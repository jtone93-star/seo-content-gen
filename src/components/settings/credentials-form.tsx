"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AiProvider } from "@/lib/ai-providers";
import type { CredentialStatus } from "@/lib/credentials";

const COPY: Record<
  AiProvider,
  {
    title: string;
    placeholder: string;
    keyLabel: string;
    blurb: ReactNode;
  }
> = {
  anthropic: {
    title: "Claude (Anthropic) account",
    placeholder: "sk-ant-...",
    keyLabel: "Anthropic API key",
    blurb: (
      <>
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
        . Claude.ai chat plans cannot be used here. Your key is encrypted at rest and never sent to
        the browser again.
      </>
    ),
  },
  gemini: {
    title: "Gemini (Google AI) account",
    placeholder: "AIza...",
    keyLabel: "Gemini API key",
    blurb: (
      <>
        Bring your own Gemini API key from{" "}
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Google AI Studio
        </a>
        . Usage is billed to <strong>your</strong> Google AI / Gemini account. Your key is encrypted
        at rest and never sent to the browser again.
      </>
    ),
  },
};

export function CredentialsForm({
  provider,
  status,
}: {
  provider: AiProvider;
  status: CredentialStatus;
}) {
  const copy = COPY[provider];
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
      body: JSON.stringify({ provider, apiKey }),
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
      body: JSON.stringify({ provider, ...(apiKey.trim() ? { apiKey } : {}) }),
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
    await fetch("/api/settings/credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    setBusy(null);
    setMessage({ kind: "ok", text: "API key removed." });
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line p-5 space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="font-medium">{copy.title}</h2>
        <Badge className={status.connected ? "bg-teal/15 text-teal" : ""}>
          {status.connected ? `Connected ····${status.last4}` : "Not connected"}
        </Badge>
      </div>

      <p className="text-sm text-foreground/70">{copy.blurb}</p>

      <div>
        <Label htmlFor={`${provider}-key`}>
          {status.connected ? `Replace ${copy.keyLabel}` : copy.keyLabel}
        </Label>
        <Input
          id={`${provider}-key`}
          type="password"
          autoComplete="off"
          placeholder={copy.placeholder}
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
        <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
