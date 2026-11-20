import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Marked } from "marked";
import { parse as parseYaml } from "yaml";
import { site } from "../content/profile";
import { esc, html, raw, type Raw } from "./html";
import { cmdline, layout, type Context } from "./layout";

export const WRITEUPS_DIR = "content/writeups";

const severities = ["critical", "high", "medium", "low", "info"] as const;
type Severity = (typeof severities)[number];

export type Writeup = {
  slug: string;
  /** 0x01, 0x02… in order of publication. */
  id: string;
  title: string;
  date: string;
  summary: string;
  program?: string;
  vulnClass?: string;
  cwe?: string;
  severity?: Severity;
  cvss?: string;
  bounty?: string;
  tags: string[];
  timeline: Array<{ date: string; event: string }>;
  draft: boolean;
  html: string;
};

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z#0-9]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Colors the request or status line and the header names of a raw HTTP message. */
const highlightHttp = (text: string) => {
  const lines = text.split("\n");
  let inBody = false;
  return lines
    .map((line, index) => {
      if (inBody) return esc(line);
      if (line.trim() === "") {
        inBody = true;
        return "";
      }
      if (index === 0) {
        const status = line.match(/^(HTTP\/[\d.]+)\s+(\d{3})(.*)$/);
        if (status) return `<span class="tok-dim">${esc(status[1])}</span> <span class="tok-status s${status[2][0]}">${esc(status[2])}${esc(status[3])}</span>`;
        const request = line.match(/^([A-Z]+)\s+(\S+)(\s+HTTP\/[\d.]+)?$/);
        if (request) return `<span class="tok-method">${esc(request[1])}</span> <span class="tok-path">${esc(request[2])}</span><span class="tok-dim">${esc(request[3] ?? "")}</span>`;
      }
      const header = line.match(/^([\w-]+):(.*)$/);
      return header ? `<span class="tok-header">${esc(header[1])}</span>:${esc(header[2])}` : esc(line);
    })
    .join("\n");
};

/** In `console` blocks, lines starting with `$ ` or `# ` are commands; the rest is output. */
const highlightConsole = (text: string) =>
  text
    .split("\n")
    .map((line) => {
      const command = line.match(/^([$#])\s(.*)$/);
      return command ? `<span class="tok-dim">${command[1]}</span> <span class="tok-cmd">${esc(command[2])}</span>` : `<span class="tok-out">${esc(line)}</span>`;
    })
    .join("\n");

const markdown = new Marked({
  gfm: true,
  renderer: {
    code({ text, lang }) {
      const language = (lang ?? "").trim().split(/\s+/)[0].toLowerCase();
      const body = language === "http" ? highlightHttp(text) : language === "console" ? highlightConsole(text) : esc(text);
      return `<figure class="code"><figcaption><span>${esc(language || "text")}</span></figcaption><pre tabindex="0"><code>${body}</code></pre></figure>\n`;
    },
    heading({ tokens, depth }) {
      const inner = this.parser.parseInline(tokens);
      // The page title is the only h1, so body headings start at h2.
      const level = Math.max(2, depth);
      const id = slugify(inner);
      return `<h${level} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true" tabindex="-1">${"#".repeat(level)}</a> ${inner}</h${level}>\n`;
    },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      const external = /^https?:\/\//.test(href);
      return `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ""}${external ? ' rel="noopener noreferrer"' : ""}>${inner}</a>`;
    },
    image({ href, title, text }) {
      return `<img src="${esc(href)}" alt="${esc(text)}"${title ? ` title="${esc(title)}"` : ""} loading="lazy" decoding="async">`;
    },
    table(token) {
      const cell = (content: string, tag: string, align: string | null) => `<${tag}${align ? ` class="al-${align}"` : ""}>${content}</${tag}>`;
      const head = token.header.map((item) => cell(this.parser.parseInline(item.tokens), "th", item.align)).join("");
      const rows = token.rows.map((row) => `<tr>${row.map((item) => cell(this.parser.parseInline(item.tokens), "td", item.align)).join("")}</tr>`).join("");
      return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
    }
  }
});

const text = (value: unknown) => (value === undefined || value === null ? undefined : String(value));

const parseTimeline = (value: unknown): Writeup["timeline"] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (item && typeof item === "object") return Object.entries(item).map(([date, event]) => ({ date: String(date), event: String(event) }));
    return [];
  });
};

