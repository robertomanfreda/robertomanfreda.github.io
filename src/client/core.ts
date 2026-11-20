/**
 * Runs on every page: theme, status bar clock, keyboard, the typed-command
 * reveal, and copy buttons on code blocks. No dependencies.
 */
import banner from "../content/banner.txt?raw";

declare global {
  interface Window {
    __rm?: boolean;
  }
}

window.__rm = true;

const root = document.documentElement;
export const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const animated = () => root.classList.contains("anim") && !reducedMotion.matches;
export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const $ = <T extends Element>(selector: string, scope: ParentNode = document) => scope.querySelector<T>(selector);
const $$ = <T extends Element>(selector: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(selector));

/* ---------- access log: other modules report, the home page's side pane listens ---------- */

export type LogEntry = { time: Date; method: string; path: string; status: number; ms?: number };
export const accessLog: LogEntry[] = [];

export const log = (method: string, path: string, status = 200, ms?: number) => {
  const entry: LogEntry = { time: new Date(), method, path, status, ms };
  accessLog.push(entry);
  if (accessLog.length > 200) accessLog.shift();
  document.dispatchEvent(new CustomEvent<LogEntry>("rm:log", { detail: entry }));
};

/* ---------- theme ---------- */

export const themes = ["phosphor", "amber", "paper"] as const;
export type Theme = (typeof themes)[number];

export const currentTheme = (): Theme => (themes.includes(root.dataset.theme as Theme) ? (root.dataset.theme as Theme) : "phosphor");

export const setTheme = (theme: Theme) => {
  root.dataset.theme = theme;
  try {
    localStorage.setItem("rm.theme", theme);
  } catch {
    /* private mode: the theme simply does not persist */
  }
  $$<HTMLElement>("[data-theme-name]").forEach((element) => (element.textContent = theme));
  const background = getComputedStyle(root).getPropertyValue("--bg").trim();
  if (background) $<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", background);
};

export const cycleTheme = () => {
  const next = themes[(themes.indexOf(currentTheme()) + 1) % themes.length];
  setTheme(next);
  log("PUT", `/theme/${next}`);
  return next;
};

/* ---------- status bar ---------- */

const clockFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Rome",
  hour: "2-digit",
  minute: "2-digit",
  day: "2-digit",
  month: "short",
  year: "2-digit",
  hour12: false
});

const tick = () => {
  const parts = Object.fromEntries(clockFormat.formatToParts(new Date()).map((part) => [part.type, part.value]));
  const label = `${parts.hour}:${parts.minute} ${parts.day}-${parts.month}-${parts.year}`;
  $$<HTMLElement>("[data-clock]").forEach((element) => (element.textContent = label));
};

/** Marks the current window with `*` and the previous one with `-`, as tmux does. */
export const setActiveWindow = (index: number) => {
  const links = $$<HTMLAnchorElement>(".sb-windows a");
  const previous = links.findIndex((link) => link.getAttribute("aria-current") === "true");
  if (previous === index) return;
  links.forEach((link, position) => {
    const flag = $(".sb-flag", link);
    if (position === index) {
      link.setAttribute("aria-current", "true");
      if (flag) flag.textContent = "*";
      link.scrollIntoView({ block: "nearest", inline: "nearest" });
    } else {
      link.removeAttribute("aria-current");
      if (flag) flag.textContent = position === previous ? "-" : "";
    }
  });
};

/* ---------- keyboard ---------- */

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

const help = () => $<HTMLDialogElement>("#help");

const goToWindow = (index: number) => {
  const link = $$<HTMLAnchorElement>(".sb-windows a")[index];
  if (link) link.click();
};

const focusShell = () => {
  const input = $<HTMLInputElement>("#term-input");
  if (!input) {
    location.href = "/#shell";
    return;
  }
  input.scrollIntoView({ block: "center", behavior: animated() ? "smooth" : "auto" });
  input.focus({ preventScroll: true });
};

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return;
  if (help()?.open) return;
  const page = Math.round(innerHeight * 0.3);
  switch (event.key) {
    case "j":
      scrollBy({ top: page });
      break;
    case "k":
      scrollBy({ top: -page });
      break;
    case "g":
      scrollTo({ top: 0 });
      break;
    case "G":
      scrollTo({ top: document.documentElement.scrollHeight });
      break;
    case "t":
      cycleTheme();
      break;
    case "?":
      help()?.showModal();
      log("GET", "/help");
      break;
    case "`":
      focusShell();
      break;
    default:
      if (/^[0-9]$/.test(event.key)) goToWindow(Number(event.key));
      else return;
  }
  event.preventDefault();
});

