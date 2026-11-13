import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  app,
  BrowserWindow,
  dialog,
  shell,
} from "electron";
import {
  DESKTOP_APP_PORT,
  applyDesktopEnv,
  ensureDesktopConfig,
} from "../src/lib/desktop-config";
import { migrateDesktopDatabase } from "./migrate";
import {
  DESKTOP_APP_NAME,
  configureDesktopUserDataPath,
  ensureUserDataDirs,
  getAppResourcesRoot,
} from "./paths";
import { startEmbeddedPostgres, type LocalPostgres } from "./postgres";
import { freePortWindows } from "./free-port";
import { waitForUrl } from "./wait-for-url";

configureDesktopUserDataPath();

let mainWindow: BrowserWindow | null = null;
let postgres: LocalPostgres | null = null;
let nextProcess: ChildProcess | null = null;
let shuttingDown = false;
let logDirGlobal = "";

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function appRoot(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app");
  }
  return path.join(__dirname, "..", "..");
}

function tailLog(filePath: string, maxChars = 1200): string {
  try {
    if (!fs.existsSync(filePath)) return "";
    const text = fs.readFileSync(filePath, "utf8");
    return text.slice(-maxChars).trim();
  } catch {
    return "";
  }
}

function createWindow(port: number) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1024,
    minHeight: 700,
    title: DESKTOP_APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  void mainWindow.loadURL(`http://127.0.0.1:${port}`);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startNextServer(opts: {
  root: string;
  port: number;
  env: NodeJS.ProcessEnv;
}): Promise<ChildProcess> {
  const standaloneServer = path.join(opts.root, ".next", "standalone", "server.js");
  const isDev = !app.isPackaged && !fs.existsSync(standaloneServer);

  if (isDev) {
    const child = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["next", "dev", "-H", "127.0.0.1", "-p", String(opts.port)],
      {
        cwd: opts.root,
        env: opts.env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: process.platform === "win32",
      },
    );
    return child;
  }

  const standaloneDir = path.join(opts.root, ".next", "standalone");
  const serverJs = path.join(standaloneDir, "server.js");
  if (!fs.existsSync(serverJs)) {
    throw new Error(`Next standalone server missing at ${serverJs}. Run npm run desktop:build first.`);
  }

  return spawn(process.execPath, [serverJs], {
    cwd: standaloneDir,
    env: {
      ...opts.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(opts.port),
      HOSTNAME: "127.0.0.1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

async function bootstrap() {
  if (process.platform !== "win32" && app.isPackaged) {
    dialog.showErrorBox(
      DESKTOP_APP_NAME,
      "This installer build is Windows-only. Please run from source on other platforms.",
    );
    app.quit();
    return;
  }

  const { configPath, pgDataDir, logDir } = ensureUserDataDirs();
  logDirGlobal = logDir;
  const config = ensureDesktopConfig(configPath);
  const root = appRoot();
  const resources = getAppResourcesRoot();

  const migrateRoot = fs.existsSync(path.join(root, "prisma", "schema.prisma"))
    ? root
    : resources;

  postgres = await startEmbeddedPostgres({
    databaseDir: pgDataDir,
    password: config.pgPassword,
  });

  applyDesktopEnv(config, {
    databaseUrl: postgres.databaseUrl,
    port: DESKTOP_APP_PORT,
    configPath,
  });

  await migrateDesktopDatabase({
    appRoot: migrateRoot,
    databaseUrl: postgres.databaseUrl,
    logDir,
  });

  const env = { ...process.env };
  // Prior crash/quit can leave next listening on 47821 and block relaunch.
  freePortWindows(DESKTOP_APP_PORT);
  nextProcess = await startNextServer({
    root: migrateRoot,
    port: DESKTOP_APP_PORT,
    env,
  });

  const nextLog = path.join(logDir, "next.log");
  nextProcess.stdout?.on("data", (chunk) => {
    fs.appendFileSync(nextLog, String(chunk));
  });
  nextProcess.stderr?.on("data", (chunk) => {
    fs.appendFileSync(nextLog, String(chunk));
  });
  nextProcess.on("exit", (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      const tail = tailLog(nextLog);
      dialog.showErrorBox(
        DESKTOP_APP_NAME,
        `The local server exited unexpectedly (code ${code}).\n\nLog folder:\n${logDir}${tail ? `\n\n${tail}` : ""}`,
      );
      app.quit();
    }
  });

  try {
    await waitForUrl(`http://127.0.0.1:${DESKTOP_APP_PORT}`);
  } catch (err) {
    const tail = tailLog(nextLog);
    const base = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${base}\n\nOften this means another Next.js/dev server conflict, or port ${DESKTOP_APP_PORT} is busy.\nLog: ${nextLog}${tail ? `\n\n${tail}` : ""}`,
    );
  }

  createWindow(DESKTOP_APP_PORT);
}

async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
    nextProcess = null;
  }
  if (postgres) {
    try {
      await postgres.stop();
    } catch {
      // best effort
    }
    postgres = null;
  }
}

app.whenReady().then(() => {
  bootstrap().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    const hint = logDirGlobal ? `\n\nLogs: ${logDirGlobal}` : "";
    dialog.showErrorBox(DESKTOP_APP_NAME, `Failed to start:\n\n${message}${hint}`);
    void shutdown().finally(() => app.quit());
  });
});

app.on("window-all-closed", () => {
  void shutdown().finally(() => app.quit());
});

app.on("before-quit", () => {
  void shutdown();
});
