"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { KPI_CATALOG } from "@/lib/strategy/kpi-catalog";

type AuditOption = { id: string; name: string; status: string };

const DEFAULT_KEYS = new Set(["ORGANIC_SESSIONS", "GSC_CLICKS", "CONTENT_SHIPPED"]);

export function CreateStrategyForm({
  clientId,
  audits,
}: {
  clientId: string;
  audits: AuditOption[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(KPI_CATALOG.map((k) => [k.key, DEFAULT_KEYS.has(k.key)])),
  );
  const completedAudits = useMemo(
    () => audits.filter((a) => a.status === "COMPLETED" || a.status === "PAUSED_FOR_REVIEW"),
    [audits],
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const kpis = KPI_CATALOG.filter((k) => selected[k.key]).map((k) => ({
      metricKey: k.key,
      baseline: fd.get(`${k.key}-baseline`) ? Number(fd.get(`${k.key}-baseline`)) : null,
      target: Number(fd.get(`${k.key}-target`)),
    }));
    if (kpis.some((k) => !Number.isFinite(k.target))) {
      setLoading(false);
      setError("Each selected KPI needs a numeric target.");
      return;
    }

    const res = await fetch("/api/strategies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientProfileId: clientId,
        name: fd.get("name"),
        sourceAuditId: String(fd.get("sourceAuditId") || "") || null,
        notes: fd.get("notes") || null,
        kpis,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create strategy.");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <h3 className="font-medium">Start the living strategy</h3>
          <p className="text-sm text-foreground/65 mt-1">
            Creating a new living strategy automatically moves the current one to Past Strategies.
          </p>
        </div>
        <div>
          <Label htmlFor="strategy-name">Strategy name *</Label>
          <Input id="strategy-name" name="name" required placeholder="H2 2026 growth plan" />
        </div>
        <div>
          <Label htmlFor="sourceAuditId">Source audit</Label>
          <select
            id="sourceAuditId"
            name="sourceAuditId"
            className="w-full rounded-lg border border-line bg-background px-3 py-2 text-sm"
            defaultValue={completedAudits[0]?.id ?? ""}
          >
            <option value="">Latest completed audit (automatic)</option>
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.status.replace(/_/g, " ").toLowerCase()})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="strategy-notes">Notes</Label>
          <Textarea id="strategy-notes" name="notes" rows={2} placeholder="Positioning, constraints, seasonality…" />
        </div>
        <div className="space-y-3">
          <p className="text-sm font-medium">KPIs (fixed catalog)</p>
          {KPI_CATALOG.map((kpi) => (
            <div key={kpi.key} className="rounded-lg border border-line p-3 space-y-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={!!selected[kpi.key]}
                  onChange={(e) => setSelected((s) => ({ ...s, [kpi.key]: e.target.checked }))}
                />
                <span>
                  <span className="font-medium">{kpi.label}</span>
                  <span className="text-foreground/55"> · {kpi.unit} · {kpi.source}</span>
                  <span className="block text-foreground/55">{kpi.description}</span>
                </span>
              </label>
              {selected[kpi.key] && (
                <div className="grid gap-2 sm:grid-cols-2 pl-6">
                  <div>
                    <Label htmlFor={`${kpi.key}-baseline`}>Baseline</Label>
                    <Input id={`${kpi.key}-baseline`} name={`${kpi.key}-baseline`} type="number" step="any" />
                  </div>
                  <div>
                    <Label htmlFor={`${kpi.key}-target`}>Target *</Label>
                    <Input id={`${kpi.key}-target`} name={`${kpi.key}-target`} type="number" step="any" required />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create living strategy"}
        </Button>
      </form>
    </Card>
  );
}
