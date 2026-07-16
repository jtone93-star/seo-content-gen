import type { PipelineJobType, PipelineStep } from "@/generated/prisma/client";
import { enqueuePipelineJob } from "@/lib/jobs/enqueue";
import { runEnqueuedJob } from "@/lib/jobs/process-job";

/**
 * Enqueue then process in the same request.
 * This is the Vercel-friendly path: no always-on worker required.
 * Optional local `npm run worker` can still drain leftover PENDING jobs.
 */
export async function enqueueAndRun(params: {
  projectId: string;
  type: PipelineJobType;
  step?: PipelineStep;
  feedback?: string;
}) {
  const job = await enqueuePipelineJob(params);
  const result = await runEnqueuedJob(job.id);

  if (!result.ok) {
    return {
      ok: false as const,
      jobId: job.id,
      status: "FAILED" as const,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    jobId: job.id,
    status: "COMPLETED" as const,
  };
}
