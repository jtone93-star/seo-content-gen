import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const DESKTOP_APP_PORT = 47821;
export const DESKTOP_PG_PORT = 55432;

export interface DesktopConfig {
  encryptionKey: string;
  pgPassword: string;
  googleClientId: string;
  googleClientSecret: string;
}

export function isDesktopMode(): boolean {
  return process.env.DESKTOP_MODE === "1" || process.env.DESKTOP_MODE === "true";
}

export function desktopConfigPath(): string | null {
  const fromEnv = process.env.DESKTOP_CONFIG_PATH?.trim();
  return fromEnv || null;
}

export function desktopRedirectUri(port = DESKTOP_APP_PORT): string {
  return `http://127.0.0.1:${port}/api/google/oauth/callback`;
}

function emptyConfig(): DesktopConfig {
  return {
    encryptionKey: "",
    pgPassword: "",
    googleClientId: "",
    googleClientSecret: "",
  };
}

export function readDesktopConfig(filePath?: string | null): DesktopConfig {
  const target = filePath ?? desktopConfigPath();
  if (!target || !fs.existsSync(target)) return emptyConfig();
  try {
    const raw = JSON.parse(fs.readFileSync(target, "utf8")) as Partial<DesktopConfig>;
    return {
      encryptionKey: String(raw.encryptionKey ?? ""),
      pgPassword: String(raw.pgPassword ?? ""),
      googleClientId: String(raw.googleClientId ?? ""),
      googleClientSecret: String(raw.googleClientSecret ?? ""),
    };
  } catch {
    return emptyConfig();
  }
}

export function writeDesktopConfig(config: DesktopConfig, filePath?: string | null): void {
  const target = filePath ?? desktopConfigPath();
  if (!target) throw new Error("DESKTOP_CONFIG_PATH is not set.");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(config, null, 2), "utf8");
}

/** Ensure encryption + DB password exist; returns the config (possibly created). */
export function ensureDesktopConfig(filePath: string): DesktopConfig {
  const current = readDesktopConfig(filePath);
  let changed = false;
  if (!current.encryptionKey) {
    current.encryptionKey = crypto.randomBytes(32).toString("base64");
    changed = true;
  }
  if (!current.pgPassword) {
    current.pgPassword = crypto.randomBytes(18).toString("base64url");
    changed = true;
  }
  if (changed) writeDesktopConfig(current, filePath);
  return current;
}

/** Apply desktop config into process.env for the Next server / Electron child. */
export function applyDesktopEnv(
  config: DesktopConfig,
  opts: {
    databaseUrl: string;
    port?: number;
    configPath: string;
  },
): void {
  const port = opts.port ?? DESKTOP_APP_PORT;
  process.env.DESKTOP_MODE = "1";
  process.env.DESKTOP_CONFIG_PATH = opts.configPath;
  process.env.DATABASE_URL = opts.databaseUrl;
  process.env.DIRECT_URL = opts.databaseUrl;
  process.env.APP_ENCRYPTION_KEY = config.encryptionKey;
  // Single-user desktop: leave password gate off unless the operator sets it.
  if (process.env.APP_PASSWORD === undefined) {
    process.env.APP_PASSWORD = "";
  }
  process.env.PORT = String(port);
  process.env.HOSTNAME = "127.0.0.1";
  process.env.GOOGLE_REDIRECT_URI = desktopRedirectUri(port);

  if (config.googleClientId) {
    process.env.GOOGLE_CLIENT_ID = config.googleClientId;
  }
  if (config.googleClientSecret) {
    process.env.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
  }
}

export function googleCredentialsFromDesktop(): {
  clientId: string | null;
  clientSecret: string | null;
} {
  if (!isDesktopMode()) return { clientId: null, clientSecret: null };
  const config = readDesktopConfig();
  return {
    clientId: config.googleClientId.trim() || null,
    clientSecret: config.googleClientSecret.trim() || null,
  };
}
