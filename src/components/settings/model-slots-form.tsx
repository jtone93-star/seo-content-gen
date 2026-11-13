"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ModelSlot } from "@/generated/prisma/client";
import { PIPELINE_STEPS, STEP_DESCRIPTIONS, STEP_LABELS } from "@/lib/pipeline/types";
import {
  EngineSlotFields,
  engineBadgeLabel,
  engineFromSlot,
  slotPayload,
  type EngineChoice,
  type ListedModel,
} from "./engine-slot-fields";

export function ModelSlotsForm({
  slots,
  anthropicConnected,
  geminiConnected,
  anthropicModels,
  geminiModels,
}: {
  slots: ModelSlot[];
  anthropicConnected: boolean;
  geminiConnected: boolean;
  anthropicModels: ListedModel[];
  geminiModels: ListedModel[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [bulkEngine, setBulkEngine] = useState<EngineChoice>(
    anthropicConnected ? "anthropic" : geminiConnected ? "gemini" : "mock",
  );
  const [bulkModel, setBulkModel] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function saveSlot(step: string, engine: EngineChoice, model: string) {
    setSaving(step);
    setMessage(null);
    const res = await fetch(`/api/settings/model-slots/${step}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slotPayload(engine, model)),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? `Failed to save ${step}.` });
      return;
    }
    setMessage({ kind: "ok", text: `${STEP_LABELS[step as keyof typeof STEP_LABELS] ?? step} saved.` });
    router.refresh();
  }

  async function applyToAll() {
    setBulkSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/model-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slotPayload(bulkEngine, bulkModel.trim())),
    });
    const data = await res.json().catch(() => ({}));
    setBulkSaving(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Failed to apply to all stages." });
      return;
    }
    setMessage({
      kind: "ok",
      text:
        bulkEngine === "mock"
          ? "All content stages set to Mock."
          : `All content stages set to ${bulkEngine === "gemini" ? "Gemini" : "Claude"} · ${bulkModel.trim()}.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/70">
        Choose Mock, Claude, or Gemini for each pipeline step. Set a default for all stages first,
        then tweak individual stages as needed.
      </p>

      {!anthropicConnected && !geminiConnected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Connect an Anthropic or Gemini API key above to enable live models. Until then, every
          step runs on mock output.
        </div>
      )}

      <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-4 space-y-3">
        <div>
          <h3 className="font-medium">Default for all content stages</h3>
          <p className="text-sm text-foreground/65 mt-1">
            Apply once to every stage below. You can still edit and save any stage individually
            afterward.
          </p>
        </div>
        <EngineSlotFields
          id="bulk-content"
          engine={bulkEngine}
          model={bulkModel}
          anthropicModels={anthropicModels}
          geminiModels={geminiModels}
          anthropicConnected={anthropicConnected}
          geminiConnected={geminiConnected}
          onEngineChange={(next) => {
            setBulkEngine(next);
            setBulkModel("");
          }}
          onModelChange={setBulkModel}
        />
        <Button
          type="button"
          disabled={bulkSaving || (bulkEngine !== "mock" && !bulkModel.trim())}
          onClick={applyToAll}
        >
          {bulkSaving ? "Applying…" : "Apply to all content stages"}
        </Button>
      </div>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      {PIPELINE_STEPS.map((step) => {
        const slot = slots.find((s) => s.step === step);
        return (
          <SlotRow
            key={`${step}-${slot?.updatedAt?.toString?.() ?? slot?.model ?? "empty"}`}
            step={step}
            label={STEP_LABELS[step]}
            description={STEP_DESCRIPTIONS[step]}
            slot={slot}
            anthropicModels={anthropicModels}
            geminiModels={geminiModels}
            anthropicConnected={anthropicConnected}
            geminiConnected={geminiConnected}
            saving={saving === step}
            onSave={saveSlot}
          />
        );
      })}
    </div>
  );
}

function SlotRow({
  step,
  label,
  description,
  slot,
  anthropicModels,
  geminiModels,
  anthropicConnected,
  geminiConnected,
  saving,
  onSave,
}: {
  step: string;
  label: string;
  description: string;
  slot?: ModelSlot;
  anthropicModels: { id: string; name: string }[];
  geminiModels: { id: string; name: string }[];
  anthropicConnected: boolean;
  geminiConnected: boolean;
  saving: boolean;
  onSave: (step: string, engine: EngineChoice, model: string) => void;
}) {
  const [engine, setEngine] = useState<EngineChoice>(engineFromSlot(slot));
  const [model, setModel] = useState(slot?.model ?? "");

  useEffect(() => {
    setEngine(engineFromSlot(slot));
    setModel(slot?.model ?? "");
  }, [slot?.enabled, slot?.provider, slot?.model]);

  return (
    <div className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{label}</h3>
        <Badge className={slot?.enabled ? "bg-gold/15 text-gold" : ""}>
          {engineBadgeLabel(engineFromSlot(slot), slot?.model ?? "")}
        </Badge>
      </div>
      <p className="text-sm text-foreground/65 leading-relaxed">{description}</p>
      <EngineSlotFields
        id={step}
        engine={engine}
        model={model}
        anthropicModels={anthropicModels}
        geminiModels={geminiModels}
        anthropicConnected={anthropicConnected}
        geminiConnected={geminiConnected}
        onEngineChange={(next) => {
          setEngine(next);
          if (next !== engine) setModel("");
        }}
        onModelChange={setModel}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={saving || (engine !== "mock" && !model.trim())}
        onClick={() => onSave(step, engine, model.trim())}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
