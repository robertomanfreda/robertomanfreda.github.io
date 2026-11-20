import "../styles/base.css";
import "../styles/home.css";
import { accessLog, animated, log, reducedMotion, setActiveWindow, sleep, type LogEntry } from "./core";
import { startShell } from "./shell";

const $ = <T extends Element>(selector: string, scope: ParentNode = document) => scope.querySelector<T>(selector);
const $$ = <T extends Element>(selector: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(selector));

const NOISE = "!<>-_\\/[]{}=+*^?#$%&01";
const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
const two = (value: number) => String(value).padStart(2, "0");

/* ---------- last login ---------- */

const motd = () => {
  const line = $<HTMLElement>("[data-motd]");
  if (!line) return;
  try {
    const previous = localStorage.getItem("rm.lastLogin");
    localStorage.setItem("rm.lastLogin", new Date().toISOString());
    if (!previous) return;
    const when = new Date(previous);
    if (Number.isNaN(when.getTime())) return;
    line.textContent = `Last login: ${when.toString().replace(/ GMT.*$/, "")} on pts/0`;
    line.hidden = false;
  } catch {
    /* no storage, no last login */
  }
};

/* ---------- the name resolves out of noise ---------- */

const decodeText = async (element: HTMLElement) => {
  const final = element.textContent ?? "";
  if (!animated()) return;
  const frames = 16;
  for (let frame = 0; frame <= frames; frame += 1) {
    const settled = Math.floor((frame / frames) * final.length);
    element.textContent = final
      .split("")
      .map((char, index) => (index < settled || char === " " ? char : pick(NOISE)))
      .join("");
    await sleep(34);
  }
  element.textContent = final;
};

/* ---------- the mark: characters that settle, and stir under the pointer ---------- */

const startMark = (element: HTMLElement) => {
  const rows = (element.textContent ?? "").split("\n");
  const width = Math.max(...rows.map((row) => row.length));
  const cells = rows.map((row) => row.padEnd(width, " ").split(""));
  // Frames of noise left on each cell. Zero means the real character shows.
  const heat = cells.map((row) => row.map((char) => (char === " " ? 0 : 6 + Math.floor(Math.random() * 22))));
  const level = (char: string) => (char === "#" || char === "+" ? 3 : char === ":" ? 2 : 1);
  let visible = true;
  let timer = 0;

  const draw = () => {
    let active = false;
    const html = cells
      .map((row, y) => {
        let line = "";
        let run = "";
        let runClass = "";
        const flush = () => {
          if (run) line += runClass ? `<span class="${runClass}">${run}</span>` : run;
          run = "";
        };
        row.forEach((char, x) => {
          const hot = heat[y][x] > 0;
          if (hot) {
            heat[y][x] -= 1;
            active = true;
          }
          const shown = char === " " ? " " : hot ? pick(NOISE) : char;
          const cls = char === " " ? "" : hot ? "mh" : `m${level(char)}`;
          if (cls !== runClass) {
            flush();
            runClass = cls;
          }
          run += shown === "<" ? "&lt;" : shown === ">" ? "&gt;" : shown === "&" ? "&amp;" : shown;
        });
        flush();
        return line.replace(/\s+$/, "");
      })
      .join("\n");
    element.innerHTML = html;
    return active;
  };

  const loop = () => {
    const active = draw();
    timer = active && visible ? window.setTimeout(loop, 42) : 0;
  };
  const wake = () => {
    if (!timer && visible && !document.hidden && animated()) loop();
  };

  // Every few seconds a handful of cells flicker, like a display that is still alive.
  const shimmer = () => {
    if (visible && !document.hidden && animated()) {
      for (let count = 0; count < 7; count += 1) {
        const y = Math.floor(Math.random() * cells.length);
        const x = Math.floor(Math.random() * width);
        if (cells[y][x] !== " ") heat[y][x] = 3 + Math.floor(Math.random() * 5);
      }
      wake();
    }
    window.setTimeout(shimmer, 900 + Math.random() * 1800);
  };

  element.addEventListener("pointermove", (event) => {
    if (!animated()) return;
    const box = element.getBoundingClientRect();
    const cx = ((event.clientX - box.left) / box.width) * width;
    const cy = ((event.clientY - box.top) / box.height) * cells.length;
    for (let y = Math.max(0, Math.floor(cy - 3)); y <= Math.min(cells.length - 1, cy + 3); y += 1) {
      for (let x = Math.max(0, Math.floor(cx - 6)); x <= Math.min(width - 1, cx + 6); x += 1) {
        const distance = Math.hypot((x - cx) / 2, y - cy);
        if (distance < 3 && cells[y][x] !== " ") heat[y][x] = Math.max(heat[y][x], Math.round(7 - distance * 2));
      }
    }
    wake();
  });

  new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) wake();
  }).observe(element);
  document.addEventListener("visibilitychange", wake);

  if (animated()) {
    loop();
    window.setTimeout(shimmer, 2600);
  }
};

