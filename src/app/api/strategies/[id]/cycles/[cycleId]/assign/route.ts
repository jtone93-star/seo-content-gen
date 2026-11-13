import { NextResponse } from "next/server";
import { assignToCycle, StrategyError } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; cycleId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, cycleId } = await params;
  const cycle = await prisma.cycle.findFirst({ where: { id: cycleId, strategyId: id } });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
  try {
    const body = await request.json();
    const recommendationIds: string[] = Array.isArray(body.recommendationIds)
      ? body.recommendationIds.map(String)
      : [];
    if (!recommendationIds.length) {
      return NextResponse.json({ error: "recommendationIds are required." }, { status: 400 });
    }
    await assignToCycle(cycleId, recommendationIds);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to assign items.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
