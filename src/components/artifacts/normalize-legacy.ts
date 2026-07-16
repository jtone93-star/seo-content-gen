import type {
  BriefOutput,
  FinalOutput,
  OutlineOutput,
  QaOutput,
  ResearchOutput,
  SeoOutput,
  TechnicalSeoOutput,
} from "@/lib/pipeline/types";

function arr<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

/** Normalize stored JSON so viewers tolerate pre-expansion pipeline artifacts. */
export function normalizeResearch(raw: unknown): ResearchOutput {
  const o = raw as Partial<ResearchOutput> & { keyFacts?: string[]; gaps?: string[] };
  return {
    summary: o.summary ?? "",
    sources: arr(o.sources),
    serpSnapshot: arr(o.serpSnapshot),
    peopleAlsoAsk: arr(o.peopleAlsoAsk),
    competitorAngles: arr(o.competitorAngles),
    contentGaps: arr(o.contentGaps?.length ? o.contentGaps : o.gaps),
    recommendedWordRange: o.recommendedWordRange ?? { min: 0, max: 0 },
  };
}

export function normalizeOutline(raw: unknown): OutlineOutput {
  const o = raw as Partial<OutlineOutput>;
  return {
    title: o.title ?? "",
    angle: o.angle ?? "",
    sections: arr(o.sections).map((s) => ({
      level: s.level ?? "h2",
      heading: s.heading ?? "",
      bullets: arr(s.bullets),
    })),
    faqSection: arr(o.faqSection),
    internalLinks: arr(o.internalLinks),
    cta: o.cta ?? "",
    keyTakeaways: arr(o.keyTakeaways),
    formattingNotes: arr(o.formattingNotes),
  };
}

export function normalizeSeo(raw: unknown): SeoOutput {
  const o = raw as Partial<SeoOutput> & {
    keywordUsage?: { keyword: string; count: number; placement: string[] };
  };
  const keywordMap =
    arr(o.keywordMap).length > 0
      ? o.keywordMap!
      : o.keywordUsage
        ? [o.keywordUsage]
        : [];

  return {
    body: o.body ?? "",
    metaTitle: o.metaTitle ?? "",
    metaDescription: o.metaDescription ?? "",
    headers: arr(o.headers),
    primaryKeyword: o.primaryKeyword ?? o.keywordUsage?.keyword ?? "",
    keywordMap,
    answerBlocks: arr(o.answerBlocks),
    aiVisibilityNotes: arr(o.aiVisibilityNotes),
  };
}

export function normalizeQa(raw: unknown): QaOutput {
  const o = raw as Partial<QaOutput>;
  return {
    passed: o.passed ?? false,
    readabilityScore: o.readabilityScore ?? "—",
    readingLevelMatch: o.readingLevelMatch ?? true,
    claimsToVerify: arr(o.claimsToVerify),
    bannedWordsFound: arr(o.bannedWordsFound),
    disclaimerIncluded: o.disclaimerIncluded ?? true,
    checklist: arr(o.checklist),
    notes: o.notes ?? "",
  };
}

export function normalizeTechnicalSeo(raw: unknown): TechnicalSeoOutput {
  const o = raw as Partial<TechnicalSeoOutput>;
  return {
    slug: o.slug ?? "",
    metaTitle: o.metaTitle ?? "",
    metaDescription: o.metaDescription ?? "",
    ogTitle: o.ogTitle ?? o.metaTitle ?? "",
    ogDescription: o.ogDescription ?? o.metaDescription ?? "",
    schemaType: o.schemaType ?? "Article",
    schemaJsonLd: o.schemaJsonLd ?? "{}",
    canonicalUrl: o.canonicalUrl ?? null,
    indexRecommendation: o.indexRecommendation ?? "index",
    hreflang: o.hreflang ?? null,
    publishingChecklist: arr(o.publishingChecklist),
    agentSummary: o.agentSummary ?? "",
    speakableSelectors: arr(o.speakableSelectors),
  };
}

export function normalizeFinal(raw: unknown): FinalOutput {
  const o = raw as Partial<FinalOutput>;
  return {
    body: o.body ?? "",
    metaTitle: o.metaTitle ?? "",
    metaDescription: o.metaDescription ?? "",
    headers: arr(o.headers),
    slug: o.slug ?? "",
    schemaType: o.schemaType ?? "Article",
    schemaJsonLd: o.schemaJsonLd ?? "{}",
    contentType: o.contentType ?? "BLOG",
    exportMarkdown: o.exportMarkdown ?? o.body ?? "",
    agentSummary: o.agentSummary ?? "",
    answerBlocks: arr(o.answerBlocks),
  };
}

export function normalizeBrief(raw: unknown): BriefOutput {
  const o = raw as Partial<BriefOutput>;
  return {
    searchIntent: o.searchIntent ?? "",
    primaryKeyword: o.primaryKeyword ?? "",
    secondaryKeywords: arr(o.secondaryKeywords),
    targetAudience: o.targetAudience ?? "",
    contentGoal: o.contentGoal ?? "",
    recommendedFormat: o.recommendedFormat ?? "",
    wordCountTarget: o.wordCountTarget ?? null,
    differentiation: o.differentiation ?? "",
    mustCoverTopics: arr(o.mustCoverTopics),
    cta: o.cta ?? "",
    successMetrics: arr(o.successMetrics),
    aiVisibilityGoals: arr(o.aiVisibilityGoals),
    primaryEntities: arr(o.primaryEntities),
  };
}
