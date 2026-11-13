import Anthropic from "@anthropic-ai/sdk";
import type { PipelineStep } from "@/generated/prisma/client";
import { extractJson } from "@/lib/llm-json";
import { AI_VISIBILITY_RULES } from "./ai-visibility";
import { STEP_LABELS } from "./types";
import type { StepContext, StepExecutor, StepOutput } from "./types";

/**
 * Per-step JSON shape + instructions. Claude must return JSON matching the shape
 * so the rest of the pipeline (viewers, downstream steps) keeps working exactly
 * as it does with the mock executors.
 */
const STEP_SPECS: Record<PipelineStep, { instruction: string; shape: string }> = {
  BRIEF: {
    instruction:
      "Produce a content brief. Define the search intent, keywords, audience, the goal, recommended format, a realistic word-count target, how this piece will differentiate, must-cover topics, a CTA, success metrics, GEO/AI-visibility goals, and the primary named entities.",
    shape:
      '{"searchIntent":"string","primaryKeyword":"string","secondaryKeywords":["string"],"targetAudience":"string","contentGoal":"string","recommendedFormat":"string","wordCountTarget":0,"differentiation":"string","mustCoverTopics":["string"],"cta":"string","successMetrics":["string"],"aiVisibilityGoals":["string"],"primaryEntities":["string"]}',
  },
  RESEARCH: {
    instruction:
      "Synthesize research from the provided notes/URLs and your knowledge. Summarize the landscape, list sources with notes, a SERP snapshot of likely competing results, People Also Ask questions, competitor angles, content gaps to exploit, and a recommended word range.",
    shape:
      '{"summary":"string","sources":[{"url":"string","notes":"string"}],"serpSnapshot":[{"url":"string","title":"string","format":"string","estimatedWords":0,"angle":"string"}],"peopleAlsoAsk":["string"],"competitorAngles":["string"],"contentGaps":["string"],"recommendedWordRange":{"min":0,"max":0}}',
  },
  OUTLINE: {
    instruction:
      "Create a heading outline. Use one clear angle, H2/H3 sections with bullet points, a question-style FAQ section (maps to FAQPage schema), an internal-link plan, a CTA, key takeaways, and formatting notes for AI visibility.",
    shape:
      '{"title":"string","angle":"string","sections":[{"level":"h2","heading":"string","bullets":["string"]}],"faqSection":[{"question":"string","answerOutline":"string"}],"internalLinks":[{"anchorText":"string","targetUrl":"string","placement":"string","rationale":"string"}],"cta":"string","keyTakeaways":["string"],"formattingNotes":["string"]}',
  },
  DRAFT: {
    instruction:
      "Write the full draft in Markdown following the outline. Lead each H2 with a direct 1-2 sentence answer before elaborating. Return the markdown in `body`, the word count, and notes on the structure choices.",
    shape: '{"body":"markdown string","wordCount":0,"structureNotes":["string"]}',
  },
  EDIT: {
    instruction:
      "Edit the draft for clarity, flow, tone match, and concision without losing substance. Return the improved Markdown in `body` and a summary of the changes you made.",
    shape: '{"body":"markdown string","changesSummary":["string"]}',
  },
  QA: {
    instruction:
      "Run QA & compliance on the edited draft. Check: (1) how it reads — awkward phrasing, overly long sentences, reading-level mismatch; (2) obvious factual misspeaks or internally inconsistent claims versus the brief, research notes, and client profile (do not invent live web facts; flag what looks wrong or unsupported); (3) banned words; (4) required disclaimers; (5) claims that need a source. If it fails, set passed=false, choose rewindTo as the earliest stage that can fix the issues (RESEARCH, OUTLINE, DRAFT, or EDIT — prefer EDIT for wording/facts in the copy), and put concrete fix instructions in feedback.",
    shape:
      '{"passed":true,"readabilityScore":"string","readingLevelMatch":true,"readabilityIssues":["string"],"factMisspeaks":[{"claim":"string","issue":"string","suggestedFix":"string"}],"claimsToVerify":[{"claim":"string","status":"ok|needs_source|verified"}],"bannedWordsFound":["string"],"disclaimerIncluded":true,"checklist":[{"item":"string","passed":true}],"notes":"string","rewindTo":null,"feedback":"string"}',
  },
  SEO: {
    instruction:
      "Optimize the copy for SEO and generative AI visibility. Return the optimized Markdown body, a meta title (<=60 chars), meta description (<=155 chars), the header hierarchy, the primary keyword, a keyword map, short answer blocks for AI Overviews/featured snippets, and AI-visibility notes.",
    shape:
      '{"body":"markdown string","metaTitle":"string","metaDescription":"string","headers":[{"level":"h2","text":"string"}],"primaryKeyword":"string","keywordMap":[{"keyword":"string","count":0,"placement":["string"]}],"answerBlocks":[{"question":"string","answer":"string"}],"aiVisibilityNotes":["string"]}',
  },
  TECHNICAL_SEO: {
    instruction:
      "Produce technical SEO metadata. Return a URL slug, meta + Open Graph tags, a schema.org type, a valid JSON-LD string (include FAQPage and speakable where relevant), canonical URL (or null), index recommendation, hreflang (or null), a publishing checklist, an agent/llms.txt-style summary, and CSS selectors for speakable content.",
    shape:
      '{"slug":"string","metaTitle":"string","metaDescription":"string","ogTitle":"string","ogDescription":"string","schemaType":"string","schemaJsonLd":"json-ld string","canonicalUrl":null,"indexRecommendation":"index","hreflang":null,"publishingChecklist":[{"item":"string","passed":true}],"agentSummary":"string","speakableSelectors":["string"]}',
  },
  SHIP_CHECK: {
    instruction:
      "Judge whether the piece is ready to ship. Review SEO copy, technical SEO, structure, meta length, schema, answer-first openings, FAQ, and whether Final packaging would look publishable. This is not the brand/compliance QA. If it fails, set passed=false, rewindTo as OUTLINE, DRAFT, EDIT, SEO, or TECHNICAL_SEO (the latest stage that can fix the issue), and put concrete fix instructions in feedback.",
    shape:
      '{"passed":true,"checklist":[{"item":"string","passed":true}],"notes":"string","rewindTo":null,"feedback":"string"}',
  },
  FINAL: {
    instruction:
      "Assemble the final deliverable. Combine the optimized copy and technical metadata into a publish-ready package. Return the final Markdown body, meta title/description, header hierarchy, slug, schema type + JSON-LD, an export-ready Markdown document (with front matter), an agent summary, and answer blocks.",
    shape:
      '{"body":"markdown string","metaTitle":"string","metaDescription":"string","headers":[{"level":"h1","text":"string"}],"slug":"string","schemaType":"string","schemaJsonLd":"json-ld string","contentType":"BLOG","exportMarkdown":"markdown string","agentSummary":"string","answerBlocks":[{"question":"string","answer":"string"}]}',
  },
};

