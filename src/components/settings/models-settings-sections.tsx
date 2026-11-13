"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuditModelSlotsForm } from "@/components/settings/audit-model-slots-form";
import { ModelSlotsForm } from "@/components/settings/model-slots-form";
import { StrategyModelSlotForm } from "@/components/settings/strategy-model-slot-form";
import {
  EngineSlotFields,
  slotPayload,
  useProviderModels,
  type EngineChoice,
} from "@/components/settings/engine-slot-fields";
import { Button } from "@/components/ui/button";
import type { AuditModelSlot, ModelSlot, StrategyModelSlot } from "@/generated/prisma/client";

export function ModelsSettingsSections({
  slots,
  auditSlots,
  strategySlot,
  anthropicConnected,
  geminiConnected,
}: {
  slots: ModelSlot[];
  auditSlots: AuditModelSlot[];
  strategySlot: StrategyModelSlot | null;
  anthropicConnected: boolean;
  geminiConnected: boolean;
}) {
  const router = useRouter();
  const { anthropicModels, geminiModels, geminiError, loadingGemini } = useProviderModels(
    anthropicConnected,
    geminiConnected,
  );
  const [bulkEngine, setBulkEngine] = useState<EngineChoice>(
    anthropicConnected ? "anthropic" : geminiConnected ? "gemini" : "mock",
  );
  const [bulkModel, setBulkModel] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function applyEverywhere() {
    setBulkSaving(true);
    setMessage(null);
    const payload = slotPayload(bulkEngine, bulkModel.trim());
    const [strategyRes, auditRes, contentRes] = await Promise.all([
      fetch("/api/settings/strategy-model", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
      fetch("/api/settings/audit-model-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAll: true, ...payload }),
      }),
      fetch("/api/settings/model-slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    ]);
    setBulkSaving(false);

    if (!strategyRes.ok || !auditRes.ok || !contentRes.ok) {
      const [strategyData, auditData, contentData] = await Promise.all([
        strategyRes.json().catch(() => ({})),
        auditRes.json().catch(() => ({})),
        contentRes.json().catch(() => ({})),
      ]);
      setMessage({
        kind: "error",
        text:
          strategyData.error ||
          auditData.error ||
          contentData.error ||
          "Failed to apply engine everywhere.",
      });
      return;
    }

    setMessage({
      kind: "ok",
      text:
        bulkEngine === "mock"
          ? "Strategy, all audit stages, and all content stages set to Mock."
          : `Strategy, all audit stages, and all content stages set to ${
              bulkEngine === "gemini" ? "Gemini" : "Claude"
            } · ${bulkModel.trim()}.`,
    });
    router.refresh();
  }

  return (
    <>
      {geminiConnected && (
        <div className="rounded-lg border border-line bg-panel/40 px-4 py-3 text-sm text-foreground/70">
          {loadingGemini
            ? "Loading Gemini models…"
            : geminiError
              ? `Could not load Gemini models: ${geminiError}. You can still type a model id manually.`
              : geminiModels.length > 0
                ? `Gemini: ${geminiModels.length} chat models available for all sections below.`
                : "Gemini key is connected, but no chat models were returned."}
        </div>
      )}

      <div className="rounded-xl border border-gold/30 bg-gold/[0.06] p-4 space-y-3">
        <div>
          <h3 className="font-medium">Default for everything</h3>
          <p className="text-sm text-foreground/65 mt-1">
            One click sets living strategy, every audit stage, and every content pipeline stage.
            You can still override any section or stage below.
          </p>
        </div>
        <EngineSlotFields
          id="bulk-everywhere"
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
          onClick={applyEverywhere}
        >
          {bulkSaving ? "Applying…" : "Apply to strategy, audit, and content"}
        </Button>
        {message && (
          <p className={`text-sm ${message.kind === "ok" ? "text-teal" : "text-red-400"}`}>
            {message.text}
          </p>
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Living strategy</h2>
        <StrategyModelSlotForm
          slot={strategySlot}
          anthropicConnected={anthropicConnected}
          geminiConnected={geminiConnected}
          anthropicModels={anthropicModels}
          geminiModels={geminiModels}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Site audit stages</h2>
        <AuditModelSlotsForm
          slots={auditSlots}
          anthropicConnected={anthropicConnected}
          geminiConnected={geminiConnected}
          anthropicModels={anthropicModels}
          geminiModels={geminiModels}
        />
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium">Content pipeline stages</h2>
        <ModelSlotsForm
          slots={slots}
          anthropicConnected={anthropicConnected}
          geminiConnected={geminiConnected}
          anthropicModels={anthropicModels}
          geminiModels={geminiModels}
        />
      </div>
    </>
  );
}
