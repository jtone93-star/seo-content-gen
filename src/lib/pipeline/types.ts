import type {
  ClientProfile,
  ContentProject,
  ContentType,
  PipelineStep,
} from "@/generated/prisma/client";

export const PIPELINE_STEPS: PipelineStep[] = [
  "BRIEF",
  "RESEARCH",
  "OUTLINE",
  "DRAFT",
  "EDIT",
  "QA",
  "SEO",
  "TECHNICAL_SEO",
  "SHIP_CHECK",
  "FINAL",
];

export const STEP_LABELS: Record<PipelineStep, string> = {
  BRIEF: "Content brief",
  RESEARCH: "SERP research",
  OUTLINE: "Outline",
  DRAFT: "Draft",
  EDIT: "Edit",
  QA: "QA & compliance",
  SEO: "SEO copy",
  TECHNICAL_SEO: "Technical SEO",
  SHIP_CHECK: "Ship check",
  FINAL: "Final output",
};

/** Short copy shown in the pipeline UI explaining what each stage does. */
export const STEP_DESCRIPTIONS: Record<PipelineStep, string> = {
  BRIEF:
    "Defines search intent, primary/secondary keywords, audience, content goal, must-cover topics, and AI-visibility goals before anything is written.",
  RESEARCH:
    "Synthesizes your URLs and notes into a SERP snapshot, competitor angles, People Also Ask questions, and content gaps to exploit.",
  OUTLINE:
    "Builds the H2/H3 structure, FAQ questions, internal-link plan, key takeaways, and formatting notes the draft will follow.",
  DRAFT:
    "Writes the full Markdown piece from the outline — answer-first sections, named entities, and structure ready for SEO and AI Overviews.",
  EDIT:
    "Polishes the draft for clarity, tone match, flow, and concision without losing substance or SEO structure.",
  QA:
    "Checks how the piece reads, obvious factual misspeaks, banned words, disclaimers, and claims. Failed checks rewind to the stage that needs a fix (up to 3 passes).",
  SEO:
    "Tunes the copy for search and generative visibility: meta title/description, header hierarchy, keyword map, and short answer blocks.",
  TECHNICAL_SEO:
    "Produces slug, Open Graph tags, JSON-LD schema (including FAQ/speakable), indexing guidance, and an agent-friendly summary.",
  SHIP_CHECK:
    "Final publish-readiness gate after technical SEO. If the piece is not ship-ready, it rewinds to the stage that should be reworked (up to 3 passes) before Final.",
  FINAL:
    "Assembles the publish-ready package: final body, meta, headers, schema, export Markdown, answer blocks, and agent summary.",
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BLOG: "Blog Post",
  LANDING_PAGE: "Landing Page",
  PRODUCT_DESCRIPTION: "Product Description",
};

export interface BriefOutput {
  searchIntent: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  targetAudience: string;
  contentGoal: string;
  recommendedFormat: string;
  wordCountTarget: number | null;
  differentiation: string;
  mustCoverTopics: string[];
  cta: string;
  successMetrics: string[];
  /** GEO / AI Overview + agent crawlability goals */
  aiVisibilityGoals: string[];
  primaryEntities: string[];
}

export interface SerpResult {
  url: string;
  title: string;
  format: string;
  estimatedWords: number;
  angle: string;
}

export interface ResearchOutput {
  summary: string;
  sources: { url: string; notes: string }[];
  serpSnapshot: SerpResult[];
  peopleAlsoAsk: string[];
  competitorAngles: string[];
  contentGaps: string[];
  recommendedWordRange: { min: number; max: number };
}

export interface OutlineSection {
  level: "h2" | "h3";
  heading: string;
  bullets: string[];
}

export interface InternalLinkPlan {
  anchorText: string;
  targetUrl: string;
  placement: string;
  rationale: string;
}

export interface OutlineOutput {
  title: string;
  angle: string;
  sections: OutlineSection[];
  faqSection: { question: string; answerOutline: string }[];
  internalLinks: InternalLinkPlan[];
  cta: string;
  keyTakeaways: string[];
  formattingNotes: string[];
}

export interface DraftOutput {
  body: string;
  wordCount: number;
  structureNotes: string[];
}

export interface EditOutput {
  body: string;
  changesSummary: string[];
}

export interface QaChecklistItem {
  item: string;
  passed: boolean;
}

export interface QaClaim {
  claim: string;
  status: "verified" | "needs_source" | "ok";
}

export interface QaFactMisspeak {
  claim: string;
  issue: string;
  suggestedFix?: string;
}

export interface QaOutput {
  passed: boolean;
  readabilityScore: string;
  readingLevelMatch: boolean;
  readabilityIssues: string[];
  factMisspeaks: QaFactMisspeak[];
  claimsToVerify: QaClaim[];
  bannedWordsFound: string[];
  disclaimerIncluded: boolean;
  checklist: QaChecklistItem[];
  notes: string;
  /** Stage to regenerate when this gate fails. */
  rewindTo: PipelineStep | null;
  /** Instructions applied when regenerating rewindTo. */
  feedback: string;
}

export interface ShipCheckOutput {
  passed: boolean;
  checklist: QaChecklistItem[];
  notes: string;
  rewindTo: PipelineStep | null;
  feedback: string;
}

export interface HeaderEntry {
  level: "h1" | "h2" | "h3";
  text: string;
}

export interface KeywordMapEntry {
  keyword: string;
  count: number;
  placement: string[];
}

export interface SeoOutput {
  body: string;
  metaTitle: string;
  metaDescription: string;
  headers: HeaderEntry[];
  primaryKeyword: string;
  keywordMap: KeywordMapEntry[];
  /** Short answer blocks designed for AI Overviews / featured snippets */
  answerBlocks: { question: string; answer: string }[];
  aiVisibilityNotes: string[];
}

export interface TechnicalSeoOutput {
  slug: string;
  metaTitle: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  schemaType: string;
  schemaJsonLd: string;
  canonicalUrl: string | null;
  indexRecommendation: "index" | "noindex";
  hreflang: string | null;
  publishingChecklist: QaChecklistItem[];
  /** Optional llms.txt-style summary for AI agents */
  agentSummary: string;
  speakableSelectors: string[];
}

export interface FinalOutput {
  body: string;
  metaTitle: string;
  metaDescription: string;
  headers: HeaderEntry[];
  slug: string;
  schemaType: string;
  schemaJsonLd: string;
  contentType: ContentType;
  exportMarkdown: string;
  agentSummary: string;
  answerBlocks: { question: string; answer: string }[];
}

export type StepOutput =
  | BriefOutput
  | ResearchOutput
  | OutlineOutput
  | DraftOutput
  | EditOutput
  | QaOutput
  | SeoOutput
  | TechnicalSeoOutput
  | ShipCheckOutput
  | FinalOutput;

export interface StepContext {
  project: ContentProject;
  client: ClientProfile;
  priorOutputs: Partial<Record<PipelineStep, StepOutput>>;
  userFeedback?: string;
}

export interface StepExecutor {
  step: PipelineStep;
  execute(input: StepContext): Promise<StepOutput>;
}
