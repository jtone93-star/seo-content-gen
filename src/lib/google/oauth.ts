import crypto from "node:crypto";
import { google } from "googleapis";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  desktopRedirectUri,
  googleCredentialsFromDesktop,
  isDesktopMode,
} from "@/lib/desktop-config";
import { prisma } from "@/lib/prisma";

export const GOOGLE_OAUTH_STATE_COOKIE = "google_oauth_state";

// The email scope lets each client's card show which Google account is connected.
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
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
  accountEmail: string | null;
  expiresAt: string | null;
  selections: {
    analyticsPropertyId: string | null;
    analyticsPropertyName: string | null;
    searchConsoleSiteUrl: string | null;
  };
}

export interface GooglePropertySelection {
  analyticsPropertyId?: string | null;
  analyticsPropertyName?: string | null;
  searchConsoleSiteUrl?: string | null;
}

interface OAuthStatePayload {
  nonce: string;
  clientId: string;
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

/** The signed state carries the client, so the tokens Google returns land on that client only. */
export function createOAuthState(
  clientId: string,
  returnTo: string,
  redirectUri: string,
): { state: string; nonce: string } {
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload: OAuthStatePayload = {
    nonce,
    clientId,
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
      typeof payload.clientId !== "string" ||
      !payload.clientId ||
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
    // Always show the account chooser so the operator picks this client's account on purpose.
    prompt: "select_account consent",
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

/**
 * Store a fresh sign-in for one client. It replaces any earlier connection outright, so a
 * refresh token from a previously connected Google account never stays behind.
 */
export async function saveGoogleConnection(input: {
  clientId: string;
  accountEmail: string | null;
  accessToken: string;
  refreshToken?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
}): Promise<void> {
  const access = encryptSecret(input.accessToken);
  const refresh = input.refreshToken ? encryptSecret(input.refreshToken) : null;

  const existing = await prisma.oAuthAccount.findUnique({
    where: { clientId: input.clientId },
    select: { accountEmail: true },
  });
  // The chosen property and site survive only when the same Google account signs in again.
  const sameAccount = Boolean(input.accountEmail && existing?.accountEmail === input.accountEmail);

  const tokens = {
    accountEmail: input.accountEmail,
    accessTokenCiphertext: access.ciphertext,
    accessTokenIv: access.iv,
    accessTokenTag: access.tag,
    refreshTokenCiphertext: refresh?.ciphertext ?? null,
    refreshTokenIv: refresh?.iv ?? null,
    refreshTokenTag: refresh?.tag ?? null,
    scope: input.scope ?? GOOGLE_SCOPES.join(" "),
    expiresAt: input.expiresAt ?? null,
  };

  await prisma.oAuthAccount.upsert({
    where: { clientId: input.clientId },
    create: { clientId: input.clientId, provider: "google", ...tokens },
    update: {
      ...tokens,
      ...(sameAccount
        ? {}
        : { analyticsPropertyId: null, analyticsPropertyName: null, searchConsoleSiteUrl: null }),
    },
  });
}

/**
 * Removes this client's stored connection. The grant is deliberately not revoked at Google:
 * revoking would also cut off other clients connected through the same Google account.
 */
export async function deleteGoogleConnection(clientId: string): Promise<void> {
  await prisma.oAuthAccount.deleteMany({ where: { clientId } });
}

export async function getGoogleConnectionStatus(clientId: string): Promise<GoogleConnectionStatus> {
  const configured = isGoogleOAuthConfigured();
  const account = await prisma.oAuthAccount.findUnique({ where: { clientId } });

  if (!account) {
    return {
      configured,
      connected: false,
      accountEmail: null,
      expiresAt: null,
      selections: {
        analyticsPropertyId: null,
        analyticsPropertyName: null,
        searchConsoleSiteUrl: null,
      },
    };
  }

  return {
    configured,
    connected: true,
    accountEmail: account.accountEmail,
    expiresAt: account.expiresAt?.toISOString() ?? null,
    selections: {
      analyticsPropertyId: account.analyticsPropertyId,
      analyticsPropertyName: account.analyticsPropertyName,
      searchConsoleSiteUrl: account.searchConsoleSiteUrl,
    },
  };
}

/**
 * Names the other client already using this GA4 property or Search Console site, if any.
 * One property belongs to one client, so a repeat is treated as a mix-up.
 */
export async function findGoogleSelectionConflict(
  clientId: string,
  selection: GooglePropertySelection,
): Promise<{ clientName: string; resource: "analytics" | "searchConsole" } | null> {
  if (selection.analyticsPropertyId) {
    const other = await prisma.oAuthAccount.findFirst({
      where: { clientId: { not: clientId }, analyticsPropertyId: selection.analyticsPropertyId },
      select: { client: { select: { name: true } } },
    });
    if (other) return { clientName: other.client.name, resource: "analytics" };
  }
  if (selection.searchConsoleSiteUrl) {
    const other = await prisma.oAuthAccount.findFirst({
      where: { clientId: { not: clientId }, searchConsoleSiteUrl: selection.searchConsoleSiteUrl },
      select: { client: { select: { name: true } } },
    });
    if (other) return { clientName: other.client.name, resource: "searchConsole" };
  }
  return null;
}

export async function saveGooglePropertySelection(
  clientId: string,
  selection: GooglePropertySelection,
): Promise<GoogleConnectionStatus> {
  const account = await prisma.oAuthAccount.findUnique({ where: { clientId } });
  if (!account) {
    throw new Error("Google account is not connected.");
  }

  await prisma.oAuthAccount.update({
    where: { clientId },
    data: {
      ...(selection.analyticsPropertyId !== undefined
        ? {
            analyticsPropertyId: selection.analyticsPropertyId || null,
            analyticsPropertyName: selection.analyticsPropertyId
              ? (selection.analyticsPropertyName ?? null)
              : null,
          }
        : {}),
      ...(selection.searchConsoleSiteUrl !== undefined
        ? { searchConsoleSiteUrl: selection.searchConsoleSiteUrl || null }
        : {}),
    },
  });

  return getGoogleConnectionStatus(clientId);
}

async function persistRefreshedTokens(
  clientId: string,
  tokens: {
    access_token?: string | null;
    refresh_token?: string | null;
    expiry_date?: number | null;
    scope?: string | null;
  },
): Promise<void> {
  if (!tokens.access_token) return;

  const access = encryptSecret(tokens.access_token);
  const refresh = tokens.refresh_token ? encryptSecret(tokens.refresh_token) : null;

  // updateMany: a connection removed mid-request is simply left removed.
  await prisma.oAuthAccount.updateMany({
    where: { clientId },
    data: {
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
      ...(tokens.scope ? { scope: tokens.scope } : {}),
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  });
}

export async function getAuthenticatedOAuth2Client(
  clientId: string,
  redirectUri?: string,
): Promise<GoogleOAuth2Client | null> {
  const account = await prisma.oAuthAccount.findUnique({ where: { clientId } });
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
      await persistRefreshedTokens(clientId, credentials);
    } catch {
      return null;
    }
  }

  client.on("tokens", (tokens) => {
    void persistRefreshedTokens(clientId, tokens);
  });

  return client;
}

async function fetchAccountEmail(client: GoogleOAuth2Client): Promise<string | null> {
  try {
    const { data } = await google.oauth2({ version: "v2", auth: client as never }).userinfo.get();
    return data.email ?? null;
  } catch {
    return null;
  }
}

export async function exchangeGoogleAuthCode(
  clientId: string,
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

  client.setCredentials(tokens);
  const accountEmail = await fetchAccountEmail(client);

  await saveGoogleConnection({
    clientId,
    accountEmail,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    scope: tokens.scope ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  });
}
