import { NextResponse } from "next/server";
import { restoreStrategy, StrategyError } from "@/lib/strategy/orchestrator";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  try {
    const strategy = await restoreStrategy(id);
    if (!strategy) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
    return NextResponse.json(strategy);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restore strategy.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
