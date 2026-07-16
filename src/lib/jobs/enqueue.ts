import type { PipelineJobType, PipelineStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export class JobEnqueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JobEnqueueError";
  }
}

async function assertNoActiveJob(projectId: string) {
  const active = await prisma.pipelineJob.findFirst({
    where: {
      projectId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
  });
  if (active) {
    throw new JobEnqueueError("A pipeline job is already queued or running for this project.");
  }
}

export async function enqueuePipelineJob(params: {
  projectId: string;
  type: PipelineJobType;
  step?: PipelineStep;
  feedback?: string;
}) {
  const { projectId, type, step, feedback } = params;

  await assertNoActiveJob(projectId);

  const project = await prisma.contentProject.findUniqueOrThrow({
    where: { id: projectId },
  });

  if (type === "START") {
    if (project.status !== "DRAFT" && project.status !== "FAILED") {
      throw new JobEnqueueError("Project cannot be started in its current state.");
    }
  }

  if (type === "APPROVE" && !step) {
    throw new JobEnqueueError("Step is required for approve jobs.");
  }

  if (type === "REGENERATE" && !step) {
    throw new JobEnqueueError("Step is required for regenerate jobs.");
  }

  const job = await prisma.$transaction(async (tx) => {
    const created = await tx.pipelineJob.create({
      data: {
        projectId,
        type,
        step: step ?? null,
        feedback: feedback ?? null,
        status: "PENDING",
      },
    });

    await tx.contentProject.update({
      where: { id: projectId },
      data: {
        status: "QUEUED",
        errorMessage: null,
      },
    });

    return created;
  });

  return job;
}

export async function getActiveJobForProject(projectId: string) {
  return prisma.pipelineJob.findFirst({
    where: {
      projectId,
      status: { in: ["PENDING", "PROCESSING"] },
    },
    orderBy: { createdAt: "desc" },
  });
}
