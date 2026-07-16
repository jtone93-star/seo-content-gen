import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const project = await prisma.contentProject.findUnique({
    where: { id },
    include: {
      clientProfile: true,
      artifacts: { orderBy: [{ step: "asc" }, { version: "desc" }] },
      pipelineJobs: {
        where: { status: { in: ["PENDING", "PROCESSING"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}
