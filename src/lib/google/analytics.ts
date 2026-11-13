import { google } from "googleapis";
import type { GoogleOAuth2Client } from "@/lib/google/oauth";

export interface AnalyticsPropertyOption {
  propertyId: string;
  displayName: string;
  account: string;
}

export interface Ga4LandingPageRow {
  landingPage: string;
  sessions: number;
  activeUsers: number;
  bounceRate: number | null;
  avgSessionDuration: number | null;
}

export interface Ga4LandingPageSummary {
  propertyId: string;
  propertyName: string;
  dateRange: { startDate: string; endDate: string };
  topLandingPages: Ga4LandingPageRow[];
}

function propertyResourceName(propertyId: string): string {
  return propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;
}

function numericMetric(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function listAnalyticsProperties(
  auth: GoogleOAuth2Client,
): Promise<AnalyticsPropertyOption[]> {
  const admin = google.analyticsadmin({ version: "v1beta", auth: auth as never });
  const properties: AnalyticsPropertyOption[] = [];
  let pageToken: string | undefined;

  do {
    const response = await admin.accountSummaries.list({ pageSize: 200, pageToken });
    for (const account of response.data.accountSummaries ?? []) {
      const accountName = account.displayName ?? account.account ?? "Account";
      for (const summary of account.propertySummaries ?? []) {
        const propertyId = summary.property?.replace(/^properties\//, "") ?? "";
        if (!propertyId) continue;
        properties.push({
          propertyId,
          displayName: summary.displayName ?? propertyId,
          account: accountName,
        });
      }
    }
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return properties.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export async function fetchGa4LandingPageSummary(
  auth: GoogleOAuth2Client,
  propertyId: string,
  propertyName?: string,
): Promise<Ga4LandingPageSummary> {
  const analyticsData = google.analyticsdata({ version: "v1beta", auth: auth as never });
  const startDate = "28daysAgo";
  const endDate = "yesterday";
  const property = propertyResourceName(propertyId);

  const response = await analyticsData.properties.runReport({
    property,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: "landingPage" }],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "15",
    },
  });

  const topLandingPages: Ga4LandingPageRow[] =
    response.data.rows?.map((row) => ({
      landingPage: row.dimensionValues?.[0]?.value ?? "(not set)",
      sessions: numericMetric(row.metricValues?.[0]?.value),
      activeUsers: numericMetric(row.metricValues?.[1]?.value),
      bounceRate: row.metricValues?.[2]?.value ? numericMetric(row.metricValues[2].value) : null,
      avgSessionDuration: row.metricValues?.[3]?.value
        ? numericMetric(row.metricValues[3].value)
        : null,
    })) ?? [];

  return {
    propertyId: propertyId.replace(/^properties\//, ""),
    propertyName: propertyName ?? propertyId,
    dateRange: { startDate, endDate },
    topLandingPages,
  };
}
