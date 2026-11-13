import Anthropic from "@anthropic-ai/sdk";
import type { StrategyRecommendationCategory } from "@/generated/prisma/client";
import { extractJson } from "@/lib/llm-json";
import { compactEvidence } from "./evidence";
import type {
  RecommendationDraft,
  StrategyEvidenceContext,
  StrategyExecutor,
  StrategySynthesis,
} from "./types";
import { STRATEGY_CATEGORIES } from "./types";

const SHAPE = `{
  "summary": "string",
  "recommendations": [{
    "category": "TECHNICAL|CONTENT|LINKING|UX|MEASUREMENT|AI_VISIBILITY",
    "title": "string",
    "rationale": "string",
    "instructions": "numbered how-to steps a human can execute",
    "relatedUrls": ["string"],
    "targetKeyword": "string or null",
    "priority": 1,
    "effort": 3,
    "impact": 4,
    "evidence": ["short citations from the supplied data"]
  }]
}`;

export function buildStrategySystemPrompt(): string {
  return [
    "You are an SEO/content strategist turning a site AUDIT findings pack plus GA4/GSC summaries into a living strategy.",
    "Honor the client's structured KPIs as the success definition. Do not invent metrics that are not in the evidence or KPI list.",
    "Each recommendation must be a concrete play a human can execute this quarter.",
    "CONTENT plays should be suitable to hand to a content generator (topic, keyword, source URLs, notes).",
    "TECHNICAL, LINKING, UX, MEASUREMENT, and AI_VISIBILITY plays must include numbered instructions a specialist can follow without deploying from this app.",
    "Never invent URLs, queries, or numbers that are not supported by the supplied data.",
    "Return 6–12 prioritized recommendations. Mix types when the evidence supports it.",
    "Respond with ONLY valid JSON matching this shape:",
    SHAPE,
  ].join("\n");
}

export function buildStrategyUserPrompt(ctx: StrategyEvidenceContext): string {
  return `Build the living strategy recommendations.\n\nEVIDENCE PACK:\n${compactEvidence(ctx)}`;
}

function clamp(n: unknown, min: number, max: number, fallback: number): number {
  const value = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

export function parseSynthesis(raw: unknown): StrategySynthesis {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(obj.recommendations) ? obj.recommendations : [];
  const recommendations: RecommendationDraft[] = [];

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const category = String(rec.category ?? "") as StrategyRecommendationCategory;
    if (!STRATEGY_CATEGORIES.includes(category)) continue;
    const title = String(rec.title ?? "").trim();
    if (!title) continue;
    recommendations.push({
      category,
      title,
      rationale: String(rec.rationale ?? "").trim() || title,
      instructions:
        String(rec.instructions ?? "").trim() ||
        "1. Confirm the issue on the listed URLs.\n2. Apply the fix.\n3. Recheck evidence.",
      relatedUrls: Array.isArray(rec.relatedUrls)
        ? rec.relatedUrls.map((u) => String(u).trim()).filter(Boolean).slice(0, 20)
        : [],
      targetKeyword: rec.targetKeyword ? String(rec.targetKeyword) : null,
      priority: clamp(rec.priority, 1, 99, recommendations.length + 1),
      effort: clamp(rec.effort, 1, 5, 3),
      impact: clamp(rec.impact, 1, 5, 3),
      evidence: Array.isArray(rec.evidence)
        ? rec.evidence.map((e) => String(e).trim()).filter(Boolean).slice(0, 12)
        : [],
    });
  }

  if (!recommendations.length) {
    throw new Error("The model returned no usable recommendations.");
  }

  return {
    summary: String(obj.summary ?? "").trim() || "Strategy recommendations generated from audit evidence.",
    recommendations: recommendations.slice(0, 16),
  };
}

export function createStrategyAnthropicExecutor(model: string, apiKey: string): StrategyExecutor {
  const client = new Anthropic({ apiKey });
  return {
    async execute(ctx) {
      const response = await client.messages.create({
        model,
        max_tokens: 8192,
        system: buildStrategySystemPrompt(),
        messages: [{ role: "user", content: buildStrategyUserPrompt(ctx) }],
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n");
      return parseSynthesis(extractJson(text, "Claude"));
    },
  };
}
