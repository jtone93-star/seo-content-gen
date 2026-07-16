import { NextResponse } from "next/server";
import { JobEnqueueError } from "@/lib/jobs/enqueue";
import { enqueueAndRun } from "@/lib/jobs/run-inline";

/** Allow long Claude / full-auto runs on Vercel (Pro; Hobby caps lower). */
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const result = await enqueueAndRun({ projectId: id, type: "START" });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, jobId: result.jobId, status: result.status },
        { status: 500 },
      );
    }
    return NextResponse.json({
      ok: true,
      jobId: result.jobId,
      status: result.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start pipeline";
    const status = err instanceof JobEnqueueError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
