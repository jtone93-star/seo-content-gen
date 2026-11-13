import { NextResponse } from "next/server";
import { loadStrategy, StrategyError } from "@/lib/strategy/orchestrator";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const strategy = await loadStrategy(id);
  if (!strategy) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
  return NextResponse.json(strategy);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.strategy.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });

  try {
    const body = await request.json();
    const data: {
      name?: string;
      notes?: string | null;
      sourceAuditId?: string | null;
    } = {};
    if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim();
    if (body.notes !== undefined) data.notes = String(body.notes).trim() || null;
    if (body.sourceAuditId !== undefined) {
      const sourceAuditId = body.sourceAuditId ? String(body.sourceAuditId) : null;
      if (sourceAuditId) {
        const audit = await prisma.audit.findFirst({
          where: { id: sourceAuditId, clientProfileId: existing.clientProfileId },
        });
        if (!audit) return NextResponse.json({ error: "Audit not found for this client." }, { status: 400 });
      }
      data.sourceAuditId = sourceAuditId;
    }
    await prisma.strategy.update({ where: { id }, data });
    const strategy = await loadStrategy(id);
    return NextResponse.json(strategy);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update strategy.";
    const status = err instanceof StrategyError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
