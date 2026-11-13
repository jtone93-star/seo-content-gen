import type { AuditStep, PipelineJobType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  approveAuditStep,
  regenerateAuditStep,
  startAuditPipeline,
} from "./orchestrator";

export class AuditJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuditJobError";
  }
}

export async function enqueueAndRunAudit(params: {
  auditId: string;
  type: PipelineJobType;
  step?: AuditStep;
  feedback?: string;
  selectedPages?: string[];
}) {
  const job = await prisma.auditJob.create({
    data: {
      auditId: params.auditId,
      type: params.type,
      step: params.step,
      feedback: params.feedback,
      status: "PENDING",
    },
  });

  await prisma.auditJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", startedAt: new Date(), attempts: { increment: 1 } },
  });

  try {
    if (params.type === "START") {
      await startAuditPipeline(params.auditId);
    } else if (params.type === "APPROVE") {
      if (!params.step) throw new AuditJobError("Approve requires a step.");
      await approveAuditStep(params.auditId, params.step, {
        selectedPages: params.selectedPages,
      });
    } else if (params.type === "REGENERATE") {
      if (!params.step) throw new AuditJobError("Regenerate requires a step.");
      await regenerateAuditStep(params.auditId, params.step, params.feedback);
    } else {
      throw new AuditJobError(`Unknown audit job type: ${params.type}`);
    }

    await prisma.auditJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });

    return { ok: true as const, jobId: job.id, status: "COMPLETED" as const };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit job failed.";
    await prisma.auditJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    return { ok: false as const, jobId: job.id, status: "FAILED" as const, error: message };
  }
}
