import { NextResponse } from "next/server";
import { startCycleWork, StrategyError } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";

export const maxDuration = 300;

type Params = { params: Promise<{ id: string; cycleId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, cycleId } = await params;
  const cycle = await prisma.cycle.findFirst({ where: { id: cycleId, strategyId: id } });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
  try {
    const body = await request.json().catch(() => ({}));
    const cycleItemIds: string[] | undefined = Array.isArray(body.cycleItemIds)
      ? body.cycleItemIds.map(String)
      : undefined;
    const result = await startCycleWork(cycleId, cycleItemIds);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start cycle work.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
