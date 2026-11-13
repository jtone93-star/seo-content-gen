import type { PipelineStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STEPS } from "./types";
import type { StepContext, StepOutput } from "./types";
import { runStep } from "./executor-registry";
import { isQualityGate, MAX_QUALITY_LOOPS, parseQualityGate } from "./quality-loop";

function nextStep(current: PipelineStep): PipelineStep | null {
  const idx = PIPELINE_STEPS.indexOf(current);
  if (idx < 0 || idx >= PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[idx + 1];
}

function downstreamSteps(step: PipelineStep): PipelineStep[] {
  const idx = PIPELINE_STEPS.indexOf(step);
  if (idx < 0) return [];
  return PIPELINE_STEPS.slice(idx + 1);
}

async function loadPriorOutputs(projectId: string): Promise<Partial<Record<PipelineStep, StepOutput>>> {
  const artifacts = await prisma.stepArtifact.findMany({
    where: { projectId, status: "APPROVED" },
    orderBy: { version: "desc" },
  });

  const byStep: Partial<Record<PipelineStep, StepOutput>> = {};
  for (const a of artifacts) {
    if (!byStep[a.step] && a.output) {
      byStep[a.step] = a.output as unknown as StepOutput;
    }
  }
  return byStep;
}

async function buildContext(projectId: string, userFeedback?: string): Promise<StepContext> {
  const project = await prisma.contentProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { clientProfile: true },
  });

  return {
    project,
    client: project.clientProfile,
    priorOutputs: await loadPriorOutputs(projectId),
    userFeedback,
  };
}

async function gateAttemptCount(projectId: string, step: PipelineStep): Promise<number> {
  return prisma.stepArtifact.count({ where: { projectId, step } });
}

export async function executeStep(
  projectId: string,
  step: PipelineStep,
  options?: { userFeedback?: string; version?: number; qualityLoopUntil?: PipelineStep },
): Promise<void> {
  const project = await prisma.contentProject.findUniqueOrThrow({
    where: { id: projectId },
  });

  const version =
    options?.version ??
    ((await prisma.stepArtifact.aggregate({
      where: { projectId, step },
      _max: { version: true },
    }))._max.version ?? 0) + 1;

  if (version > 1) {
    await prisma.stepArtifact.updateMany({
      where: { projectId, step, status: { not: "SUPERSEDED" } },
      data: { status: "SUPERSEDED" },
    });
  }

  const ctx = await buildContext(projectId, options?.userFeedback);
  const inputSnapshot = {
    topic: project.topic,
    targetKeyword: project.targetKeyword,
    sourceUrls: project.sourceUrls,
    pastedNotes: project.pastedNotes,
    targetLength: project.targetLength,
    contentType: project.contentType,
    priorSteps: Object.keys(ctx.priorOutputs),
    userFeedback: options?.userFeedback,
  };

  const artifact = await prisma.stepArtifact.create({
    data: {
      projectId,
      step,
      version,
      status: "RUNNING",
      inputSnapshot,
      userFeedback: options?.userFeedback,
    },
  });

  await prisma.contentProject.update({
    where: { id: projectId },
    data: { status: "RUNNING", currentStep: step, errorMessage: null },
  });

  let output: StepOutput;
  try {
    output = await runStep(ctx, step);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.stepArtifact.update({
      where: { id: artifact.id },
      data: { status: "REJECTED" },
    });
    await prisma.contentProject.update({
      where: { id: projectId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }

  const isLast = step === "FINAL";
  const inQualityLoop = !!options?.qualityLoopUntil;
  const pauseForReview =
    project.runMode === "STEP_BY_STEP" && (!inQualityLoop || step === options.qualityLoopUntil);

  if (isQualityGate(step)) {
    const gate = parseQualityGate(step, output);
    const attempts = await gateAttemptCount(projectId, step);
    const canRewind = !gate.passed && !!gate.rewindTo && attempts < MAX_QUALITY_LOOPS;

    if (canRewind && gate.rewindTo) {
      await prisma.stepArtifact.update({
        where: { id: artifact.id },
        data: {
          output: output as object,
          status: "APPROVED",
          approvedAt: new Date(),
        },
      });
      await regenerateStep(projectId, gate.rewindTo, gate.feedback, step);
      return;
    }

    const forceHuman = !gate.passed && attempts >= MAX_QUALITY_LOOPS;
    const pause = pauseForReview || forceHuman;
    await prisma.stepArtifact.update({
      where: { id: artifact.id },
      data: {
        output: output as object,
        status: pause ? "AWAITING_REVIEW" : "APPROVED",
        approvedAt: pause ? null : new Date(),
      },
    });

    if (pause) {
      const loopNote = forceHuman
        ? `${step === "QA" ? "QA & compliance" : "Ship check"} still failing after ${MAX_QUALITY_LOOPS} passes. Review the report, then approve to continue or regenerate a stage.`
        : null;
      await prisma.contentProject.update({
        where: { id: projectId },
        data: {
          status: "PAUSED_FOR_REVIEW",
          currentStep: step,
          errorMessage: loopNote,
        },
      });
      return;
    }
  } else {
    await prisma.stepArtifact.update({
      where: { id: artifact.id },
      data: {
        output: output as object,
        status: pauseForReview ? "AWAITING_REVIEW" : "APPROVED",
        approvedAt: pauseForReview ? null : new Date(),
      },
    });

    if (isLast) {
      await prisma.contentProject.update({
        where: { id: projectId },
        data: { status: "COMPLETED", currentStep: "FINAL" },
      });
      return;
    }

    if (pauseForReview) {
      await prisma.contentProject.update({
        where: { id: projectId },
        data: { status: "PAUSED_FOR_REVIEW", currentStep: step },
      });
      return;
    }
  }

  const following = nextStep(step);
  if (following) {
    await executeStep(projectId, following, { qualityLoopUntil: options?.qualityLoopUntil });
  }
}

export async function startPipeline(projectId: string): Promise<void> {
  const project = await prisma.contentProject.findUniqueOrThrow({
    where: { id: projectId },
  });

  if (project.status !== "DRAFT" && project.status !== "FAILED") {
    throw new Error("Project has already been started.");
  }

  await executeStep(projectId, "BRIEF");
}

export async function approveStep(projectId: string, step: PipelineStep): Promise<void> {
  const artifact = await prisma.stepArtifact.findFirst({
    where: { projectId, step, status: "AWAITING_REVIEW" },
    orderBy: { version: "desc" },
  });

  if (!artifact) {
    throw new Error(`No artifact awaiting review for step ${step}.`);
  }

  await prisma.stepArtifact.update({
    where: { id: artifact.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  const following = nextStep(step);
  if (!following) {
    await prisma.contentProject.update({
      where: { id: projectId },
      data: { status: "COMPLETED", errorMessage: null },
    });
    return;
  }

  await prisma.contentProject.update({
    where: { id: projectId },
    data: { errorMessage: null },
  });

  await executeStep(projectId, following);
}

export async function regenerateStep(
  projectId: string,
  step: PipelineStep,
  userFeedback?: string,
  qualityLoopUntil?: PipelineStep,
): Promise<void> {
  const later = downstreamSteps(step);
  if (later.length > 0) {
    await prisma.stepArtifact.updateMany({
      where: { projectId, step: { in: later }, status: { not: "SUPERSEDED" } },
      data: { status: "SUPERSEDED" },
    });
  }

  await executeStep(projectId, step, { userFeedback, qualityLoopUntil });
}
