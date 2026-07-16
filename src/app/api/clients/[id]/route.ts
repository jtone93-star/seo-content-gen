import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const client = await prisma.clientProfile.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const client = await prisma.clientProfile.update({
    where: { id },
    data: {
      name: body.name,
      industry: body.industry,
      audience: body.audience,
      tone: body.tone,
      readingLevel: body.readingLevel,
      pointOfView: body.pointOfView,
      wordsToAvoid: body.wordsToAvoid,
      requiredDisclaimers: body.requiredDisclaimers,
      seoNotes: body.seoNotes,
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.clientProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
