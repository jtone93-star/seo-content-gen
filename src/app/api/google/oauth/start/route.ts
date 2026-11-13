import { NextResponse } from "next/server";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  buildGoogleAuthUrl,
  createOAuthState,
  getGoogleOAuthConfig,
  isGoogleOAuthConfigured,
  resolveOAuthRedirectUri,
  sanitizeReturnPath,
} from "@/lib/google/oauth";

export async function GET(request: Request) {
  const redirectUri = resolveOAuthRedirectUri(request);
  if (!redirectUri || !isGoogleOAuthConfigured(redirectUri)) {
    return NextResponse.json(
      { error: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI." },
      { status: 503 },
    );
  }

  const config = getGoogleOAuthConfig(redirectUri);
  if (!config) {
    return NextResponse.json({ error: "Google OAuth is not configured." }, { status: 503 });
  }

  const url = new URL(request.url);
  const returnTo = sanitizeReturnPath(url.searchParams.get("returnTo"));
  const { state, nonce } = createOAuthState(returnTo, redirectUri);
  const authUrl = buildGoogleAuthUrl(config, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
