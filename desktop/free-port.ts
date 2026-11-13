import { execSync } from "node:child_process";

/** Best-effort: free a localhost TCP port on Windows (orphaned next/electron). */
export function freePortWindows(port: number): void {
  if (process.platform !== "win32") return;
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      windowsHide: true,
    });
    const pids = new Set<number>();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = Number(parts[parts.length - 1]);
      if (Number.isFinite(pid) && pid > 0) pids.add(pid);
    }
    for (const pid of pids) {
      if (pid === process.pid) continue;
      try {
        execSync(`taskkill /PID ${pid} /F`, {
          stdio: "ignore",
          windowsHide: true,
        });
      } catch {
        // ignore
      }
    }
  } catch {
    // findstr exits 1 when no matches — port already free
  }
}
