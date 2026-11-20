import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_OAUTH_STATE_COOKIE,
  exchangeGoogleAuthCode,
  sanitizeReturnPath,
  verifyOAuthState,
} from "@/lib/google/oauth";

function redirectWithStatus(
  request: Request,
  returnTo: string,
  params: Record<string, string>,
): NextResponse {
  const url = new URL(returnTo, request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthError = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const payload = state ? verifyOAuthState(state) : null;
  const returnTo = payload?.returnTo ?? "/";

  if (oauthError) {
    const response = redirectWithStatus(request, returnTo, { google: "error", reason: oauthError });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  if (!code || !payload) {
    const response = redirectWithStatus(request, returnTo, { google: "error", reason: "invalid_state" });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  const cookieStore = await cookies();
  const nonce = cookieStore.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!nonce || nonce !== payload.nonce) {
    const response = redirectWithStatus(request, returnTo, { google: "error", reason: "state_mismatch" });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  try {
    await exchangeGoogleAuthCode(payload.clientId, code, payload.redirectUri);
  } catch (err) {
    const message = err instanceof Error ? err.message : "token_exchange_failed";
    const response = redirectWithStatus(request, returnTo, { google: "error", reason: message });
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  }

  const response = redirectWithStatus(request, sanitizeReturnPath(returnTo), { google: "connected" });
  response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return response;
}
