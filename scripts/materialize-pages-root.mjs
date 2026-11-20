// GitHub Pages serves this repository's root, so a release copies dist/ over it.
// The names copied are recorded in .pages-manifest.json; the next release removes
// them first, so a page that is no longer built does not linger at the root.
import { cp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const manifestFile = ".pages-manifest.json";

// Never touched, whatever ends up in dist/ or in the manifest.
const sources = new Set([
  ".git",
  ".github",
  ".gitignore",
  manifestFile,
  "content",
  "dist",
  "node_modules",
  "package-lock.json",
  "package.json",
  "public",
  "README.md",
  "scripts",
  "src",
  "tsconfig.json",
  "vite.config.ts"
]);

const built = (await readdir(dist)).sort();
const previous = await readFile(manifestFile, "utf8")
  .then((text) => JSON.parse(text))
  .catch(() => []);
if (!Array.isArray(previous) || previous.some((entry) => typeof entry !== "string")) throw new Error(`${manifestFile} is not a list of names`);

const unsafe = [...built, ...previous].filter((entry) => sources.has(entry) || entry === "" || entry === "." || entry === ".." || /[\\/]/.test(entry));
if (unsafe.length) throw new Error(`refusing to replace source or nested paths: ${[...new Set(unsafe)].join(", ")}`);

for (const target of new Set([...previous, ...built])) await rm(target, { recursive: true, force: true });
for (const entry of built) await cp(join(dist, entry), entry, { recursive: true });
await writeFile(manifestFile, `${JSON.stringify(built, null, 2)}\n`);

console.log(`materialized ${built.length} entries at the repository root`);
