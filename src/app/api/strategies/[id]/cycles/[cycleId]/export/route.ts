import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  rowsFromRecommendations,
  slugifyFilename,
  workPackageToXlsxBuffer,
} from "@/lib/strategy/export-work-package";

type Params = { params: Promise<{ id: string; cycleId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id, cycleId } = await params;
  const cycle = await prisma.cycle.findFirst({
    where: { id: cycleId, strategyId: id },
    include: {
      strategy: true,
      items: { include: { recommendation: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!cycle) return NextResponse.json({ error: "Cycle not found." }, { status: 404 });

  const recs = cycle.items.map((item) => item.recommendation);
  if (!recs.length) {
    return NextResponse.json({ error: "This cycle has no items to export." }, { status: 400 });
  }

  const rows = rowsFromRecommendations(cycle.strategy, recs, cycle);
  const buffer = await workPackageToXlsxBuffer({
    strategyName: cycle.strategy.name,
    cycleLabel: cycle.label,
    rows,
  });
  const base = `${slugifyFilename(cycle.strategy.name)}-${slugifyFilename(cycle.label)}`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${base}.xlsx"`,
    },
  });
}