/** Reads content/writeups/*.md. Files starting with "_" are ignored; drafts are only returned when asked for. */
export const loadWriteups = async (options: { drafts: boolean }): Promise<Writeup[]> => {
  let files: string[] = [];
  try {
    files = (await readdir(WRITEUPS_DIR)).filter((name) => name.endsWith(".md") && !name.startsWith("_"));
  } catch {
    return [];
  }

  const loaded = await Promise.all(
    files.map(async (name) => {
      const source = await readFile(join(WRITEUPS_DIR, name), "utf8");
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
      if (!match) throw new Error(`${WRITEUPS_DIR}/${name}: missing front matter (--- … ---)`);
      const meta = (parseYaml(match[1]) ?? {}) as Record<string, unknown>;
      const slug = name.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
      const date = text(meta.date) ?? name.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
      if (!meta.title || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`${WRITEUPS_DIR}/${name}: "title" and "date" (YYYY-MM-DD) are required`);
      const severity = text(meta.severity)?.toLowerCase();
      if (severity && !severities.includes(severity as Severity)) throw new Error(`${WRITEUPS_DIR}/${name}: severity must be one of ${severities.join(", ")}`);
      return {
        slug,
        id: "0x??",
        title: String(meta.title),
        date,
        summary: text(meta.summary) ?? "",
        program: text(meta.program),
        vulnClass: text(meta.class),
        cwe: text(meta.cwe),
        severity: severity as Severity | undefined,
        cvss: text(meta.cvss),
        bounty: text(meta.bounty),
        tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
        timeline: parseTimeline(meta.timeline),
        draft: meta.draft === true,
        html: await markdown.parse(match[2])
      } satisfies Writeup;
    })
  );

  const visible = loaded.filter((writeup) => options.drafts || !writeup.draft).sort((a, b) => a.date.localeCompare(b.date) || a.slug.localeCompare(b.slug));
  let published = 0;
  for (const writeup of visible) if (!writeup.draft) writeup.id = `0x${(++published).toString(16).padStart(2, "0")}`;
  return visible.reverse();
};

/** One row per write-up, newest first. */
export const writeupList = (writeups: Writeup[]): Raw => html`<ol class="wu-list">
  ${writeups.map(
    (writeup) => html`<li data-row>
    <a href="/writeups/${writeup.slug}/">
      <span class="wu-date">${writeup.date}</span>
      <span class="wu-num">${writeup.id}</span>
      <span class="sev sev-${writeup.severity ?? "none"}">${writeup.severity ?? "n/a"}</span>
      <span class="wu-title">${writeup.title}${writeup.draft ? html` <span class="warn">[draft]</span>` : ""}</span>
      <span class="wu-prog">${[writeup.program, writeup.vulnClass].filter(Boolean).join(" · ")}</span>
    </a>
  </li>`
  )}
</ol>`;

export const writeupIndexPage = (writeups: Writeup[], context: Context) =>
  layout(
    {
      path: "/writeups/",
      title: `Write-ups · ${site.name}`,
      description: "Bug bounty write-ups by Roberto Manfreda, published after coordinated disclosure.",
      entry: "src/client/page.ts",
      active: "writeups",
      bodyClass: "page-writeups"
    },
    html`<section class="win" aria-labelledby="wu-index-title">
  <h1 class="page-title" id="wu-index-title">Write-ups</h1>
  <p class="lede">Bug bounty findings, written up after coordinated disclosure.</p>
  ${cmdline("ls -lt", { path: "~/writeups" })}
  ${
    writeups.length
      ? html`<div class="out"><p class="dim">total ${writeups.length}</p>${writeupList(writeups)}</div>`
      : html`<p class="out">total 0</p>
  ${cmdline("cat README", { path: "~/writeups" })}
  <div class="out readme-empty">
    <p class="lede">Nothing public yet.</p>
    <p>I hunt solo on bug bounty programs. Findings are published here only after coordinated disclosure: what the target exposed, how I got from the first odd response to a working proof of concept, and how it was fixed.</p>
    <dl class="facts">
      <div><dt>status</dt><dd><span class="warn">425 Too Early</span> <span class="dim">· waiting on disclosure</span></dd></div>
      <div><dt>feed</dt><dd><a href="/feed.xml">/feed.xml</a></dd></div>
    </dl>
  </div>`
  }
  <p class="links"><a href="/"><span aria-hidden="true">← </span>cd ~</a> <a href="/feed.xml"><span aria-hidden="true">→ </span>rss</a></p>
</section>`,
    context
  );

