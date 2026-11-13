import type { AuditStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { runAuditStep } from "./executor-registry";
import { AUDIT_STEPS } from "./types";
import type { AuditStepContext, AuditStepOutput, PageShortlistOutput } from "./types";

function nextStep(current: AuditStep): AuditStep | null {
  const idx = AUDIT_STEPS.indexOf(current);
  if (idx < 0 || idx >= AUDIT_STEPS.length - 1) return null;
  return AUDIT_STEPS[idx + 1];
}

function downstreamSteps(step: AuditStep): AuditStep[] {
  const idx = AUDIT_STEPS.indexOf(step);
  if (idx < 0) return [];
  return AUDIT_STEPS.slice(idx + 1);
}

async function loadPriorOutputs(
  auditId: string,
): Promise<Partial<Record<AuditStep, AuditStepOutput>>> {
  const artifacts = await prisma.auditArtifact.findMany({
    where: { auditId, status: "APPROVED" },
    orderBy: { version: "desc" },
  });
  const byStep: Partial<Record<AuditStep, AuditStepOutput>> = {};
  for (const a of artifacts) {
    if (!byStep[a.step] && a.output) {
      byStep[a.step] = a.output as unknown as AuditStepOutput;
    }
  }
  return byStep;
}

async function buildContext(auditId: string): Promise<AuditStepContext> {
  const audit = await prisma.audit.findUniqueOrThrow({
    where: { id: auditId },
    include: {
      clientProfile: true,
      dataSources: { orderBy: { createdAt: "asc" } },
    },
  });
  return {
    audit,
    client: audit.clientProfile,
    dataSources: audit.dataSources,
    priorOutputs: await loadPriorOutputs(auditId),
  };
}

/** After PAGE_SHORTLIST approval, persist nominated/edited pages onto the audit. */
export async function applyShortlistSelection(
  auditId: string,
  pages?: string[],
): Promise<void> {
  if (pages && pages.length) {
    const cleaned = pages.map((p) => p.trim()).filter(Boolean);
    await prisma.audit.update({
      where: { id: auditId },
      data: { selectedPages: cleaned },
    });
    return;
  }

  const artifact = await prisma.auditArtifact.findFirst({
    where: { auditId, step: "PAGE_SHORTLIST", status: "APPROVED" },
    orderBy: { version: "desc" },
  });
  const output = artifact?.output as PageShortlistOutput | null;
  const nominated = output?.nominatedPages?.map((p) => p.url).filter(Boolean) ?? [];
  if (nominated.length) {
    await prisma.audit.update({
      where: { id: auditId },
      data: { selectedPages: nominated },
    });
  }
}

export async function executeAuditStep(
  auditId: string,
  step: AuditStep,
  options?: { userFeedback?: string; version?: number },
): Promise<void> {
  const audit = await prisma.audit.findUniqueOrThrow({ where: { id: auditId } });

  const version =
    options?.version ??
    ((await prisma.auditArtifact.aggregate({
      where: { auditId, step },
      _max: { version: true },
    }))._max.version ?? 0) + 1;

  if (version > 1) {
    await prisma.auditArtifact.updateMany({
      where: { auditId, step, status: { not: "SUPERSEDED" } },
      data: { status: "SUPERSEDED" },
    });
  }

  const ctx = await buildContext(auditId);
  const inputSnapshot = {
    seedUrl: audit.seedUrl,
    scopeNotes: audit.scopeNotes,
    selectedPages: audit.selectedPages,
    priorSteps: Object.keys(ctx.priorOutputs),
    dataSourceIds: ctx.dataSources.map((s) => s.id),
    userFeedback: options?.userFeedback,
  };

  const artifact = await prisma.auditArtifact.create({
    data: {
      auditId,
      step,
      version,
      status: "RUNNING",
      inputSnapshot,
      userFeedback: options?.userFeedback,
    },
  });

  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "RUNNING", currentStep: step, errorMessage: null },
  });

  try {
    const output = await runAuditStep(ctx, step);
    const isLast = step === "FINDINGS_ROLLUP";
    const pauseForReview = audit.runMode === "STEP_BY_STEP";

    await prisma.auditArtifact.update({
      where: { id: artifact.id },
      data: {
        output: output as object,
        status: pauseForReview ? "AWAITING_REVIEW" : "APPROVED",
        approvedAt: pauseForReview ? null : new Date(),
      },
    });

    if (!pauseForReview && step === "PAGE_SHORTLIST") {
      await applyShortlistSelection(auditId);
    }

    if (isLast) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: "COMPLETED", currentStep: "FINDINGS_ROLLUP" },
      });
      return;
    }

    if (pauseForReview) {
      await prisma.audit.update({
        where: { id: auditId },
        data: { status: "PAUSED_FOR_REVIEW", currentStep: step },
      });
      return;
    }

    const following = nextStep(step);
    if (following) await executeAuditStep(auditId, following);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.auditArtifact.update({
      where: { id: artifact.id },
      data: { status: "REJECTED" },
    });
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}

export async function startAuditPipeline(auditId: string): Promise<void> {
  const audit = await prisma.audit.findUniqueOrThrow({ where: { id: auditId } });
  if (audit.status !== "DRAFT" && audit.status !== "FAILED") {
    throw new Error("Audit has already been started.");
  }
  await executeAuditStep(auditId, "CRAWL_TECHNICAL");
}

export async function approveAuditStep(
  auditId: string,
  step: AuditStep,
  options?: { selectedPages?: string[] },
): Promise<void> {
  const artifact = await prisma.auditArtifact.findFirst({
    where: { auditId, step, status: "AWAITING_REVIEW" },
    orderBy: { version: "desc" },
  });
  if (!artifact) throw new Error(`No artifact awaiting review for step ${step}.`);

  await prisma.auditArtifact.update({
    where: { id: artifact.id },
    data: { status: "APPROVED", approvedAt: new Date() },
  });

  if (step === "PAGE_SHORTLIST") {
    await applyShortlistSelection(auditId, options?.selectedPages);
    const audit = await prisma.audit.findUniqueOrThrow({ where: { id: auditId } });
    if (!audit.selectedPages.length) {
      throw new Error("Approve page shortlist with at least one selected page URL.");
    }
  }

  const following = nextStep(step);
  if (!following) {
    await prisma.audit.update({
      where: { id: auditId },
      data: { status: "COMPLETED" },
    });
    return;
  }

  await executeAuditStep(auditId, following);
}

export async function regenerateAuditStep(
  auditId: string,
  step: AuditStep,
  userFeedback?: string,
): Promise<void> {
  const later = downstreamSteps(step);
  if (later.length > 0) {
    await prisma.auditArtifact.updateMany({
      where: { auditId, step: { in: later }, status: { not: "SUPERSEDED" } },
      data: { status: "SUPERSEDED" },
    });
  }
  if (AUDIT_STEPS.indexOf(step) <= AUDIT_STEPS.indexOf("PAGE_SHORTLIST")) {
    // Regenerating at or before shortlist clears locked page selection for later stages.
    await prisma.audit.update({
      where: { id: auditId },
      data: { selectedPages: [] },
    });
  }
  await executeAuditStep(auditId, step, { userFeedback });
}
