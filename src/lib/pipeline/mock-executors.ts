import type { PipelineStep } from "@/generated/prisma/client";
import type {
  BriefOutput,
  DraftOutput,
  EditOutput,
  FinalOutput,
  OutlineOutput,
  QaOutput,
  ResearchOutput,
  SeoOutput,
  StepContext,
  StepExecutor,
  StepOutput,
  TechnicalSeoOutput,
} from "./types";
import { AI_VISIBILITY_RULES } from "./ai-visibility";

function primaryKeyword(ctx: StepContext): string {
  return ctx.project.targetKeyword ?? ctx.project.topic;
}

function intentForContentType(contentType: string): string {
  switch (contentType) {
    case "LANDING_PAGE":
      return "Commercial — user is evaluating a solution";
    case "PRODUCT_DESCRIPTION":
      return "Transactional — user is close to purchase";
    default:
      return "Informational — user wants to learn and compare options";
  }
}

function siteHost(clientName: string): string {
  return `${clientName.toLowerCase().replace(/\s+/g, "")}.com`;
}

function mockBrief(ctx: StepContext): BriefOutput {
  const keyword = primaryKeyword(ctx);
  const format =
    ctx.project.contentType === "BLOG"
      ? "Answer-first long-form guide with TL;DR, H2/H3, FAQ, and entity-clear sections"
      : ctx.project.contentType === "LANDING_PAGE"
        ? "Conversion page with hero answer, benefit list, proof, FAQ, CTA"
        : "Product page with definition, specs list, FAQ, and clear entity naming";

  return {
    searchIntent: intentForContentType(ctx.project.contentType),
    primaryKeyword: keyword,
    secondaryKeywords: [
      `${keyword} guide`,
      `${keyword} best practices`,
      `how to ${ctx.project.topic.toLowerCase()}`,
      `what is ${keyword}`,
    ],
    targetAudience: ctx.client.audience ?? "Target readers for this client",
    contentGoal: `Rank for "${keyword}", earn AI Overview / citation visibility, and drive qualified traffic for ${ctx.client.name}`,
    recommendedFormat: format,
    wordCountTarget: ctx.project.targetLength ?? null,
    differentiation: `Unique angle for ${ctx.client.industry ?? "this industry"}: ${ctx.client.tone ?? "professional"} voice, ${ctx.client.pointOfView ?? "second person"}.`,
    mustCoverTopics: [
      `Definition: what ${ctx.project.topic} is (in one clear sentence)`,
      `What ${ctx.project.topic} means for ${ctx.client.audience ?? "the audience"}`,
      "Common mistakes and how to avoid them",
      "Actionable steps or framework",
      "When to seek expert help / next steps",
    ],
    cta:
      ctx.project.contentType === "PRODUCT_DESCRIPTION"
        ? "Add to cart / Request demo"
        : "Get started / Contact us",
    successMetrics: [
      "Organic impressions for primary keyword",
      "AI Overview / generative SERP citations (where trackable)",
      "Engagement (time on page, scroll depth)",
    ],
    aiVisibilityGoals: [...AI_VISIBILITY_RULES],
    primaryEntities: [
      ctx.client.name,
      keyword,
      ctx.project.topic,
      ctx.client.industry ?? "industry solution",
    ].filter(Boolean),
  };
}