export const writeupPage = (writeup: Writeup, all: Writeup[], context: Context) => {
  const index = all.indexOf(writeup);
  const newer = all[index - 1];
  const older = all[index + 1];
  const meta: Array<[string, Raw | string | undefined]> = [
    ["published", writeup.date],
    ["program", writeup.program],
    ["class", [writeup.vulnClass, writeup.cwe].filter(Boolean).join(" · ") || undefined],
    ["severity", writeup.severity ? html`<span class="sev sev-${writeup.severity}">${writeup.severity}</span>${writeup.cvss ? html` <span class="dim">· CVSS ${writeup.cvss}</span>` : ""}` : undefined],
    ["bounty", writeup.bounty],
    ["tags", writeup.tags.length ? writeup.tags.join(", ") : undefined]
  ];

  return layout(
    {
      path: `/writeups/${writeup.slug}/`,
      title: `${writeup.title} · ${site.name}`,
      description: writeup.summary || `Bug bounty write-up by ${site.name}.`,
      entry: "src/client/page.ts",
      active: "writeups",
      type: "article",
      bodyClass: "page-writeup",
      noindex: writeup.draft,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: writeup.title,
        description: writeup.summary,
        datePublished: writeup.date,
        author: { "@type": "Person", name: site.name, url: site.url },
        url: `${site.url}/writeups/${writeup.slug}/`
      }
    },
    html`<article class="win writeup">
  ${cmdline(`cat ${writeup.slug}.md`, { path: "~/writeups" })}
  <header class="wu-head">
    <p class="wu-kicker">write-up ${writeup.id}${writeup.draft ? html` <span class="warn">[draft, not published]</span>` : ""}</p>
    <h1 class="page-title">${writeup.title}</h1>
    ${writeup.summary ? html`<p class="lede">${writeup.summary}</p>` : ""}
    <dl class="facts">
      ${meta.filter(([, value]) => value).map(([key, value]) => html`<div><dt>${key}</dt><dd>${value}</dd></div>`)}
    </dl>
  </header>
  <div class="prose">${raw(writeup.html)}</div>
  ${
    writeup.timeline.length
      ? html`<section class="wu-timeline" aria-labelledby="timeline-title">
    <h2 id="timeline-title"><a class="anchor" href="#timeline-title" aria-hidden="true" tabindex="-1">##</a> Timeline</h2>
    <ol>${writeup.timeline.map((entry) => html`<li><time>${entry.date}</time><span>${entry.event}</span></li>`)}</ol>
  </section>`
      : ""
  }
  <nav class="links wu-nav" aria-label="More write-ups">
    <a href="/writeups/"><span aria-hidden="true">← </span>ls ~/writeups</a>
    ${older ? html`<a href="/writeups/${older.slug}/"><span aria-hidden="true">← </span>older: ${older.title}</a>` : ""}
    ${newer ? html`<a href="/writeups/${newer.slug}/"><span aria-hidden="true">→ </span>newer: ${newer.title}</a>` : ""}
  </nav>
</article>`,
    context
  );
};

/** Atom feed of published write-ups. The timestamp only moves when a write-up is added. */
export const feed = (writeups: Writeup[]) => {
  const published = writeups.filter((writeup) => !writeup.draft);
  const stamp = (date: string) => `${date}T09:00:00Z`;
  const updated = published[0] ? stamp(published[0].date) : "2026-01-01T00:00:00Z";
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.name)} — write-ups</title>
  <subtitle>Bug bounty findings, published after coordinated disclosure.</subtitle>
  <link href="${site.url}/feed.xml" rel="self"/>
  <link href="${site.url}/writeups/"/>
  <id>${site.url}/writeups/</id>
  <updated>${updated}</updated>
  <author><name>${esc(site.name)}</name><uri>${site.url}</uri></author>
${published
  .map(
    (writeup) => `  <entry>
    <title>${esc(writeup.title)}</title>
    <link href="${site.url}/writeups/${writeup.slug}/"/>
    <id>${site.url}/writeups/${writeup.slug}/</id>
    <published>${stamp(writeup.date)}</published>
    <updated>${stamp(writeup.date)}</updated>
    <summary>${esc(writeup.summary)}</summary>
    <content type="html">${esc(writeup.html)}</content>
  </entry>`
  )
  .join("\n")}
</feed>
`;
};
