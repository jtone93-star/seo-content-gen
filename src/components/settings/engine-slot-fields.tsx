"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { liveEngineLabel, providerDisplayName, type AiProvider } from "@/lib/ai-providers";

export type EngineChoice = "mock" | AiProvider;
export type ListedModel = { id: string; name: string };

export function engineFromSlot(slot?: {
  enabled: boolean;
  provider: string | null;
} | null): EngineChoice {
  if (slot?.enabled && (slot.provider === "anthropic" || slot.provider === "gemini")) {
    return slot.provider;
  }
  return "mock";
}

/** Shared model lists for the AI models page (fetch once, pass into all forms). */
export function useProviderModels(anthropicConnected: boolean, geminiConnected: boolean) {
  const [anthropicModels, setAnthropicModels] = useState<ListedModel[]>([]);
  const [geminiModels, setGeminiModels] = useState<ListedModel[]>([]);
  const [geminiError, setGeminiError] = useState<string | null>(null);
  const [loadingGemini, setLoadingGemini] = useState(false);

  useEffect(() => {
    if (!anthropicConnected) {
      setAnthropicModels([]);
      return;
    }
    fetch("/api/settings/anthropic-models")
      .then((r) => r.json())
      .then((d) => setAnthropicModels(d.models ?? []))
      .catch(() => setAnthropicModels([]));
  }, [anthropicConnected]);

  useEffect(() => {
    if (!geminiConnected) {
      setGeminiModels([]);
      setGeminiError(null);
      return;
    }
    setLoadingGemini(true);
    fetch("/api/settings/gemini-models")
      .then((r) => r.json())
      .then((d) => {
        setGeminiModels(d.models ?? []);
        setGeminiError(typeof d.error === "string" && d.error ? d.error : null);
      })
      .catch(() => {
        setGeminiModels([]);
        setGeminiError("Could not load Gemini models.");
      })
      .finally(() => setLoadingGemini(false));
  }, [geminiConnected]);

  return { anthropicModels, geminiModels, geminiError, loadingGemini };
}

export function EngineSlotFields({
  id,
  engine,
  model,
  anthropicModels,
  geminiModels,
  anthropicConnected,
  geminiConnected,
  onEngineChange,
  onModelChange,
}: {
  id: string;
  engine: EngineChoice;
  model: string;
  anthropicModels: ListedModel[];
  geminiModels: ListedModel[];
  anthropicConnected: boolean;
  geminiConnected: boolean;
  onEngineChange: (engine: EngineChoice) => void;
  onModelChange: (model: string) => void;
}) {
  const live = engine !== "mock";
  const connected =
    engine === "gemini" ? geminiConnected : engine === "anthropic" ? anthropicConnected : true;
  const models = engine === "gemini" ? geminiModels : anthropicModels;
  const placeholder = engine === "gemini" ? "gemini-…" : engine === "anthropic" ? "claude-…" : "";
  const knownIds = new Set(models.map((m) => m.id));
  const modelIsCustom = Boolean(model && !knownIds.has(model));
  const [forceCustom, setForceCustom] = useState(false);
  const showCustomInput = models.length === 0 || forceCustom || modelIsCustom;

  useEffect(() => {
    setForceCustom(false);
  }, [engine]);

  return (
    <>
      <div>
        <Label htmlFor={`${id}-engine`}>Engine</Label>
        <Select
          id={`${id}-engine`}
          value={engine}
          onChange={(e) => onEngineChange(e.target.value as EngineChoice)}
        >
          <option value="mock">Mock (free)</option>
          <option value="anthropic" disabled={!anthropicConnected}>
            Claude{anthropicConnected ? "" : " — connect key first"}
          </option>
          {/* Gemini hidden from operator UX (Claude-first); executor code retained. */}
        </Select>
      </div>
      {live && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-model`}>{providerDisplayName(engine)} model</Label>
          {models.length > 0 ? (
            <Select
              id={`${id}-model`}
              value={showCustomInput ? "__custom__" : model}
              disabled={!connected}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "__custom__") {
                  setForceCustom(true);
                  onModelChange("");
                  return;
                }
                setForceCustom(false);
                onModelChange(value);
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
          {showCustomInput && (
            <Input
              id={`${id}-model-custom`}
              value={model}
              disabled={!connected}
              placeholder={
                models.length === 0
                  ? `${placeholder} (type a model id — list unavailable)`
                  : placeholder
              }
              onChange={(e) => onModelChange(e.target.value)}
            />
          )}
          {models.length > 0 && (
            <p className="text-xs text-foreground/50">{models.length} models available</p>
          )}
        </div>
      )}
    </>
  );
}

export function engineBadgeLabel(engine: EngineChoice, model: string) {
  if (engine === "mock") return "Mock / disabled";
  return liveEngineLabel(engine, model || null);
}

export function slotPayload(engine: EngineChoice, model: string) {
  return {
    provider: engine === "mock" ? null : engine,
    model: engine === "mock" ? null : model || null,
    enabled: engine !== "mock",
  };
}
