import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { upsertKpi, StrategyError } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string; kpiId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id, kpiId } = await params;
  const existing = await prisma.strategyKpi.findFirst({ where: { id: kpiId, strategyId: id } });
  if (!existing) return NextResponse.json({ error: "KPI not found." }, { status: 404 });
  try {
    const body = await request.json();
    const kpi = await upsertKpi(id, {
      id: kpiId,
      metricKey: typeof body.metricKey === "string" ? body.metricKey : existing.metricKey,
      baseline: body.baseline === undefined ? existing.baseline : body.baseline == null ? null : Number(body.baseline),
      target: body.target === undefined ? existing.target : Number(body.target),
      currentValue:
        body.currentValue === undefined
          ? existing.currentValue
          : body.currentValue == null
            ? null
            : Number(body.currentValue),
      deadline: body.deadline === undefined ? existing.deadline?.toISOString() ?? null : body.deadline,
    });
    return NextResponse.json(kpi);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update KPI.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id, kpiId } = await params;
  const existing = await prisma.strategyKpi.findFirst({ where: { id: kpiId, strategyId: id } });
  if (!existing) return NextResponse.json({ error: "KPI not found." }, { status: 404 });
  await prisma.strategyKpi.delete({ where: { id: kpiId } });
  return NextResponse.json({ ok: true });
}
