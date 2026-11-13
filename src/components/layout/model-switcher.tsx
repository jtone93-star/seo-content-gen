"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";

type ListedModel = { id: string; name: string };

export function ModelSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [models, setModels] = useState<ListedModel[]>([]);
  const [value, setValue] = useState("mock");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const defaultsRes = await fetch("/api/settings/ai-defaults");
      const defaults = await defaultsRes.json().catch(() => ({}));
      if (cancelled) return;
      const isConnected = Boolean(defaults.anthropicConnected);
      setConnected(isConnected);
      setValue(defaults.enabled && defaults.model ? String(defaults.model) : "mock");
      if (!isConnected) {
        setModels([]);
        return;
      }
      const modelsRes = await fetch("/api/settings/anthropic-models");
      const listed = await modelsRes.json().catch(() => ({}));
      if (cancelled) return;
      setModels((listed.models ?? []) as ListedModel[]);
    }
    load().catch(() => {
      if (!cancelled) setNote("Could not load models.");
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function onChange(next: string) {
    const previous = value;
    setValue(next);
    setSaving(true);
    setNote(null);
    const res = await fetch("/api/settings/ai-defaults", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: next !== "mock",
        model: next === "mock" ? null : next,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setValue(previous);
      setNote(typeof data.error === "string" ? data.error : "Could not switch model.");
      return;
    }
    setNote(next === "mock" ? "Mock" : "Updated");
    router.refresh();
  }

  const known = new Set(models.map((model) => model.id));
  const custom = value !== "mock" && !known.has(value);

  return (
    <div className="mb-3 space-y-1.5 px-1">
      <label htmlFor="sidebar-model" className="px-1.5 text-xs text-muted">
        Model
      </label>
      <Select
        id="sidebar-model"
        value={value}
        disabled={saving || !connected}
        className="bg-[#0c0f16] px-2 py-1.5 text-xs"
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="mock">Mock</option>
        {custom && <option value={value}>{value}</option>}
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name}
          </option>
        ))}
      </Select>
      <p className="px-1.5 text-[11px] text-foreground/45">
        {!connected ? "Connect Claude in AI models." : saving ? "Saving…" : note}
      </p>
    </div>
  );
}
