import { createHash } from "node:crypto";
import {
  about,
  areas,
  career,
  facts,
  mark,
  plan,
  site,
  type Role
} from "../content/profile";
import { html, pad, raw, type Raw } from "./html";
import { cmdline, layout, prompt, type Context } from "./layout";
import { writeupList, type Writeup } from "./writeups";

const home = `/home/${site.user}`;

/** "Jan 2017", from site.careerStart. */
const since = new Intl.DateTimeFormat("en", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(site.careerStart));

export const yearsOfExperience = (now: Date) => {
  const start = new Date(site.careerStart);
  let years = now.getUTCFullYear() - start.getUTCFullYear();
  if (now.getUTCMonth() < start.getUTCMonth()) years -= 1;
  return years;
};

const shortHash = (role: Role) => createHash("sha1").update(`${role.from} ${role.title} ${role.org}`).digest("hex").slice(0, 7);
const range = (role: Role) => (role.to === role.from ? role.from : `${role.from}..${role.to ?? "HEAD"}`);

/** Runs of the same density share a span: `#+` is the glyph, `:` its edge, `.` the body of the hexagon. */
export const markHtml = (lines: string[] = mark) =>
  lines
    .map((line) => line.replace(/[#+]+|:+|\.+/g, (run) => `<span class="m${run[0] === "." ? 1 : run[0] === ":" ? 2 : 3}">${run}</span>`))
    .join("\n");

/* ---------- sections ---------- */

const hero = (context: Context) => html`<section id="whoami" class="win hero" data-win="0" aria-labelledby="name">
  <p class="motd" data-motd hidden></p>
  ${cmdline("whoami")}
  <div class="hero-grid out">
    <div class="hero-id">
      <h1 class="name" id="name"><span data-decode>Roberto</span> <span class="name-last"><span data-decode>Manfreda</span><span class="cursor" aria-hidden="true"></span></span></h1>
      <p class="role">${site.tagline}</p>
    </div>
    <pre class="mark" aria-hidden="true" data-mark>${raw(markHtml())}</pre>
  </div>
  ${cmdline("cat about.txt")}
  <div class="out about">
    ${about.map((paragraph, index) => html`<p${index === 0 ? raw(' class="lede"') : ""}>${paragraph}</p>`)}
    <dl class="facts">
      ${facts.map(([key, value]) => html`<div><dt>${key}</dt><dd>${value}</dd></div>`)}
      <div><dt>uptime</dt><dd><span data-uptime data-since="${site.careerStart}">${yearsOfExperience(context.now)}+ years</span> <span class="dim">in software</span></dd></div>
    </dl>
  </div>
</section>`;

const scope = () => html`<section id="scope" class="win" data-win="1" aria-labelledby="scope-title">
  ${cmdline("head scope/*", { label: "what I work on", id: "scope-title" })}
  <div class="out areas">
    ${areas.map(
      (area) => html`<article class="area" data-row>
      <p class="head-file" aria-hidden="true">==&gt; scope/${area.id} &lt;==</p>
      <h3><span class="md" aria-hidden="true"># </span>${area.title}</h3>
      <p>${area.text}</p>
    </article>`
    )}
  </div>
</section>`;

const commit = (role: Role, options: { side?: boolean; head?: boolean; root?: boolean }) => html`<li class="commit${options.side ? " side" : ""}${options.root ? " root" : ""}" data-row>
  <span class="graph" aria-hidden="true">${options.side ? "| *" : "*"}</span>
  <p class="commit-line">
    <span class="hash">${shortHash(role)}</span>
    <span class="range">${range(role)}</span>
    <span class="subject"><b>${role.title}</b> <span class="at">@</span> ${role.org}${options.head ? html` <span class="refs">(<span class="ref-head">HEAD -&gt;</span> <span class="ref-branch">main</span>)</span>` : ""}${role.via ? html` <span class="via"><span aria-hidden="true">· </span>consultant through ${role.via}</span>` : ""}</span>
  </p>
</li>`;

const careerLog = () => {
  const rows: Raw[] = [];
  career.forEach((role, index) => {
    for (const side of role.side ?? []) {
      rows.push(commit(side, { side: true }));
      rows.push(html`<li class="join" aria-hidden="true">|/</li>`);
    }
    rows.push(commit(role, { head: index === 0, root: index === career.length - 1 }));
  });
  return html`<section id="career" class="win" data-win="2" aria-labelledby="career-title">
  ${cmdline("git log --graph --oneline --all", { path: "~/career", label: "career", id: "career-title" })}
  <ol class="out gitlog">${rows}</ol>
  <p class="out dim gitlog-note">Side branches are short engagements that ran alongside the main role.</p>
</section>`;
};

const projectList = () => html`<section id="projects" class="win" data-win="3" aria-labelledby="projects-title">
  ${cmdline("git remote -v", { path: "~/projects", label: "projects", id: "projects-title" })}
  <div class="out remote">
    <p><span class="remote-name">origin</span> <a href="${site.links.github}" rel="me noopener">${site.links.github}</a> <span class="dim">(fetch)</span></p>
    <p aria-hidden="true"><span class="remote-name">origin</span> <span>${site.links.github}</span> <span class="dim">(push)</span></p>
  </div>
  <p class="out">My code lives on GitHub.</p>
</section>`;

const writeupsSection = (writeups: Writeup[]) => html`<section id="writeups" class="win" data-win="4" aria-labelledby="writeups-title">
  ${cmdline("ls -lt", { path: "~/writeups", label: "write-ups", id: "writeups-title" })}
  ${
    writeups.length
      ? html`<div class="out">${writeupList(writeups.slice(0, 5))}
        <p class="links"><a href="/writeups/"><span aria-hidden="true">→ </span>all write-ups</a> <a href="/feed.xml"><span aria-hidden="true">→ </span>rss</a></p></div>`
      : html`<p class="out">total 0</p>
  ${cmdline("cat README", { path: "~/writeups" })}
  <div class="out readme-empty">
    <p class="lede">Nothing public yet.</p>
    <p>I hunt solo on bug bounty programs. Findings are published here only after coordinated disclosure: what the target exposed, how I got from the first odd response to a working proof of concept, and how it was fixed.</p>
    <dl class="facts">
      <div><dt>status</dt><dd><span class="warn">425 Too Early</span> <span class="dim">· waiting on disclosure</span></dd></div>
      <div><dt>index</dt><dd><a href="/writeups/">/writeups/</a></dd></div>
      <div><dt>feed</dt><dd><a href="/feed.xml">/feed.xml</a></dd></div>
    </dl>
  </div>`
  }
</section>`;

const contactLinks = (): Array<[string, string]> => [
  ...(site.email ? ([["mail", `mailto:${site.email}`]] as Array<[string, string]>) : []),
  ["github", site.links.github],
  ["linkedin", site.links.linkedin],
  ["stack overflow", site.links.stackoverflow]
];

/** Link text: no scheme, no trailing slash, and no name slug after a Stack Overflow user id. */
const pretty = (href: string) =>
  href
    .replace(/^mailto:|^https?:\/\/(www\.)?/, "")
    .replace(/\/$/, "")
    .replace(/^(stackoverflow\.com\/users\/\d+)\/.*$/, "$1");

const contact = () => html`<section id="contact" class="win" data-win="5" aria-labelledby="contact-title">
  ${cmdline(`finger ${site.user}`, { label: "contact", id: "contact-title" })}
  <div class="out finger">
    <dl class="finger-head">
      <div><dt>Login:</dt><dd>${site.user}</dd></div>
      <div><dt>Name:</dt><dd>${site.name}</dd></div>
      <div><dt>Directory:</dt><dd>${home}</dd></div>
      <div><dt>Shell:</dt><dd>/bin/bash</dd></div>
    </dl>
    <p>On since ${since} on pts/0 from ${site.location}</p>
    ${site.email ? "" : html`<p>No mail.</p>`}
    <p>Plan:</p>
    <div class="plan">
      ${plan.map((line) => html`<p>${line}</p>`)}
      <dl class="facts">
        ${contactLinks().map(([label, href]) => html`<div><dt>${label}</dt><dd><a href="${href}" rel="me noopener">${pretty(href)}</a></dd></div>`)}
      </dl>
    </div>
  </div>
</section>`;

const shell = () => html`<section id="shell" class="win shell" aria-label="Guest shell">
  ${cmdline("su guest")}
  <div class="term" data-term>
    <div class="term-out" data-term-out role="log" aria-live="polite"></div>
    <form class="term-line" data-term-form autocomplete="off">
      <label for="term-input" data-term-prompt>${prompt(home, "guest")}</label>
      <input id="term-input" name="command" type="text" autocomplete="off" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" aria-label="Shell command">
    </form>
    <p class="hint dim">Your turn. Type <kbd>help</kbd>.</p>
  </div>
  <noscript><p class="out dim">The guest shell needs JavaScript. Everything else on this page does not.</p></noscript>
</section>`;

const sidePane = () => html`<aside class="pane pane-side" aria-label="Session monitor" data-side>
  <section class="mini">
    <h2 class="mini-title">tail -f access.log</h2>
    <ol class="access" data-access aria-live="off"></ol>
  </section>
  <section class="mini">
    <h2 class="mini-title">session</h2>
    <dl class="mini-facts">
      <div><dt>you</dt><dd>guest <span class="dim">(read-only)</span></dd></div>
      <div><dt>host</dt><dd>${site.host} <span class="dim" data-tz></span></dd></div>
      <div><dt>up</dt><dd data-uptime-long>since ${since}</dd></div>
      <div><dt>window</dt><dd data-current-window>0:whoami</dd></div>
      <div><dt>scroll</dt><dd><span class="meter" data-meter aria-hidden="true">[....................]</span> <span data-meter-pct>0%</span></dd></div>
    </dl>
  </section>
  <section class="mini">
    <h2 class="mini-title">keys</h2>
    <dl class="mini-facts keys">
      <div><dt>0-5</dt><dd>jump to window</dd></div>
      <div><dt>j k</dt><dd>scroll</dd></div>
      <div><dt>t</dt><dd>theme</dd></div>
      <div><dt>\`</dt><dd>shell</dd></div>
      <div><dt>?</dt><dd>help</dd></div>
    </dl>
  </section>
</aside>`;

/* ---------- the guest shell's filesystem ---------- */

const through = (role: Role) => (role.via ? ` · consultant through ${role.via}` : "");

const careerOneline = () =>
  career
    .flatMap((role) => [
      ...(role.side ?? []).map((side) => `| * ${shortHash(side)} ${pad(range(side), 17)}${side.title} @ ${side.org}${through(side)}\n|/`),
      `* ${shortHash(role)} ${pad(range(role), 17)}${role.title} @ ${role.org}${through(role)}`
    ])
    .join("\n");

type FsNode = { mode: string; owner: string; text?: string };

const filesystem = (writeups: Writeup[]): Record<string, FsNode> => {
  const dir = (owner: string = site.user, mode = "drwxr-xr-x"): FsNode => ({ mode, owner });
  const file = (text: string, owner: string = site.user, mode = "-rw-r--r--"): FsNode => ({ mode, owner, text });
  const nodes: Record<string, FsNode> = {
    "/": dir("root"),
    "/etc": dir("root"),
    "/etc/hostname": file(site.host, "root"),
    "/etc/passwd": file(
      [
        "root:x:0:0:root:/root:/bin/bash",
        `${site.user}:x:1000:1000:${site.name}:${home}:/bin/bash`,
        "guest:x:1001:1001:read-only visitor:/home/guest:/bin/rbash"
      ].join("\n"),
      "root"
    ),
    "/etc/shadow": file("", "root", "-rw-r-----"),
    "/home": dir("root"),
    "/home/guest": dir("guest"),
    "/root": dir("root", "drwx------"),
    "/var": dir("root"),
    "/var/log": dir("root"),
    "/var/log/access.log": file("", "root"),
    [home]: dir(),
    [`${home}/about.txt`]: file([...about, "", ...facts.map(([key, value]) => `${pad(key, 8)}${value}`)].join("\n")),
    [`${home}/scope`]: dir(),
    [`${home}/career.log`]: file(careerOneline()),
    [`${home}/.plan`]: file([...plan, "", ...contactLinks().map(([label, href]) => `${pad(label, 16)}${pretty(href)}`)].join("\n")),
    [`${home}/.bash_history`]: file(
      ["tmux new -s rm", "head scope/*", "cd career && git log --graph --oneline --all", "k6 run --vus 500 --duration 10m soak.js", "history -c"].join("\n")
    ),
    [`${home}/writeups`]: dir(),
    [`${home}/writeups/README`]: file(
      [
        writeups.length ? `${writeups.length} published. Read them at /writeups/` : "Nothing public yet.",
        "",
        "I hunt solo on bug bounty programs. Findings are published here only",
        "after coordinated disclosure.",
        "",
        "index   /writeups/",
        "feed    /feed.xml"
      ].join("\n")
    )
  };
  for (const area of areas) nodes[`${home}/scope/${area.id}`] = file(`# ${area.title}\n\n${area.text}`);
  for (const writeup of writeups) nodes[`${home}/writeups/${writeup.slug}.md`] = file(`${writeup.title}\n\n${writeup.summary}\n\nread    /writeups/${writeup.slug}/`);
  return nodes;
};

/* ---------- page ---------- */

export const homePage = (writeups: Writeup[], context: Context) => {
  const main = html`
${hero(context)}
${scope()}
${careerLog()}
${projectList()}
${writeupsSection(writeups)}
${contact()}
${shell()}
<script type="application/json" id="fs">${raw(JSON.stringify(filesystem(writeups)).replace(/</g, "\\u003c"))}</script>`;

  return layout(
    {
      path: "/",
      title: `${site.name} · Software & DevOps engineer, bug bounty hunter`,
      description: site.description,
      entry: "src/client/home.ts",
      active: "whoami",
      bodyClass: "page-home",
      side: sidePane(),
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Person",
        name: site.name,
        url: site.url,
        image: `${site.url}/assets/icon-512.png`,
        sameAs: [site.links.github, site.links.linkedin, site.links.stackoverflow],
        jobTitle: site.role,
        worksFor: { "@type": "Organization", name: site.employer },
        address: { "@type": "PostalAddress", addressLocality: "Potenza", addressCountry: "IT" },
        knowsAbout: [
          "Software engineering",
          "DevOps",
          "Performance testing",
          "Kubernetes",
          "CI/CD",
          "Observability",
          "Application security",
          "Bug bounty",
          "Platform engineering"
        ]
      }
    },
    main,
    context
  );
};
