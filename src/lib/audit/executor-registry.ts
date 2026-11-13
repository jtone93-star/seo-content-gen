import type { AuditStep } from "@/generated/prisma/client";
import { getProviderKey } from "@/lib/credentials";
import { prisma } from "@/lib/prisma";
import { createAuditAnthropicExecutor } from "./anthropic-executor";
import { createAuditGeminiExecutor } from "./gemini-executor";
import { getAuditMockExecutor } from "./mock-executors";
import type { AuditStepContext, AuditStepExecutor, AuditStepOutput } from "./types";

export async function getAuditExecutor(step: AuditStep): Promise<AuditStepExecutor> {
  const slot = await prisma.auditModelSlot.findUnique({ where: { step } });

  if (slot?.enabled && slot.model) {
    if (slot.provider === "anthropic") {
      const apiKey = await getProviderKey("anthropic");
      if (!apiKey) {
        throw new Error(
          `Audit step ${step} is set to Claude (${slot.model}), but no Anthropic API key is connected.`,
        );
      }
      return createAuditAnthropicExecutor(step, slot.model, apiKey);
    }
    if (slot.provider === "gemini") {
      const apiKey = await getProviderKey("gemini");
      if (!apiKey) {
        throw new Error(
          `Audit step ${step} is set to Gemini (${slot.model}), but no Gemini API key is connected.`,
        );
      }
      return createAuditGeminiExecutor(step, slot.model, apiKey);
    }
    throw new Error(`Unsupported audit provider "${slot.provider}". Use Claude, Gemini, or Mock.`);
  }

  return getAuditMockExecutor(step);
}

export async function runAuditStep(
  ctx: AuditStepContext,
  step: AuditStep,
): Promise<AuditStepOutput> {
  const executor = await getAuditExecutor(step);
  return executor.execute(ctx);
}
