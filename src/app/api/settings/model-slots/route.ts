import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const slots = await prisma.modelSlot.findMany({ orderBy: { step: "asc" } });
  return NextResponse.json(slots);
}
