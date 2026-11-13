import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clampBillingDay } from "@/lib/strategy/cycles";

function normalizeBillingDay(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return clampBillingDay(n);
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const client = await prisma.clientProfile.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(client);
}

function optionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const text = String(value).trim();
  return text || null;
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
      billingDay: body.billingDay === undefined ? undefined : normalizeBillingDay(body.billingDay),
      contactName: optionalText(body.contactName),
      contactEmail: optionalText(body.contactEmail),
      contactPhone: optionalText(body.contactPhone),
      website: optionalText(body.website),
      crmNotes: optionalText(body.crmNotes),
    },
  });
  return NextResponse.json(client);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  await prisma.clientProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
