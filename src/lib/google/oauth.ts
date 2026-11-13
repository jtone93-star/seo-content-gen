import crypto from "node:crypto";
import { google } from "googleapis";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  desktopRedirectUri,
  googleCredentialsFromDesktop,
  isDesktopMode,
} from "@/lib/desktop-config";
import { prisma } from "@/lib/prisma";

export const GOOGLE_OAUTH_ACCOUNT_ID = "google";
export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
];

const STATE_TTL_MS = 10 * 60 * 1000;

export type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface GoogleConnectionStatus {
  configured: boolean;
  connected: boolean;
  expiresAt: string | null;
  selections: {
    analyticsPropertyId: string | null;
    searchConsoleSiteUrl: string | null;
  };
}

export interface GooglePropertySelection {
  analyticsPropertyId?: string | null;
  searchConsoleSiteUrl?: string | null;
}

interface OAuthStatePayload {
  nonce: string;
  returnTo: string;
  redirectUri: string;
  exp: number;
}

function normalizeSecret(raw: string | undefined): string | null {
  if (!raw) return null;
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || null;
}

function configuredRedirectUri(): string | null {
  return (
    normalizeSecret(process.env.GOOGLE_REDIRECT_URI) ||
    normalizeSecret(process.env.GOOGLE_OAUTH_REDIRECT_URI)
  );
}

function signingSecret(): string {
  return (
    normalizeSecret(process.env.APP_ENCRYPTION_KEY) ||
    normalizeSecret(process.env.APP_PASSWORD) ||
    "insecure-dev-secret"
  );
}

function toBase64Url(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf.toString("base64url");
}

