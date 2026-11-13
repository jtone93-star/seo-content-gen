"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StrategyModelSlot } from "@/generated/prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  EngineSlotFields,
  engineBadgeLabel,
  engineFromSlot,
  slotPayload,
  type EngineChoice,
  type ListedModel,
} from "./engine-slot-fields";

export function StrategyModelSlotForm({
  slot,
  anthropicConnected,
  geminiConnected,
  anthropicModels,
  geminiModels,
}: {
  slot: StrategyModelSlot | null;
  anthropicConnected: boolean;
  geminiConnected: boolean;
  anthropicModels: ListedModel[];
  geminiModels: ListedModel[];
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [engine, setEngine] = useState<EngineChoice>(engineFromSlot(slot));
  const [model, setModel] = useState(slot?.model ?? "");

  async function save() {
    setSaving(true);
    await fetch("/api/settings/strategy-model", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slotPayload(engine, model.trim())),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-line p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Living strategy synthesis</h3>
        <Badge className={slot?.enabled ? "bg-gold/15 text-gold" : ""}>
          {engineBadgeLabel(engineFromSlot(slot), slot?.model ?? "")}
        </Badge>
      </div>
      <p className="text-sm text-foreground/65">
        Turns audit findings, GA4/GSC summaries, and catalog KPIs into prioritized recommendations.
      </p>
      <EngineSlotFields
        id="strategy"
        engine={engine}
        model={model}
        anthropicModels={anthropicModels}
        geminiModels={geminiModels}
        anthropicConnected={anthropicConnected}
        geminiConnected={geminiConnected}
        onEngineChange={setEngine}
        onModelChange={setModel}
      />
      <Button
        type="button"
        variant="secondary"
        disabled={saving || (engine !== "mock" && !model.trim())}
        onClick={save}
      >
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}
