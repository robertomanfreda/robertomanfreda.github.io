import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { site } from "../content/profile";
import { html } from "./html";
import { homePage } from "./home";
import { cmdline, layout, prompt, type Context } from "./layout";
import { feed, loadWriteups, writeupIndexPage, writeupPage } from "./writeups";

type Output = { type: string; body: string };

type ManifestChunk = { file: string; css?: string[]; imports?: string[] };
export type Manifest = Record<string, ManifestChunk>;

/** Tags for a client entry: the dev server's module in development, hashed files from the manifest in a build. */
const assetTags = (manifest: Manifest | null) => (entry: string) => {
  if (!manifest) return `<script type="module" src="/${entry}"></script>`;
  const chunk = manifest[entry];
  if (!chunk) throw new Error(`Client entry "${entry}" is missing from the build manifest`);
  const styles = new Set<string>();
  const preloads = new Set<string>();
  const visit = (key: string) => {
    const current = manifest[key];
    if (!current || preloads.has(current.file)) return;
    preloads.add(current.file);
    current.css?.forEach((file) => styles.add(file));
    current.imports?.forEach(visit);
  };
  visit(entry);
  preloads.delete(chunk.file);
  return [
    ...[...styles].map((file) => `<link rel="stylesheet" href="/${file}">`),
    ...[...preloads].map((file) => `<link rel="modulepreload" href="/${file}">`),
    `<script type="module" src="/${chunk.file}"></script>`
  ].join("\n");
};

const notFoundPage = (context: Context) =>
  layout(
    {
      path: "/404.html",
      title: `404 · ${site.name}`,
      description: "No such file or directory.",
      entry: "src/client/page.ts",
      active: null,
      bodyClass: "page-404",
      noindex: true
    },
    html`<section class="win notfound" aria-labelledby="nf-title">
  <p class="cmdline">${prompt()} <span class="cmd">cd <span data-missing-path>/nowhere</span></span></p>
  <h1 class="page-title" id="nf-title">404</h1>
  <p class="out err">bash: cd: <span data-missing-path>/nowhere</span>: No such file or directory</p>
  ${cmdline("ls /")}
  <ul class="out ls">
    <li><a href="/">~</a></li>
    <li><a href="/#scope">scope/</a></li>
    <li><a href="/#career">career/</a></li>
    <li><a href="/#projects">projects/</a></li>
    <li><a href="/writeups/">writeups/</a></li>
    <li><a href="/#contact">contact/</a></li>
  </ul>
</section>`,
    context
  );

/** security.txt must not go stale: Expires is the next half-year boundary at least six months out. */
const securityTxt = (now: Date) => {
  const expires = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() < 6 ? 11 : 17, 30, 22, 0, 0));
  return [
    ...(site.email ? [`Contact: mailto:${site.email}`] : []),
    `Contact: ${site.links.github}`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en, it",
    `Canonical: ${site.url}/.well-known/security.txt`,
    ""
  ].join("\n");
};

const sitemap = (entries: Array<{ path: string; lastmod?: string }>) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url><loc>${site.url}${entry.path}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`).join("\n")}
</urlset>
`;

/** Every generated file, keyed by its path inside the output directory. */
const buildSite = async (context: Context): Promise<Map<string, Output>> => {
  const writeups = await loadWriteups({ drafts: context.dev });
  const published = writeups.filter((writeup) => !writeup.draft);
  const page = (body: string): Output => ({ type: "text/html", body });
  const files = new Map<string, Output>();

  files.set("index.html", page(homePage(published, context)));
  files.set("writeups/index.html", page(writeupIndexPage(writeups, context)));
  for (const writeup of writeups) files.set(`writeups/${writeup.slug}/index.html`, page(writeupPage(writeup, writeups, context)));
  files.set("404.html", page(notFoundPage(context)));
  files.set("feed.xml", { type: "application/atom+xml", body: feed(writeups) });
  files.set(".well-known/security.txt", { type: "text/plain", body: securityTxt(context.now) });
  files.set("sitemap.xml", {
    type: "application/xml",
    body: sitemap([
      { path: "/" },
      { path: "/writeups/", lastmod: published[0]?.date },
      ...published.map((writeup) => ({ path: `/writeups/${writeup.slug}/`, lastmod: writeup.date }))
    ])
  });
  return files;
};

/** Development: render one path on demand. Returns null for anything that is not a page. */
export const renderRoute = async (pathname: string): Promise<(Output & { status: number }) | null> => {
  if (/^\/(@|src\/|node_modules\/)/.test(pathname)) return null;
  const files = await buildSite({ dev: true, assets: assetTags(null), now: new Date() });
  const key = pathname.endsWith("/") ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  const hit = files.get(key);
  if (hit) return { ...hit, status: 200 };
  // Extension-less misses are navigations: answer with the 404 page, like GitHub Pages does.
  if (!/\.[a-z0-9]+$/i.test(pathname)) return { ...files.get("404.html")!, status: 404 };
  return null;
};

/** Production: write every page next to the bundled assets. */
export const generate = async (options: { outDir: string; manifest: Manifest }) => {
  const files = await buildSite({ dev: false, assets: assetTags(options.manifest), now: new Date() });
  for (const [path, output] of files) {
    const target = join(options.outDir, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, output.body);
  }
  return [...files.keys()];
};
