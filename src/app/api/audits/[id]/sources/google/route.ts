import { NextResponse } from "next/server";
import { AuditDataSourceType, type Prisma } from "@/generated/prisma/client";
import { fetchGa4LandingPageSummary } from "@/lib/google/analytics";
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
    return NextResponse.json({ error: "Google sign-in is not set up for this app yet." }, { status: 503 });
  }

  // Google data always comes from the connection that belongs to this audit's client.
  const clientId = audit.clientProfileId;
  const connection = await getGoogleConnectionStatus(clientId);
  if (!connection.connected) {
    return NextResponse.json(
      { error: "Connect Google on this client's Overview before importing analytics data." },
      { status: 400 },
    );
  }

  const { analyticsPropertyId, analyticsPropertyName, searchConsoleSiteUrl } = connection.selections;
  if (!analyticsPropertyId && !searchConsoleSiteUrl) {
    return NextResponse.json(
      { error: "Choose a GA4 property and/or Search Console site on this client's Overview first." },
      { status: 400 },
    );
  }

  const auth = await getAuthenticatedOAuth2Client(clientId, redirectUri);
  if (!auth) {
    return NextResponse.json(
      { error: "Google connection is invalid or expired. Reconnect Google on this client's Overview." },
      { status: 401 },
    );
  }

  const created: Array<{ id: string; type: AuditDataSourceType; label: string }> = [];
  const errors: string[] = [];

  try {
    if (analyticsPropertyId) {
      const summary = await fetchGa4LandingPageSummary(
        auth,
        analyticsPropertyId,
        analyticsPropertyName ?? undefined,
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
