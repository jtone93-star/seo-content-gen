"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DesktopStatus = {
  desktop: boolean;
  google?: {
    configured: boolean;
    hasClientId: boolean;
    hasClientSecret: boolean;
    redirectUri: string;
  };
};

export function DesktopGoogleForm() {
  const [status, setStatus] = useState<DesktopStatus | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function refresh() {
    const res = await fetch("/api/settings/desktop");
    const data = (await res.json()) as DesktopStatus;
    setStatus(data);
  }

  useEffect(() => {
    refresh().catch(() => setStatus({ desktop: false }));
  }, []);

  if (!status?.desktop) return null;

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/settings/desktop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setMessage({ kind: "error", text: data.error ?? "Failed to save Google credentials." });
      return;
    }
    setClientId("");
    setClientSecret("");
    setMessage({ kind: "ok", text: "Google OAuth credentials saved for this machine." });
    await refresh();
  }

  async function clear() {
    setBusy(true);
    setMessage(null);
    await fetch("/api/settings/desktop", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clear: true }),
    });
    setBusy(false);
    setMessage({ kind: "ok", text: "Google OAuth credentials cleared." });
    await refresh();
  }

  const redirectUri = status.google?.redirectUri ?? "";

  return (
    <div className="rounded-xl border border-line p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">Google Analytics & Search Console</h2>
        <Badge className={status.google?.configured ? "bg-teal/15 text-teal" : ""}>
          {status.google?.configured ? "Configured" : "Not configured"}
        </Badge>
      </div>
      <p className="text-sm text-foreground/70">
        Desktop installs use your own Google Cloud OAuth client. Create a <strong>Web</strong>{" "}
        application client, enable Analytics Data, Analytics Admin, and Search Console APIs, then
        add this exact authorized redirect URI:
      </p>
      <code className="block break-all rounded-lg border border-line bg-foreground/[0.03] px-3 py-2 text-xs">
        {redirectUri}
      </code>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="google-client-id">
            {status.google?.hasClientId ? "Replace client ID" : "Client ID"}
          </Label>
          <Input
            id="google-client-id"
            value={clientId}
            autoComplete="off"
            placeholder="….apps.googleusercontent.com"
            onChange={(e) => setClientId(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="google-client-secret">
            {status.google?.hasClientSecret ? "Replace client secret" : "Client secret"}
          </Label>
          <Input
            id="google-client-secret"
            type="password"
            value={clientSecret}
            autoComplete="off"
            placeholder="GOCSPX-…"
            onChange={(e) => setClientSecret(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={busy || (!clientId.trim() && !clientSecret.trim())}
          onClick={save}
        >
          {busy ? "Saving…" : "Save Google credentials"}
        </Button>
        {status.google?.hasClientId && (
          <Button type="button" variant="secondary" disabled={busy} onClick={clear}>
            Clear
          </Button>
        )}
      </div>
      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
