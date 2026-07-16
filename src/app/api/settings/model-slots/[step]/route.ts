import { NextResponse } from "next/server";
import type { PipelineStep } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ step: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { step } = await params;
  const body = await request.json();

  const slot = await prisma.modelSlot.update({
    where: { step: step as PipelineStep },
    data: {
      provider: body.provider ?? null,
      model: body.model ?? null,
      enabled: Boolean(body.enabled),
    },
  });

  return NextResponse.json(slot);
}
