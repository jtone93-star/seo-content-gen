const path = require("path");

/** @type {import('electron-builder').Configuration} */
const config = {
  appId: "com.seoturtle.tool",
  productName: "SEO Turtle Tool",
  copyright: "Copyright © SEO Turtle Tool",
  directories: {
    output: "release",
    buildResources: "desktop/build-resources",
  },
  files: [
    "desktop/dist/**/*",
    "package.json",
    // Main-process native deps (embedded Postgres binaries).
    "node_modules/embedded-postgres/**/*",
    "node_modules/@embedded-postgres/**/*",
    "node_modules/pg/**/*",
    "node_modules/pg-types/**/*",
    "node_modules/pg-cloudflare/**/*",
    "node_modules/pg-connection-string/**/*",
    "node_modules/pg-int8/**/*",
    "node_modules/pg-pool/**/*",
    "node_modules/pg-protocol/**/*",
    "node_modules/pgpass/**/*",
    "node_modules/postgres-array/**/*",
    "node_modules/postgres-bytea/**/*",
    "node_modules/postgres-date/**/*",
    "node_modules/postgres-interval/**/*",
    "node_modules/split2/**/*",
    "node_modules/xtend/**/*",
  ],
  extraResources: [
    {
      from: ".next/standalone",
      to: "app/.next/standalone",
      filter: ["**/*"],
    },
    {
      from: ".next/static",
      to: "app/.next/standalone/.next/static",
      filter: ["**/*"],
    },
    {
      from: "public",
      to: "app/.next/standalone/public",
      filter: ["**/*"],
    },
    {
      from: "prisma",
      to: "app/prisma",
      filter: ["**/*"],
    },
    {
      from: "prisma.config.ts",
      to: "app/prisma.config.ts",
    },
    {
      from: "node_modules/prisma",
      to: "app/node_modules/prisma",
      filter: ["**/*"],
    },
    {
      from: "node_modules/@prisma",
      to: "app/node_modules/@prisma",
      filter: ["**/*"],
    },
    {
      from: "node_modules/dotenv",
      to: "app/node_modules/dotenv",
      filter: ["**/*"],
    },
  ],
  asar: true,
  asarUnpack: [
    "**/node_modules/embedded-postgres/**/*",
    "**/node_modules/@embedded-postgres/**/*",
  ],
  win: {
    target: [{ target: "nsis", arch: ["x64"] }],
    artifactName: "${productName}-Setup-${version}.${ext}",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "SEO Turtle Tool",
  },
  forceCodeSigning: false,
};

module.exports = config;
