import ExcelJS from "exceljs";
import type { AuditArtifact, AuditStep } from "@/generated/prisma/client";
import { AUDIT_STEP_LABELS } from "./types";

export type AuditReportRow = {
  stage: string;
  stageKey: AuditStep | string;
  kind: string;
  severity: string;
  title: string;
  detail: string;
  urls: string;
  evidence: string;
  queries: string;
};

function joinList(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => String(item).trim()).filter(Boolean).join("; ");
}

function pushFindingRows(
  rows: AuditReportRow[],
  step: AuditStep,
  findings: unknown[],
) {
  for (const raw of findings) {
    if (!raw || typeof raw !== "object") continue;
    const f = raw as Record<string, unknown>;
    rows.push({
      stage: AUDIT_STEP_LABELS[step] ?? step,
      stageKey: step,
      kind: "finding",
      severity: String(f.severity ?? ""),
      title: String(f.title ?? ""),
      detail: String(f.detail ?? ""),
      urls: joinList(f.urls),
      evidence: joinList(f.evidence),
      queries: "",
    });
  }
}

export function buildAuditReportRows(artifacts: AuditArtifact[]): AuditReportRow[] {
  const latestByStep = new Map<AuditStep, AuditArtifact>();
  for (const artifact of artifacts) {
    if (artifact.status === "SUPERSEDED" || artifact.status === "REJECTED") continue;
    const existing = latestByStep.get(artifact.step);
    if (!existing || artifact.version > existing.version) {
      latestByStep.set(artifact.step, artifact);
    }
  }

  const rows: AuditReportRow[] = [];

  for (const [step, artifact] of latestByStep) {
    const output = artifact.output as Record<string, unknown> | null;
    if (!output || typeof output !== "object") continue;

    if (Array.isArray(output.findings)) {
      pushFindingRows(rows, step, output.findings);
    }

    if (Array.isArray(output.opportunityPages)) {
      for (const raw of output.opportunityPages) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        rows.push({
          stage: AUDIT_STEP_LABELS[step],
          stageKey: step,
          kind: "opportunity_page",
          severity: "",
          title: String(item.url ?? "Opportunity page"),
          detail: String(item.rationale ?? ""),
          urls: String(item.url ?? ""),
          evidence: joinList(item.signals),
          queries: "",
        });
      }
    }

    if (Array.isArray(output.nominatedPages)) {
      for (const raw of output.nominatedPages) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        rows.push({
          stage: AUDIT_STEP_LABELS[step],
          stageKey: step,
          kind: "nominated_page",
          severity: typeof item.priority === "number" ? `P${item.priority}` : "",
          title: String(item.url ?? "Nominated page"),
          detail: String(item.rationale ?? ""),
          urls: String(item.url ?? ""),
          evidence: "",
          queries: "",
        });
      }
    }

    if (Array.isArray(output.pages)) {
      for (const raw of output.pages) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        const weaknesses = joinList(item.weaknesses);
        const strengths = joinList(item.strengths);
        rows.push({
          stage: AUDIT_STEP_LABELS[step],
          stageKey: step,
          kind: "page_review",
          severity: "",
          title: String(item.url ?? "Page review"),
          detail: [weaknesses && `Issues: ${weaknesses}`, strengths && `Strengths: ${strengths}`, item.notes]
            .filter(Boolean)
            .join(" | "),
          urls: String(item.url ?? ""),
          evidence: "",
          queries: "",
        });
      }
    }

    if (Array.isArray(output.mismatches)) {
      for (const raw of output.mismatches) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        rows.push({
          stage: AUDIT_STEP_LABELS[step],
          stageKey: step,
          kind: "keyword_mismatch",
          severity: "",
          title: String(item.url ?? "Keyword mismatch"),
          detail: String(item.issue ?? ""),
          urls: String(item.url ?? ""),
          evidence: "",
          queries: joinList(item.queries),
        });
      }
    }

    if (Array.isArray(output.opportunities)) {
      for (const raw of output.opportunities) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        rows.push({
          stage: AUDIT_STEP_LABELS[step],
          stageKey: step,
          kind: "opportunity",
          severity: String(item.category ?? ""),
          title: String(item.title ?? "Opportunity"),
          detail: String(item.detail ?? ""),
          urls: joinList(item.relatedUrls),
          evidence: joinList(item.evidence),
          queries: "",
        });
      }
    }
  }

  return rows;
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function reportRowsToCsv(rows: AuditReportRow[]): string {
  const headers = [
    "Stage",
    "Kind",
    "Severity",
    "Title",
    "Detail",
    "URLs",
    "Evidence",
    "Queries",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.stage,
        row.kind,
        row.severity,
        row.title,
        row.detail,
        row.urls,
        row.evidence,
        row.queries,
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export async function reportRowsToXlsxBuffer(rows: AuditReportRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SEO Turtle Tool";
  const sheet = workbook.addWorksheet("Audit findings");
  sheet.columns = [
    { header: "Stage", key: "stage", width: 28 },
    { header: "Kind", key: "kind", width: 18 },
    { header: "Severity", key: "severity", width: 14 },
    { header: "Title", key: "title", width: 40 },
    { header: "Detail", key: "detail", width: 60 },
    { header: "URLs", key: "urls", width: 40 },
    { header: "Evidence", key: "evidence", width: 40 },
    { header: "Queries", key: "queries", width: 30 },
  ];
  for (const row of rows) {
    sheet.addRow(row);
  }
  sheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function slugifyFilename(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "audit-report";
}
