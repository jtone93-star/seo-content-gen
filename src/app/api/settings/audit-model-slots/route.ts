import { NextResponse } from "next/server";
import type { AuditStep } from "@/generated/prisma/client";
import { slotProviderFromBody } from "@/lib/ai-providers";
import { AUDIT_STEPS } from "@/lib/audit/types";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;
  const enabled = Boolean(body.enabled);
  if (enabled && !model) {
    return NextResponse.json({ error: "Choose a model before enabling a live engine." }, { status: 400 });
  }

  const provider = slotProviderFromBody({ provider: body.provider, enabled });
  const data = { provider, model, enabled };

  if (body.applyAll === true) {
    await Promise.all(
      AUDIT_STEPS.map((step) =>
        prisma.auditModelSlot.upsert({
          where: { step },
          create: { step, ...data },
          update: data,
        }),
      ),
    );
    const slots = await prisma.auditModelSlot.findMany();
    return NextResponse.json(slots);
  }

  const step = body.step as AuditStep | undefined;
  if (!step) return NextResponse.json({ error: "step is required." }, { status: 400 });

  const slot = await prisma.auditModelSlot.upsert({
    where: { step },
    create: { step, ...data },
    update: data,
  });
  return NextResponse.json(slot);
}

export async function GET() {
  const slots = await prisma.auditModelSlot.findMany();
  return NextResponse.json(slots);
}
