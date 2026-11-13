import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  rowsFromRecommendations,
  slugifyFilename,
  workPackageToXlsxBuffer,
} from "@/lib/strategy/export-work-package";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const strategy = await prisma.strategy.findUnique({
    where: { id },
    include: {
      recommendations: {
        where: { status: { in: ["BACKLOG", "SCHEDULED", "DONE"] } },
        orderBy: { priority: "asc" },
      },
    },
  });
  if (!strategy) return NextResponse.json({ error: "Strategy not found." }, { status: 404 });
  if (!strategy.recommendations.length) {
    return NextResponse.json({ error: "Approve recommendations before exporting." }, { status: 400 });
  }

  const rows = rowsFromRecommendations(strategy, strategy.recommendations);
  const buffer = await workPackageToXlsxBuffer({
    strategyName: strategy.name,
    rows,
  });
  const base = `${slugifyFilename(strategy.name)}-work-package`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
    },
  });
}
