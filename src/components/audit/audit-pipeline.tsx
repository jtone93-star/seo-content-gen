"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleDataConnection } from "@/components/strategy/google-data-connection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  Audit,
  AuditArtifact,
  AuditDataSource,
  AuditJob,
  AuditModelSlot,
  AuditStep,
  ClientProfile,
} from "@/generated/prisma/client";
import {
  AUDIT_STEPS,
  AUDIT_STEP_DESCRIPTIONS,
  AUDIT_STEP_LABELS,
} from "@/lib/audit/types";
import { liveEngineLabel } from "@/lib/ai-providers";

type AuditWithRelations = Audit & {
  clientProfile: ClientProfile;
  dataSources: AuditDataSource[];
  artifacts: AuditArtifact[];
  jobs: AuditJob[];
};

function latestArtifact(artifacts: AuditArtifact[], step: AuditStep) {
  return artifacts
    .filter((a) => a.step === step && a.status !== "SUPERSEDED")
    .sort((a, b) => b.version - a.version)[0];
}

function statusColor(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-teal/15 text-teal";
    case "AWAITING_REVIEW":
      return "bg-gold/15 text-gold";
    case "RUNNING":
    case "QUEUED":
      return "bg-sky-500/15 text-sky-300";
    case "FAILED":
    case "REJECTED":
      return "bg-red-500/15 text-red-300";
    default:
      return "bg-white/[0.06] text-muted";
  }
}

