import fs from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import { DESKTOP_PG_PORT } from "../src/lib/desktop-config";

export type LocalPostgres = {
  databaseUrl: string;
  stop: () => Promise<void>;
};

/**
 * Start an embedded Postgres instance with persistent data under AppData.
 * Port is fixed so Google OAuth redirect URIs stay stable.
 */
export async function startEmbeddedPostgres(opts: {
  databaseDir: string;
  password: string;
  port?: number;
}): Promise<LocalPostgres> {
  const port = opts.port ?? DESKTOP_PG_PORT;
  const databaseDir = path.resolve(opts.databaseDir);
  const alreadyInitialized = fs.existsSync(path.join(databaseDir, "PG_VERSION"));

  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "seo_turtle",
    password: opts.password,
    port,
    persistent: true,
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (!alreadyInitialized) {
    await pg.initialise();
  }
  await pg.start();

  try {
    await pg.createDatabase("seo_turtle");
  } catch {
    // Already exists on subsequent launches.
  }

  const databaseUrl = `postgresql://seo_turtle:${encodeURIComponent(opts.password)}@127.0.0.1:${port}/seo_turtle`;

  return {
    databaseUrl,
    stop: async () => {
      await pg.stop();
    },
  };
}
