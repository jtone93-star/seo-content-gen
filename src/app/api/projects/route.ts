import { NextResponse } from "next/server";
import type { ContentType, RunMode } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const projects = await prisma.contentProject.findMany({
    include: { clientProfile: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const body = await request.json();

  const project = await prisma.contentProject.create({
    data: {
      clientProfileId: body.clientProfileId,
      topic: body.topic,
      targetKeyword: body.targetKeyword || null,
      sourceUrls: body.sourceUrls ?? [],
      pastedNotes: body.pastedNotes || null,
      targetLength: body.targetLength ? Number(body.targetLength) : null,
      contentType: body.contentType as ContentType,
      runMode: body.runMode as RunMode,
      status: "DRAFT",
    },
  });

  return NextResponse.json(project, { status: 201 });
}