function mockResearch(ctx: StepContext): ResearchOutput {
  const brief = ctx.priorOutputs.BRIEF as BriefOutput | undefined;
  const keyword = brief?.primaryKeyword ?? primaryKeyword(ctx);
  const urls = ctx.project.sourceUrls.length
    ? ctx.project.sourceUrls
    : [
        `https://example.com/competitor-1-${keyword.replace(/\s+/g, "-")}`,
        `https://example.com/competitor-2-${keyword.replace(/\s+/g, "-")}`,
      ];

  const wordTarget = brief?.wordCountTarget ?? ctx.project.targetLength ?? 1500;

  return {
    summary: `SERP analysis for "${keyword}" (${brief?.searchIntent ?? "informational"}). Based on ${urls.length} reference URL(s) and pasted notes — live fetch not enabled.`,
    sources: urls.map((url) => ({
      url,
      notes:
        url.includes("example.com")
          ? "Mock competitor entry — replace with real SERP URLs for production research."
          : `Notes from provided URL. ${ctx.project.pastedNotes?.slice(0, 120) ?? ""}`,
    })),
    serpSnapshot: urls.slice(0, 5).map((url, i) => ({
      url,
      title: `Top result #${i + 1}: ${keyword} — Complete Guide`,
      format: i % 2 === 0 ? "Long-form guide" : "Listicle / how-to",
      estimatedWords: 1200 + i * 400,
      angle: i === 0 ? "Beginner-friendly overview" : "Advanced tactics and tools",
    })),
    peopleAlsoAsk: [
      `What is ${ctx.project.topic}?`,
      `How does ${keyword} work?`,
      `What are the benefits of ${keyword}?`,
      `How much does ${keyword} cost?`,
    ],
    competitorAngles: [
      "Comprehensive beginner guides dominate positions 1–3",
      "Most articles lack industry-specific examples and clear entity naming",
      "Few include answer-first sections or FAQ schema-ready Q&A",
    ],
    contentGaps: [
      "Add TL;DR / key takeaways for AI Overview extraction",
      "Lead each H2 with a direct answer sentence",
      "Include comparison list or table vs alternatives",
      "Answer PAA questions in dedicated FAQ with question headings",
      brief?.differentiation ?? "Stronger differentiation vs generic guides",
    ],
    recommendedWordRange: {
      min: Math.round(wordTarget * 0.85),
      max: Math.round(wordTarget * 1.15),
    },
  };
}

function mockOutline(ctx: StepContext): OutlineOutput {
  const brief = ctx.priorOutputs.BRIEF as BriefOutput | undefined;
  const research = ctx.priorOutputs.RESEARCH as ResearchOutput | undefined;
  const keyword = brief?.primaryKeyword ?? primaryKeyword(ctx);
  const title = brief?.primaryKeyword
    ? `${ctx.project.topic}: ${brief.primaryKeyword}`
    : ctx.project.topic;

  const linkTargets = ctx.project.sourceUrls.filter((u) => !u.includes("example.com"));
  const host = siteHost(ctx.client.name);
  const internalLinks =
    linkTargets.length > 0
      ? linkTargets.slice(0, 3).map((url, i) => ({
          anchorText: brief?.secondaryKeywords[i] ?? `Related: ${ctx.project.topic}`,
          targetUrl: url,
          placement: ["Introduction", "How it works", "Conclusion"][i] ?? "Body",
          rationale: "Supports topical cluster and agent-followable site graph.",
        }))
      : [
          {
            anchorText: `${ctx.client.name} services`,
            targetUrl: `https://${host}/services`,
            placement: "Introduction",
            rationale: "Entity link to brand money page for crawlability.",
          },
          {
            anchorText: `More on ${ctx.project.topic}`,
            targetUrl: `https://${host}/blog`,
            placement: "Conclusion",
            rationale: "Hub page link for topical authority.",
          },
        ];

  return {
    title,
    angle: brief?.differentiation ?? research?.summary ?? `Guide to ${ctx.project.topic}`,
    sections: [
      {
        level: "h2",
        heading: `What is ${keyword}?`,
        bullets: [
          "Answer-first definition (1–2 sentences)",
          "Who it is for",
          "Why it matters now",
        ],
      },
      {
        level: "h2",
        heading: `How ${keyword} works`,
        bullets: brief?.mustCoverTopics.slice(0, 3) ?? [
          "Core concept 1",
          "Core concept 2",
          "Core concept 3",
        ],
      },
      {
        level: "h2",
        heading: `Best practices for ${keyword}`,
        bullets: research?.contentGaps.slice(0, 3) ?? ["Step 1", "Step 2", "Step 3"],
      },
      {
        level: "h2",
        heading: "Key takeaways",
        bullets: ["3–5 scannable bullets agents can quote"],
      },
    ],
    faqSection: (research?.peopleAlsoAsk ?? []).slice(0, 4).map((q) => ({
      question: q,
      answerOutline:
        "Direct answer in the first sentence. Then 1–2 supporting sentences with a named entity or example.",
    })),
    internalLinks,
    cta: brief?.cta ?? "Get started today",
    keyTakeaways: [
      `${keyword} is ${ctx.project.topic.toLowerCase()} explained for ${ctx.client.audience ?? "your audience"}.`,
      `${ctx.client.name} focuses on practical, verifiable guidance.`,
      "Use a clear process, avoid common mistakes, and measure outcomes.",
    ],
    formattingNotes: [...AI_VISIBILITY_RULES],
  };
}

