import { NextResponse } from "next/server";
import { AuditDataSourceType, type Prisma } from "@/generated/prisma/client";
import { fetchGa4LandingPageSummary, listAnalyticsProperties } from "@/lib/google/analytics";
import {
  getAuthenticatedOAuth2Client,
  getGoogleConnectionStatus,
  isGoogleOAuthConfigured,
  resolveOAuthRedirectUri,
} from "@/lib/google/oauth";
import { fetchGscPerformanceSummary } from "@/lib/google/search-console";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id: auditId } = await params;
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  const redirectUri = resolveOAuthRedirectUri(request);
  if (!redirectUri || !isGoogleOAuthConfigured(redirectUri)) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
  }

  const connection = await getGoogleConnectionStatus();
  if (!connection.connected) {
    return NextResponse.json({ error: "Connect Google before importing analytics data." }, { status: 400 });
  }

  const { analyticsPropertyId, searchConsoleSiteUrl } = connection.selections;
  if (!analyticsPropertyId && !searchConsoleSiteUrl) {
    return NextResponse.json(
      { error: "Select a GA4 property and/or Search Console site first." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedOAuth2Client(redirectUri);
  if (!auth) {
    return NextResponse.json(
      { error: "Google connection is invalid or expired. Reconnect Google." },
      { status: 401 },
    );
  }

  const created: Array<{ id: string; type: AuditDataSourceType; label: string }> = [];
  const errors: string[] = [];

  try {
    if (analyticsPropertyId) {
      const properties = await listAnalyticsProperties(auth);
      const selected = properties.find((p) => p.propertyId === analyticsPropertyId);
      const summary = await fetchGa4LandingPageSummary(
        auth,
        analyticsPropertyId,
        selected?.displayName,
      );
      await prisma.auditDataSource.deleteMany({
        where: { auditId, type: AuditDataSourceType.GA4 },
      });
      const ga4Source = await prisma.auditDataSource.create({
        data: {
          auditId,
          type: AuditDataSourceType.GA4,
          label: `GA4: ${summary.propertyName}`,
          summary: summary as unknown as Prisma.InputJsonValue,
          meta: { propertyId: analyticsPropertyId, fetchedAt: new Date().toISOString() },
        },
      });
      created.push({ id: ga4Source.id, type: ga4Source.type, label: ga4Source.label });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Failed to fetch GA4 landing page metrics.");
  }

  try {
    if (searchConsoleSiteUrl) {
      const summary = await fetchGscPerformanceSummary(auth, searchConsoleSiteUrl);
      await prisma.auditDataSource.deleteMany({
        where: { auditId, type: AuditDataSourceType.GSC },
      });
      const gscSource = await prisma.auditDataSource.create({
        data: {
          auditId,
          type: AuditDataSourceType.GSC,
          label: `Search Console: ${searchConsoleSiteUrl}`,
          summary: summary as unknown as Prisma.InputJsonValue,
          meta: { siteUrl: searchConsoleSiteUrl, fetchedAt: new Date().toISOString() },
        },
      });
      created.push({ id: gscSource.id, type: gscSource.type, label: gscSource.label });
    }
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Failed to fetch Search Console metrics.");
  }

  if (created.length === 0) {
    return NextResponse.json(
      { error: errors.join(" ") || "No Google data could be imported." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    dataSources: created,
    errors: errors.length > 0 ? errors : undefined,
  });
}
