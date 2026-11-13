"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StrategyKpi } from "@/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { KPI_CATALOG_BY_KEY, isKpiMetricKey, kpiProgressPercent } from "@/lib/strategy/kpi-catalog";

function formatNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
}

export function KpiDashboard({
  strategyId,
  kpis,
}: {
  strategyId: string;
  kpis: StrategyKpi[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});

  async function sync() {
    setBusy(true);
    await fetch(`/api/strategies/${strategyId}/kpis/sync`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function saveCurrent(kpi: StrategyKpi) {
    const raw = editing[kpi.id];
    if (raw == null || raw === "") return;
    setBusy(true);
    await fetch(`/api/strategies/${strategyId}/kpis/${kpi.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentValue: Number(raw) }),
    });
    setBusy(false);
    setEditing((e) => {
      const next = { ...e };
      delete next[kpi.id];
      return next;
    });
    router.refresh();
  }

  if (!kpis.length) {
    return (
      <Card>
        <p className="text-sm text-foreground/70">
          No KPIs yet. Add catalog metrics when you create or edit this strategy.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-medium">Goals</h3>
        <Button type="button" variant="secondary" disabled={busy} onClick={sync}>
          {busy ? "Syncing…" : "Sync from audit / app"}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((kpi) => {
          const meta = isKpiMetricKey(kpi.metricKey) ? KPI_CATALOG_BY_KEY[kpi.metricKey] : null;
          const pct = kpiProgressPercent(
            kpi.baseline,
            kpi.currentValue,
            kpi.target,
            meta?.invert ?? false,
          );
          const bar = "bg-gold";
          return (
            <Card key={kpi.id} className="space-y-3">
              <p className="text-sm text-muted">{meta?.label ?? kpi.metricKey}</p>
              <p className="text-4xl font-semibold tracking-tight tabular-nums whitespace-nowrap">
                {formatNumber(kpi.currentValue)}
                <span className="ml-2 text-sm font-medium text-muted">
                  of {formatNumber(kpi.target)}
                </span>
              </p>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
                  <div className={`h-full ${bar}`} style={{ width: `${pct ?? 0}%` }} />
                </div>
                {pct != null && (
                  <span className="text-sm font-medium text-gold tabular-nums">{Math.round(pct)}%</span>
                )}
              </div>
              <p className="text-xs text-muted">
                Baseline {formatNumber(kpi.baseline)}
                {meta?.unit ? ` · ${meta.unit}` : ""}
                {meta?.invert ? " · lower is better" : ""}
              </p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="any"
                  placeholder="Current"
                  value={editing[kpi.id] ?? ""}
                  onChange={(e) => setEditing((s) => ({ ...s, [kpi.id]: e.target.value }))}
                />
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || editing[kpi.id] == null || editing[kpi.id] === ""}
                  onClick={() => saveCurrent(kpi)}
                >
                  Set
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
