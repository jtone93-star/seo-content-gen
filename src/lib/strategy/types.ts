import type {
  Audit,
  AuditDataSource,
  ClientProfile,
  Cycle,
  CycleItem,
  Strategy,
  StrategyKpi,
  StrategyRecommendation,
  StrategyRecommendationCategory,
} from "@/generated/prisma/client";

export const STRATEGY_CATEGORIES: StrategyRecommendationCategory[] = [
  "TECHNICAL",
  "CONTENT",
  "LINKING",
  "UX",
  "MEASUREMENT",
  "AI_VISIBILITY",
];

export const CATEGORY_LABELS: Record<StrategyRecommendationCategory, string> = {
  TECHNICAL: "Technical",
  CONTENT: "Content",
  LINKING: "Internal linking",
  UX: "UX",
  MEASUREMENT: "Measurement",
  AI_VISIBILITY: "AI visibility",
};

export function workKindForCategory(
  category: StrategyRecommendationCategory,
): "CONTENT" | "TECH" {
  return category === "CONTENT" ? "CONTENT" : "TECH";
}

export type RecommendationDraft = {
  category: StrategyRecommendationCategory;
  title: string;
  rationale: string;
  instructions: string;
  relatedUrls: string[];
  targetKeyword: string | null;
  priority: number;
  effort: number;
  impact: number;
  evidence: string[];
};

export type StrategySynthesis = {
  summary: string;
  recommendations: RecommendationDraft[];
};

export type StrategyEvidenceContext = {
  strategy: Strategy & { kpis: StrategyKpi[] };
  client: ClientProfile;
  audit: (Audit & { dataSources: AuditDataSource[] }) | null;
  findingsPack: unknown;
};

export interface StrategyExecutor {
  execute(ctx: StrategyEvidenceContext): Promise<StrategySynthesis>;
}

export type CycleItemWithRec = CycleItem & {
  recommendation: StrategyRecommendation;
  contentProject: { id: string; topic: string; status: string } | null;
};

export type CycleWithItems = Cycle & { items: CycleItemWithRec[] };

export type StrategyWithRelations = Strategy & {
  kpis: StrategyKpi[];
  recommendations: StrategyRecommendation[];
  cycles: CycleWithItems[];
  sourceAudit: { id: string; name: string; status: string } | null;
};
