"use client";

import Link from "next/link";
import type { Cycle, CycleItem, StrategyRecommendation } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CATEGORY_LABELS } from "@/lib/strategy/types";

type Rec = StrategyRecommendation;
type Item = CycleItem & {
  recommendation: Rec;
  contentProject: { id: string; topic: string; status: string } | null;
};
type CycleRow = Cycle & { items: Item[] };

function statusLabel(value: string) {
  return value.replace(/_/g, " ").toLowerCase();
}

function windowLabel(cycle: CycleRow) {
  const start = cycle.startDate.toString().slice(0, 10);
  const end = cycle.endDate.toString().slice(0, 10);
  return `${start} → ${end}`;
}

export function WorkLanes({
  billingDay,
  strategyId,
  backlog,
  thisMonth,
  nextMonth,
  history,
  busy,
  onCall,
}: {
  billingDay: number | null;
  strategyId: string;
  backlog: Rec[];
  thisMonth: CycleRow | null;
  nextMonth: CycleRow | null;
  history: CycleRow[];
  busy: string | null;
  onCall: (label: string, url: string, init?: RequestInit) => Promise<unknown>;
}) {
  function assign(cycleId: string, recommendationId: string) {
    return onCall(`assign-${recommendationId}`, `/api/strategies/${strategyId}/cycles/${cycleId}/assign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recommendationIds: [recommendationId] }),
    });
  }

  function move(recommendationId: string, direction: "up" | "down") {
    return onCall(`priority-${recommendationId}`, `/api/strategies/${strategyId}/recommendations`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: recommendationId, direction }),
    });
  }

  return (
    <div className="space-y-8">
      {!billingDay && (
        <Card>
          <p className="text-sm text-foreground/70">
            Set a billing day on the Overview tab. This month and next month are created from that day.
          </p>
        </Card>
      )}

      <MonthLane
        title="This month"
        hint="Work you are executing now."
        cycle={thisMonth}
        strategyId={strategyId}
        busy={busy}
        allowStart
        onCall={onCall}
      />
      <MonthLane
        title="Next month"
        hint="Lined up. It becomes this month when the billing window rolls."
        cycle={nextMonth}
        strategyId={strategyId}
        busy={busy}
        allowStart={false}
        onCall={onCall}
      />

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Backlog</h3>
          <p className="text-sm text-foreground/65">
            Approved plays, most important first. Add them to this month or next month.
          </p>
        </div>
        {backlog.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground/70">
              Approve proposed recommendations to fill the backlog.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {backlog.map((rec, index) => (
              <li key={rec.id}>
                <Card className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{rec.title}</p>
                    <Badge className="bg-gold/10 text-gold">{CATEGORY_LABELS[rec.category]}</Badge>
                    <span className="text-xs text-foreground/55">
                      Priority {index + 1} · effort {rec.effort}/5 · impact {rec.impact}/5
                    </span>
                  </div>
                  <p className="text-sm text-foreground/70">{rec.rationale}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!!busy || index === 0}
                      onClick={() => move(rec.id, "up")}
                    >
                      Higher
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!!busy || index === backlog.length - 1}
                      onClick={() => move(rec.id, "down")}
                    >
                      Lower
                    </Button>
                    <Button
                      type="button"
                      disabled={!!busy || !thisMonth}
                      onClick={() => thisMonth && assign(thisMonth.id, rec.id)}
                    >
                      Add to this month
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!!busy || !nextMonth}
                      onClick={() => nextMonth && assign(nextMonth.id, rec.id)}
                    >
                      Add to next month
                    </Button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Past</h3>
            <p className="text-sm text-foreground/65">Work from earlier months.</p>
          </div>
          {history.map((cycle) => (
            <MonthLane
              key={cycle.id}
              title={cycle.label}
              hint="Completed or left over from an earlier window."
              cycle={cycle}
              strategyId={strategyId}
              busy={busy}
              allowStart={false}
              onCall={onCall}
            />
          ))}
        </section>
      ) : (
        <section className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight">Past</h3>
          <Card>
            <p className="text-sm text-foreground/70">Nothing from earlier months yet.</p>
          </Card>
        </section>
      )}
    </div>
  );
}

function MonthLane({
  title,
  hint,
  cycle,
  strategyId,
  busy,
  allowStart,
  onCall,
}: {
  title: string;
  hint: string;
  cycle: CycleRow | null;
  strategyId: string;
  busy: string | null;
  allowStart: boolean;
  onCall: (label: string, url: string, init?: RequestInit) => Promise<unknown>;
}) {
  const done = cycle?.items.filter((item) => item.executionStatus === "DONE").length ?? 0;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {title}
            {cycle && title !== cycle.label ? ` · ${cycle.label}` : ""}
          </h3>
          <p className="text-sm text-foreground/65">
            {cycle ? `${hint} ${windowLabel(cycle)}.` : hint}
          </p>
        </div>
        {cycle && allowStart && (
          <a
            className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
            href={`/api/strategies/${strategyId}/cycles/${cycle.id}/export`}
          >
            Download tech package
          </a>
        )}
      </div>
      {!cycle ? (
        <Card>
          <p className="text-sm text-foreground/70">This window appears after you set a billing day.</p>
        </Card>
      ) : cycle.items.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/70">Nothing scheduled. Add plays from the backlog.</p>
        </Card>
      ) : (
        <Card className="space-y-2">
          <p className="text-xs text-foreground/55">
            {done}/{cycle.items.length} done
          </p>
          <ul className="space-y-2">
            {cycle.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-line p-3 text-sm space-y-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{item.recommendation.title}</span>
                      <Badge className={item.workKind === "CONTENT" ? "bg-gold/15 text-gold" : "bg-teal/15 text-teal"}>
                        {item.workKind === "CONTENT" ? "Content" : "Tech"}
                      </Badge>
                      <Badge>{statusLabel(item.executionStatus)}</Badge>
                    </div>
                    {item.contentProject && (
                      <Link href={`/projects/${item.contentProject.id}`} className="text-xs hover:underline text-foreground/70">
                        Open content: {item.contentProject.topic}
                      </Link>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {allowStart && (
                      <select
                        className="rounded-lg border border-line bg-background px-2 py-1 text-xs"
                        value={item.executionStatus}
                        onChange={(e) =>
                          onCall(`status-${item.id}`, `/api/strategies/${strategyId}/cycles/${cycle.id}/items/${item.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ executionStatus: e.target.value }),
                          })
                        }
                      >
                        <option value="PLANNED">Planned</option>
                        <option value="IN_PROGRESS">In progress</option>
                        <option value="DONE">Done</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
                    )}
                    {allowStart && item.workKind === "CONTENT" && !item.contentProject && (
                      <Button
                        type="button"
                        disabled={!!busy}
                        onClick={() =>
                          onCall(`start-${item.id}`, `/api/strategies/${strategyId}/cycles/${cycle.id}/start`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ cycleItemIds: [item.id] }),
                          })
                        }
                      >
                        Start content
                      </Button>
                    )}
                    {allowStart && item.workKind === "TECH" && item.executionStatus === "PLANNED" && (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={!!busy}
                        onClick={() =>
                          onCall(`start-${item.id}`, `/api/strategies/${strategyId}/cycles/${cycle.id}/start`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ cycleItemIds: [item.id] }),
                          })
                        }
                      >
                        Mark in progress
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!!busy}
                      onClick={() =>
                        onCall(`unassign-${item.id}`, `/api/strategies/${strategyId}/cycles/${cycle.id}/unassign`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ cycleItemId: item.id }),
                        })
                      }
                    >
                      Back to backlog
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}