/* ---------- uptime since the first developer job ---------- */

/** The start date is written into the page by the build (site.careerStart), read as a local calendar date. */
const careerStart = () => {
  const [year, month, day] = ($<HTMLElement>("[data-since]")?.dataset.since ?? "").split("-").map(Number);
  return year && month && day ? new Date(year, month - 1, day) : null;
};

const uptimeParts = (start: Date, now: Date) => {
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
};

const tickUptime = () => {
  const start = careerStart();
  if (!start) return;
  const now = new Date();
  const { years, months, days } = uptimeParts(start, now);
  const short = $<HTMLElement>("[data-uptime]");
  if (short) short.textContent = `${years} years, ${months} ${months === 1 ? "month" : "months"}`;
  const long = $<HTMLElement>("[data-uptime-long]");
  if (long) long.textContent = `${years}y ${months}m ${days}d ${two(now.getHours())}:${two(now.getMinutes())}:${two(now.getSeconds())}`;
};

/* ---------- which window is on screen ---------- */

const windows = () => $$<HTMLElement>(".win[data-win]");

/**
 * A window the visitor asked for by name stays the current one until they
 * scroll by hand. Short sections, or ones the page cannot scroll to the top,
 * would otherwise be reported as their neighbour.
 */
let pinnedWindow: number | null = null;
let refreshWindows = () => {};

