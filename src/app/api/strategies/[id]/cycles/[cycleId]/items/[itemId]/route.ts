import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setCycleItemStatus, StrategyError } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string; cycleId: string; itemId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, cycleId, itemId } = await params;
  const item = await prisma.cycleItem.findFirst({
    where: { id: itemId, cycleId, cycle: { strategyId: id } },
  });
  if (!item) return NextResponse.json({ error: "Cycle item not found." }, { status: 404 });
  try {
    const body = await request.json();
    const executionStatus = String(body.executionStatus ?? "");
    if (!["PLANNED", "IN_PROGRESS", "DONE", "BLOCKED"].includes(executionStatus)) {
      return NextResponse.json({ error: "Invalid executionStatus." }, { status: 400 });
    }
    await setCycleItemStatus(
      itemId,
      executionStatus as "PLANNED" | "IN_PROGRESS" | "DONE" | "BLOCKED",
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update item.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
