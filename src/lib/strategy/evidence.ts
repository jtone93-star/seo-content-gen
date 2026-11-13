import type { AuditArtifact, AuditDataSource } from "@/generated/prisma/client";
import type { FindingsRollupOutput } from "@/lib/audit/types";
import type { Ga4LandingPageSummary } from "@/lib/google/analytics";
import type { GscPerformanceSummary } from "@/lib/google/search-console";
import type { StrategyEvidenceContext } from "./types";

const MAX_CHARS = 36_000;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function latestFindingsPack(artifacts: AuditArtifact[]): FindingsRollupOutput | null {
  const rollup = artifacts
    .filter((a) => a.step === "FINDINGS_ROLLUP" && (a.status === "APPROVED" || a.status === "AWAITING_REVIEW"))
    .sort((a, b) => b.version - a.version)[0];
  const output = rollup?.output as FindingsRollupOutput | null;
  return output ?? null;
}

export function summarizeDataSources(sources: AuditDataSource[]): unknown {
  return sources.map((source) => {
    const summary = asRecord(source.summary) ?? source.summary;
    if (source.type === "GA4") {
      const ga4 = summary as unknown as Ga4LandingPageSummary;
      return {
        type: source.type,
        label: source.label,
        dateRange: ga4.dateRange,
        topLandingPages: (ga4.topLandingPages ?? []).slice(0, 15),
      };
    }
    if (source.type === "GSC") {
      const gsc = summary as unknown as GscPerformanceSummary;
      return {
        type: source.type,
        label: source.label,
        dateRange: gsc.dateRange,
        topQueries: (gsc.topQueries ?? []).slice(0, 15),
        topPages: (gsc.topPages ?? []).slice(0, 15),
      };
    }
    return { type: source.type, label: source.label, summary };
  });
}

export function compactEvidence(ctx: StrategyEvidenceContext): string {
  const payload = {
    client: {
      name: ctx.client.name,
      industry: ctx.client.industry,
      audience: ctx.client.audience,
      seoNotes: ctx.client.seoNotes,
    },
    strategy: {
      name: ctx.strategy.name,
      notes: ctx.strategy.notes,
      kpis: ctx.strategy.kpis.map((k) => ({
        metricKey: k.metricKey,
        baseline: k.baseline,
        target: k.target,
        currentValue: k.currentValue,
      })),
    },
    audit: ctx.audit
      ? {
          name: ctx.audit.name,
          seedUrl: ctx.audit.seedUrl,
          status: ctx.audit.status,
          selectedPages: ctx.audit.selectedPages,
          dataSources: summarizeDataSources(ctx.audit.dataSources),
        }
      : null,
    findingsPack: ctx.findingsPack,
  };
  const json = JSON.stringify(payload, null, 2);
  if (json.length <= MAX_CHARS) return json;
  return `${json.slice(0, MAX_CHARS)}\n…[truncated]`;
}
