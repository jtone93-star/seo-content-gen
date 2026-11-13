import type { AuditStep } from "@/generated/prisma/client";
import { generateGeminiJson } from "@/lib/gemini";
import { extractJson } from "@/lib/llm-json";
import { buildSystemPrompt, buildUserPrompt } from "./anthropic-executor";
import type { AuditStepExecutor, AuditStepOutput } from "./types";

export function createAuditGeminiExecutor(
  step: AuditStep,
  model: string,
  apiKey: string,
): AuditStepExecutor {
  return {
    step,
    async execute(ctx) {
      const text = await generateGeminiJson({
        apiKey,
        model,
        system: buildSystemPrompt(step, ctx),
        user: buildUserPrompt(step, ctx),
      });
      return extractJson(text, "Gemini") as AuditStepOutput;
    },
  };
}
