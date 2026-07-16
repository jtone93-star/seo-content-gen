import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.clientProfile.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(clients);
}

export async function POST(request: Request) {
  const body = await request.json();
  const client = await prisma.clientProfile.create({
    data: {
      name: body.name,
      industry: body.industry || null,
      audience: body.audience || null,
      tone: body.tone || null,
      readingLevel: body.readingLevel || null,
      pointOfView: body.pointOfView || null,
      wordsToAvoid: body.wordsToAvoid ?? [],
      requiredDisclaimers: body.requiredDisclaimers || null,
      seoNotes: body.seoNotes || null,
    },
  });
  return NextResponse.json(client, { status: 201 });
}
