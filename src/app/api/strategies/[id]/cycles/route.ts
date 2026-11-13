import { NextResponse } from "next/server";
import { createCycle, createNextCycles, StrategyError } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    if (body.next === true || Number(body.count) > 1) {
      const count = Math.min(12, Math.max(1, Number(body.count) || 6));
      const cycles = await createNextCycles(id, count);
      return NextResponse.json(cycles, { status: 201 });
    }
    const year = Number(body.year);
    const month = Number(body.month);
    if (!year || !month) {
      return NextResponse.json({ error: "year and month are required." }, { status: 400 });
    }
    const cycle = await createCycle(id, year, month);
    return NextResponse.json(cycle, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create cycle.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
