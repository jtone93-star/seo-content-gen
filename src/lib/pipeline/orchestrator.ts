import type { PipelineStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PIPELINE_STEPS } from "./types";
import type { StepContext, StepOutput } from "./types";
import { runStep } from "./executor-registry";

function nextStep(current: PipelineStep): PipelineStep | null {
  const idx = PIPELINE_STEPS.indexOf(current);
  if (idx < 0 || idx >= PIPELINE_STEPS.length - 1) return null;
  return PIPELINE_STEPS[idx + 1];
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

async function buildContext(projectId: string): Promise<StepContext> {
  const project = await prisma.contentProject.findUniqueOrThrow({
    where: { id: projectId },
    include: { clientProfile: true },
  });

  return {
    project,
    client: project.clientProfile,
    priorOutputs: await loadPriorOutputs(projectId),
  };
}

export async function executeStep(
  projectId: string,
  step: PipelineStep,
  options?: { userFeedback?: string; version?: number },
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

  const ctx = await buildContext(projectId);
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

  try {
    const output = await runStep(ctx, step);
    const isLast = step === "FINAL";
    // In step-by-step mode, every stage—including final—requires explicit approval.
    const pauseForReview = project.runMode === "STEP_BY_STEP";

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

    const following = nextStep(step);
    if (following) {
      await executeStep(projectId, following);
    }
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
      data: { status: "COMPLETED" },
    });
    return;
  }

  await executeStep(projectId, following);
}

function downstreamSteps(step: PipelineStep): PipelineStep[] {
  const idx = PIPELINE_STEPS.indexOf(step);
  if (idx < 0) return [];
  return PIPELINE_STEPS.slice(idx + 1);
}

export async function regenerateStep(
  projectId: string,
  step: PipelineStep,
  userFeedback?: string,
): Promise<void> {
  const later = downstreamSteps(step);
  if (later.length > 0) {
    await prisma.stepArtifact.updateMany({
      where: { projectId, step: { in: later }, status: { not: "SUPERSEDED" } },
      data: { status: "SUPERSEDED" },
    });
  }

  await executeStep(projectId, step, { userFeedback });
}
