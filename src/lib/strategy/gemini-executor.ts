import { generateGeminiJson } from "@/lib/gemini";
import { extractJson } from "@/lib/llm-json";
import {
  buildStrategySystemPrompt,
  buildStrategyUserPrompt,
  parseSynthesis,
} from "./anthropic-executor";
import type { StrategyExecutor } from "./types";

export function createStrategyGeminiExecutor(model: string, apiKey: string): StrategyExecutor {
  return {
    async execute(ctx) {
      const text = await generateGeminiJson({
        apiKey,
        model,
        system: buildStrategySystemPrompt(),
        user: buildStrategyUserPrompt(ctx),
      });
      return parseSynthesis(extractJson(text, "Gemini"));
    },
  };
}
