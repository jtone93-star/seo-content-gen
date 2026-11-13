import { NextResponse } from "next/server";
import type { PipelineStep } from "@/generated/prisma/client";
import { slotProviderFromBody } from "@/lib/ai-providers";
import { PIPELINE_STEPS } from "@/lib/pipeline/types";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ step: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { step: rawStep } = await params;
  const step = rawStep as PipelineStep;
  if (!PIPELINE_STEPS.includes(step)) {
    return NextResponse.json({ error: `Unknown pipeline step: ${rawStep}` }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const enabled = Boolean(body.enabled);
  const model = typeof body.model === "string" && body.model.trim() ? body.model.trim() : null;
  if (enabled && !model) {
    return NextResponse.json({ error: "Choose a model before enabling a live engine." }, { status: 400 });
  }

  const provider = slotProviderFromBody({ provider: body.provider, enabled });

  try {
    const slot = await prisma.modelSlot.upsert({
      where: { step },
      create: { step, provider, model, enabled },
      update: { provider, model, enabled },
    });
    return NextResponse.json(slot);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save model slot.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
