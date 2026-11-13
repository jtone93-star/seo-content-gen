import type { NextConfig } from "next";

const desktopMode =
  process.env.DESKTOP_MODE === "1" || process.env.DESKTOP_MODE === "true";

const nextConfig: NextConfig = {
  // Required for the Electron desktop shell to run a self-contained Node server.
  output: "standalone",
  // Isolate desktop `next dev` from the browser `npm run dev` lock/port conflict.
  ...(desktopMode ? { distDir: ".next-desktop" } : {}),
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "embedded-postgres",
  ],
};

export default nextConfig;
