export const KPI_METRIC_KEYS = [
  "ORGANIC_SESSIONS",
  "CONVERSIONS",
  "GSC_CLICKS",
  "GSC_IMPRESSIONS",
  "AVG_POSITION",
  "INDEXED_PAGES",
  "CONTENT_SHIPPED",
  "TECH_ITEMS_CLOSED",
] as const;

export type KpiMetricKey = (typeof KPI_METRIC_KEYS)[number];

export type KpiSource = "GA4" | "GSC" | "APP" | "MANUAL";

export type KpiCatalogEntry = {
  key: KpiMetricKey;
  label: string;
  unit: string;
  source: KpiSource;
  /** Lower current is better (e.g. average position). */
  invert: boolean;
  description: string;
};

export const KPI_CATALOG: KpiCatalogEntry[] = [
  {
    key: "ORGANIC_SESSIONS",
    label: "Organic sessions",
    unit: "sessions",
    source: "GA4",
    invert: false,
    description: "Sessions on top landing pages from the linked GA4 summary.",
  },
  {
    key: "CONVERSIONS",
    label: "Conversions",
    unit: "conversions",
    source: "MANUAL",
    invert: false,
    description: "Enter conversions manually until a GA4 conversion metric is wired.",
  },
  {
    key: "GSC_CLICKS",
    label: "Search clicks",
    unit: "clicks",
    source: "GSC",
    invert: false,
    description: "Clicks from the linked Search Console summary.",
  },
  {
    key: "GSC_IMPRESSIONS",
    label: "Search impressions",
    unit: "impressions",
    source: "GSC",
    invert: false,
    description: "Impressions from the linked Search Console summary.",
  },
  {
    key: "AVG_POSITION",
    label: "Average position",
    unit: "position",
    source: "GSC",
    invert: true,
    description: "Average query position from Search Console (lower is better).",
  },
  {
    key: "INDEXED_PAGES",
    label: "Indexed pages",
    unit: "pages",
    source: "MANUAL",
    invert: false,
    description: "Coverage count you record from Search Console or the audit.",
  },
  {
    key: "CONTENT_SHIPPED",
    label: "Content pieces shipped",
    unit: "pieces",
    source: "APP",
    invert: false,
    description: "Cycle content items marked done on this strategy.",
  },
  {
    key: "TECH_ITEMS_CLOSED",
    label: "Tech items closed",
    unit: "items",
    source: "APP",
    invert: false,
    description: "Cycle tech items marked done on this strategy.",
  },
];

export const KPI_CATALOG_BY_KEY: Record<KpiMetricKey, KpiCatalogEntry> = Object.fromEntries(
  KPI_CATALOG.map((entry) => [entry.key, entry]),
) as Record<KpiMetricKey, KpiCatalogEntry>;

export function isKpiMetricKey(value: string): value is KpiMetricKey {
  return (KPI_METRIC_KEYS as readonly string[]).includes(value);
}

export function kpiProgressPercent(
  baseline: number | null | undefined,
  current: number | null | undefined,
  target: number,
  invert: boolean,
): number | null {
  if (current == null || !Number.isFinite(current) || !Number.isFinite(target)) return null;
  const start = baseline ?? (invert ? current * 1.25 : 0);
  if (invert) {
    if (start <= target) return current <= target ? 100 : 0;
    const pct = ((start - current) / (start - target)) * 100;
    return Math.max(0, Math.min(100, pct));
  }
  if (target === start) return current >= target ? 100 : 0;
  const pct = ((current - start) / (target - start)) * 100;
  return Math.max(0, Math.min(100, pct));
}
