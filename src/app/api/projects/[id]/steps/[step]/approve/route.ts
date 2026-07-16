import { NextResponse } from "next/server";
import type { PipelineStep } from "@/generated/prisma/client";
import { JobEnqueueError } from "@/lib/jobs/enqueue";
import { enqueueAndRun } from "@/lib/jobs/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string; step: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id, step } = await params;
  try {
    const result = await enqueueAndRun({
      projectId: id,
      type: "APPROVE",
      step: step as PipelineStep,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to approve step";
    const status = err instanceof JobEnqueueError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
