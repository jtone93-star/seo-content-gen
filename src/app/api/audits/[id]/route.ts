import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      clientProfile: true,
      dataSources: { orderBy: { createdAt: "desc" } },
      artifacts: { orderBy: [{ step: "asc" }, { version: "desc" }] },
      jobs: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  return NextResponse.json(audit);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  const existing = await prisma.audit.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  await prisma.audit.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
