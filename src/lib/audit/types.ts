import type {
  Audit,
  AuditDataSource,
  AuditStep,
  ClientProfile,
} from "@/generated/prisma/client";

export const AUDIT_STEPS: AuditStep[] = [
  "CRAWL_TECHNICAL",
  "INDEXATION",
  "VISIBILITY_DEMAND",
  "INTERNAL_LINKING",
  "PAGE_SHORTLIST",
  "PAGE_DEEP_DIVE",
  "KEYWORD_RELEVANCE",
  "AI_CRAWLABILITY",
  "AI_EXTRACTABILITY",
  "FINDINGS_ROLLUP",
];

export const AUDIT_STEP_LABELS: Record<AuditStep, string> = {
  CRAWL_TECHNICAL: "Crawl & technical health",
  INDEXATION: "Indexation & coverage",
  VISIBILITY_DEMAND: "Visibility & demand",
  INTERNAL_LINKING: "Internal linking & architecture",
  PAGE_SHORTLIST: "Page shortlist",
  PAGE_DEEP_DIVE: "Page deep-dive",
  KEYWORD_RELEVANCE: "Keyword & relevance health",
  AI_CRAWLABILITY: "AI crawlability & agent access",
  AI_EXTRACTABILITY: "Answer extractability",
  FINDINGS_ROLLUP: "Findings report",
};

export const AUDIT_STEP_DESCRIPTIONS: Record<AuditStep, string> = {
  CRAWL_TECHNICAL:
    "Checks crawlability and technical health: status codes, canonicals, robots/noindex, redirects, and systemic page-health issues from crawl uploads and notes.",
  INDEXATION:
    "Separates discovery from serving: coverage exclusions, crawled-not-indexed, soft 404s, and duplicate/canonical conflicts that block visibility.",
  VISIBILITY_DEMAND:
    "Maps site-level demand from Search Console and Analytics: impressions, clicks, CTR gaps, and rising or falling landing pages.",
  INTERNAL_LINKING:
    "Finds architecture problems: orphan or buried pages, weak paths to important URLs, and hub/spoke gaps.",
  PAGE_SHORTLIST:
    "Nominates pages for deep-dive based on earlier findings. Approve the shortlist (and edit selected URLs) before page-level stages run.",
  PAGE_DEEP_DIVE:
    "Inspects each selected page for on-page structure, intent match, engagement friction, and local internal-link context.",
  KEYWORD_RELEVANCE:
    "Flags relevance problems: important pages with little query coverage, or strong rankings that do not match the page’s apparent topic/intent.",
  AI_CRAWLABILITY:
    "Checks whether AI agents can find and fetch important pages: bot rules, JS-only shells, sitemaps/llms.txt cues, and extractable HTML content.",
  AI_EXTRACTABILITY:
    "Checks answer-first structure for AI Overviews and agents: clear H1/H2s, direct answers, FAQ shape, and entity clarity.",
  FINDINGS_ROLLUP:
    "Consolidates evidence-backed issues and opportunities into a findings report you can export as CSV or Excel.",
};

export type AuditFindingSeverity = "blocker" | "high" | "medium" | "low" | "info";

export interface AuditFinding {
  id: string;
  severity: AuditFindingSeverity;
  title: string;
  detail: string;
  evidence: string[];
  urls?: string[];
}

export interface AuditStepOutputBase {
  summary: string;
  findings: AuditFinding[];
}

export interface CrawlTechnicalOutput extends AuditStepOutputBase {
  blockers: string[];
}

export interface IndexationOutput extends AuditStepOutputBase {
  coverageThemes: string[];
}

export interface VisibilityDemandOutput extends AuditStepOutputBase {
  opportunityPages: Array<{ url: string; rationale: string; signals: string[] }>;
}

export interface InternalLinkingOutput extends AuditStepOutputBase {
  architectureNotes: string[];
}

export interface PageShortlistOutput extends AuditStepOutputBase {
  nominatedPages: Array<{ url: string; rationale: string; priority: number }>;
}

export interface PageDeepDiveOutput extends AuditStepOutputBase {
  pages: Array<{ url: string; strengths: string[]; weaknesses: string[]; notes: string }>;
}

export interface KeywordRelevanceOutput extends AuditStepOutputBase {
  mismatches: Array<{ url: string; issue: string; queries: string[] }>;
}

export interface AiCrawlabilityOutput extends AuditStepOutputBase {
  agentAccessNotes: string[];
}

export interface AiExtractabilityOutput extends AuditStepOutputBase {
  extractabilityNotes: string[];
}

export interface FindingsRollupOutput extends AuditStepOutputBase {
  opportunities: Array<{
    title: string;
    category: "TECHNICAL" | "CONTENT" | "LINKING" | "UX" | "MEASUREMENT" | "AI_VISIBILITY";
    detail: string;
    evidence: string[];
    relatedUrls: string[];
  }>;
  openQuestions: string[];
}

export type AuditStepOutput =
  | CrawlTechnicalOutput
  | IndexationOutput
  | VisibilityDemandOutput
  | InternalLinkingOutput
  | PageShortlistOutput
  | PageDeepDiveOutput
  | KeywordRelevanceOutput
  | AiCrawlabilityOutput
  | AiExtractabilityOutput
  | FindingsRollupOutput;

export interface AuditStepContext {
  audit: Audit;
  client: ClientProfile;
  dataSources: AuditDataSource[];
  priorOutputs: Partial<Record<AuditStep, AuditStepOutput>>;
}

export interface AuditStepExecutor {
  step: AuditStep;
  execute(ctx: AuditStepContext): Promise<AuditStepOutput>;
}
