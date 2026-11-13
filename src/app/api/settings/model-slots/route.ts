import { NextResponse } from "next/server";
import type { PipelineStep } from "@/generated/prisma/client";
import { slotProviderFromBody } from "@/lib/ai-providers";
import { PIPELINE_STEPS } from "@/lib/pipeline/types";
import { prisma } from "@/lib/prisma";

/** Apply the same engine/model to every content pipeline stage. */
export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;
  if (enabled && !model) {
    return NextResponse.json({ error: "Choose a model before enabling a live engine." }, { status: 400 });
  }

  const provider = slotProviderFromBody({ provider: body.provider, enabled });
  const data = { provider, model, enabled };

  await Promise.all(
    PIPELINE_STEPS.map((step) =>
      prisma.modelSlot.upsert({
        where: { step },
        create: { step, ...data },
        update: data,
      }),
    ),
  );

  const slots = await prisma.modelSlot.findMany({ orderBy: { step: "asc" } });
  return NextResponse.json(slots);
}

export async function GET() {
  const slots = await prisma.modelSlot.findMany({ orderBy: { step: "asc" } });
  return NextResponse.json(slots);
}
