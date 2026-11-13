import { NextResponse } from "next/server";
import { syncStrategyKpis } from "@/lib/strategy/kpi-sync";
import { loadStrategy } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  await syncStrategyKpis(id);
  const strategy = await loadStrategy(id);
  if (!strategy) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
  return NextResponse.json(strategy);
}
