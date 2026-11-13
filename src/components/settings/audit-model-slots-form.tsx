"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AuditModelSlot, AuditStep } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUDIT_STEPS, AUDIT_STEP_DESCRIPTIONS, AUDIT_STEP_LABELS } from "@/lib/audit/types";
import {
  EngineSlotFields,
  engineBadgeLabel,
  engineFromSlot,
  slotPayload,
  type EngineChoice,
  type ListedModel,
} from "./engine-slot-fields";

export function AuditModelSlotsForm({
  slots,
  anthropicConnected,
  geminiConnected,
  anthropicModels,
  geminiModels,
}: {
  slots: AuditModelSlot[];
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

  async function saveSlot(step: AuditStep, engine: EngineChoice, model: string) {
    setSaving(step);
    setMessage(null);
    const res = await fetch("/api/settings/audit-model-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step, ...slotPayload(engine, model) }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? `Failed to save ${step}.` });
      return;
    }
    setMessage({
      kind: "ok",
      text: `${AUDIT_STEP_LABELS[step]} saved.`,
    });
    router.refresh();
  }

  async function applyToAll() {
    setBulkSaving(true);
    setMessage(null);
    const res = await fetch("/api/settings/audit-model-slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ applyAll: true, ...slotPayload(bulkEngine, bulkModel.trim()) }),
    });
    const data = await res.json().catch(() => ({}));
    setBulkSaving(false);
    if (!res.ok) {
      setMessage({ kind: "error", text: data.error ?? "Failed to apply to all audit stages." });
      return;
    }
    setMessage({
      kind: "ok",
      text:
        bulkEngine === "mock"
          ? "All audit stages set to Mock."
          : `All audit stages set to ${bulkEngine === "gemini" ? "Gemini" : "Claude"} · ${bulkModel.trim()}.`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/70">
        Assign Claude or Gemini to each audit stage, or leave Mock for free placeholder output. Set
        a default for all stages first, then tweak individual stages as needed.
      </p>
      {!anthropicConnected && !geminiConnected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Connect an Anthropic or Gemini API key above to enable live audit models.
        </div>
      )}

      <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-4 space-y-3">
        <div>
          <h3 className="font-medium">Default for all audit stages</h3>
          <p className="text-sm text-foreground/65 mt-1">
            Apply once to every stage below. You can still edit and save any stage individually
            afterward.
          </p>
        </div>
        <EngineSlotFields
          id="bulk-audit"
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
          {bulkSaving ? "Applying…" : "Apply to all audit stages"}
        </Button>
      </div>

      {message && (
        <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      {AUDIT_STEPS.map((step) => {
        const slot = slots.find((s) => s.step === step);
        return (
          <AuditSlotRow
            key={`${step}-${slot?.updatedAt?.toString?.() ?? slot?.model ?? "empty"}`}
            step={step}
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

function AuditSlotRow({
  step,
  slot,
  anthropicModels,
  geminiModels,
  anthropicConnected,
  geminiConnected,
  saving,
  onSave,
}: {
  step: AuditStep;
  slot?: AuditModelSlot;
  anthropicModels: ListedModel[];
  geminiModels: ListedModel[];
  anthropicConnected: boolean;
  geminiConnected: boolean;
  saving: boolean;
  onSave: (step: AuditStep, engine: EngineChoice, model: string) => void;
}) {
  const [engine, setEngine] = useState<EngineChoice>(engineFromSlot(slot));
  const [model, setModel] = useState(slot?.model ?? "");

  return (
    <div className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{AUDIT_STEP_LABELS[step]}</h3>
        <Badge className={slot?.enabled ? "bg-gold/15 text-gold" : ""}>
          {engineBadgeLabel(engineFromSlot(slot), slot?.model ?? "")}
        </Badge>
      </div>
      <p className="text-sm text-foreground/65">{AUDIT_STEP_DESCRIPTIONS[step]}</p>
      <EngineSlotFields
        id={`audit-${step}`}
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