function mockDraft(ctx: StepContext): DraftOutput {
  const outline = ctx.priorOutputs.OUTLINE as OutlineOutput | undefined;
  const brief = ctx.priorOutputs.BRIEF as BriefOutput | undefined;
  const title = outline?.title ?? ctx.project.topic;
  const keyword = brief?.primaryKeyword ?? primaryKeyword(ctx);
  const brand = ctx.client.name;
  const entities = brief?.primaryEntities ?? [brand, keyword];

  let body = `# ${title}\n\n`;

  body += `## Key takeaways\n\n`;
  for (const t of outline?.keyTakeaways ?? [
    `${keyword} helps ${ctx.client.audience ?? "teams"} achieve clearer outcomes.`,
  ]) {
    body += `- ${t}\n`;
  }
  body += `\n`;

  body += `## What is ${keyword}?\n\n`;
  body += `**${keyword}** is a practical approach to ${ctx.project.topic.toLowerCase()} that helps ${ctx.client.audience ?? "organizations"} get reliable results. `;
  body += `${brand} recommends treating it as a defined process—not a buzzword—so both people and AI systems can extract a clear meaning.\n\n`;
  body += `In short: ${keyword} gives ${ctx.client.audience ?? "your audience"} a structured way to plan, execute, and measure ${ctx.project.topic.toLowerCase()}.\n\n`;

  for (const section of (outline?.sections ?? []).filter(
    (s) =>
      !s.heading.toLowerCase().includes("what is") &&
      !s.heading.toLowerCase().includes("key takeaways") &&
      !s.heading.toLowerCase().includes("faq"),
  )) {
    body += `## ${section.heading}\n\n`;
    body += `**Answer:** ${section.bullets[0] ?? `Apply ${keyword} with a clear, measurable process.`}\n\n`;
    body += `Here’s how ${brand} breaks it down:\n\n`;
    section.bullets.forEach((b, i) => {
      body += `${i + 1}. **${b}.** Expand with a concrete example tied to ${entities[0]}.\n`;
    });
    body += `\n`;
  }

  if (outline?.faqSection.length) {
    body += `## Frequently asked questions\n\n`;
    for (const faq of outline.faqSection) {
      body += `### ${faq.question}\n\n`;
      body += `${faq.answerOutline.replace(
        "Direct answer in the first sentence.",
        `**${keyword}** addresses this directly.`,
      )} ${brand} notes that answers should stay specific and attributable.\n\n`;
    }
  }

  if (outline?.internalLinks.length) {
    body += `## Related resources\n\n`;
    body += `These pages help crawlers and AI agents follow the ${brand} topic cluster:\n\n`;
    for (const link of outline.internalLinks) {
      body += `- [${link.anchorText}](${link.targetUrl})\n`;
    }
    body += `\n`;
  }

  body += `## Next steps\n\n`;
  body += `Ready to apply **${keyword}** with ${brand}? **${outline?.cta ?? "Get started today"}**\n`;

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  return {
    body,
    wordCount,
    structureNotes: [
      "Includes Key takeaways for AI Overview extraction",
      "Answer-first pattern under major H2s",
      "FAQ uses question headings for FAQPage schema",
      "Entities named explicitly (brand + keyword)",
      "Related resources for agent followable links",
    ],
  };
}

