"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Property = { propertyId: string; displayName: string; account: string };
type Site = { siteUrl: string; permissionLevel: string | null };
type GoogleData = {
  configured: boolean;
  connected: boolean;
  accountEmail: string | null;
  error?: string;
  selections: {
    analyticsPropertyId: string | null;
    analyticsPropertyName: string | null;
    searchConsoleSiteUrl: string | null;
  };
  analyticsProperties: Property[];
  searchConsoleSites: Site[];
};

/** This client's own Google sign-in and the Analytics property / Search Console site it uses. */
export function ClientGoogleCard({
  clientId,
  clientName,
  signInFailed,
}: {
  clientId: string;
  clientName: string;
  signInFailed?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<GoogleData | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [busy, setBusy] = useState<"save" | "disconnect" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [reloads, setReloads] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/clients/${clientId}/google`)
      .then(async (response) => {
        const payload = (await response.json()) as GoogleData;
        if (cancelled) return;
        setData(payload);
        setPropertyId(payload.selections?.analyticsPropertyId ?? "");
        setSiteUrl(payload.selections?.searchConsoleSiteUrl ?? "");
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the Google connection.");
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, reloads]);

  const connectHref = `/api/google/oauth/start?clientId=${encodeURIComponent(clientId)}&returnTo=${encodeURIComponent(`/clients/${clientId}`)}`;

  async function save() {
    setBusy("save");
    setError(null);
    setSaved(false);
    const response = await fetch(`/api/clients/${clientId}/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analyticsPropertyId: propertyId || null,
        searchConsoleSiteUrl: siteUrl || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    setBusy(null);
    if (!response.ok) {
      setError(payload?.error ?? "Could not save the Google selection.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function disconnect() {
    if (!window.confirm(`Disconnect Google from ${clientName}?`)) return;
    setBusy("disconnect");
    setError(null);
    setSaved(false);
    const response = await fetch(`/api/clients/${clientId}/google`, { method: "DELETE" });
    setBusy(null);
    if (!response.ok) {
      setError("Could not disconnect Google.");
      return;
    }
    setReloads((n) => n + 1);
    router.refresh();
  }

  if (!data) {
    return (
      <Card>
        <h2 className="font-medium">Google data</h2>
        <p className="mt-1 text-sm text-foreground/60">{error ?? "Loading Google connection…"}</p>
      </Card>
    );
  }

  if (!data.configured) {
    return (
      <Card>
        <h2 className="font-medium">Google data</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Google sign-in is not set up for this app yet. Add the Google app credentials, then
          connect {clientName}&apos;s account here.
        </p>
      </Card>
    );
  }

  if (!data.connected) {
    return (
      <Card>
        <h2 className="font-medium">Google data</h2>
        <p className="mt-1 text-sm text-foreground/65">
          Connect the Google account that can see {clientName}&apos;s Analytics and Search Console.
          It is used for this client only.
        </p>
        {(data.error || signInFailed) && (
          <p className="mt-2 text-sm text-red-600">
            {data.error ?? "Google sign-in did not finish. Try again."}
          </p>
        )}
        <a
          className="mt-3 inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          href={connectHref}
        >
          Connect Google
        </a>
      </Card>
    );
  }

  // A saved choice that Google no longer lists stays visible instead of silently vanishing.
  const savedProperty = data.selections.analyticsPropertyId;
  const savedSite = data.selections.searchConsoleSiteUrl;
  const propertyMissing =
    savedProperty && !data.analyticsProperties.some((p) => p.propertyId === savedProperty);
  const siteMissing = savedSite && !data.searchConsoleSites.some((s) => s.siteUrl === savedSite);
  const missingNote = data.error ? "" : " (no longer available)";

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">Google data</h2>
          <p className="text-sm text-foreground/60">
            {data.accountEmail ? `Connected as ${data.accountEmail}` : "Connected"} · used for{" "}
            {clientName} only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a className="hover:underline" href={connectHref}>
            Change account
          </a>
          <button
            type="button"
            className="text-foreground/60 hover:text-foreground hover:underline"
            disabled={!!busy}
            onClick={disconnect}
          >
            {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
          </button>
        </div>
      </div>
      {data.error && <p className="text-sm text-red-600">{data.error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="ga4-property">Analytics property</Label>
          <Select
            id="ga4-property"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          >
            <option value="">None</option>
            {propertyMissing && (
              <option value={savedProperty}>
                {data.selections.analyticsPropertyName ?? savedProperty}
                {missingNote}
              </option>
            )}
            {data.analyticsProperties.map((property) => (
              <option key={property.propertyId} value={property.propertyId}>
                {property.displayName} — {property.account}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="gsc-site">Search Console site</Label>
          <Select id="gsc-site" value={siteUrl} onChange={(event) => setSiteUrl(event.target.value)}>
            <option value="">None</option>
            {siteMissing && (
              <option value={savedSite}>
                {savedSite}
                {missingNote}
              </option>
            )}
            {data.searchConsoleSites.map((site) => (
              <option key={site.siteUrl} value={site.siteUrl}>
                {site.siteUrl}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" disabled={!!busy} onClick={save}>
          {busy === "save" ? "Saving…" : "Save Google selection"}
        </Button>
        {saved && <span className="text-sm text-foreground/60">Saved</span>}
      </div>
    </Card>
  );
}
