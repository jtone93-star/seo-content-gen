import ExcelJS from "exceljs";
import type { Cycle, Strategy, StrategyRecommendation } from "@/generated/prisma/client";
import { CATEGORY_LABELS } from "./types";

export type WorkPackageRow = {
  cycle: string;
  window: string;
  category: string;
  workKind: string;
  title: string;
  rationale: string;
  instructions: string;
  urls: string;
  keyword: string;
  priority: number;
  effort: number;
  impact: number;
  evidence: string;
  status: string;
};

function joinEvidence(value: unknown): string {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean).join("; ");
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    if (Array.isArray(rec.citations)) return rec.citations.map(String).join("; ");
  }
  return value ? String(value) : "";
}

export function rowsFromRecommendations(
  strategy: Pick<Strategy, "name">,
  recs: StrategyRecommendation[],
  cycle?: Pick<Cycle, "label" | "startDate" | "endDate"> | null,
): WorkPackageRow[] {
  const window = cycle
    ? `${cycle.startDate.toISOString().slice(0, 10)} → ${cycle.endDate.toISOString().slice(0, 10)}`
    : "";
  return recs.map((rec) => ({
    cycle: cycle?.label ?? "Unscheduled",
    window,
    category: CATEGORY_LABELS[rec.category],
    workKind: rec.category === "CONTENT" ? "Content" : "Tech",
    title: rec.title,
    rationale: rec.rationale,
    instructions: rec.instructions,
    urls: rec.relatedUrls.join("; "),
    keyword: rec.targetKeyword ?? "",
    priority: rec.priority,
    effort: rec.effort,
    impact: rec.impact,
    evidence: joinEvidence(rec.evidence),
    status: rec.status,
  }));
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { wrapText: true, vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

function addRecSheet(workbook: ExcelJS.Workbook, name: string, rows: WorkPackageRow[]) {
  const sheet = workbook.addWorksheet(name);
  sheet.columns = [
    { header: "Cycle", key: "cycle", width: 18 },
    { header: "Window", key: "window", width: 24 },
    { header: "Category", key: "category", width: 18 },
    { header: "Kind", key: "workKind", width: 12 },
    { header: "Title", key: "title", width: 40 },
    { header: "Why", key: "rationale", width: 50 },
    { header: "How to fix", key: "instructions", width: 60 },
    { header: "URLs", key: "urls", width: 40 },
    { header: "Keyword", key: "keyword", width: 24 },
    { header: "Priority", key: "priority", width: 10 },
    { header: "Effort (1-5)", key: "effort", width: 12 },
    { header: "Impact (1-5)", key: "impact", width: 12 },
    { header: "Evidence", key: "evidence", width: 40 },
    { header: "Status", key: "status", width: 14 },
  ];
  for (const row of rows) sheet.addRow(row);
  sheet.eachRow((r) => {
    r.alignment = { wrapText: true, vertical: "top" };
  });
  styleHeader(sheet);
}

export async function workPackageToXlsxBuffer(params: {
  strategyName: string;
  cycleLabel?: string;
  rows: WorkPackageRow[];
}): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SEO Turtle Tool";
  workbook.created = new Date();

  const intro = workbook.addWorksheet("How to execute");
  intro.columns = [{ header: "Instructions", key: "text", width: 100 }];
  intro.addRow({
    text: `Work package for ${params.strategyName}${params.cycleLabel ? ` · ${params.cycleLabel}` : ""}.`,
  });
  intro.addRow({ text: "" });
  intro.addRow({
    text: "This workbook is the v1 tech/content deliverable. A human executes the work; the app does not deploy changes to the site.",
  });
  intro.addRow({
    text: "Content rows: start the cycle item in the app to open a Content Generator project, or write from the Content sheet.",
  });
  intro.addRow({
    text: "Tech rows: follow How to fix in order. Confirm URLs, apply the smallest reversible change, then re-check GSC/GA4/crawl evidence.",
  });
  intro.addRow({
    text: "Mark the cycle item Done in the app when the acceptance signal is met so KPIs (content shipped / tech closed) update.",
  });
  styleHeader(intro);

  addRecSheet(workbook, "All recommendations", params.rows);
  addRecSheet(
    workbook,
    "Tech fixes",
    params.rows.filter((row) => row.workKind === "Tech"),
  );
  addRecSheet(
    workbook,
    "Content briefs",
    params.rows.filter((row) => row.workKind === "Content"),
  );

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function slugifyFilename(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "strategy-work-package"
  );
}
