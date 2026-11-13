/**
 * Build Electron main/preload into desktop/dist as CommonJS for electron-builder.
 */
import esbuild from "esbuild";
import path from "node:path";

async function main() {
  const outdir = path.join(process.cwd(), "desktop", "dist");
  await esbuild.build({
    entryPoints: [
      path.join("desktop", "main.ts"),
      path.join("desktop", "preload.ts"),
    ],
    outdir,
    bundle: true,
    platform: "node",
    target: "node20",
    format: "cjs",
    sourcemap: true,
    external: ["electron", "embedded-postgres", "pg"],
    outExtension: { ".js": ".js" },
  });
  console.log("Desktop main/preload built → desktop/dist");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