export function buildSystemPrompt(step: PipelineStep, ctx: StepContext): string {
  const { client } = ctx;
  const wordsToAvoid = client.wordsToAvoid?.length ? client.wordsToAvoid.join(", ") : "none";

  return [
    `You are an expert SEO content strategist executing the "${STEP_LABELS[step]}" stage of a content-generation pipeline.`,
    "",
    "Client profile constraints:",
    `- Brand/client: ${client.name}`,
    `- Industry: ${client.industry ?? "unspecified"}`,
    `- Audience: ${client.audience ?? "unspecified"}`,
    `- Tone: ${client.tone ?? "professional, clear"}`,
    `- Reading level: ${client.readingLevel ?? "general"}`,
    `- Point of view: ${client.pointOfView ?? "unspecified"}`,
    `- Words to avoid: ${wordsToAvoid}`,
    `- Required disclaimers: ${client.requiredDisclaimers ?? "none"}`,
    `- SEO notes: ${client.seoNotes ?? "none"}`,
    "",
    "Follow these AI-visibility (GEO) and agent-crawlability rules:",
    ...AI_VISIBILITY_RULES.map((r) => `- ${r}`),
    "",
    "Respond with ONLY valid JSON. No markdown fences, no commentary, no explanation before or after the JSON.",
  ].join("\n");
}

export function buildUserPrompt(step: PipelineStep, ctx: StepContext): string {
  const { project, priorOutputs } = ctx;
  const spec = STEP_SPECS[step];

  const lines = [
    "PROJECT CONTEXT",
    `- Topic: ${project.topic}`,
    `- Target keyword: ${project.targetKeyword ?? "(none — infer from topic)"}`,
    `- Content type: ${project.contentType}`,
    `- Target length: ${project.targetLength ? `${project.targetLength} words` : "(none specified)"}`,
    `- Source URLs: ${project.sourceUrls?.length ? project.sourceUrls.join(", ") : "(none)"}`,
    "",
    "PASTED RESEARCH NOTES:",
    project.pastedNotes?.trim() || "(none provided)",
  ];

  if (ctx.userFeedback?.trim()) {
    lines.push("", "FEEDBACK TO APPLY ON THIS RUN:", ctx.userFeedback.trim());
  }

  const priorKeys = Object.keys(priorOutputs) as PipelineStep[];
  if (priorKeys.length) {
    lines.push("", "OUTPUTS FROM PRIOR STAGES (JSON):");
    for (const key of priorKeys) {
      lines.push(`### ${STEP_LABELS[key]}`, JSON.stringify(priorOutputs[key]));
    }
  }

  lines.push(
    "",
    `TASK: ${spec.instruction}`,
    "",
    "Return JSON matching EXACTLY this shape (arrays may have more items; keep the same keys and types):",
    spec.shape,
  );

  return lines.join("\n");
}

export function createAnthropicExecutor(
  step: PipelineStep,
  model: string,
  apiKey: string,
): StepExecutor {
  return {
    step,
    async execute(ctx: StepContext): Promise<StepOutput> {
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

      const parsed = extractJson(text, "Claude") as Record<string, unknown>;

      // Guarantee the final step carries the project's real content type.
      if (step === "FINAL") {
        parsed.contentType = ctx.project.contentType;
      }

      return parsed as unknown as StepOutput;
    },
  };
}
