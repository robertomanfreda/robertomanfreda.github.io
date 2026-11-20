// Bundles the client assets, then renders every page into dist/.
import { readFile, rm } from "node:fs/promises";
import { build, createServer } from "vite";

await build();

const manifest = JSON.parse(await readFile("dist/.vite/manifest.json", "utf8"));

// The page templates are TypeScript; a middleware-mode Vite server loads them without a second bundle.
const vite = await createServer({
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  logLevel: "warn"
});

try {
  const { generate } = await vite.ssrLoadModule("/src/site/generate.ts");
  const files = await generate({ outDir: "dist", manifest });
  await rm("dist/.vite", { recursive: true, force: true });
  console.log(`rendered ${files.length} files:\n${files.map((file) => `  dist/${file}`).join("\n")}`);
} finally {
  await vite.close();
}
