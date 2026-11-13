import type { PipelineStep } from "@/generated/prisma/client";
import { getProviderKey } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";
import { createAnthropicExecutor } from "./anthropic-executor";
import { createGeminiExecutor } from "./gemini-executor";
import { getMockExecutor } from "./mock-executors";
import type { StepContext, StepExecutor, StepOutput } from "./types";

export async function getExecutor(step: PipelineStep): Promise<StepExecutor> {
  const slot = await prisma.modelSlot.findUnique({ where: { step } });

  if (slot?.enabled && slot.model) {
    if (slot.provider === "anthropic") {
      const apiKey = await getProviderKey("anthropic");
      if (!apiKey) {
        throw new Error(
          `Step ${step} is set to run on Claude (${slot.model}), but no Anthropic API key is connected. Add your key in Settings → AI models.`,
        );
      }
      return createAnthropicExecutor(step, slot.model, apiKey);
    }

    if (slot.provider === "gemini") {
      const apiKey = await getProviderKey("gemini");
      if (!apiKey) {
        throw new Error(
          `Step ${step} is set to run on Gemini (${slot.model}), but no Gemini API key is connected. Add your key in Settings → AI models.`,
        );
      }
      return createGeminiExecutor(step, slot.model, apiKey);
    }

    throw new Error(
      `Model slot for ${step} uses provider "${slot.provider}", which is not supported. Use Claude, Gemini, or Mock.`,
    );
  }

  return getMockExecutor(step);
}

export async function runStep(ctx: StepContext, step: PipelineStep): Promise<StepOutput> {
  const executor = await getExecutor(step);
  return executor.execute(ctx);
}
