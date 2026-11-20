import { createHash } from "node:crypto";
import banner from "../content/banner.txt?raw";
import { site, windows, type WindowId } from "../content/profile";
import { html, raw, type Raw } from "./html";

export type Context = {
  dev: boolean;
  /** `<link>`/`<script>` tags for a client entry such as "src/client/home.ts". */
  assets: (entry: string) => string;
  now: Date;
};

export type Page = {
  path: string;
  title: string;
  description: string;
  entry: string;
  /** Window highlighted in the status bar. */
  active: WindowId | null;
  image?: string;
  type?: "website" | "article";
  bodyClass?: string;
  noindex?: boolean;
  jsonLd?: unknown;
  side?: Raw;
};

/** Runs before first paint: restores the theme and arms entrance motion (with a failsafe). */
const bootScript = `(function(){var d=document.documentElement;try{var t=localStorage.getItem("rm.theme");if(t)d.dataset.theme=t}catch(e){}d.classList.add("js");if(!matchMedia("(prefers-reduced-motion: reduce)").matches){d.classList.add("anim");setTimeout(function(){if(!window.__rm)d.classList.remove("anim")},3000)}})()`;

const csp = () => {
  const hash = createHash("sha256").update(bootScript).digest("base64");
  return [
    "default-src 'none'",
    `script-src 'self' 'sha256-${hash}'`,
    "style-src 'self'",
    "img-src 'self'",
    "font-src 'self'",
    "manifest-src 'self'",
    "base-uri 'none'",
    "form-action 'none'"
  ].join("; ");
};

const sourceComment = `<!--
${banner.trimEnd()}

  You read source. Good.

  No frameworks on this page, no trackers, no third-party requests.

  ${site.links.source}
-->`;

export const prompt = (path = "~", user: string = site.user, sigil = "$") =>
  html`<span class="ps1" aria-hidden="true"><span class="ps1-user">${user}@${site.host}</span>:<span class="ps1-path">${path}</span>${sigil}</span>`;

/** A prompt with a command. With `label` it becomes the section heading. */
export const cmdline = (command: string, options: { path?: string; label?: string; id?: string; level?: 1 | 2 } = {}) => {
  const body = html`${prompt(options.path)} <span class="cmd" aria-hidden="true" data-type>${command}</span>`;
  if (!options.label) return html`<p class="cmdline">${body}</p>`;
  return html`<h2 class="cmdline"${options.id ? raw(` id="${options.id}"`) : ""}>${body} <span class="cmd-note"><span aria-hidden="true"># </span>${options.label}</span></h2>`;
};

const statusBar = (page: Page) => {
  const home = page.path === "/";
  return html`<nav class="statusbar" aria-label="Site sections">
  <a class="sb-session" href="/" aria-label="Home">[rm]</a>
  <ol class="sb-windows">
    ${windows.map(
      (window, index) =>
        html`<li><a href="${home ? "" : "/"}#${window.id}" data-win="${index}"${page.active === window.id ? raw(' aria-current="true"') : ""}><span class="sb-idx" aria-hidden="true">${index}:</span>${window.label}<span class="sb-flag" aria-hidden="true">${page.active === window.id ? "*" : ""}</span></a></li>`
    )}
  </ol>
  <div class="sb-right">
    <button type="button" class="sb-button" data-theme-cycle aria-label="Change color theme" title="theme (t)"><span data-theme-name>phosphor</span></button>
    <button type="button" class="sb-button" data-help-open aria-label="Keyboard shortcuts" title="keys (?)">?</button>
    <span class="sb-host" aria-hidden="true">"${site.host}"</span>
    <time class="sb-clock" data-clock aria-label="Local time in ${site.location}"></time>
  </div>
</nav>`;
};

const helpDialog = html`<dialog class="help" id="help" aria-labelledby="help-title">
  <form method="dialog">
    <p class="help-title" id="help-title">keys</p>
    <dl>
      <div><dt><kbd>0</kbd>–<kbd>5</kbd></dt><dd>jump to a window</dd></div>
      <div><dt><kbd>j</kbd> <kbd>k</kbd></dt><dd>scroll down, up</dd></div>
      <div><dt><kbd>g</kbd> <kbd>G</kbd></dt><dd>top, bottom</dd></div>
      <div><dt><kbd>t</kbd></dt><dd>cycle theme</dd></div>
      <div><dt><kbd>\`</kbd></dt><dd>focus the shell</dd></div>
      <div><dt><kbd>?</kbd></dt><dd>this help</dd></div>
    </dl>
    <p class="help-themes"><span class="dim">theme</span>
      <button type="button" data-theme-set="phosphor">[phosphor]</button>
      <button type="button" data-theme-set="amber">[amber]</button>
      <button type="button" data-theme-set="paper">[paper]</button>
    </p>
    <button class="help-close" autofocus>[ close ]</button>
  </form>
</dialog>`;

export const footer = (context: Context) => html`<footer class="eof">
  <p class="eof-rule" aria-hidden="true">[EOF]</p>
  <p>
    © ${context.now.getUTCFullYear()} ${site.name} <span class="sep" aria-hidden="true">·</span>
    <a href="${site.links.source}" rel="noopener">source</a> <span class="sep" aria-hidden="true">·</span>
    <a href="/feed.xml">rss</a> <span class="sep" aria-hidden="true">·</span>
    <a href="/.well-known/security.txt">security.txt</a>
  </p>
  <p class="dim">No cookies, no trackers, no third-party requests.</p>
</footer>`;

export const layout = (page: Page, main: Raw, context: Context): string => {
  const url = `${site.url}${page.path}`;
  const image = `${site.url}${page.image ?? "/assets/og.png"}`;
  return `<!doctype html>
${sourceComment}
${html`<html lang="en" data-theme="phosphor">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${context.dev ? "" : html`<meta http-equiv="Content-Security-Policy" content="${raw(csp())}">`}
<title>${page.title}</title>
<meta name="description" content="${page.description}">
<meta name="author" content="${site.name}">
${page.noindex ? raw('<meta name="robots" content="noindex">') : html`<link rel="canonical" href="${url}">`}
<meta name="theme-color" content="#0b0e0c">
<meta name="color-scheme" content="dark light">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta property="og:site_name" content="${site.name}">
<meta property="og:title" content="${page.title}">
<meta property="og:description" content="${page.description}">
<meta property="og:type" content="${page.type ?? "website"}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="en_US">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${site.name}. ${site.tagline}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${page.title}">
<meta name="twitter:description" content="${page.description}">
<meta name="twitter:image" content="${image}">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="alternate" type="application/atom+xml" title="${site.name} — write-ups" href="/feed.xml">
<link rel="me" href="${site.links.github}">
<link rel="preload" href="/fonts/iosevka-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/iosevka-800-normal.woff2" as="font" type="font/woff2" crossorigin>
<script>${raw(bootScript)}</script>
${raw(context.assets(page.entry))}
${page.jsonLd ? html`<script type="application/ld+json">${raw(JSON.stringify(page.jsonLd).replace(/</g, "\\u003c"))}</script>` : ""}
</head>
<body class="${page.bodyClass ?? ""}">
<a class="skip" href="#main">Skip to content</a>
<div class="tmux${page.side ? " has-side" : ""}">
<main id="main" class="pane pane-main" tabindex="-1">
${main}
${footer(context)}
</main>
${page.side ?? ""}
</div>
${statusBar(page)}
${helpDialog}
</body>
</html>`}
`;
};