/* ---------- typed commands, then their output ---------- */

const typeCommand = async (element: HTMLElement) => {
  const full = element.textContent ?? "";
  element.textContent = "";
  element.classList.add("typing");
  const step = Math.max(8, Math.min(34, 420 / Math.max(1, full.length)));
  for (let index = 1; index <= full.length; index += 1) {
    element.textContent = full.slice(0, index);
    await sleep(step);
  }
  element.classList.remove("typing");
};

/**
 * A container holds commands and their output in order. Each command is typed,
 * then everything up to the next command appears, rows one after another.
 */
const play = async (container: HTMLElement) => {
  const steps = $$<HTMLElement>(":scope > .cmdline, :scope > .out", container);
  for (const element of steps) {
    if (element.classList.contains("cmdline")) {
      element.classList.add("on");
      const command = $<HTMLElement>("[data-type]", element);
      if (command) await typeCommand(command);
      await sleep(90);
      continue;
    }
    element.classList.add("on");
    element.dispatchEvent(new CustomEvent("rm:reveal", { bubbles: true }));
    const rows = $$<HTMLElement>("[data-row]", element);
    const delay = Math.max(14, Math.min(42, 620 / Math.max(1, rows.length)));
    for (const row of rows) {
      row.classList.add("on");
      await sleep(delay);
    }
    await sleep(60);
  }
  container.classList.add("played");
  container.dispatchEvent(new CustomEvent("rm:played", { bubbles: true }));
};

const showEverything = () => {
  $$(".cmdline, .out, [data-row]").forEach((element) => element.classList.add("on"));
  $$<HTMLElement>(".win").forEach((container) => {
    $$<HTMLElement>(".out", container).forEach((element) => element.dispatchEvent(new CustomEvent("rm:reveal", { bubbles: true })));
    container.classList.add("played");
    container.dispatchEvent(new CustomEvent("rm:played", { bubbles: true }));
  });
};

const armReveals = () => {
  if (!animated() || !("IntersectionObserver" in window)) {
    root.classList.remove("anim");
    showEverything();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        void play(entry.target as HTMLElement);
      }
    },
    { rootMargin: "0px 0px -12% 0px" }
  );
  $$<HTMLElement>(".win").forEach((container) => observer.observe(container));
  reducedMotion.addEventListener("change", () => {
    if (!reducedMotion.matches) return;
    observer.disconnect();
    root.classList.remove("anim");
    showEverything();
  });
};

/* ---------- copy buttons on code blocks ---------- */

const addCopyButtons = () => {
  if (!navigator.clipboard) return;
  for (const block of $$<HTMLElement>("figure.code")) {
    const header = $<HTMLElement>("figcaption", block);
    const code = $<HTMLElement>("pre", block);
    if (!header || !code || $(".copy", header)) continue;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "copy";
    button.textContent = "copy";
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(code.innerText);
      button.textContent = "copied";
      setTimeout(() => (button.textContent = "copy"), 1400);
    });
    header.append(button);
  }
};

/* ---------- boot ---------- */

const boot = () => {
  setTheme(currentTheme());
  tick();
  setInterval(tick, 15_000);

  $$<HTMLButtonElement>("[data-theme-cycle]").forEach((button) => button.addEventListener("click", cycleTheme));
  $$<HTMLButtonElement>("[data-help-open]").forEach((button) =>
    button.addEventListener("click", () => {
      help()?.showModal();
      log("GET", "/help");
    })
  );
  $$<HTMLButtonElement>("[data-theme-set]").forEach((button) =>
    button.addEventListener("click", () => {
      setTheme(button.dataset.themeSet as Theme);
      log("PUT", `/theme/${button.dataset.themeSet}`);
    })
  );
  help()?.addEventListener("click", (event) => {
    if (event.target === help()) help()?.close();
  });

  document.addEventListener("click", (event) => {
    const link = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
    if (link && link.origin !== location.origin) log("GET", `${link.hostname}${link.pathname}`.replace(/\/$/, ""), 302);
  });

  addCopyButtons();
  armReveals();

  console.log(`%c${banner}`, "font-family:monospace;line-height:1.1");
};

// Deferred a task so that page modules importing this one have registered their listeners first.
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(boot), { once: true });
else setTimeout(boot);
