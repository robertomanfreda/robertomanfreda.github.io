import { defineConfig, type Plugin } from "vite";

/** Client bundles. Pages are not Vite inputs: src/site/ renders them and links these by manifest. */
const entries = ["src/client/home.ts", "src/client/page.ts"];

/** Development: render pages on request with the same code the build uses. */
const sitePages = (): Plugin => ({
  name: "site-pages",
  configureServer(server) {
    server.middlewares.use(async (request, response, next) => {
      if (request.method !== "GET" || !request.url) return next();
      try {
        const { pathname } = new URL(request.url, "http://localhost");
        const site = await server.ssrLoadModule("/src/site/generate.ts");
        const page = await site.renderRoute(pathname);
        if (!page) return next();
        const body = page.type === "text/html" ? await server.transformIndexHtml(request.url, page.body) : page.body;
        response.statusCode = page.status;
        response.setHeader("content-type", `${page.type}; charset=utf-8`);
        response.end(body);
      } catch (error) {
        server.ssrFixStacktrace(error as Error);
        next(error);
      }
    });
  }
});

export default defineConfig({
  base: "/",
  appType: "mpa",
  plugins: [sitePages()],
  optimizeDeps: { entries },
  build: {
    outDir: "dist",
    manifest: true,
    sourcemap: true,
    rolldownOptions: { input: entries }
  }
});
