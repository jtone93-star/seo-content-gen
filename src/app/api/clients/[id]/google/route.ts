import { NextResponse } from "next/server";
import { listAnalyticsProperties } from "@/lib/google/analytics";
import {
  deleteGoogleConnection,
  findGoogleSelectionConflict,
  getAuthenticatedOAuth2Client,
  getGoogleConnectionStatus,
  isGoogleOAuthConfigured,
  resolveOAuthRedirectUri,
  saveGooglePropertySelection,
} from "@/lib/google/oauth";
import { listSearchConsoleSites } from "@/lib/google/search-console";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

const EXPIRED = "Google connection is invalid or expired. Reconnect Google.";

async function clientExists(id: string): Promise<boolean> {
  const client = await prisma.clientProfile.findUnique({ where: { id }, select: { id: true } });
  return Boolean(client);
}

/** This client's Google connection, plus the properties and sites its account can reach. */
export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  if (!(await clientExists(id))) {
    return NextResponse.json({ error: "Client not found." }, { status: 404 });
  }

  const redirectUri = resolveOAuthRedirectUri(request);
  const status = await getGoogleConnectionStatus(id);
  const empty = { analyticsProperties: [], searchConsoleSites: [] };

  if (!redirectUri || !isGoogleOAuthConfigured(redirectUri)) {
    return NextResponse.json({ ...status, configured: false, ...empty });
  }
  if (!status.connected) {
    return NextResponse.json({ ...status, ...empty });
  }

  const auth = await getAuthenticatedOAuth2Client(id, redirectUri);
  if (!auth) {
    return NextResponse.json({ ...status, connected: false, error: EXPIRED, ...empty }, { status: 401 });
  }

  try {
    const [analyticsProperties, searchConsoleSites] = await Promise.all([
      listAnalyticsProperties(auth),
      listSearchConsoleSites(auth),
    ]);
    return NextResponse.json({ ...status, analyticsProperties, searchConsoleSites });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list Google properties.";
    return NextResponse.json({ ...status, error: message, ...empty }, { status: 502 });
  }
}

/** Save which GA4 property and Search Console site belong to this client. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const status = await getGoogleConnectionStatus(id);
  if (!status.connected) {
    return NextResponse.json(
      { error: "Connect Google for this client before selecting properties." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const analyticsPropertyId: string | null | undefined =
    body.analyticsPropertyId === null || typeof body.analyticsPropertyId === "string"
      ? body.analyticsPropertyId || null
      : undefined;
  const searchConsoleSiteUrl: string | null | undefined =
    body.searchConsoleSiteUrl === null || typeof body.searchConsoleSiteUrl === "string"
      ? body.searchConsoleSiteUrl || null
      : undefined;

  if (analyticsPropertyId === undefined && searchConsoleSiteUrl === undefined) {
    return NextResponse.json(
      { error: "Provide analyticsPropertyId and/or searchConsoleSiteUrl." },
      { status: 400 },
    );
  }

  const conflict = await findGoogleSelectionConflict(id, { analyticsPropertyId, searchConsoleSiteUrl });
  if (conflict) {
    const what = conflict.resource === "analytics" ? "Analytics property" : "Search Console site";
    return NextResponse.json(
      { error: `That ${what} is already linked to ${conflict.clientName}. Remove it there first.` },
      { status: 409 },
    );
  }

  // Confirm each choice is reachable from this client's own Google account before saving it.
  let analyticsPropertyName: string | null = null;
  if (analyticsPropertyId || searchConsoleSiteUrl) {
    const auth = await getAuthenticatedOAuth2Client(id, resolveOAuthRedirectUri(request) ?? undefined);
    if (!auth) return NextResponse.json({ error: EXPIRED }, { status: 401 });

    try {
      if (analyticsPropertyId) {
        const property = (await listAnalyticsProperties(auth)).find(
          (p) => p.propertyId === analyticsPropertyId,
        );
        if (!property) {
          return NextResponse.json(
            { error: "That Analytics property is not available on this client's Google account." },
            { status: 400 },
          );
        }
        analyticsPropertyName = property.displayName;
      }
      if (searchConsoleSiteUrl) {
        const sites = await listSearchConsoleSites(auth);
        if (!sites.some((site) => site.siteUrl === searchConsoleSiteUrl)) {
          return NextResponse.json(
            { error: "That Search Console site is not available on this client's Google account." },
            { status: 400 },
          );
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not check the selection with Google.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const updated = await saveGooglePropertySelection(id, {
    analyticsPropertyId,
    analyticsPropertyName,
    searchConsoleSiteUrl,
  });
  return NextResponse.json(updated);
}

/** Disconnect Google from this client. Other clients keep their own connections. */
export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  await deleteGoogleConnection(id);
  return NextResponse.json({ ok: true });
}
