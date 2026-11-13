import type { PipelineStep } from "@/generated/prisma/client";
import { generateGeminiJson } from "@/lib/gemini";
import { extractJson } from "@/lib/llm-json";
import { buildSystemPrompt, buildUserPrompt } from "./anthropic-executor";
import type { StepContext, StepExecutor, StepOutput } from "./types";

export function createGeminiExecutor(
  step: PipelineStep,
  model: string,
  apiKey: string,
): StepExecutor {
  return {
    step,
    async execute(ctx: StepContext): Promise<StepOutput> {
      const text = await generateGeminiJson({
        apiKey,
        model,
        system: buildSystemPrompt(step, ctx),
        user: buildUserPrompt(step, ctx),
      });
      const parsed = extractJson(text, "Gemini") as Record<string, unknown>;
      if (step === "FINAL") {
        parsed.contentType = ctx.project.contentType;
      }
      return parsed as unknown as StepOutput;
    },
  };
}
