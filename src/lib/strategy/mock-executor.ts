import type { StrategyRecommendationCategory } from "@/generated/prisma/client";
import type { FindingsRollupOutput } from "@/lib/audit/types";
import type { RecommendationDraft, StrategyEvidenceContext, StrategyExecutor, StrategySynthesis } from "./types";

function urlsFromPack(pack: FindingsRollupOutput | null, fallback: string[]): string[] {
  const fromOps = pack?.opportunities?.flatMap((o) => o.relatedUrls ?? []) ?? [];
  const fromFindings = pack?.findings?.flatMap((f) => f.urls ?? []) ?? [];
  const merged = [...fromOps, ...fromFindings, ...fallback].filter(Boolean);
  return [...new Set(merged)].slice(0, 8);
}

function rec(
  category: StrategyRecommendationCategory,
  title: string,
  rationale: string,
  instructions: string,
  relatedUrls: string[],
  extra?: Partial<RecommendationDraft>,
): RecommendationDraft {
  return {
    category,
    title,
    rationale,
    instructions,
    relatedUrls,
    targetKeyword: extra?.targetKeyword ?? null,
    priority: extra?.priority ?? 1,
    effort: extra?.effort ?? 3,
    impact: extra?.impact ?? 4,
    evidence: extra?.evidence ?? ["Mock synthesis from the linked audit findings pack."],
  };
}

export function mockStrategySynthesis(ctx: StrategyEvidenceContext): StrategySynthesis {
  const pack = ctx.findingsPack as FindingsRollupOutput | null;
  const fallbackPages = ctx.audit?.selectedPages?.length
    ? ctx.audit.selectedPages
    : ctx.audit?.seedUrl
      ? [ctx.audit.seedUrl]
      : [];
  const pages = urlsFromPack(pack, fallbackPages);
  const page = pages[0] ?? ctx.audit?.seedUrl ?? "(priority URL)";
  const kpiLine = ctx.strategy.kpis.length
    ? ctx.strategy.kpis.map((k) => `${k.metricKey} → ${k.target}`).join("; ")
    : "no KPIs set yet";

  const fromPack: RecommendationDraft[] = (pack?.opportunities ?? []).slice(0, 4).map((op, idx) =>
    rec(
      op.category,
      op.title,
      op.detail,
      [
        `1. Confirm the issue on: ${(op.relatedUrls ?? pages).join(", ") || page}.`,
        "2. Apply the smallest reversible fix first (config, copy, or link — not a redesign).",
        "3. Recheck the original evidence (GSC/GA4/crawl) after the change.",
        "4. Mark the cycle item done only when the acceptance signal moves.",
      ].join("\n"),
      op.relatedUrls?.length ? op.relatedUrls : pages,
      {
        priority: idx + 1,
        effort: 3,
        impact: 4,
        evidence: op.evidence?.length ? op.evidence : [`Audit opportunity: ${op.title}`],
      },
    ),
  );

  const extras: RecommendationDraft[] = [
    rec(
      "CONTENT",
      `Refresh or create a page that captures demand around ${page}`,
      `Use audit visibility gaps and KPIs (${kpiLine}) to ship a focused content piece rather than more generic posts.`,
      [
        "1. Confirm the primary query and URL from GSC / the audit shortlist.",
        "2. Start this cycle item to open a Content Generator project (brief → draft).",
        "3. Include answer-first H2s and a FAQ that matches question-shaped queries.",
        "4. Internally link from a hub page after publish.",
      ].join("\n"),
      pages,
      {
        priority: fromPack.length + 1,
        effort: 4,
        impact: 5,
        targetKeyword: ctx.client.industry ? `${ctx.client.industry} guide` : null,
        evidence: ["Mock content play derived from visibility/demand + findings roll-up."],
      },
    ),
    rec(
      "TECHNICAL",
      "Clear crawl/indexation blockers before scaling new URLs",
      "Technical debt on existing URLs will waste new content if Google/AI agents cannot fetch or index it cleanly.",
      [
        "1. Export this cycle’s Excel work package and work the Technical sheet top-down.",
        "2. Fix status/canonical/noindex issues on listed URLs.",
        "3. Request indexing (or recrawl) for corrected URLs.",
        "4. Re-run or spot-check coverage in Search Console.",
      ].join("\n"),
      pages,
      { priority: fromPack.length + 2, effort: 3, impact: 5 },
    ),
    rec(
      "MEASUREMENT",
      "Instrument KPI baselines so cycle progress is visible",
      "Without current values, the strategy dashboard cannot show movement against the catalog KPIs.",
      [
        "1. Sync Google data on the source audit (or enter current values on each KPI card).",
        "2. Confirm billing day so cycles map to invoice periods.",
        "3. Review dashboard after each cycle close.",
      ].join("\n"),
      [],
      { priority: fromPack.length + 3, effort: 2, impact: 3 },
    ),
  ];

  const recommendations = [...fromPack, ...extras]
    .slice(0, 8)
    .map((item, idx) => ({ ...item, priority: idx + 1 }));

  return {
    summary: pack?.summary
      ? `Mock strategy from audit findings: ${pack.summary} Prioritized against KPIs (${kpiLine}).`
      : `Mock strategy for ${ctx.client.name}. Prioritized against KPIs (${kpiLine}). Link a completed audit for richer plays.`,
    recommendations,
  };
}

export function getStrategyMockExecutor(): StrategyExecutor {
  return {
    async execute(ctx) {
      return mockStrategySynthesis(ctx);
    },
  };
}
