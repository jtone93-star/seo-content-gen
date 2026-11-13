import { google } from "googleapis";
import type { GoogleOAuth2Client } from "@/lib/google/oauth";

export interface SearchConsoleSiteOption {
  siteUrl: string;
  permissionLevel: string | null;
}

export interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export interface GscPerformanceSummary {
  siteUrl: string;
  dateRange: { startDate: string; endDate: string };
  topQueries: GscQueryRow[];
  topPages: GscPageRow[];
}

function isoDateDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function mapSearchAnalyticsRow(
  row: {
    keys?: string[] | null;
    clicks?: number | null;
    impressions?: number | null;
    ctr?: number | null;
    position?: number | null;
  },
  keyName: "query" | "page",
): GscQueryRow | GscPageRow {
  const base = {
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? null,
    position: row.position ?? null,
  };
  const key = row.keys?.[0] ?? "(not set)";
  return keyName === "query" ? { query: key, ...base } : { page: key, ...base };
}

export async function listSearchConsoleSites(
  auth: GoogleOAuth2Client,
): Promise<SearchConsoleSiteOption[]> {
  const searchConsole = google.searchconsole({ version: "v1", auth: auth as never });
  const response = await searchConsole.sites.list();
  const sites =
    response.data.siteEntry?.map((entry) => ({
      siteUrl: entry.siteUrl ?? "",
      permissionLevel: entry.permissionLevel ?? null,
    })) ?? [];

  return sites
    .filter((site) => site.siteUrl)
    .sort((a, b) => a.siteUrl.localeCompare(b.siteUrl));
}

async function fetchDimensionRows(
  auth: GoogleOAuth2Client,
  siteUrl: string,
  dimension: "query" | "page",
  startDate: string,
  endDate: string,
): Promise<Array<GscQueryRow | GscPageRow>> {
  const searchConsole = google.searchconsole({ version: "v1", auth: auth as never });
  const response = await searchConsole.searchanalytics.query({
    siteUrl,
    requestBody: {
      startDate,
      endDate,
      dimensions: [dimension],
      rowLimit: 15,
      dataState: "final",
    },
  });

  return (
    response.data.rows?.map((row) => mapSearchAnalyticsRow(row, dimension)) ?? []
  );
}

export async function fetchGscPerformanceSummary(
  auth: GoogleOAuth2Client,
  siteUrl: string,
): Promise<GscPerformanceSummary> {
  const endDate = isoDateDaysAgo(3);
  const startDate = isoDateDaysAgo(30);

  const [queryRows, pageRows] = await Promise.all([
    fetchDimensionRows(auth, siteUrl, "query", startDate, endDate),
    fetchDimensionRows(auth, siteUrl, "page", startDate, endDate),
  ]);

  return {
    siteUrl,
    dateRange: { startDate, endDate },
    topQueries: queryRows as GscQueryRow[],
    topPages: pageRows as GscPageRow[],
  };
}
