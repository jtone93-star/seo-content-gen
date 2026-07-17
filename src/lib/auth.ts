/**
 * Minimal single-user auth for the MVP.
 *
 * Gate is ENABLED only when APP_PASSWORD is set. The session cookie stores an
 * HMAC of the password (signed with APP_ENCRYPTION_KEY) so it can be validated
 * without a database lookup, and changing the password invalidates old cookies.
 *
 * Uses Web Crypto so it works in both the Node proxy runtime and route handlers.
 */

export const SESSION_COOKIE = "cg_session";

/** Normalize env secrets (Vercel pastes often include trailing newlines / quotes). */
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

function getPassword(): string | null {
  return normalizeSecret(process.env.APP_PASSWORD);
}

export function isAuthEnabled(): boolean {
  return getPassword() !== null;
}

function signingSecret(): string {
  return (
    normalizeSecret(process.env.APP_ENCRYPTION_KEY) ||
    getPassword() ||
    "insecure-dev-secret"
  );
}

function toBase64Url(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  // Prefer Buffer when available (Node); fall back to btoa (browsers).
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Deterministic token for the current password + secret. */
export async function expectedSessionToken(): Promise<string | null> {
  const password = getPassword();
  if (!password) return null;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(signingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`auth:v1:${password}`));
  return toBase64Url(signature);
}

/** Constant-time-ish string compare. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(candidate: string): Promise<boolean> {
  const password = getPassword();
  if (!password) return false;
  return safeEqual(candidate.trim(), password);
}
