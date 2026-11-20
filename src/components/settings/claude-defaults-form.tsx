"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type ListedModel = { id: string; name: string };

const SONNET_HINT = "claude-sonnet";

function pickDefaultModel(models: ListedModel[], current: string | null): string {
  if (current && models.some((m) => m.id === current)) return current;
  const sonnet = models.find((m) => m.id.toLowerCase().includes(SONNET_HINT));
  return sonnet?.id ?? models[0]?.id ?? current ?? "";
}

export function ClaudeDefaultsForm({
  anthropicConnected,
  initialEnabled,
  initialModel,
}: {
  anthropicConnected: boolean;
  initialEnabled: boolean;
  initialModel: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"mock" | "live">(initialEnabled ? "live" : "mock");
  const [model, setModel] = useState(initialModel ?? "");
  const [models, setModels] = useState<ListedModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMode(initialEnabled ? "live" : "mock");
    setModel(initialModel ?? "");
  }, [initialEnabled, initialModel]);

  useEffect(() => {
    if (!anthropicConnected) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    fetch("/api/settings/anthropic-models")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.models ?? []) as ListedModel[];
        setModels(list);
        setModel((prev) => pickDefaultModel(list, prev || initialModel));
      })
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [anthropicConnected, initialModel]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/ai-defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: mode === "live",
        model: mode === "live" ? model.trim() : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Failed to save AI defaults." });
      return;
    }
    setMessage({
      kind: "ok",
      text:
        mode === "mock"
          ? "Mock enabled everywhere (strategy, audits, content)."
          : `Claude · ${model.trim()} applied to strategy, all audit stages, and all content stages.`,
    });
    router.refresh();
  }

  const customModel = Boolean(model && models.length > 0 && !models.some((m) => m.id === model));

  return (
    <div className="rounded-xl border border-line p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-medium">Claude for all engines</h2>
        <Badge className={mode === "live" ? "bg-gold/15 text-gold" : ""}>
          {mode === "live" ? `Live · ${model || "pick a model"}` : "Mock"}
        </Badge>
      </div>
      <p className="text-sm text-foreground/70">
        One Claude model powers strategy, site audits, and the content pipeline. Use Mock for
        free dry runs. Switch to a higher-tier model (for example Opus) when a job needs more depth.
      </p>

      {!anthropicConnected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Connect a Claude API key above before enabling live AI.
        </div>
      )}

      <div>
        <Label htmlFor="ai-mode">Mode</Label>
        <Select
          id="ai-mode"
          value={mode}
          onChange={(e) => setMode(e.target.value as "mock" | "live")}
        >
          <option value="mock">Mock (free placeholders)</option>
          <option value="live" disabled={!anthropicConnected}>
            Live Claude{anthropicConnected ? "" : " — connect key first"}
          </option>
        </Select>
      </div>

      {mode === "live" && (
        <div className="space-y-2">
          <Label htmlFor="ai-model">Claude model</Label>
          {loadingModels ? (
            <p className="text-sm text-foreground/55">Loading models…</p>
          ) : models.length > 0 ? (
            <Select
              id="ai-model"
              value={customModel ? "__custom__" : model}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom__") {
                  setModel("");
                  return;
                }
                setModel(value);
              }}
            >
              <option value="" disabled>
                Select a model…
              </option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.id})
                </option>
              ))}
              <option value="__custom__">Other — type a model id</option>
            </Select>
          ) : null}
          {(models.length === 0 || customModel || !model) && (
            <Input
              id="ai-model-custom"
              value={model}
              placeholder="claude-sonnet-… (or paste a model id)"
              onChange={(e) => setModel(e.target.value)}
            />
          )}
          <p className="text-xs text-foreground/50">
            Tip: Sonnet is the usual default. Pick Opus (or another higher tier) only when you need
            extra reasoning quality.
          </p>
        </div>
      )}

      <Button
        type="button"
        disabled={saving || (mode === "live" && !model.trim())}
        onClick={save}
      >
        {saving ? "Saving…" : "Apply to strategy, audits, and content"}
      </Button>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
