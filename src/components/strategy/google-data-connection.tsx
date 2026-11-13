"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Property = { propertyId: string; displayName: string; account: string };
type Site = { siteUrl: string; permissionLevel: string | null };
type GoogleData = {
  configured: boolean;
  connected: boolean;
  error?: string;
  selections: {
    analyticsPropertyId: string | null;
    searchConsoleSiteUrl: string | null;
  };
  analyticsProperties: Property[];
  searchConsoleSites: Site[];
};

export function GoogleDataConnection({
  returnTo,
  onSaved,
}: {
  returnTo: string;
  onSaved?: () => void;
}) {
  const [data, setData] = useState<GoogleData | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/google/oauth/properties")
      .then(async (response) => {
        const payload = await response.json();
        setData(payload);
        setPropertyId(payload.selections?.analyticsPropertyId ?? "");
        setSiteUrl(payload.selections?.searchConsoleSiteUrl ?? "");
      })
      .catch(() => setError("Could not load Google connection status."));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    const response = await fetch("/api/google/oauth/selection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        analyticsPropertyId: propertyId || null,
        searchConsoleSiteUrl: siteUrl || null,
      }),
    });
    const payload = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      setError(payload?.error ?? "Could not save Google selections.");
      return;
    }
    onSaved?.();
  }

  if (!data) {
    return <Card><p className="text-sm text-foreground/60">Loading Google connection…</p></Card>;
  }

  if (!data.configured) {
    return (
      <Card>
        <p className="font-medium">Google data</p>
        <p className="mt-1 text-sm text-foreground/65">
          Add the Google OAuth environment variables to connect Analytics and Search Console.
        </p>
      </Card>
    );
  }

  if (!data.connected) {
    return (
      <Card>
        <p className="font-medium">Google data</p>
        <p className="mt-1 text-sm text-foreground/65">
          Connect a Google account with access to this client’s GA4 property and Search Console site.
        </p>
        {data.error && <p className="mt-2 text-sm text-red-600">{data.error}</p>}
        <a
          className="mt-3 inline-block rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
          href={`/api/google/oauth/start?returnTo=${encodeURIComponent(returnTo)}`}
        >
          Connect Google
        </a>
      </Card>
    );
  }

  return (
    <Card className="space-y-3">
      <div>
        <p className="font-medium">Google data</p>
        <p className="text-sm text-foreground/60">Connected. Choose the resources to sync.</p>
      </div>
      <div>
        <Label htmlFor="ga4-property">GA4 property</Label>
        <Select
          id="ga4-property"
          value={propertyId}
          onChange={(event) => setPropertyId(event.target.value)}
        >
          <option value="">Do not sync GA4</option>
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
          <option value="">Do not sync Search Console</option>
          {data.searchConsoleSites.map((site) => (
            <option key={site.siteUrl} value={site.siteUrl}>
              {site.siteUrl}
            </option>
          ))}
        </Select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="button" variant="secondary" disabled={saving} onClick={save}>
        {saving ? "Saving…" : "Save Google selections"}
      </Button>
    </Card>
  );
}
