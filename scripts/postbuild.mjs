import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const dist = "dist";
const routes = ["respawn", "llm-model-checker"];

await writeFile(join(dist, ".nojekyll"), "");

await Promise.all(
  routes.map(async (route) => {
    const routeDir = join(dist, route);
    await mkdir(routeDir, { recursive: true });
    await copyFile(join(dist, "index.html"), join(routeDir, "index.html"));
  })
);
