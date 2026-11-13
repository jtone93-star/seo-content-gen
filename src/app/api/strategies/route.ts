import { NextResponse } from "next/server";
import { createLivingStrategy, loadStrategy, StrategyError } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const clientProfileId = new URL(request.url).searchParams.get("clientProfileId");
  const strategies = await prisma.strategy.findMany({
    where: clientProfileId ? { clientProfileId } : undefined,
    orderBy: { updatedAt: "desc" },
    include: { kpis: true, _count: { select: { recommendations: true, cycles: true } } },
  });
  return NextResponse.json(strategies);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const clientProfileId = String(body.clientProfileId ?? "").trim();
    const name = String(body.name ?? "").trim();
    if (!clientProfileId) {
      return NextResponse.json({ error: "clientProfileId is required." }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

    const strategy = await createLivingStrategy({
      clientProfileId,
      name,
      sourceAuditId: body.sourceAuditId ? String(body.sourceAuditId) : null,
      notes: typeof body.notes === "string" ? body.notes : null,
      kpis: Array.isArray(body.kpis) ? body.kpis : [],
    });
    return NextResponse.json(strategy, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create strategy.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
