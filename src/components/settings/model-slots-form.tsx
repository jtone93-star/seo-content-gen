"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ModelSlot } from "@/generated/prisma/client";
import { PIPELINE_STEPS, STEP_DESCRIPTIONS, STEP_LABELS } from "@/lib/pipeline/types";

const CONFIGURABLE_STEPS = PIPELINE_STEPS;

interface ClaudeModel {
  id: string;
  name: string;
}

export function ModelSlotsForm({
  slots,
  connected,
}: {
  slots: ModelSlot[];
  connected: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState<string | null>(null);
  const [models, setModels] = useState<ClaudeModel[]>([]);

  useEffect(() => {
    if (!connected) return;
    fetch("/api/settings/anthropic-models")
      .then((r) => r.json())
      .then((d) => setModels(d.models ?? []))
      .catch(() => setModels([]));
  }, [connected]);

  async function saveSlot(step: string, model: string, enabled: boolean) {
    setSaving(step);
    await fetch(`/api/settings/model-slots/${step}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "anthropic",
        model: model || null,
        enabled,
      }),
    });
    setSaving(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-foreground/70">
        Choose which Claude model runs each pipeline step. Enabled steps call your connected
        Anthropic account; disabled steps use built-in mock output so you can keep building without
        spending credits.
      </p>

      {!connected && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
          Connect your Anthropic API key above to enable live models. Until then, every step runs on
          mock output.
        </div>
      )}

      {CONFIGURABLE_STEPS.map((step) => {
        const slot = slots.find((s) => s.step === step);
        return (
          <SlotRow
            key={step}
            step={step}
            label={STEP_LABELS[step]}
            description={STEP_DESCRIPTIONS[step]}
            slot={slot}
            models={models}
            connected={connected}
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
  models,
  connected,
  saving,
  onSave,
}: {
  step: string;
  label: string;
  description: string;
  slot?: ModelSlot;
  models: ClaudeModel[];
  connected: boolean;
  saving: boolean;
  onSave: (step: string, model: string, enabled: boolean) => void;
}) {
  const [model, setModel] = useState(slot?.model ?? "");
  const [enabled, setEnabled] = useState(slot?.enabled ?? false);

  const listId = `models-${step}`;

  return (
    <div className="rounded-xl border border-foreground/10 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">{label}</h3>
        <Badge className={slot?.enabled ? "bg-green-500/15" : ""}>
          {slot?.enabled ? `Claude · ${slot.model}` : "Mock / disabled"}
        </Badge>
      </div>
      <p className="text-sm text-foreground/65 leading-relaxed">{description}</p>

      <div>
        <Label htmlFor={`${step}-model`}>Claude model</Label>
        <Input
          id={`${step}-model`}
          list={listId}
          placeholder="claude-… (pick or type a model id)"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!connected}
        />
        <datalist id={listId}>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </datalist>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground/70">
        <input
          type="checkbox"
          className="rounded"
          checked={enabled}
          disabled={!connected}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Run this step on Claude
      </label>

      <Button
        type="button"
        variant="secondary"
        disabled={!connected || saving || (enabled && !model.trim())}
        onClick={() => onSave(step, model.trim(), enabled)}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