function engineFor(slots: AuditModelSlot[], step: AuditStep) {
  const slot = slots.find((s) => s.step === step);
  if (slot?.enabled && slot.model) return liveEngineLabel(slot.provider, slot.model);
  return "Mock";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function UrlList({ urls, label = "Affected URLs" }: { urls: string[]; label?: string }) {
  if (!urls.length) return null;
  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-foreground/55">{label}</p>
      <ul className="mt-1 space-y-1">
        {urls.map((url) => (
          <li key={url} className="break-all text-xs">
            <a href={url} className="text-foreground/70 hover:underline" target="_blank" rel="noreferrer">
              {url}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StageSpecificLists({ data }: { data: Record<string, unknown> }) {
  const opportunityPages = Array.isArray(data.opportunityPages) ? data.opportunityPages : [];
  const nominatedPages = Array.isArray(data.nominatedPages) ? data.nominatedPages : [];
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const mismatches = Array.isArray(data.mismatches) ? data.mismatches : [];
  const opportunities = Array.isArray(data.opportunities) ? data.opportunities : [];

  return (
    <div className="space-y-4">
      {opportunityPages.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Opportunity pages</p>
          <ul className="space-y-2">
            {opportunityPages.map((raw, index) => {
              const item = raw as Record<string, unknown>;
              const url = String(item.url ?? "");
              return (
                <li key={`${url}-${index}`} className="rounded-lg border border-foreground/10 p-3">
                  {url && (
                    <a href={url} className="font-medium break-all hover:underline" target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  )}
                  {typeof item.rationale === "string" && (
                    <p className="mt-1 text-foreground/70">{item.rationale}</p>
                  )}
                  {asStringArray(item.signals).length > 0 && (
                    <p className="mt-1 text-xs text-foreground/50">
                      Signals: {asStringArray(item.signals).join(" · ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {nominatedPages.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Nominated pages</p>
          <ul className="space-y-2">
            {nominatedPages.map((raw, index) => {
              const item = raw as Record<string, unknown>;
              const url = String(item.url ?? "");
              return (
                <li key={`${url}-${index}`} className="rounded-lg border border-foreground/10 p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    {typeof item.priority === "number" && <Badge>P{item.priority}</Badge>}
                    {url && (
                      <a href={url} className="font-medium break-all hover:underline" target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    )}
                  </div>
                  {typeof item.rationale === "string" && (
                    <p className="mt-1 text-foreground/70">{item.rationale}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {pages.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Page reviews</p>
          <ul className="space-y-2">
            {pages.map((raw, index) => {
              const item = raw as Record<string, unknown>;
              const url = String(item.url ?? "");
              return (
                <li key={`${url}-${index}`} className="rounded-lg border border-foreground/10 p-3 space-y-2">
                  {url && (
                    <a href={url} className="font-medium break-all hover:underline" target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  )}
                  {asStringArray(item.weaknesses).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground/55">Issues</p>
                      <ul className="mt-1 list-disc pl-5 text-foreground/70">
                        {asStringArray(item.weaknesses).map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {asStringArray(item.strengths).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-foreground/55">Strengths</p>
                      <ul className="mt-1 list-disc pl-5 text-foreground/70">
                        {asStringArray(item.strengths).map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {typeof item.notes === "string" && (
                    <p className="text-xs text-foreground/55">{item.notes}</p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {mismatches.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Keyword / relevance mismatches</p>
          <ul className="space-y-2">
            {mismatches.map((raw, index) => {
              const item = raw as Record<string, unknown>;
              const url = String(item.url ?? "");
              return (
                <li key={`${url}-${index}`} className="rounded-lg border border-foreground/10 p-3">
                  {url && (
                    <a href={url} className="font-medium break-all hover:underline" target="_blank" rel="noreferrer">
                      {url}
                    </a>
                  )}
                  {typeof item.issue === "string" && (
                    <p className="mt-1 text-foreground/70">{item.issue}</p>
                  )}
                  {asStringArray(item.queries).length > 0 && (
                    <p className="mt-1 text-xs text-foreground/50">
                      Queries: {asStringArray(item.queries).join(" · ")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {opportunities.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Noted opportunities</p>
          <ul className="space-y-2">
            {opportunities.map((raw, index) => {
              const item = raw as Record<string, unknown>;
              return (
                <li key={`${String(item.title ?? index)}`} className="rounded-lg border border-foreground/10 p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    {typeof item.category === "string" && <Badge>{item.category}</Badge>}
                    <span className="font-medium">{String(item.title ?? "Opportunity")}</span>
                  </div>
                  {typeof item.detail === "string" && (
                    <p className="mt-1 text-foreground/70">{item.detail}</p>
                  )}
                  <UrlList urls={asStringArray(item.relatedUrls)} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderOutput(output: unknown) {
  if (!output || typeof output !== "object") {
    return <p className="text-sm text-foreground/60">No output.</p>;
  }
  const data = output as Record<string, unknown>;
  const findings = Array.isArray(data.findings) ? data.findings : [];

  return (
    <div className="space-y-4 text-sm">
      {typeof data.summary === "string" && (
        <p className="text-foreground/80 leading-relaxed">{data.summary}</p>
      )}

      <StageSpecificLists data={data} />

      {findings.length > 0 && (
        <div className="space-y-2">
          <p className="font-medium">Issues found</p>
          <ul className="space-y-2">
            {findings.map((raw, index) => {
              const f = raw as Record<string, unknown>;
              const urls = asStringArray(f.urls);
              const evidence = asStringArray(f.evidence);
              return (
                <li key={String(f.id ?? index)} className="rounded-lg border border-foreground/10 p-3">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge>{String(f.severity ?? "info")}</Badge>
                    <span className="font-medium">{String(f.title ?? "Finding")}</span>
                  </div>
                  {typeof f.detail === "string" && (
                    <p className="mt-1 text-foreground/70">{f.detail}</p>
                  )}
                  <UrlList urls={urls} />
                  {evidence.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-foreground/55">Evidence</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-foreground/60">
                        {evidence.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!urls.length && (
                    <p className="mt-2 text-xs text-foreground/45">
                      No specific URL attached — may be site-wide or evidence incomplete.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <details className="text-xs text-foreground/50">
        <summary className="cursor-pointer">Raw JSON</summary>
        <pre className="mt-2 overflow-auto rounded bg-foreground/5 p-2 whitespace-pre-wrap">
          {JSON.stringify(output, null, 2)}
        </pre>
      </details>
    </div>
  );
}

export function AuditPipeline({
  audit,
  modelSlots,
  clientId,
}: {
  audit: AuditWithRelations;
  modelSlots: AuditModelSlot[];
  clientId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [viewStep, setViewStep] = useState<AuditStep | null>(audit.currentStep);
  const [shortlistText, setShortlistText] = useState(
    (audit.selectedPages.length
      ? audit.selectedPages
      : ((latestArtifact(audit.artifacts, "PAGE_SHORTLIST")?.output as { nominatedPages?: { url: string }[] } | null)
          ?.nominatedPages?.map((p) => p.url) ??
          (audit.seedUrl ? [audit.seedUrl] : []))
    ).join("\n"),
  );

  useEffect(() => {
    setViewStep(audit.currentStep);
  }, [audit.currentStep, audit.updatedAt]);

  const activeStep = viewStep ?? audit.currentStep ?? "CRAWL_TECHNICAL";
  const artifact = latestArtifact(audit.artifacts, activeStep);
  const awaiting = artifact?.status === "AWAITING_REVIEW";
  const running =
    audit.status === "RUNNING" ||
    audit.status === "QUEUED" ||
    busy === "start" ||
    busy === "approve" ||
    busy === "regenerate";

  const shortlistNominations = useMemo(() => {
    const out = latestArtifact(audit.artifacts, "PAGE_SHORTLIST")?.output as
      | { nominatedPages?: { url: string; rationale?: string }[] }
      | null;
    return out?.nominatedPages ?? [];
  }, [audit.artifacts]);

  async function post(key: string, url: string, body?: unknown) {
    setBusy(key);
    setError(null);
    const res = await fetch(url, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(data?.error ?? `Request failed (${res.status}).`);
      return false;
    }
    router.refresh();
    return true;
  }

  async function onAddSource(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy("upload");
    setError(null);
    const form = e.currentTarget;
    const res = await fetch(`/api/audits/${audit.id}/sources`, { method: "POST", body: new FormData(form) });
    const data = await res.json().catch(() => null);
    setBusy(null);
    if (!res.ok) {
      setError(data?.error ?? "Failed to add source.");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/clients/${clientId}`} className="text-sm text-foreground/60 hover:text-foreground">
            ← Client hub
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight mt-2">{audit.name}</h1>
          <p className="text-sm text-foreground/70 mt-1">
            Site audit — diagnose issues and note opportunities. Strategy planning comes later.
          </p>
          {audit.seedUrl && (
            <p className="text-sm text-foreground/60 mt-1 break-all">
              Seed:{" "}
              <a href={audit.seedUrl} className="hover:underline" target="_blank" rel="noreferrer">
                {audit.seedUrl}
              </a>
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge className={statusColor(audit.status)}>{audit.status.replace(/_/g, " ")}</Badge>
            {audit.currentStep && <Badge>{AUDIT_STEP_LABELS[audit.currentStep]}</Badge>}
            <Badge>{audit.dataSources.length} source(s)</Badge>
          </div>
          {audit.errorMessage && <p className="text-sm text-red-600 mt-2">{audit.errorMessage}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {(audit.status === "DRAFT" || audit.status === "FAILED") && (
            <Button type="button" disabled={!!busy} onClick={() => post("start", `/api/audits/${audit.id}/start`)}>
              {busy === "start" ? "Starting…" : "Start audit"}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            disabled={!!busy}
            onClick={() => post("google", `/api/audits/${audit.id}/sources/google`)}
          >
            {busy === "google" ? "Syncing…" : "Sync Google"}
          </Button>
          {audit.artifacts.some((a) => a.status === "APPROVED" || a.status === "AWAITING_REVIEW") && (
            <>
              <a
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
                href={`/api/audits/${audit.id}/export?format=csv`}
              >
                Export CSV
              </a>
              <a
                className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
                href={`/api/audits/${audit.id}/export?format=xlsx`}
              >
                Export Excel
              </a>
            </>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {running && <p className="text-sm text-foreground/60">Running audit step…</p>}

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Data sources</h2>
        <GoogleDataConnection
          returnTo={`/clients/${clientId}/audits/${audit.id}`}
          onSaved={() => router.refresh()}
        />
        {audit.dataSources.length === 0 ? (
          <Card>
            <p className="text-sm text-foreground/70">
              Add crawl uploads, notes, and Google data before or while running stages.
            </p>
          </Card>
        ) : (
          <ul className="space-y-2">
            {audit.dataSources.map((source) => (
              <li key={source.id}>
                <Card>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Badge>{source.type}</Badge>
                    <span className="text-sm font-medium">{source.label}</span>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
        <Card>
          <form onSubmit={onAddSource} className="space-y-3" encType="multipart/form-data">
            <p className="text-sm font-medium">Add notes or upload</p>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>
            <div>
              <Label htmlFor="file">CSV / Excel</Label>
              <Input id="file" name="file" type="file" accept=".csv,.xlsx" />
            </div>
            <Button type="submit" variant="secondary" disabled={busy === "upload"}>
              {busy === "upload" ? "Uploading…" : "Add source"}
            </Button>
          </form>
        </Card>
      </section>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-1">
          {AUDIT_STEPS.map((step) => {
            const art = latestArtifact(audit.artifacts, step);
            const disabled = !art && step !== audit.currentStep && audit.status === "DRAFT";
            return (
              <button
                key={step}
                type="button"
                disabled={disabled && !art}
                onClick={() => setViewStep(step)}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeStep === step ? "bg-foreground/10" : "hover:bg-foreground/5"
                } ${!art && audit.status === "DRAFT" ? "opacity-50" : ""}`}
              >
                <div className="font-medium">{AUDIT_STEP_LABELS[step]}</div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge className="text-[10px]">{engineFor(modelSlots, step)}</Badge>
                  {art ? (
                    <Badge className={`text-[10px] ${statusColor(art.status)}`}>
                      {art.status.replace(/_/g, " ")}
                    </Badge>
                  ) : (
                    <Badge className="text-[10px]">Not started</Badge>
                  )}
                </div>
              </button>
            );
          })}
        </aside>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-medium">{AUDIT_STEP_LABELS[activeStep]}</h2>
            <p className="mt-1 text-sm text-foreground/65">{AUDIT_STEP_DESCRIPTIONS[activeStep]}</p>
            <div className="mt-2">
              <Badge>Using: {engineFor(modelSlots, activeStep)}</Badge>
            </div>
          </div>

          {!artifact ? (
            <Card>
              <p className="text-sm text-foreground/70">This step has not run yet.</p>
            </Card>
          ) : (
            <Card>{renderOutput(artifact.output)}</Card>
          )}

          {activeStep === "FINDINGS_ROLLUP" && artifact && (
            <Card className="space-y-3">
              <p className="text-sm font-medium">Export findings report</p>
              <p className="text-sm text-foreground/65">
                Downloads every issue, opportunity page, nominated URL, page review, and keyword
                mismatch from completed audit stages (CSV or Excel).
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  className="inline-flex items-center justify-center rounded-lg bg-gold px-4 py-2 text-sm font-medium text-gold-ink"
                  href={`/api/audits/${audit.id}/export?format=csv`}
                >
                  Download CSV
                </a>
                <a
                  className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2 text-sm font-medium hover:border-gold/40 hover:bg-white/[0.03] transition"
                  href={`/api/audits/${audit.id}/export?format=xlsx`}
                >
                  Download Excel
                </a>
              </div>
            </Card>
          )}

          {activeStep === "PAGE_SHORTLIST" && awaiting && (
            <Card className="space-y-3">
              <p className="text-sm font-medium">Confirm pages for deep-dive</p>
              {shortlistNominations.length > 0 && (
                <ul className="text-sm text-foreground/70 space-y-1">
                  {shortlistNominations.map((n) => (
                    <li key={n.url}>
                      <span className="font-medium">{n.url}</span>
                      {n.rationale ? ` — ${n.rationale}` : ""}
                    </li>
                  ))}
                </ul>
              )}
              <div>
                <Label htmlFor="selectedPages">Selected page URLs (one per line)</Label>
                <Textarea
                  id="selectedPages"
                  rows={5}
                  value={shortlistText}
                  onChange={(e) => setShortlistText(e.target.value)}
                />
              </div>
            </Card>
          )}

          {awaiting && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={!!busy}
                onClick={() =>
                  post("approve", `/api/audits/${audit.id}/steps/${activeStep}/approve`, {
                    selectedPages:
                      activeStep === "PAGE_SHORTLIST"
                        ? shortlistText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
                        : undefined,
                  })
                }
              >
                {busy === "approve" ? "Approving…" : "Approve & continue"}
              </Button>
            </div>
          )}

          {artifact && artifact.status !== "RUNNING" && (
            <div className="space-y-2 max-w-xl">
              <Label htmlFor="feedback">Regenerate with feedback (optional)</Label>
              <Textarea
                id="feedback"
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="What should change on this stage?"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={!!busy}
                onClick={() =>
                  post("regenerate", `/api/audits/${audit.id}/steps/${activeStep}/regenerate`, {
                    feedback: feedback.trim() || undefined,
                  })
                }
              >
                {busy === "regenerate" ? "Regenerating…" : "Regenerate step"}
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
