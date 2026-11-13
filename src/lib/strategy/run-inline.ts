import { prisma } from "@/lib/prisma";
import { analyzeStrategy, StrategyError } from "./orchestrator";

export async function enqueueAndRunStrategyAnalyze(strategyId: string) {
  const job = await prisma.strategyJob.create({
    data: { strategyId, status: "PENDING" },
  });

  await prisma.strategyJob.update({
    where: { id: job.id },
    data: { status: "PROCESSING", startedAt: new Date() },
  });

  try {
    const strategy = await analyzeStrategy(strategyId);
    await prisma.strategyJob.update({
      where: { id: job.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    return { ok: true as const, jobId: job.id, strategy };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Strategy analysis failed.";
    await prisma.strategyJob.update({
      where: { id: job.id },
      data: { status: "FAILED", errorMessage: message, completedAt: new Date() },
    });
    return {
      ok: false as const,
      jobId: job.id,
      error: message,
      statusCode: err instanceof StrategyError ? 400 : 500,
    };
  }
}
