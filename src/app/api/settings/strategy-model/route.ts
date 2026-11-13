import { NextResponse } from "next/server";
import { slotProviderFromBody } from "@/lib/ai-providers";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const body = await request.json();
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;
  const enabled = Boolean(body.enabled);
  if (enabled && !model) {
    return NextResponse.json({ error: "Choose a model before enabling a live engine." }, { status: 400 });
  }

  const slot = await prisma.strategyModelSlot.upsert({
    where: { id: "strategy" },
    create: {
      id: "strategy",
      provider: slotProviderFromBody({ provider: body.provider, enabled }),
      model,
      enabled,
    },
    update: {
      provider: slotProviderFromBody({ provider: body.provider, enabled }),
      model,
      enabled,
    },
  });
  return NextResponse.json(slot);
}
