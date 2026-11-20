"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Audit, ClientProfile, ContentProject } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CONTENT_TYPE_LABELS } from "@/lib/pipeline/types";
import { StrategyPanel, type HubStrategy } from "@/components/strategy/strategy-panel";
import { ClientGoogleCard } from "@/components/clients/client-google-card";
import { ClientInfoButton } from "@/components/clients/client-info-panel";
import { KpiDashboard } from "@/components/strategy/kpi-dashboard";
import { partitionCycles } from "@/lib/strategy/cycles";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "audits", label: "Audits" },
  { id: "strategy", label: "Strategy" },
  { id: "content", label: "Content" },
  { id: "performance", label: "Performance" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTab(value: string | undefined): value is TabId {
  return TABS.some((t) => t.id === value);
}

export function ClientHub({
  client,
  audits,
  projects,
  living,
  past,
  initialTab,
  googleSignInFailed,
}: {
  client: ClientProfile;
  audits: Audit[];
  projects: ContentProject[];
  living: HubStrategy | null;
  past: HubStrategy[];
  initialTab?: string;
  googleSignInFailed?: boolean;
}) {
  const router = useRouter();
  // Default landing is Overview; only honor an explicit valid ?tab=
  const [tab, setTab] = useState<TabId>(() => (isTab(initialTab) ? initialTab : "overview"));
  const [billingDay, setBillingDay] = useState(client.billingDay?.toString() ?? "");
  const [savingDay, setSavingDay] = useState(false);

  function go(next: TabId) {
    setTab(next);
    if (next === "overview") {
      router.replace(`/clients/${client.id}`, { scroll: false });
    } else {
      router.replace(`/clients/${client.id}?tab=${next}`, { scroll: false });
    }
  }

  async function saveBillingDay() {
    setSavingDay(true);
    await fetch(`/api/clients/${client.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: client.name,
        industry: client.industry,
        audience: client.audience,
        tone: client.tone,
        readingLevel: client.readingLevel,
        pointOfView: client.pointOfView,
        wordsToAvoid: client.wordsToAvoid,
        requiredDisclaimers: client.requiredDisclaimers,
        seoNotes: client.seoNotes,
        billingDay: billingDay ? Number(billingDay) : null,
      }),
    });
    setSavingDay(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted">Client hub</p>
          <h1 className="text-3xl font-semibold tracking-tight mt-1">{client.name}</h1>
          <p className="text-sm text-muted mt-1">
            {[client.industry, client.audience, client.tone].filter(Boolean).join(" · ") ||
              "Profile, audits, strategy, and content"}
          </p>
        </div>
        <Link
          href={`/clients/${client.id}/edit`}
          className="text-sm font-medium rounded-lg border border-line px-4 py-2 text-muted hover:border-gold/40 hover:text-foreground transition"
        >
          Edit profile
        </Link>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? "border-gold text-gold"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <OverviewTab
          client={client}
          audits={audits}
          projects={projects}
          living={living}
          billingDay={billingDay}
          setBillingDay={setBillingDay}
          savingDay={savingDay}
          saveBillingDay={saveBillingDay}
          googleSignInFailed={googleSignInFailed}
          onTab={go}
        />
      )}
      {tab === "performance" && <PerformanceTab living={living} onTab={go} />}
      {tab === "audits" && <AuditsTab clientId={client.id} audits={audits} />}
      {tab === "strategy" && (
        <StrategyPanel
          clientId={client.id}
          billingDay={client.billingDay}
          audits={audits.map((a) => ({ id: a.id, name: a.name, status: a.status }))}
          living={living}
          past={past}
        />
      )}
      {tab === "content" && <ContentTab clientId={client.id} projects={projects} />}
    </div>
  );
}

function OverviewTab({
  client,
  audits,
  projects,
  living,
  billingDay,
  setBillingDay,
  savingDay,
  saveBillingDay,
  googleSignInFailed,
  onTab,
}: {
  client: ClientProfile;
  audits: Audit[];
  projects: ContentProject[];
  living: HubStrategy | null;
  billingDay: string;
  setBillingDay: (v: string) => void;
  savingDay: boolean;
  saveBillingDay: () => void;
  googleSignInFailed?: boolean;
  onTab: (tab: TabId) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Link
          href={`/clients/${client.id}/dashboard`}
          className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
        >
          Client dashboard
        </Link>
        <ClientInfoButton client={client} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{audits.length}</p>
          <p className="text-sm text-foreground/60">Audits</p>
        </Card>
        <Card>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{living ? living.recommendations.length : 0}</p>
          <p className="text-sm text-foreground/60">Strategy recs</p>
        </Card>
        <Card>
          <p className="text-4xl font-semibold tracking-tight tabular-nums">{projects.length}</p>
          <p className="text-sm text-foreground/60">Content projects</p>
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-medium">Profile</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {client.industry && (
            <div>
              <dt className="text-foreground/50">Industry</dt>
              <dd>{client.industry}</dd>
            </div>
          )}
          {client.audience && (
            <div>
              <dt className="text-foreground/50">Audience</dt>
              <dd>{client.audience}</dd>
            </div>
          )}
          {client.tone && (
            <div>
              <dt className="text-foreground/50">Tone</dt>
              <dd>{client.tone}</dd>
            </div>
          )}
          {client.seoNotes && (
            <div className="sm:col-span-2">
              <dt className="text-foreground/50">SEO notes</dt>
              <dd>{client.seoNotes}</dd>
            </div>
          )}
        </dl>
        <div className="flex flex-wrap items-end gap-2 pt-2">
          <label className="text-sm">
            <span className="block text-foreground/60 mb-1">Billing day (1–28)</span>
            <Input
              type="number"
              min={1}
              max={28}
              className="w-28"
              value={billingDay}
              onChange={(e) => setBillingDay(e.target.value)}
            />
          </label>
          <Button type="button" variant="secondary" disabled={savingDay} onClick={saveBillingDay}>
            {savingDay ? "Saving…" : "Save billing day"}
          </Button>
        </div>
      </Card>

      <ClientGoogleCard
        clientId={client.id}
        clientName={client.name}
        signInFailed={googleSignInFailed}
      />

      {living ? (
        <WorkSnapshot living={living} billingDay={client.billingDay} onTab={onTab} />
      ) : (
        <Card>
          <p className="text-sm text-foreground/70">
            No strategy yet.{" "}
            <button type="button" className="font-medium hover:underline" onClick={() => onTab("strategy")}>
              Create one
            </button>{" "}
            after an audit.
          </p>
        </Card>
      )}
    </div>
  );
}

function WorkSnapshot({
  living,
  billingDay,
  onTab,
}: {
  living: HubStrategy;
  billingDay: number | null;
  onTab: (tab: TabId) => void;
}) {
  const lanes = partitionCycles(living.cycles, billingDay);
  const backlog = living.recommendations.filter((rec) => rec.status === "BACKLOG").length;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Strategy · {living.name}</h2>
        <button type="button" className="text-sm hover:underline" onClick={() => onTab("strategy")}>
          Open strategy
        </button>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <LaneCard
          title="This month"
          label={lanes.thisMonth?.label}
          empty="Nothing scheduled."
          items={lanes.thisMonth?.items.map((item) => item.recommendation.title) ?? []}
        />
        <LaneCard
          title="Next month"
          label={lanes.nextMonth?.label}
          empty="Nothing lined up."
          items={lanes.nextMonth?.items.map((item) => item.recommendation.title) ?? []}
        />
        <Card>
          <p className="text-sm text-muted">Backlog</p>
          <p className="text-4xl font-semibold tracking-tight mt-1 tabular-nums">{backlog}</p>
          <p className="text-sm text-foreground/60 mt-1">Prioritized plays waiting to be scheduled.</p>
        </Card>
      </div>
    </div>
  );
}

function PerformanceTab({
  living,
  onTab,
}: {
  living: HubStrategy | null;
  onTab: (tab: TabId) => void;
}) {
  if (!living) {
    return (
      <Card>
        <p className="text-sm text-foreground/70">
          Performance tracks goals once a strategy exists.{" "}
          <button type="button" className="font-medium hover:underline" onClick={() => onTab("strategy")}>
            Create one
          </button>{" "}
          and choose the metrics you want to follow.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">Performance</h2>
        <p className="text-sm text-foreground/65 mt-1">
          Goals and tracked numbers for {living.name}. Sync pulls the latest figures from the linked audit.
        </p>
      </div>
      <KpiDashboard strategyId={living.id} kpis={living.kpis} />
    </div>
  );
}

function LaneCard({
  title,
  label,
  empty,
  items,
}: {
  title: string;
  label?: string;
  empty: string;
  items: string[];
}) {
  return (
    <Card>
      <p className="text-sm text-muted">{title}{label ? ` · ${label}` : ""}</p>
      {items.length === 0 ? (
        <p className="text-sm text-foreground/60 mt-2">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm">
          {items.slice(0, 4).map((titleText) => (
            <li key={titleText} className="truncate">{titleText}</li>
          ))}
          {items.length > 4 && (
            <li className="text-foreground/50">+{items.length - 4} more</li>
          )}
        </ul>
      )}
    </Card>
  );
}

function AuditsTab({ clientId, audits }: { clientId: string; audits: Audit[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">Site audits</h2>
        <Link href={`/clients/${clientId}/audits/new`} className="text-sm font-medium hover:underline">
          + New audit
        </Link>
      </div>
      {audits.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/70">
            No audits yet. Run a site audit to find crawl, visibility, linking, keyword, and AI crawlability issues.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {audits.map((a) => (
            <li key={a.id}>
              <Link href={`/clients/${clientId}/audits/${a.id}`}>
                <Card className="hover:border-gold/30 transition">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{a.name}</p>
                    <Badge>{a.status.replace(/_/g, " ")}</Badge>
                  </div>
                  {a.seedUrl && <p className="text-sm text-foreground/60 mt-1 truncate">{a.seedUrl}</p>}
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ContentTab({ clientId, projects }: { clientId: string; projects: ContentProject[] }) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-medium">Content projects</h2>
        <Link href={`/projects/new?client=${clientId}`} className="text-sm font-medium hover:underline">
          + New content
        </Link>
      </div>
      {projects.length === 0 ? (
        <Card>
          <p className="text-sm text-foreground/70">No content projects for this client yet.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`}>
                <Card className="hover:border-gold/30 transition">
                  <p className="font-medium">{p.topic}</p>
                  <p className="text-sm text-foreground/60 mt-1">
                    {CONTENT_TYPE_LABELS[p.contentType]} · {p.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
