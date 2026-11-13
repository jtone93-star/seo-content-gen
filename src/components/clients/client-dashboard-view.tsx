import Link from "next/link";
import type { Cycle, CycleItem, StrategyKpi, StrategyRecommendation } from "@/generated/prisma/client";
import { Card } from "@/components/ui/card";
import { KPI_CATALOG_BY_KEY, isKpiMetricKey, kpiProgressPercent } from "@/lib/strategy/kpi-catalog";
import { partitionCycles } from "@/lib/strategy/cycles";

type Item = CycleItem & { recommendation: Pick<StrategyRecommendation, "title"> };
type CycleRow = Cycle & { items: Item[] };

export type DashboardAudit = {
  name: string;
  updatedAt: string;
  summary: string | null;
  highlights: string[];
};

function plainStatus(status: string) {
  if (status === "IN_PROGRESS") return "In progress";
  if (status === "DONE") return "Done";
  if (status === "BLOCKED") return "Blocked";
  return "Planned";
}

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

export function ClientDashboardView({
  clientId,
  clientName,
  billingDay,
  cycles,
  kpis,
  audit,
}: {
  clientId: string;
  clientName: string;
  billingDay: number | null;
  cycles: CycleRow[];
  kpis: StrategyKpi[];
  audit: DashboardAudit | null;
}) {
  const lanes = partitionCycles(cycles, billingDay);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Your plan</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{clientName}</h1>
          <p className="text-sm text-foreground/65 mt-2">
            Recent results, the latest audit, and what we are doing this month and next.
          </p>
        </div>
        <Link href={`/clients/${clientId}`} className="text-sm font-medium hover:underline">
          Back to client
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Performance</h2>
        {kpis.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground/70">No goals are being tracked yet.</p>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {kpis.map((kpi) => {
              const meta = isKpiMetricKey(kpi.metricKey) ? KPI_CATALOG_BY_KEY[kpi.metricKey] : null;
              const pct = kpiProgressPercent(
                kpi.baseline,
                kpi.currentValue,
                kpi.target,
                meta?.invert ?? false,
              );
              return (
                <Card key={kpi.id}>
                  <p className="text-sm text-muted">{meta?.label ?? kpi.metricKey}</p>
                  <p className="text-3xl font-semibold tracking-tight mt-1 tabular-nums">
                    {formatNumber(kpi.currentValue)}
                    <span className="ml-2 text-sm font-medium text-muted">of {formatNumber(kpi.target)}</span>
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${pct ?? 0}%` }} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Latest audit</h2>
        {!audit ? (
          <Card>
            <p className="text-sm text-foreground/70">No audit yet.</p>
          </Card>
        ) : (
          <Card className="space-y-3">
            <div>
              <p className="font-medium">{audit.name}</p>
              <p className="text-xs text-foreground/55 mt-1">
                Updated {new Date(audit.updatedAt).toLocaleDateString()}
              </p>
            </div>
            {audit.summary ? (
              <p className="text-sm text-foreground/75 leading-relaxed">{audit.summary}</p>
            ) : (
              <p className="text-sm text-foreground/70">The findings summary is not ready yet.</p>
            )}
            {audit.highlights.length > 0 && (
              <ul className="space-y-1 text-sm text-foreground/75">
                {audit.highlights.map((item, index) => (
                  <li key={`${index}-${item}`}>{item}</li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </section>

      <MonthBlock title="This month" cycle={lanes.thisMonth} empty="Nothing scheduled this month yet." />
      <MonthBlock title="Next month" cycle={lanes.nextMonth} empty="Nothing lined up for next month yet." />
    </div>
  );
}

function MonthBlock({
  title,
  cycle,
  empty,
}: {
  title: string;
  cycle: CycleRow | null;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          {title}
          {cycle ? ` · ${cycle.label}` : ""}
        </h2>
      </div>
      {!cycle || cycle.items.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/70">{empty}</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {cycle.items.map((item) => (
            <li key={item.id}>
              <Card className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{item.recommendation.title}</p>
                <p className="text-sm text-foreground/60">
                  {item.workKind === "CONTENT" ? "Content" : "Tech"} · {plainStatus(item.executionStatus)}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
