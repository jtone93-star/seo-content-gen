import type { AuditDataSource, CycleItemWorkKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import type { Ga4LandingPageSummary } from "@/lib/google/analytics";
import type { GscPerformanceSummary } from "@/lib/google/search-console";
import { isKpiMetricKey, type KpiMetricKey } from "./kpi-catalog";

function asGa4(summary: unknown): Ga4LandingPageSummary | null {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as Ga4LandingPageSummary;
  return Array.isArray(s.topLandingPages) ? s : null;
}

function asGsc(summary: unknown): GscPerformanceSummary | null {
  if (!summary || typeof summary !== "object") return null;
  const s = summary as GscPerformanceSummary;
  return Array.isArray(s.topQueries) || Array.isArray(s.topPages) ? s : null;
}

function fromSources(sources: AuditDataSource[], key: KpiMetricKey): number | null {
  const ga4 = sources.find((s) => s.type === "GA4");
  const gsc = sources.find((s) => s.type === "GSC");
  if (key === "ORGANIC_SESSIONS") {
    const summary = asGa4(ga4?.summary);
    if (!summary) return null;
    const total = summary.topLandingPages.reduce((sum, row) => sum + (row.sessions ?? 0), 0);
    return total;
  }
  if (key === "GSC_CLICKS") {
    const summary = asGsc(gsc?.summary);
    if (!summary) return null;
    const rows = summary.topPages?.length ? summary.topPages : summary.topQueries ?? [];
    return rows.reduce((sum, row) => sum + (row.clicks ?? 0), 0);
  }
  if (key === "GSC_IMPRESSIONS") {
    const summary = asGsc(gsc?.summary);
    if (!summary) return null;
    const rows = summary.topPages?.length ? summary.topPages : summary.topQueries ?? [];
    return rows.reduce((sum, row) => sum + (row.impressions ?? 0), 0);
  }
  if (key === "AVG_POSITION") {
    const summary = asGsc(gsc?.summary);
    const rows = summary?.topQueries ?? [];
    if (!rows.length) return null;
    const weighted = rows.reduce(
      (acc, row) => {
        const weight = row.impressions || 1;
        return { pos: acc.pos + (row.position ?? 0) * weight, weight: acc.weight + weight };
      },
      { pos: 0, weight: 0 },
    );
    if (!weighted.weight) return null;
    return Math.round((weighted.pos / weighted.weight) * 10) / 10;
  }
  return null;
}

async function appCounts(strategyId: string, kind: CycleItemWorkKind): Promise<number> {
  return prisma.cycleItem.count({
    where: {
      workKind: kind,
      executionStatus: "DONE",
      cycle: { strategyId },
    },
  });
}

export async function syncStrategyKpis(strategyId: string): Promise<void> {
  const strategy = await prisma.strategy.findUnique({
    where: { id: strategyId },
    include: {
      kpis: true,
      sourceAudit: { include: { dataSources: true } },
    },
  });
  if (!strategy) return;

  let sources = strategy.sourceAudit?.dataSources ?? [];
  if (!sources.length) {
    const latest = await prisma.audit.findFirst({
      where: { clientProfileId: strategy.clientProfileId, status: "COMPLETED" },
      orderBy: { updatedAt: "desc" },
      include: { dataSources: true },
    });
    sources = latest?.dataSources ?? [];
  }

  const now = new Date();
  for (const kpi of strategy.kpis) {
    if (!isKpiMetricKey(kpi.metricKey)) continue;
    let value: number | null = null;
    if (kpi.metricKey === "CONTENT_SHIPPED") value = await appCounts(strategyId, "CONTENT");
    else if (kpi.metricKey === "TECH_ITEMS_CLOSED") value = await appCounts(strategyId, "TECH");
    else value = fromSources(sources, kpi.metricKey);

    if (value == null) continue;
    await prisma.strategyKpi.update({
      where: { id: kpi.id },
      data: { currentValue: value, lastSyncedAt: now },
    });
  }
}
