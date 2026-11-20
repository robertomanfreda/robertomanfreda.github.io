# robertomanfreda.github.io

Personal site of Roberto Manfreda. It reads as the scrollback of a terminal session inside tmux: the status bar is the navigation, the areas of work are four tiled panes, the career is a `git log`, and a guest shell waits at the bottom of the home page.

Pages are static HTML rendered at build time. The site ships about 9 KB of JavaScript (gzip), no framework and no runtime dependencies; it works without JavaScript, apart from the shell.

## Commands

```bash
npm install
npm run dev        # http://127.0.0.1:5173, renders pages on request, shows draft write-ups
npm run build      # type-check, bundle assets, render every page into dist/
npm run preview    # http://127.0.0.1:4173, serves dist/ as GitHub Pages would
npm run release    # build, then copy dist/ over the repository root
```

GitHub Pages serves this repository's root, so the built site is committed. Run `npm run release` and commit the result to publish. The release records what it copied in `.pages-manifest.json` and removes those names first on the next run, so a page that is no longer built does not linger at the root.

`.github/workflows/rebuild-site.yml` runs the same build once a month and commits the result if it changed. Two outputs depend on the date: the `Expires` field of `security.txt` and the years of experience on the home page.

## Editing content

| What | Where |
| --- | --- |
| Name, bio, areas of work, career, links, email, hostname | `src/content/profile.ts` |
| Write-ups | `content/writeups/*.md` |
| Colors and themes | the three `[data-theme]` blocks at the top of `src/styles/base.css` |

`profile.ts` is the single source for the home page, the guest shell's filesystem, the structured data and `security.txt`. `site.email` is the address in the contact section; `site.host` is the hostname in every prompt (`roberto@lab`); `areas` are the four panes of the scope section; `career` is one title, organisation and date range per entry.

Projects are not presented on the site: the projects section points at the GitHub profile.

### Publishing a write-up

Copy `content/writeups/_template.md` to `content/writeups/YYYY-MM-DD-some-slug.md`, fill in the front matter, and write Markdown below it. The date prefix is dropped from the URL: the page lands at `/writeups/some-slug/`.

- `draft: true` keeps a write-up out of the build. Drafts are visible only under `npm run dev`.
- Files whose name starts with `_` are ignored.
- Published write-ups are numbered `0x01`, `0x02`, … by date and appear on the home page, in `/writeups/`, in `/feed.xml` (Atom) and in the sitemap.
- Fenced blocks tagged `http` get request, status and header coloring. Blocks tagged `console` treat lines starting with `$ ` or `# ` as commands and the rest as output. Other languages are shown as plain text.
- `severity` is one of `critical`, `high`, `medium`, `low`, `info`. `timeline` is a list of `date: event` pairs.

## How it is built

```
src/content/    profile data and the ASCII banner
src/site/       page templates, run in Node at build time (and on request in dev)
src/client/     browser code: core.ts on every page, home.ts and shell.ts on the home page
src/styles/     base.css (themes, frame, shared pieces), home.css, prose.css
content/        Markdown write-ups
public/         files copied as they are (fonts, images, robots.txt, favicon)
scripts/        build.mjs, materialize-pages-root.mjs
```

`scripts/build.mjs` runs Vite once for the client bundles (with a manifest), then loads `src/site/generate.ts` through Vite's module runner and writes every page, the feed, the sitemap and `security.txt` into `dist/`. In development the same module answers requests through a small plugin in `vite.config.ts`.

Built pages carry a Content Security Policy in a `<meta>` tag: `default-src 'none'`, with scripts, styles, fonts and images from the same origin only. The one inline script, which restores the theme before first paint, is allowed by hash; the hash is computed at build time.

## Design notes

- **Type.** Iosevka in four files of about 14 KB each (`public/fonts/`), subset to Basic Latin, Latin-1, punctuation, arrows, box drawing and block elements, with layout features removed so `->` and `==` stay as typed. License: `public/fonts/Iosevka-OFL.txt`. They were produced from the upstream fonts with `pyftsubset --layout-features='' --flavor=woff2`.
- **Themes.** `phosphor` (default), `amber` and `paper`. The choice is stored in `localStorage` under `rm.theme`.
- **Motion.** Commands are typed and their output follows, once, when a section scrolls into view. The name resolves out of noise and the mark shimmers and reacts to the pointer. With `prefers-reduced-motion` everything is simply there.
- **Keys.** `0`–`5` jump to a window, `j`/`k` scroll, `g`/`G` top and bottom, `t` cycles the theme, `` ` `` focuses the shell, `?` lists them.
- **The mark** in the hero is the icon, `public/favicon.svg`, sampled into a 52×26 grid of characters; the result is stored as `mark` in `profile.ts`. Redo it if the icon changes.
- **Icon.** `public/favicon.svg` is the source: an angular R drawn with two strokes, a stem and one zigzag that makes a pointed bowl (the `>` of a prompt) and the leg. The stem sits on a 16-pixel grid so it stays sharp in a browser tab. `favicon.ico` (16, 32, 48), `apple-touch-icon.png` (180, square corners) and `assets/icon-192.png` / `icon-512.png` are renders of it; redo them if the SVG changes.
- **Link preview.** `public/assets/og.png` (1200×630) is what LinkedIn, Slack, WhatsApp and the like show for a link to the site: the hero, laid out for that size. Take a new one if the name, tagline or hostname changes. These services cache previews, so after publishing a new image ask them to fetch it again (LinkedIn: Post Inspector).
