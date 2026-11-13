import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { app } from "electron";

export const DESKTOP_APP_NAME = "SEO Turtle Tool";

/** Call before app.ready so userData is not content-generator-tool. */
export function configureDesktopUserDataPath(): void {
  try {
    const target = path.join(app.getPath("appData"), DESKTOP_APP_NAME);
    app.setPath("userData", target);
  } catch {
    // ignore if Electron paths are unavailable
  }
}

export function getUserDataRoot(): string {
  try {
    return app.getPath("userData");
  } catch {
    return path.join(os.homedir(), "AppData", "Roaming", DESKTOP_APP_NAME);
  }
}

export function ensureUserDataDirs(): {
  root: string;
  configPath: string;
  pgDataDir: string;
  logDir: string;
} {
  const root = getUserDataRoot();
  const configPath = path.join(root, "config.json");
  const pgDataDir = path.join(root, "pg-data");
  const logDir = path.join(root, "logs");
  fs.mkdirSync(root, { recursive: true });
  fs.mkdirSync(pgDataDir, { recursive: true });
  fs.mkdirSync(logDir, { recursive: true });
  return { root, configPath, pgDataDir, logDir };
}

/** App resources root: packaged resources/ or repo root in dev. */
export function getAppResourcesRoot(): string {
  if (app?.isPackaged) {
    return process.resourcesPath;
  }
  // desktop/dist → repo root
  return path.join(__dirname, "..", "..");
}