const trackWindows = () => {
  const sections = windows();
  const label = $<HTMLElement>("[data-current-window]");
  const meter = $<HTMLElement>("[data-meter]");
  const percent = $<HTMLElement>("[data-meter-pct]");
  let current = -1;
  let frame = 0;

  const update = () => {
    frame = 0;
    const probe = innerHeight * 0.38;
    let index = 0;
    sections.forEach((section, position) => {
      if (section.getBoundingClientRect().top <= probe) index = position;
    });
    const range = document.documentElement.scrollHeight - innerHeight;
    const progress = range > 0 ? Math.min(1, Math.max(0, scrollY / range)) : 0;
    if (progress > 0.995) index = sections.length - 1;
    if (pinnedWindow !== null) index = pinnedWindow;
    if (index !== current) {
      const first = current === -1;
      current = index;
      setActiveWindow(index);
      const name = sections[index].id;
      if (label) label.textContent = `${index}:${name}`;
      if (!first) log("GET", `/#${name}`);
    }
    if (meter && percent) {
      const filled = Math.round(progress * 20);
      meter.textContent = `[${"#".repeat(filled)}${".".repeat(20 - filled)}]`;
      percent.textContent = `${Math.round(progress * 100)}%`;
    }
  };

  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const release = () => {
    if (pinnedWindow === null) return;
    pinnedWindow = null;
    schedule();
  };
  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule);
  addEventListener("wheel", release, { passive: true });
  addEventListener("touchmove", release, { passive: true });
  addEventListener("mousedown", release);
  addEventListener("keydown", (event) => {
    if (["j", "k", "g", "G", "ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(event.key)) release();
  });
  refreshWindows = schedule;

  // Arriving on /#career from another page counts as asking for that window.
  const requested = sections.findIndex((section) => `#${section.id}` === location.hash);
  if (requested !== -1) pinnedWindow = requested;
  update();
};

const goTo = (target: string) => {
  const sections = windows();
  const section = /^\d$/.test(target) ? sections[Number(target)] : sections.find((candidate) => candidate.id === target);
  if (!section) return false;
  pinnedWindow = sections.indexOf(section);
  refreshWindows();
  section.scrollIntoView({ behavior: animated() ? "smooth" : "auto", block: "start" });
  return true;
};

/* ---------- side pane: the visitor's own access log ---------- */

const startAccessLog = () => {
  const list = $<HTMLOListElement>("[data-access]");
  const zone = $<HTMLElement>("[data-tz]");
  if (zone) zone.textContent = "Europe/Rome";
  if (!list) return;

  const add = (entry: LogEntry) => {
    const item = document.createElement("li");
    const time = document.createElement("time");
    time.textContent = `${two(entry.time.getHours())}:${two(entry.time.getMinutes())}:${two(entry.time.getSeconds())}`;
    const method = document.createElement("span");
    method.className = "a-method";
    method.textContent = entry.method;
    const path = document.createElement("span");
    path.className = "a-path";
    path.textContent = entry.path;
    const status = document.createElement("span");
    status.className = `a-status s${String(entry.status)[0]}`;
    status.textContent = String(entry.status);
    item.append(time, " ", method, " ", path, " ", status);
    if (entry.ms !== undefined) {
      const took = document.createElement("span");
      took.className = "a-ms";
      took.textContent = ` ${entry.ms}ms`;
      item.append(took);
    }
    list.append(item);
    while (list.children.length > 12) list.firstElementChild?.remove();
  };

  accessLog.forEach(add);
  document.addEventListener("rm:log", (event) => add((event as CustomEvent<LogEntry>).detail));
};

/** The first line of the log is this page load, with the browser's own timing. */
const logNavigation = () => {
  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const ms = navigation && navigation.responseEnd > 0 ? Math.max(1, Math.round(navigation.responseEnd - navigation.startTime)) : undefined;
  log("GET", location.pathname + location.hash, 200, ms);
};

/* ---------- boot ---------- */

const hero = $<HTMLElement>(".hero-grid");
const markElement = $<HTMLElement>("[data-mark]");
const markText = markElement?.textContent ?? "";
let heroStarted = false;

const startHero = () => {
  if (heroStarted) return;
  heroStarted = true;
  $$<HTMLElement>("[data-decode]").forEach((element) => void decodeText(element));
  if (markElement) startMark(markElement);
};

if (hero?.classList.contains("on")) startHero();
else hero?.addEventListener("rm:reveal", startHero, { once: true });
reducedMotion.addEventListener("change", startHero);

motd();
tickUptime();
setInterval(tickUptime, 1000);
startAccessLog();
logNavigation();
trackWindows();

try {
  const files = JSON.parse($("#fs")?.textContent ?? "{}");
  startShell({ files, goTo, windows: windows().map((section) => section.id), mark: markText });
} catch (error) {
  console.error("shell: could not read the filesystem", error);
}

// In-page window links scroll instead of jumping, and keep the URL tidy.
document.addEventListener("click", (event) => {
  const link = (event.target as Element | null)?.closest?.('.sb-windows a[href^="#"]') as HTMLAnchorElement | null;
  if (!link) return;
  const id = link.getAttribute("href")!.slice(1);
  if (goTo(id)) {
    event.preventDefault();
    history.replaceState(null, "", `#${id}`);
  }
});
