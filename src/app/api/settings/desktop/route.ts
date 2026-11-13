import { NextResponse } from "next/server";
import {
  DESKTOP_APP_PORT,
  desktopRedirectUri,
  isDesktopMode,
  readDesktopConfig,
  writeDesktopConfig,
} from "@/lib/desktop-config";
import { isGoogleOAuthConfigured } from "@/lib/google/oauth";

export async function GET() {
  if (!isDesktopMode()) {
    return NextResponse.json({ desktop: false });
  }

  const config = readDesktopConfig();
  const port = Number(process.env.PORT) || DESKTOP_APP_PORT;
  const redirectUri = desktopRedirectUri(port);

  return NextResponse.json({
    desktop: true,
    google: {
      configured: isGoogleOAuthConfigured(redirectUri),
      hasClientId: Boolean(config.googleClientId.trim()),
      hasClientSecret: Boolean(config.googleClientSecret.trim()),
      redirectUri,
    },
  });
}

export async function PATCH(request: Request) {
  if (!isDesktopMode()) {
    return NextResponse.json(
      { error: "Google desktop settings are only available in the desktop app." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const clientId = typeof body.clientId === "string" ? body.clientId.trim() : "";
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret.trim() : "";

  const current = readDesktopConfig();
  const next = {
    ...current,
    googleClientId: clientId || current.googleClientId,
    googleClientSecret: clientSecret || current.googleClientSecret,
  };

  if (body.clear === true) {
    next.googleClientId = "";
    next.googleClientSecret = "";
  }

  writeDesktopConfig(next);
  process.env.GOOGLE_CLIENT_ID = next.googleClientId;
  process.env.GOOGLE_CLIENT_SECRET = next.googleClientSecret;

  const port = Number(process.env.PORT) || DESKTOP_APP_PORT;
  const redirectUri = desktopRedirectUri(port);

  return NextResponse.json({
    desktop: true,
    google: {
      configured: Boolean(next.googleClientId && next.googleClientSecret),
      hasClientId: Boolean(next.googleClientId),
      hasClientSecret: Boolean(next.googleClientSecret),
      redirectUri,
    },
  });
}
