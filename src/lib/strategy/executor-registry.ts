import { liveEngineLabel } from "@/lib/ai-providers";
import { getProviderKey } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";
import { createStrategyAnthropicExecutor } from "./anthropic-executor";
import { createStrategyGeminiExecutor } from "./gemini-executor";
import { getStrategyMockExecutor } from "./mock-executor";
import type { StrategyEvidenceContext, StrategyExecutor, StrategySynthesis } from "./types";

export async function getStrategyExecutor(): Promise<{ executor: StrategyExecutor; engine: string }> {
  const slot = await prisma.strategyModelSlot.findUnique({ where: { id: "strategy" } });
  if (slot?.enabled && slot.model) {
    if (slot.provider === "anthropic") {
      const apiKey = await getProviderKey("anthropic");
      if (!apiKey) {
        throw new Error("Strategy is set to Claude, but no Anthropic API key is connected.");
      }
      return {
        executor: createStrategyAnthropicExecutor(slot.model, apiKey),
        engine: liveEngineLabel("anthropic", slot.model),
      };
    }
    if (slot.provider === "gemini") {
      const apiKey = await getProviderKey("gemini");
      if (!apiKey) {
        throw new Error("Strategy is set to Gemini, but no Gemini API key is connected.");
      }
      return {
        executor: createStrategyGeminiExecutor(slot.model, apiKey),
        engine: liveEngineLabel("gemini", slot.model),
      };
    }
    throw new Error(`Unsupported strategy provider "${slot.provider}". Use Claude, Gemini, or Mock.`);
  }
  return { executor: getStrategyMockExecutor(), engine: "Mock" };
}

export async function runStrategySynthesis(ctx: StrategyEvidenceContext): Promise<StrategySynthesis> {
  const { executor } = await getStrategyExecutor();
  return executor.execute(ctx);
}
