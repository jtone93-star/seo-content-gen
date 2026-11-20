"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type {
  Cycle,
  CycleItem,
  Strategy,
  StrategyKpi,
  StrategyRecommendation,
} from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CreateStrategyForm } from "@/components/strategy/create-strategy-form";
import { WorkLanes } from "@/components/strategy/work-lanes";
import { CATEGORY_LABELS } from "@/lib/strategy/types";
import { partitionCycles } from "@/lib/strategy/cycles";

type Rec = StrategyRecommendation;
type Item = CycleItem & {
  recommendation: Rec;
  contentProject: { id: string; topic: string; status: string } | null;
};
type CycleRow = Cycle & { items: Item[] };
export type HubStrategy = Strategy & {
  kpis: StrategyKpi[];
  recommendations: Rec[];
  cycles: CycleRow[];
  sourceAudit: { id: string; name: string; status: string } | null;
};

function statusLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

export function StrategyPanel({
  clientId,
  billingDay,
  audits,
  living,
  past,
}: {
  clientId: string;
  billingDay: number | null;
  audits: Array<{ id: string; name: string; status: string }>;
  living: HubStrategy | null;
  past: HubStrategy[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedProposed, setSelectedProposed] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(!living);

  const proposed = living?.recommendations.filter((r) => r.status === "PROPOSED") ?? [];
  const backlog = (living?.recommendations.filter((r) => r.status === "BACKLOG") ?? []).slice().sort(
    (a, b) => a.priority - b.priority || a.createdAt.toString().localeCompare(b.createdAt.toString()),
  );
  const lanes = partitionCycles(living?.cycles ?? [], billingDay);

  async function call(label: string, url: string, init?: RequestInit) {
    setBusy(label);
    setError(null);
    const res = await fetch(url, init);
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Something went wrong.");
      return null;
    }
    router.refresh();
    return data;
  }

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!living && (
        <CreateStrategyForm clientId={clientId} audits={audits} />
      )}

      {living && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-semibold tracking-tight">{living.name}</h2>
                <Badge>{statusLabel(living.status)}</Badge>
              </div>
              <p className="text-sm text-foreground/65 mt-1">
                {living.sourceAudit
                  ? `Evidence: ${living.sourceAudit.name}`
                  : "No audit linked yet — generate will use the latest completed audit."}
              </p>
              {living.synthesis && (
                <p className="text-sm text-foreground/75 mt-2 max-w-3xl">{living.synthesis}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!!busy}
                onClick={() => call("analyze", `/api/strategies/${living.id}/analyze`, { method: "POST" })}
              >
                {busy === "analyze" ? "Generating…" : "Generate recommendations"}
              </Button>
              <a
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
                href={`/api/strategies/${living.id}/export`}
              >
                Export Excel
              </a>
              <Button type="button" variant="secondary" onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? "Hide new strategy" : "New strategy"}
              </Button>
            </div>
          </div>

          {living.errorMessage && (
            <p className="text-sm text-red-600">{living.errorMessage}</p>
          )}

          {showCreate && <CreateStrategyForm clientId={clientId} audits={audits} />}

          {proposed.length > 0 && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-medium">Proposed recommendations</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!!busy || !proposed.length}
                  onClick={() =>
                    call("approve-all", `/api/strategies/${living.id}/recommendations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "approve" }),
                    })
                  }
                >
                  Approve all
                </Button>
                <Button
                  type="button"
                  disabled={!!busy || !selectedProposed.length}
                  onClick={() =>
                    call("approve", `/api/strategies/${living.id}/recommendations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "approve", ids: selectedProposed }),
                    }).then(() => setSelectedProposed([]))
                  }
                >
                  Approve selected
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!!busy || !selectedProposed.length}
                  onClick={() =>
                    call("reject", `/api/strategies/${living.id}/recommendations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ action: "reject", ids: selectedProposed }),
                    }).then(() => setSelectedProposed([]))
                  }
                >
                  Reject selected
                </Button>
              </div>
            </div>
            {proposed.length === 0 ? (
              <Card>
                <p className="text-sm text-foreground/70">
                  Generate recommendations from the linked audit, then approve the ones that belong in the backlog.
                </p>
              </Card>
            ) : (
              <ul className="space-y-2">
                {proposed.map((rec) => (
                  <li key={rec.id}>
                    <RecCard
                      rec={rec}
                      checked={selectedProposed.includes(rec.id)}
                      onCheck={(on) =>
                        setSelectedProposed((ids) =>
                          on ? [...ids, rec.id] : ids.filter((id) => id !== rec.id),
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          <WorkLanes
            billingDay={billingDay}
            strategyId={living.id}
            backlog={backlog}
            thisMonth={lanes.thisMonth}
            nextMonth={lanes.nextMonth}
            history={lanes.history}
            busy={busy}
            onCall={call}
          />
        </>
      )}

      {past.length > 0 && (
        <details className="rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">Archived strategies</summary>
          <ul className="mt-3 space-y-2">
            {past.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-foreground/60">
                      {s.archivedAt ? new Date(s.archivedAt).toLocaleDateString() : ""} ·{" "}
                      {s.recommendations.length} recs · {s.cycles.length} cycles
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={!!busy}
                    onClick={() => call("restore", `/api/strategies/${s.id}/restore`, { method: "POST" })}
                  >
                    Restore as living
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function RecCard({
  rec,
  checked,
  onCheck,
}: {
  rec: Rec;
  checked: boolean;
  onCheck: (on: boolean) => void;
}) {
  return (
    <Card className="space-y-2">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{rec.title}</p>
            <Badge className="bg-gold/10 text-gold">{CATEGORY_LABELS[rec.category]}</Badge>
            <span className="text-xs text-foreground/55">
              P{rec.priority} · effort {rec.effort}/5 · impact {rec.impact}/5
            </span>
          </div>
          <p className="text-sm text-foreground/70 mt-1">{rec.rationale}</p>
          {rec.relatedUrls.length > 0 && (
            <p className="text-xs text-foreground/55 mt-1 truncate">{rec.relatedUrls.join(" · ")}</p>
          )}
          <pre className="mt-2 whitespace-pre-wrap text-xs text-foreground/65 font-sans">
            {rec.instructions}
          </pre>
        </div>
      </div>
    </Card>
  );
}

