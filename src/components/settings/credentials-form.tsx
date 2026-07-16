"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CredentialStatus } from "@/lib/credentials";

export function CredentialsForm({ status }: { status: CredentialStatus }) {
  const router = useRouter();
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState<null | "save" | "test" | "delete">(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function save() {
    if (!apiKey.trim()) return;
    setBusy("save");
    setMessage(null);
    const res = await fetch("/api/settings/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    setBusy(null);
    if (res.ok) {
      setApiKey("");
      setMessage({ kind: "ok", text: "API key saved and encrypted." });
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setMessage({ kind: "error", text: data.error ?? "Failed to save key." });
    }
  }

  async function test() {
    setBusy("test");
    setMessage(null);
    const res = await fetch("/api/settings/credentials/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(apiKey.trim() ? { apiKey } : {}),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (data.ok) {
      setMessage({ kind: "ok", text: `Connection works — ${data.modelCount} models available.` });
    } else {
      setMessage({ kind: "error", text: data.error ?? "Connection failed." });
    }
  }

  async function disconnect() {
    setBusy("delete");
    setMessage(null);
    await fetch("/api/settings/credentials", { method: "DELETE" });
    setBusy(null);
    setMessage({ kind: "ok", text: "API key removed." });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-foreground/10 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">Claude (Anthropic) account</h2>
        <Badge className={status.connected ? "bg-green-500/15" : ""}>
          {status.connected ? `Connected ····${status.last4}` : "Not connected"}
        </Badge>
      </div>

      <p className="text-sm text-foreground/70">
        Bring your own Anthropic API key. Generations run on <strong>your</strong> account and are
        billed to you — we never use shared credits. Create a key at{" "}
        <a
          href="https://console.anthropic.com/settings/keys"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          console.anthropic.com
        </a>
        . Your key is encrypted at rest and never sent to the browser again.
      </p>

      <div>
        <Label htmlFor="anthropic-key">
          {status.connected ? "Replace API key" : "Anthropic API key"}
        </Label>
        <Input
          id="anthropic-key"
          type="password"
          autoComplete="off"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={busy !== null || !apiKey.trim()}>
          {busy === "save" ? "Saving…" : "Save key"}
        </Button>
        <Button type="button" variant="secondary" onClick={test} disabled={busy !== null}>
          {busy === "test" ? "Testing…" : "Test connection"}
        </Button>
        {status.connected && (
          <Button type="button" variant="secondary" onClick={disconnect} disabled={busy !== null}>
            {busy === "delete" ? "Removing…" : "Disconnect"}
          </Button>
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${message.kind === "ok" ? "text-green-600" : "text-red-600"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
