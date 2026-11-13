import { NextResponse } from "next/server";
import { listAnalyticsProperties } from "@/lib/google/analytics";
import {
  getAuthenticatedOAuth2Client,
  getGoogleConnectionStatus,
  isGoogleOAuthConfigured,
  resolveOAuthRedirectUri,
} from "@/lib/google/oauth";
import { listSearchConsoleSites } from "@/lib/google/search-console";

export async function GET(request: Request) {
  const redirectUri = resolveOAuthRedirectUri(request);
  const status = await getGoogleConnectionStatus();

  if (!redirectUri || !isGoogleOAuthConfigured(redirectUri)) {
    return NextResponse.json({
      ...status,
      error: "Google OAuth is not configured.",
      analyticsProperties: [],
      searchConsoleSites: [],
    });
  }

  if (!status.connected) {
    return NextResponse.json({
      ...status,
      analyticsProperties: [],
      searchConsoleSites: [],
    });
  }

  const auth = await getAuthenticatedOAuth2Client(redirectUri);
  if (!auth) {
    return NextResponse.json(
      {
        ...status,
        connected: false,
        error: "Google connection is invalid or expired. Reconnect Google.",
        analyticsProperties: [],
        searchConsoleSites: [],
      },
      { status: 401 },
    );
  }

  try {
    const [analyticsProperties, searchConsoleSites] = await Promise.all([
      listAnalyticsProperties(auth),
      listSearchConsoleSites(auth),
    ]);

    return NextResponse.json({
      ...status,
      analyticsProperties,
      searchConsoleSites,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list Google properties.";
    return NextResponse.json(
      {
        ...status,
        error: message,
        analyticsProperties: [],
        searchConsoleSites: [],
      },
      { status: 502 },
    );
  }
}
