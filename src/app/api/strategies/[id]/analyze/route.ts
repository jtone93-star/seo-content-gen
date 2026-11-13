import { NextResponse } from "next/server";
import { enqueueAndRunStrategyAnalyze } from "@/lib/strategy/run-inline";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const result = await enqueueAndRunStrategyAnalyze(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, jobId: result.jobId },
      { status: result.statusCode },
    );
  }
  return NextResponse.json({ ok: true, jobId: result.jobId, strategy: result.strategy });
}
