/**
 * After `next build`, standalone output may nest the project under a folder.
 * Normalize paths and copy static + public assets beside server.js.
 */
import fs from "node:fs";
import path from "node:path";

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

const root = process.cwd();
const standaloneRoot = path.join(root, ".next", "standalone");
if (!fs.existsSync(standaloneRoot)) {
  console.error("Missing .next/standalone — run next build first.");
  process.exit(1);
}

// Next sometimes nests as .next/standalone/<package-name>/
let serverDir = standaloneRoot;
const nestedServer = path.join(standaloneRoot, "server.js");
if (!fs.existsSync(nestedServer)) {
  const kids = fs.readdirSync(standaloneRoot, { withFileTypes: true }).filter((d) => d.isDirectory());
  for (const kid of kids) {
    const candidate = path.join(standaloneRoot, kid.name, "server.js");
    if (fs.existsSync(candidate)) {
      serverDir = path.join(standaloneRoot, kid.name);
      break;
    }
  }
}

if (!fs.existsSync(path.join(serverDir, "server.js"))) {
  console.error("Could not locate standalone server.js");
  process.exit(1);
}

// If nested, flatten into .next/standalone for electron-builder paths.
if (serverDir !== standaloneRoot) {
  const tmp = path.join(root, ".next", "standalone-flat");
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.renameSync(serverDir, tmp);
  fs.rmSync(standaloneRoot, { recursive: true, force: true });
  fs.renameSync(tmp, standaloneRoot);
  serverDir = standaloneRoot;
}

copyDir(path.join(root, ".next", "static"), path.join(serverDir, ".next", "static"));
copyDir(path.join(root, "public"), path.join(serverDir, "public"));

console.log("Standalone prepared at", serverDir);
