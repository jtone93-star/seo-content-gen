import "dotenv/config";
import {
  claimNextPendingJob,
  completeJob,
  processPipelineJob,
  retryOrFailJob,
} from "@/lib/jobs/process-job";

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1500);

async function runOnce(): Promise<boolean> {
  const job = await claimNextPendingJob();
  if (!job) return false;

  console.log(`[worker] Processing ${job.type} job ${job.id} (project ${job.projectId})`);

  try {
    await processPipelineJob(job);
    await completeJob(job.id);
    console.log(`[worker] Completed job ${job.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[worker] Job ${job.id} failed:`, message);
    await retryOrFailJob(job, message);
  }

  return true;
}

async function loop() {
  console.log(`[worker] Pipeline worker started (poll every ${POLL_MS}ms)`);

  while (true) {
    const processed = await runOnce();
    if (!processed) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

loop().catch((err) => {
  console.error("[worker] Fatal error:", err);
  process.exit(1);
});
