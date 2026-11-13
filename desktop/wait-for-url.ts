import http from "node:http";

export async function waitForUrl(url: string, opts?: { timeoutMs?: number; intervalMs?: number }) {
  const timeoutMs = opts?.timeoutMs ?? 120_000;
  const intervalMs = opts?.intervalMs ?? 500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve((res.statusCode ?? 500) < 500);
      });
      req.on("error", () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Timed out waiting for ${url}`);
}
