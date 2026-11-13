import type { AuditStep } from "@/generated/prisma/client";
import type {
  AuditFinding,
  AuditStepContext,
  AuditStepExecutor,
  AuditStepOutput,
  PageShortlistOutput,
} from "./types";

function finding(
  id: string,
  severity: AuditFinding["severity"],
  title: string,
  detail: string,
  evidence: string[],
  urls?: string[],
): AuditFinding {
  return { id, severity, title, detail, evidence, urls };
}

function seedUrl(ctx: AuditStepContext): string {
  return ctx.audit.seedUrl || ctx.audit.selectedPages[0] || "https://example.com/";
}

function sourceLabels(ctx: AuditStepContext): string[] {
  if (!ctx.dataSources.length) return ["No connected data sources yet — findings are illustrative."];
  return ctx.dataSources.map((s) => `${s.type}: ${s.label}`);
}

function mockFor(step: AuditStep, ctx: AuditStepContext): AuditStepOutput {
  const url = seedUrl(ctx);
  const evidence = sourceLabels(ctx);
  const selected = ctx.audit.selectedPages.length ? ctx.audit.selectedPages : [url];

  switch (step) {
    case "CRAWL_TECHNICAL":
      return {
        summary: "Mock crawl/technical pass based on available uploads and the seed URL.",
        blockers: ["Confirm crawl CSV covers key templates before treating blockers as definitive."],
        findings: [
          finding(
            "crawl-1",
            "high",
            `Canonical consistency risk on ${url}`,
            `Confirm the live canonical for ${url} matches the preferred money URL and is not caught in a redirect/self-canonical conflict.`,
            evidence,
            [url],
          ),
          finding(
            "crawl-2",
            "medium",
            `Robots/noindex check near ${url}`,
            `Inspect robots and indexability around ${url} and nearby templates for accidental noindex or blocked paths.`,
            evidence,
            [url],
          ),
        ],
      };
    case "INDEXATION":
      return {
        summary: "Mock indexation themes focusing on coverage and duplicate risks.",
        coverageThemes: ["Crawled – currently not indexed", "Alternate page with proper canonical tag"],
        findings: [
          finding(
            "idx-1",
            "high",
            `Crawled-not-indexed risk for ${url}`,
            `Check Search Console coverage for ${url} and matching templates for crawled-not-indexed, soft 404, or duplicate exclusions.`,
            evidence,
            [url],
          ),
        ],
      };
    case "VISIBILITY_DEMAND":
      return {
        summary: "Mock visibility scan using GA4/GSC summaries when present.",
        opportunityPages: [
          {
            url,
            rationale: `CTR or engagement gap likely on ${url} relative to impression demand.`,
            signals: ["impressions without proportional clicks", "landing-page engagement risk"],
          },
        ],
        findings: [
          finding(
            "vis-1",
            "medium",
            `CTR / demand gap on ${url}`,
            `Review title/meta and answer framing for queries sending impressions to ${url}; clicks may underperform demand.`,
            evidence,
            [url],
          ),
        ],
      };
    case "INTERNAL_LINKING":
      return {
        summary: "Mock architecture review for paths into important pages.",
        architectureNotes: [
          `Confirm ${url} is linked from relevant hubs, not only the sitemap.`,
          "Watch for orphan landing pages that rely on paid or external entry only.",
        ],
        findings: [
          finding(
            "link-1",
            "medium",
            `Weak internal paths to ${url}`,
            `${url} may under-earn if high-demand hubs do not pass contextual internal links to it.`,
            evidence,
            [url],
          ),
        ],
      };
    case "PAGE_SHORTLIST": {
      const out: PageShortlistOutput = {
        summary: "Nominated pages for deep-dive. Edit and approve the shortlist before continuing.",
        nominatedPages: selected.map((page, index) => ({
          url: page,
          rationale: index === 0 ? "Seed or top opportunity candidate." : "Secondary candidate from visibility/linking signals.",
          priority: index + 1,
        })),
        findings: [
          finding(
            "short-1",
            "info",
            "Human gate: confirm pages to inspect",
            "Deep-dive and keyword stages only run on approved selectedPages.",
            evidence,
            selected,
          ),
        ],
      };
      return out;
    }
    case "PAGE_DEEP_DIVE":
      return {
        summary: `Mock deep-dive across ${selected.length} selected page(s).`,
        pages: selected.map((page) => ({
          url: page,
          strengths: ["Clear commercial or informational intent possible"],
          weaknesses: ["Answer may be buried below promotional content", "Internal links from hubs unclear"],
          notes: "Replace mock notes with crawl/on-page evidence when available.",
        })),
        findings: selected.map((page, i) =>
          finding(
            `page-${i}`,
            "medium",
            `On-page clarity risk: ${page}`,
            "Section answers and entity clarity need verification on the live page.",
            evidence,
            [page],
          ),
        ),
      };
    case "KEYWORD_RELEVANCE":
      return {
        summary: "Mock keyword/relevance health for selected pages.",
        mismatches: selected.map((page) => ({
          url: page,
          issue: "Possible under-coverage or intent mismatch versus apparent page topic.",
          queries: ["(connect GSC for real query lists)"],
        })),
        findings: [
          finding(
            "kw-1",
            "high",
            `Keyword coverage / relevance risk on ${selected[0]}`,
            `${selected[0]} may have thin matching query coverage, or rankings that do not fit the page topic. Inspect GSC queries for this URL.`,
            evidence,
            selected,
          ),
        ],
      };
    case "AI_CRAWLABILITY":
      return {
        summary: "Mock AI agent access review.",
        agentAccessNotes: [
          "Confirm robots.txt does not blanket-block major AI crawlers unless intentional.",
          "Prefer server-rendered primary content over JS-only shells for agent fetch.",
        ],
        findings: [
          finding(
            "ai-crawl-1",
            "medium",
            `Agent access / HTML extractability check for ${selected[0]}`,
            `Validate that ${selected[0]} exposes primary content in initial HTML and is not blocked for major AI crawlers.`,
            evidence,
            selected,
          ),
        ],
      };
    case "AI_EXTRACTABILITY":
      return {
        summary: "Mock answer-extractability review for AI Overviews and agents.",
        extractabilityNotes: [
          "Lead sections with a direct 1–2 sentence answer.",
          "Use question-style H2s and FAQ blocks where queries are question-shaped.",
        ],
        findings: [
          finding(
            "ai-x-1",
            "medium",
            `Answer-first structure incomplete on ${selected[0]}`,
            `${selected[0]} may get impressions without offering a clean quotable answer near the top of key sections.`,
            evidence,
            selected,
          ),
        ],
      };
    case "FINDINGS_ROLLUP":
      return {
        summary: "Mock findings pack consolidating earlier stages for later strategy work.",
        opportunities: [
          {
            title: "Fix technical/indexation blockers before scaling content",
            category: "TECHNICAL",
            detail: "Resolve crawl and coverage issues that would waste content investment.",
            evidence,
            relatedUrls: selected,
          },
          {
            title: "Improve answer extractability on priority pages",
            category: "AI_VISIBILITY",
            detail: "Restructure top sections and FAQs so agents and overviews can quote cleanly.",
            evidence,
            relatedUrls: selected,
          },
          {
            title: "Strengthen internal links to demand-bearing URLs",
            category: "LINKING",
            detail: "Connect hubs to pages with impressions but weak paths.",
            evidence,
            relatedUrls: selected,
          },
        ],
        openQuestions: [
          "Which KPI defines success once a Strategy module is run?",
          "Should competitive SERP context be gathered for the top nominated queries?",
        ],
        findings: [
          finding(
            "roll-1",
            "info",
            "Audit complete — strategy not included",
            "This roll-up lists issues and obvious opportunities; prioritization against a growth goal belongs in Strategy later.",
            evidence,
          ),
        ],
      };
  }
}

export function getAuditMockExecutor(step: AuditStep): AuditStepExecutor {
  return {
    step,
    async execute(ctx) {
      return mockFor(step, ctx);
    },
  };
}
