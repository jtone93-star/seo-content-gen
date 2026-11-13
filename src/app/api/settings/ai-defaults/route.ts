import { NextResponse } from "next/server";
import { getCredentialStatuses } from "@/lib/credentials";
import { AUDIT_STEPS } from "@/lib/audit/types";
import { PIPELINE_STEPS } from "@/lib/pipeline/types";
import { prisma } from "@/lib/prisma";

async function readCurrentDefaults() {
  const [strategySlot, contentSlots, auditSlots, credentials] = await Promise.all([
    prisma.strategyModelSlot.findUnique({ where: { id: "strategy" } }),
    prisma.modelSlot.findMany({ orderBy: { step: "asc" } }),
    prisma.auditModelSlot.findMany(),
    getCredentialStatuses(),
  ]);

  const candidates = [
    strategySlot,
    ...contentSlots,
    ...auditSlots,
  ].filter(Boolean);

  const live = candidates.find((s) => s?.enabled && s.provider === "anthropic" && s.model);
  const anyEnabled = candidates.some((s) => s?.enabled);
  const model =
    live?.model ??
    strategySlot?.model ??
    contentSlots.find((s) => s.model)?.model ??
    auditSlots.find((s) => s.model)?.model ??
    null;

  const allMatch =
    candidates.length > 0 &&
    candidates.every(
      (s) =>
        Boolean(s?.enabled) === Boolean(live) &&
        (live
          ? s?.provider === "anthropic" && s?.model === live.model
          : !s?.enabled),
    );

  return {
    enabled: Boolean(live),
    model,
    provider: live ? ("anthropic" as const) : null,
    uniform: allMatch || (!anyEnabled && candidates.every((s) => !s?.enabled)),
    anthropicConnected: credentials.anthropic.connected,
    strategy: strategySlot,
    contentSlots,
    auditSlots,
  };
}

/** Current Claude-first AI defaults (one model for strategy, audit, and content). */
export async function GET() {
  const current = await readCurrentDefaults();
  return NextResponse.json(current);
}

/**
 * Apply one Claude model (or Mock) across living strategy, every audit stage,
 * and every content pipeline stage.
 */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;

  if (enabled && !model) {
    return NextResponse.json(
      { error: "Choose a Claude model before enabling live AI." },
      { status: 400 },
    );
  }

  if (enabled) {
    const credentials = await getCredentialStatuses();
    if (!credentials.anthropic.connected) {
      return NextResponse.json(
        { error: "Connect a Claude (Anthropic) API key before enabling live AI." },
        { status: 400 },
      );
    }
  }

  const data = {
    provider: enabled ? ("anthropic" as const) : null,
    model: enabled ? model : null,
    enabled,
  };

  await prisma.$transaction([
    prisma.strategyModelSlot.upsert({
      where: { id: "strategy" },
      create: { id: "strategy", ...data },
      update: data,
    }),
    ...PIPELINE_STEPS.map((step) =>
      prisma.modelSlot.upsert({
        where: { step },
        create: { step, ...data },
        update: data,
      }),
    ),
    ...AUDIT_STEPS.map((step) =>
      prisma.auditModelSlot.upsert({
        where: { step },
        create: { step, ...data },
        update: data,
      }),
    ),
  ]);

  const current = await readCurrentDefaults();
  return NextResponse.json(current);
}
