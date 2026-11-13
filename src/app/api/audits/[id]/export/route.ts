import { NextResponse } from "next/server";
import {
  buildAuditReportRows,
  reportRowsToCsv,
  reportRowsToXlsxBuffer,
  slugifyFilename,
} from "@/lib/audit/export-report";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const format = new URL(request.url).searchParams.get("format")?.toLowerCase() ?? "csv";

  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json({ error: "format must be csv or xlsx." }, { status: 400 });
  }

  const audit = await prisma.audit.findUnique({
    where: { id },
    include: {
      artifacts: {
        where: { status: { in: ["APPROVED", "AWAITING_REVIEW"] } },
        orderBy: [{ step: "asc" }, { version: "desc" }],
      },
    },
  });

  if (!audit) {
    return NextResponse.json({ error: "Audit not found." }, { status: 404 });
  }

  const rows = buildAuditReportRows(audit.artifacts);
  if (!rows.length) {
    return NextResponse.json(
      { error: "No findings to export yet. Run and review audit stages first." },
      { status: 400 },
    );
  }

  const base = `${slugifyFilename(audit.name)}-findings`;

  if (format === "xlsx") {
    const buffer = await reportRowsToXlsxBuffer(rows);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  const csv = reportRowsToCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${base}.csv"`,
    },
  });
}
