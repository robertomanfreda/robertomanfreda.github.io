import { cp, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";

const generatedPaths = [
  ".nojekyll",
  "assets",
  "data",
  "respawn",
  "llm-model-checker",
  "favicon.ico",
  "index.html",
  "llm-model-checker.html",
  "respawn.html",
  "robots.txt",
  "site.webmanifest",
  "sitemap.xml"
];

for (const target of generatedPaths) {
  await rm(target, { recursive: true, force: true });
}

for (const entry of await readdir(dist)) {
  await cp(join(dist, entry), entry, { recursive: true });
}
