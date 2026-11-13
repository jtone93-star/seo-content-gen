import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Run `prisma migrate deploy` against the local desktop database. */
export async function migrateDesktopDatabase(opts: {
  appRoot: string;
  databaseUrl: string;
  logDir: string;
}): Promise<void> {
  const prismaCli = path.join(opts.appRoot, "node_modules", "prisma", "build", "index.js");
  const fallbackBin = path.join(
    opts.appRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "prisma.cmd" : "prisma",
  );

  const logFile = path.join(opts.logDir, "migrate.log");
  const useJs = fs.existsSync(prismaCli);

  await new Promise<void>((resolve, reject) => {
    const child = useJs
      ? spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
          cwd: opts.appRoot,
          env: {
            ...process.env,
            ELECTRON_RUN_AS_NODE: "1",
            DATABASE_URL: opts.databaseUrl,
            DIRECT_URL: opts.databaseUrl,
          },
          stdio: ["ignore", "pipe", "pipe"],
        })
      : spawn(fallbackBin, ["migrate", "deploy"], {
          cwd: opts.appRoot,
          env: {
            ...process.env,
            DATABASE_URL: opts.databaseUrl,
            DIRECT_URL: opts.databaseUrl,
          },
          stdio: ["ignore", "pipe", "pipe"],
          shell: process.platform === "win32",
        });

    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      fs.writeFileSync(logFile, output, "utf8");
      if (code === 0) resolve();
      else reject(new Error(`prisma migrate deploy failed (exit ${code}). See ${logFile}`));
    });
  });
}
