import { NextResponse } from "next/server";
import type { PipelineStep } from "@/generated/prisma/client";
import { JobEnqueueError } from "@/lib/jobs/enqueue";
import { enqueueAndRun } from "@/lib/jobs/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string; step: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, step } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const result = await enqueueAndRun({
      projectId: id,
      type: "REGENERATE",
      step: step as PipelineStep,
      feedback: body.feedback,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true, jobId: result.jobId, status: result.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to regenerate step";
    const status = err instanceof JobEnqueueError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