function mockEdit(ctx: StepContext): EditOutput {
  const draft = ctx.priorOutputs.DRAFT as DraftOutput | undefined;
  let body = (draft?.body ?? "").trim();

  // Ensure answer-first cue is present if missing
  if (!body.includes("**Answer:**") && body.includes("## ")) {
    body = body.replace(
      /(## (?!Key takeaways|Frequently asked|Related|Next steps|What is)[^\n]+)\n\n/g,
      "$1\n\n**Answer:** Start with the clearest one-sentence conclusion for this section.\n\n",
    );
  }

  return {
    body,
    changesSummary: [
      `Aligned voice with ${ctx.client.tone ?? "client tone"}`,
      `Applied ${ctx.client.pointOfView ?? "POV"} consistently`,
      ctx.client.wordsToAvoid.length
        ? `Checked against words to avoid: ${ctx.client.wordsToAvoid.join(", ")}`
        : "Tone and clarity pass",
      "Reinforced answer-first H2 openings for AI visibility",
      "Kept entity names explicit for agent crawlability",
      "Preserved FAQ question headings and Key takeaways block",
    ],
  };
}

function mockQa(ctx: StepContext): QaOutput {
  const edit = ctx.priorOutputs.EDIT as EditOutput | undefined;
  const body = edit?.body ?? "";
  const bannedFound = ctx.client.wordsToAvoid.filter((w) =>
    body.toLowerCase().includes(w.toLowerCase()),
  );
  const hasDisclaimer = ctx.client.requiredDisclaimers
    ? body.toLowerCase().includes(ctx.client.requiredDisclaimers.slice(0, 20).toLowerCase())
    : true;

  const checklist = [
    { item: "Matches client tone and audience", passed: true },
    { item: "Reading level appropriate", passed: true },
    { item: "No banned words", passed: bannedFound.length === 0 },
    { item: "Required disclaimers present", passed: hasDisclaimer },
    { item: "Claims flagged for human verification", passed: true },
    { item: "Internal links present in draft", passed: body.includes("](") || body.includes("http") },
    { item: "Key takeaways / TL;DR block present", passed: /key takeaways|tl;?dr/i.test(body) },
    { item: "Answer-first cues under major sections", passed: /\*\*Answer:\*\*/i.test(body) || /In short:/i.test(body) },
    { item: "FAQ uses question-style headings", passed: /## Frequently asked|\n### .+\?/i.test(body) },
    { item: "Primary entities named explicitly", passed: body.includes(ctx.client.name) },
  ];

  const passed = checklist.every((c) => c.passed);

  return {
    passed,
    readabilityScore: ctx.client.readingLevel ?? "General business (~Grade 8–10)",
    readingLevelMatch: true,
    claimsToVerify: [
      { claim: "Statistics and third-party data cited in draft", status: "needs_source" },
      { claim: "Product/service claims match client offerings", status: "ok" },
    ],
    bannedWordsFound: bannedFound,
    disclaimerIncluded: hasDisclaimer,
    checklist,
    notes: passed
      ? "Ready for SEO copy — GEO / AI-visibility checks passed."
      : "Resolve failed checks (including AI visibility items) before publishing.",
  };
}

function mockSeo(ctx: StepContext): SeoOutput {
  const edit = ctx.priorOutputs.EDIT as EditOutput | undefined;
  const outline = ctx.priorOutputs.OUTLINE as OutlineOutput | undefined;
  const brief = ctx.priorOutputs.BRIEF as BriefOutput | undefined;
  const body = edit?.body ?? "";
  const keyword = brief?.primaryKeyword ?? primaryKeyword(ctx);
  const title = outline?.title ?? ctx.project.topic;

  const metaTitle =
    title.length > 60 ? `${title.slice(0, 57)}...` : `${title} | ${ctx.client.name}`;

  const metaDescription =
    `${keyword}: clear definition, steps, and FAQ for ${ctx.client.audience ?? "your audience"}. From ${ctx.client.name}.`.slice(
      0,
      160,
    );

  const headers: SeoOutput["headers"] = [
    { level: "h1", text: title },
    ...(outline?.sections.map((s) => ({
      level: s.level as "h2" | "h3",
      text: s.heading,
    })) ?? []),
  ];

  const secondary = brief?.secondaryKeywords ?? [];
  const answerBlocks = [
    {
      question: `What is ${keyword}?`,
      answer: `${keyword} is a practical approach to ${ctx.project.topic.toLowerCase()} that helps ${ctx.client.audience ?? "organizations"} get reliable, measurable results.`,
    },
    ...(outline?.faqSection.slice(0, 3).map((f) => ({
      question: f.question,
      answer: f.answerOutline,
    })) ?? []),
  ];

  return {
    body,
    metaTitle,
    metaDescription,
    headers,
    primaryKeyword: keyword,
    keywordMap: [
      {
        keyword,
        count: (body.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? [])
          .length,
        placement: ["H1", "Key takeaways", "definition H2", "meta title", "meta description"],
      },
      ...secondary.slice(0, 2).map((kw) => ({
        keyword: kw,
        count: (body.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi")) ?? [])
          .length,
        placement: ["H2 body", "FAQ"],
      })),
    ],
    answerBlocks,
    aiVisibilityNotes: [
      "Answer blocks ready for featured snippet / AI Overview extraction",
      "Meta description leads with definition + audience",
      "Headers stay hierarchical (H1 → H2 → H3 questions)",
      ...AI_VISIBILITY_RULES.slice(0, 3),
    ],
  };
}

function mockTechnicalSeo(ctx: StepContext): TechnicalSeoOutput {
  const seo = ctx.priorOutputs.SEO as SeoOutput | undefined;
  const brief = ctx.priorOutputs.BRIEF as BriefOutput | undefined;
  const outline = ctx.priorOutputs.OUTLINE as OutlineOutput | undefined;
  const keyword = seo?.primaryKeyword ?? primaryKeyword(ctx);
  const host = siteHost(ctx.client.name);
  const slug = keyword
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const mainType =
    ctx.project.contentType === "PRODUCT_DESCRIPTION"
      ? "Product"
      : ctx.project.contentType === "LANDING_PAGE"
        ? "WebPage"
        : "Article";

  const faqEntities = (seo?.answerBlocks ?? outline?.faqSection ?? []).slice(0, 5).map((f) => ({
    "@type": "Question",
    name: "question" in f ? f.question : (f as { question: string }).question,
    acceptedAnswer: {
      "@type": "Answer",
      text:
        "answer" in f
          ? f.answer
          : ((f as { answerOutline?: string }).answerOutline ?? ""),
    },
  }));

  const schemaJsonLd = JSON.stringify(
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": mainType,
          headline: seo?.metaTitle,
          description: seo?.metaDescription,
          author: { "@type": "Organization", name: ctx.client.name },
          about: (brief?.primaryEntities ?? [keyword]).map((name) => ({
            "@type": "Thing",
            name,
          })),
          speakable: {
            "@type": "SpeakableSpecification",
            cssSelector: [".key-takeaways", "h1", "h2"],
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://${host}/${slug}`,
          },
        },
        {
          "@type": "FAQPage",
          mainEntity: faqEntities,
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: `https://${host}/`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: seo?.metaTitle ?? ctx.project.topic,
              item: `https://${host}/${slug}`,
            },
          ],
        },
      ],
    },
    null,
    2,
  );

  const agentSummary = [
    `Page: ${seo?.metaTitle ?? ctx.project.topic}`,
    `Entity: ${ctx.client.name}; Topic: ${keyword}`,
    `Intent: ${brief?.searchIntent ?? "informational"}`,
    `Summary: ${(seo?.answerBlocks?.[0]?.answer ?? outline?.keyTakeaways?.[0] ?? "").slice(0, 240)}`,
    `Canonical: https://${host}/${slug}`,
    `Primary CTA: ${outline?.cta ?? brief?.cta ?? "Contact"}`,
  ].join("\n");

  return {
    slug,
    metaTitle: seo?.metaTitle ?? ctx.project.topic,
    metaDescription: seo?.metaDescription ?? "",
    ogTitle: seo?.metaTitle ?? ctx.project.topic,
    ogDescription: seo?.metaDescription ?? "",
    schemaType: `${mainType}+FAQPage`,
    schemaJsonLd,
    canonicalUrl: `https://${host}/${slug}`,
    indexRecommendation: "index",
    hreflang: null,
    agentSummary,
    speakableSelectors: [".key-takeaways", "h1", "h2", ".faq"],
    publishingChecklist: [
      { item: "Meta title under 60 characters", passed: (seo?.metaTitle.length ?? 0) <= 60 },
      { item: "Meta description under 160 characters", passed: (seo?.metaDescription.length ?? 0) <= 160 },
      { item: "Single H1 present", passed: true },
      { item: "Article/WebPage + FAQPage JSON-LD graph", passed: faqEntities.length > 0 },
      { item: "Speakable / key-takeaways selectors noted", passed: true },
      { item: "Canonical URL set", passed: true },
      { item: "Agent summary block generated", passed: true },
      { item: brief ? "Primary keyword in title" : "Keyword mapping complete", passed: true },
    ],
  };
}