function fromBase64Url(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function sign(data: string): string {
  return crypto.createHmac("sha256", signingSecret()).update(data).digest("base64url");
}

/** Allow only same-origin relative paths (no protocol-relative or absolute URLs). */
export function sanitizeReturnPath(raw: string | null | undefined): string {
  const fallback = "/";
  if (!raw) return fallback;

  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") return fallback;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
}

export function isGoogleOAuthConfigured(redirectUri?: string | null): boolean {
  const fromDesktop = googleCredentialsFromDesktop();
  const clientId =
    normalizeSecret(process.env.GOOGLE_CLIENT_ID) || fromDesktop.clientId;
  const clientSecret =
    normalizeSecret(process.env.GOOGLE_CLIENT_SECRET) || fromDesktop.clientSecret;
  const uri = redirectUri ?? configuredRedirectUri() ?? (isDesktopMode() ? desktopRedirectUri() : null);
  return Boolean(clientId && clientSecret && uri);
}

export function getGoogleOAuthConfig(redirectUri: string): GoogleOAuthConfig | null {
  const fromDesktop = googleCredentialsFromDesktop();
  const clientId =
    normalizeSecret(process.env.GOOGLE_CLIENT_ID) || fromDesktop.clientId;
  const clientSecret =
    normalizeSecret(process.env.GOOGLE_CLIENT_SECRET) || fromDesktop.clientSecret;
  const resolvedRedirect = isDesktopMode()
    ? desktopRedirectUri(Number(process.env.PORT) || undefined)
    : configuredRedirectUri() ?? redirectUri.trim();

  if (!clientId || !clientSecret || !resolvedRedirect) return null;

  return {
    clientId,
    clientSecret,
    redirectUri: resolvedRedirect,
  };
}

export function resolveOAuthRedirectUri(request: Request): string | null {
  if (isDesktopMode()) {
    return desktopRedirectUri(Number(process.env.PORT) || undefined);
  }

  const fromEnv = configuredRedirectUri();
  if (fromEnv) return fromEnv;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  if (!host) return null;

  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}/api/google/oauth/callback`;
}

export function createOAuthState(
  returnTo: string,
  redirectUri: string,
): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload: OAuthStatePayload = {
    nonce,
    returnTo: sanitizeReturnPath(returnTo),
    redirectUri,
    exp: Date.now() + STATE_TTL_MS,
  };
  const encoded = toBase64Url(JSON.stringify(payload));
  const signature = sign(encoded);
  return { state: `${encoded}.${signature}`, nonce };
}

export function verifyOAuthState(state: string): OAuthStatePayload | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  const sigBuf = Buffer.from(signature, "utf8");
  const expBuf = Buffer.from(expected, "utf8");
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encoded).toString("utf8")) as OAuthStatePayload;
    if (
      !payload ||
      typeof payload.nonce !== "string" ||
      typeof payload.returnTo !== "string" ||
      typeof payload.redirectUri !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.exp < Date.now()) return null;
    return {
      ...payload,
      returnTo: sanitizeReturnPath(payload.returnTo),
    };
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(config: GoogleOAuthConfig, state: string): string {
  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

function tokenPartsFromAccount(account: {
  accessTokenCiphertext: string;
  accessTokenIv: string;
  accessTokenTag: string;
  refreshTokenCiphertext: string | null;
  refreshTokenIv: string | null;
  refreshTokenTag: string | null;
}) {
  const accessToken = decryptSecret({
    ciphertext: account.accessTokenCiphertext,
    iv: account.accessTokenIv,
    tag: account.accessTokenTag,
  });

  const refreshToken =
    account.refreshTokenCiphertext && account.refreshTokenIv && account.refreshTokenTag
      ? decryptSecret({
          ciphertext: account.refreshTokenCiphertext,
          iv: account.refreshTokenIv,
          tag: account.refreshTokenTag,
        })
      : null;

  return { accessToken, refreshToken };
}

export async function saveGoogleTokens(input: {
  accessToken: string;
  refreshToken?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
}): Promise<void> {
  const access = encryptSecret(input.accessToken);
  const refresh = input.refreshToken ? encryptSecret(input.refreshToken) : null;

  await prisma.oAuthAccount.upsert({
    where: { id: GOOGLE_OAUTH_ACCOUNT_ID },
    create: {
      id: GOOGLE_OAUTH_ACCOUNT_ID,
      provider: "google",
      accessTokenCiphertext: access.ciphertext,
      accessTokenIv: access.iv,
      accessTokenTag: access.tag,
      refreshTokenCiphertext: refresh?.ciphertext ?? null,
      refreshTokenIv: refresh?.iv ?? null,
      refreshTokenTag: refresh?.tag ?? null,
      scope: input.scope ?? GOOGLE_SCOPES.join(" "),
      expiresAt: input.expiresAt ?? null,
    },
    update: {
      accessTokenCiphertext: access.ciphertext,
      accessTokenIv: access.iv,
      accessTokenTag: access.tag,
      ...(refresh
        ? {
            refreshTokenCiphertext: refresh.ciphertext,
            refreshTokenIv: refresh.iv,
            refreshTokenTag: refresh.tag,
          }
        : {}),
      scope: input.scope ?? GOOGLE_SCOPES.join(" "),
      expiresAt: input.expiresAt ?? null,
    },
  });
}

export async function deleteGoogleConnection(): Promise<void> {
  await prisma.oAuthAccount.deleteMany({ where: { id: GOOGLE_OAUTH_ACCOUNT_ID } });
}

export async function getGoogleConnectionStatus(): Promise<GoogleConnectionStatus> {
  const configured = isGoogleOAuthConfigured();
  const account = await prisma.oAuthAccount.findUnique({
    where: { id: GOOGLE_OAUTH_ACCOUNT_ID },
  });

  if (!account) {
    return {
      configured,
      connected: false,
      expiresAt: null,
      selections: {
        analyticsPropertyId: null,
        searchConsoleSiteUrl: null,
      },
    };
  }

  return {
    configured,
    connected: true,
    expiresAt: account.expiresAt?.toISOString() ?? null,
    selections: {
      analyticsPropertyId: account.analyticsPropertyId,
      searchConsoleSiteUrl: account.searchConsoleSiteUrl,
    },
  };
}

export async function saveGooglePropertySelection(
  selection: GooglePropertySelection,
): Promise<GoogleConnectionStatus> {
  const account = await prisma.oAuthAccount.findUnique({
    where: { id: GOOGLE_OAUTH_ACCOUNT_ID },
  });
  if (!account) {
    throw new Error("Google account is not connected.");
  }

  await prisma.oAuthAccount.update({
    where: { id: GOOGLE_OAUTH_ACCOUNT_ID },
    data: {
      ...(selection.analyticsPropertyId !== undefined
        ? { analyticsPropertyId: selection.analyticsPropertyId || null }
        : {}),
      ...(selection.searchConsoleSiteUrl !== undefined
        ? { searchConsoleSiteUrl: selection.searchConsoleSiteUrl || null }
        : {}),
    },
  });

  return getGoogleConnectionStatus();
}

async function persistRefreshedTokens(
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string | null;
  },
  existingRefreshToken: string | null,
): Promise<void> {
  if (!tokens.access_token) return;

  await saveGoogleTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existingRefreshToken,
    scope: tokens.scope ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  });
}

export async function getAuthenticatedOAuth2Client(
  redirectUri?: string,
): Promise<GoogleOAuth2Client | null> {
  const account = await prisma.oAuthAccount.findUnique({
    where: { id: GOOGLE_OAUTH_ACCOUNT_ID },
  });
  if (!account) return null;

  const config = getGoogleOAuthConfig(
    redirectUri ?? configuredRedirectUri() ?? "http://localhost",
  );
  if (!config) return null;

  let accessToken: string;
  let refreshToken: string | null;
  try {
    ({ accessToken, refreshToken } = tokenPartsFromAccount(account));
  } catch {
    return null;
  }

  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken ?? undefined,
    expiry_date: account.expiresAt?.getTime(),
    scope: account.scope,
  });

  const expiresAt = account.expiresAt?.getTime() ?? 0;
  const needsRefresh = !expiresAt || expiresAt <= Date.now() + 60_000;
  if (needsRefresh && refreshToken) {
    try {
      const { credentials } = await client.refreshAccessToken();
      client.setCredentials(credentials);
      await persistRefreshedTokens(credentials, refreshToken);
    } catch {
      return null;
    }
  }

  client.on("tokens", (tokens) => {
    void persistRefreshedTokens(tokens, refreshToken);
  });

  return client;
}

export async function exchangeGoogleAuthCode(
  code: string,
  redirectUri: string,
): Promise<void> {
  const config = getGoogleOAuthConfig(redirectUri);
  if (!config) {
    throw new Error("Google OAuth is not configured.");
  }

  const client = new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token.");
  }

  await saveGoogleTokens({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: tokens.scope ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  });
}
