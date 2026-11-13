import Anthropic from "@anthropic-ai/sdk";
import type { AuditStep } from "@/generated/prisma/client";
import { extractJson } from "@/lib/llm-json";
import { AUDIT_STEP_DESCRIPTIONS, AUDIT_STEP_LABELS } from "./types";
import type { AuditStepContext, AuditStepExecutor, AuditStepOutput } from "./types";

const SHAPES: Record<AuditStep, string> = {
  CRAWL_TECHNICAL:
    '{"summary":"string","blockers":["string"],"findings":[{"id":"string","severity":"blocker|high|medium|low|info","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  INDEXATION:
    '{"summary":"string","coverageThemes":["string"],"findings":[{"id":"string","severity":"high","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  VISIBILITY_DEMAND:
    '{"summary":"string","opportunityPages":[{"url":"string","rationale":"string","signals":["string"]}],"findings":[{"id":"string","severity":"medium","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  INTERNAL_LINKING:
    '{"summary":"string","architectureNotes":["string"],"findings":[{"id":"string","severity":"medium","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  PAGE_SHORTLIST:
    '{"summary":"string","nominatedPages":[{"url":"string","rationale":"string","priority":1}],"findings":[{"id":"string","severity":"info","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  PAGE_DEEP_DIVE:
    '{"summary":"string","pages":[{"url":"string","strengths":["string"],"weaknesses":["string"],"notes":"string"}],"findings":[{"id":"string","severity":"medium","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  KEYWORD_RELEVANCE:
    '{"summary":"string","mismatches":[{"url":"string","issue":"string","queries":["string"]}],"findings":[{"id":"string","severity":"high","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  AI_CRAWLABILITY:
    '{"summary":"string","agentAccessNotes":["string"],"findings":[{"id":"string","severity":"medium","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  AI_EXTRACTABILITY:
    '{"summary":"string","extractabilityNotes":["string"],"findings":[{"id":"string","severity":"medium","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
  FINDINGS_ROLLUP:
    '{"summary":"string","opportunities":[{"title":"string","category":"TECHNICAL|CONTENT|LINKING|UX|MEASUREMENT|AI_VISIBILITY","detail":"string","evidence":["string"],"relatedUrls":["string"]}],"openQuestions":["string"],"findings":[{"id":"string","severity":"info","title":"string","detail":"string","evidence":["string"],"urls":["string"]}]}',
};

export function buildSystemPrompt(step: AuditStep, ctx: AuditStepContext): string {
  const { client } = ctx;
  return [
    "You are an expert SEO and AI-visibility auditor running the \"" + AUDIT_STEP_LABELS[step] + "\" stage.",
    "This is an AUDIT, not a growth strategy. Diagnose issues and note obvious opportunities with evidence.",
    "Do not invent a prioritized roadmap against a traffic % goal. Leave goal-based planning for a later Strategy module.",
    "",
    "Finding quality rules:",
    "- Prefer specific, page-level issues over generic advice.",
    "- Every finding that applies to pages MUST include those exact URLs in `urls`.",
    "- Put the concrete problem in `detail` (what is wrong on which URL / query / signal).",
    "- Prefer multiple focused findings over one broad statement.",
    "- If you only have site-wide evidence, say that explicitly and leave `urls` empty.",
    "- Never invent URLs, metrics, or queries that are not supported by the supplied data.",
    "",
    "Client context:",
    `- Brand/client: ${client.name}`,
    `- Industry: ${client.industry ?? "unspecified"}`,
    `- Audience: ${client.audience ?? "unspecified"}`,
    `- SEO notes: ${client.seoNotes ?? "none"}`,
    "",
    "Respond with ONLY valid JSON. No markdown fences, no commentary.",
  ].join("\n");
}

export function buildUserPrompt(step: AuditStep, ctx: AuditStepContext): string {
  const lines = [
    "AUDIT CONTEXT",
    `- Name: ${ctx.audit.name}`,
    `- Seed URL: ${ctx.audit.seedUrl ?? "(none — site-level)"}`,
    `- Scope notes: ${ctx.audit.scopeNotes?.trim() || "(none)"}`,
    `- Selected pages for page-level stages: ${
      ctx.audit.selectedPages.length ? ctx.audit.selectedPages.join(", ") : "(none yet)"
    }`,
    "",
    "DATA SOURCE SUMMARIES:",
    JSON.stringify(
      ctx.dataSources.map((s) => ({
        id: s.id,
        type: s.type,
        label: s.label,
        summary: s.summary,
      })),
    ),
  ];

  const priorKeys = Object.keys(ctx.priorOutputs) as AuditStep[];
  if (priorKeys.length) {
    lines.push("", "PRIOR AUDIT STAGE OUTPUTS:");
    for (const key of priorKeys) {
      lines.push(`### ${AUDIT_STEP_LABELS[key]}`, JSON.stringify(ctx.priorOutputs[key]));
    }
  }

  lines.push(
    "",
    `TASK: ${AUDIT_STEP_DESCRIPTIONS[step]}`,
    "",
    "Cite evidence from the provided sources. If evidence is missing, say so in findings instead of fabricating metrics.",
    "For each concrete issue, include the affected URL(s) in findings.urls (and in stage-specific url fields when present).",
    "",
    "Return JSON matching EXACTLY this shape:",
    SHAPES[step],
  );

  return lines.join("\n");
}

export function createAuditAnthropicExecutor(
  step: AuditStep,
  model: string,
  apiKey: string,
): AuditStepExecutor {
  return {
    step,
    async execute(ctx) {
      const anthropic = new Anthropic({ apiKey });
      const response = await anthropic.messages.create({
        model,
        max_tokens: 8000,
        system: buildSystemPrompt(step, ctx),
        messages: [{ role: "user", content: buildUserPrompt(step, ctx) }],
      });
      const text = response.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("\n");
      return extractJson(text, "Claude") as AuditStepOutput;
    },
  };
}