function mockFinal(ctx: StepContext): FinalOutput {
  const seo = ctx.priorOutputs.SEO as SeoOutput | undefined;
  const technical = ctx.priorOutputs.TECHNICAL_SEO as TechnicalSeoOutput | undefined;
  const body = seo?.body ?? "";
  const metaTitle = technical?.metaTitle ?? seo?.metaTitle ?? ctx.project.topic;
  const metaDescription = technical?.metaDescription ?? seo?.metaDescription ?? "";
  const headers = seo?.headers ?? [];
  const answerBlocks = seo?.answerBlocks ?? [];
  const agentSummary = technical?.agentSummary ?? "";

  const exportMarkdown = `---
title: ${metaTitle}
description: ${metaDescription}
slug: ${technical?.slug ?? ""}
schema: ${technical?.schemaType ?? "Article+FAQPage"}
contentType: ${ctx.project.contentType}
canonical: ${technical?.canonicalUrl ?? ""}
ai_visibility: true
speakable: ${(technical?.speakableSelectors ?? []).join(", ")}
---

<!-- agent-summary
${agentSummary}
-->

${body}

<script type="application/ld+json">
${technical?.schemaJsonLd ?? "{}"}
</script>
`;

  return {
    body,
    metaTitle,
    metaDescription,
    headers,
    slug: technical?.slug ?? "",
    schemaType: technical?.schemaType ?? "Article+FAQPage",
    schemaJsonLd: technical?.schemaJsonLd ?? "{}",
    contentType: ctx.project.contentType,
    exportMarkdown,
    agentSummary,
    answerBlocks,
  };
}

const executors: Record<PipelineStep, (ctx: StepContext) => StepOutput> = {
  BRIEF: mockBrief,
  RESEARCH: mockResearch,
  OUTLINE: mockOutline,
  DRAFT: mockDraft,
  EDIT: mockEdit,
  QA: mockQa,
  SEO: mockSeo,
  TECHNICAL_SEO: mockTechnicalSeo,
  FINAL: mockFinal,
};

export function getMockExecutor(step: PipelineStep): StepExecutor {
  return {
    step,
    async execute(ctx) {
      return executors[step](ctx);
    },
  };
}
