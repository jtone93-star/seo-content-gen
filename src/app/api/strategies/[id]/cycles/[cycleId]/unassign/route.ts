import { NextResponse } from "next/server";
import { unassignCycleItem, StrategyError } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string; cycleId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id, cycleId } = await params;
  const cycle = await prisma.cycle.findFirst({ where: { id: cycleId, strategyId: id } });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });
  try {
    const body = await request.json();
    const cycleItemId = String(body.cycleItemId ?? "");
    if (!cycleItemId) return NextResponse.json({ error: "cycleItemId is required." }, { status: 400 });
    await unassignCycleItem(cycleItemId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to unassign item.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
