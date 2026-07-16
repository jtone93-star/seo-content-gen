import type { PipelineJob } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  approveStep,
  regenerateStep,
  startPipeline,
} from "@/lib/pipeline/orchestrator";

export async function processPipelineJob(job: PipelineJob): Promise<void> {
  switch (job.type) {
    case "START":
      await startPipeline(job.projectId);
      break;
    case "APPROVE":
      if (!job.step) throw new Error("Approve job missing step.");
      await approveStep(job.projectId, job.step);
      break;
    case "REGENERATE":
      if (!job.step) throw new Error("Regenerate job missing step.");
      await regenerateStep(job.projectId, job.step, job.feedback ?? undefined);
      break;
    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function claimPendingJob(jobId: string): Promise<PipelineJob | null> {
  const claimed = await prisma.pipelineJob.updateMany({
    where: { id: jobId, status: "PENDING" },
    data: {
      status: "PROCESSING",
      startedAt: new Date(),
      attempts: { increment: 1 },
    },
  });

  if (claimed.count !== 1) return null;
  return prisma.pipelineJob.findUniqueOrThrow({ where: { id: jobId } });
}

/**
 * Claim + run a specific PENDING job in-process (Vercel API route / local inline).
 * Used so hosting does not require a separate always-on worker.
 */
export async function runEnqueuedJob(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const job = await claimPendingJob(jobId);
  if (!job) {
    return { ok: false, error: "Job is no longer pending (already claimed or missing)." };
  }

  try {
    await processPipelineJob(job);
    await completeJob(job.id);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Inline path: fail immediately (no re-queue). User can retry from the UI.
    await failJob(job.id, message);
    await prisma.contentProject.update({
      where: { id: job.projectId },
      data: { status: "FAILED", errorMessage: message },
    });
    return { ok: false, error: message };
  }
}

export async function claimNextPendingJob(): Promise<PipelineJob | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = await prisma.pipelineJob.findFirst({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    if (!candidate) return null;

    const job = await claimPendingJob(candidate.id);
    if (job) return job;
  }

  return null;
}

export async function completeJob(jobId: string) {
  await prisma.pipelineJob.update({
    where: { id: jobId },
    data: { status: "COMPLETED", completedAt: new Date(), errorMessage: null },
  });
}

export async function failJob(jobId: string, message: string) {
  await prisma.pipelineJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage: message,
    },
  });
}

export async function retryOrFailJob(job: PipelineJob, message: string) {
  if (job.attempts < job.maxAttempts) {
    await prisma.$transaction([
      prisma.pipelineJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          errorMessage: message,
        },
      }),
      prisma.contentProject.update({
        where: { id: job.projectId },
        data: { status: "QUEUED", errorMessage: message },
      }),
    ]);
    return;
  }

  await failJob(job.id, message);
  await prisma.contentProject.update({
    where: { id: job.projectId },
    data: { status: "FAILED", errorMessage: message },
  });
}
