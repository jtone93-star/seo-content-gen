import { NextResponse } from "next/server";
import { upsertKpi, StrategyError } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json();
    const kpi = await upsertKpi(id, {
      metricKey: String(body.metricKey ?? ""),
      baseline: body.baseline == null ? null : Number(body.baseline),
      target: Number(body.target),
      currentValue: body.currentValue == null ? null : Number(body.currentValue),
      deadline: body.deadline ?? null,
    });
    return NextResponse.json(kpi, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save KPI.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
