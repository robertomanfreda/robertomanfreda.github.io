/**
 * The guest shell at the bottom of the home page: a small read-only
 * filesystem (rendered into the page at build time), a handful of commands,
 * history and tab completion.
 */
import { accessLog, currentTheme, log, setTheme, themes, type Theme } from "./core";

type Node = { mode: string; owner: string; text?: string };
type Line = string | { text: string; cls: string };

const USER = "guest";
const HOME = "/home/roberto";
const GITHUB = "https://github.com/robertomanfreda";

const READ_ONLY = ["rm", "rmdir", "mv", "cp", "touch", "mkdir", "chmod", "chown", "ln", "tee", "dd", "vi", "vim", "nvim", "nano", "emacs"];

export const startShell = (options: { files: Record<string, Node>; goTo: (windowId: string) => boolean; windows: string[]; mark: string }) => {
  const output = document.querySelector<HTMLElement>("[data-term-out]");
  const form = document.querySelector<HTMLFormElement>("[data-term-form]");
  const input = document.querySelector<HTMLInputElement>("#term-input");
  const promptLabel = document.querySelector<HTMLElement>("[data-term-prompt]");
  const term = document.querySelector<HTMLElement>("[data-term]");
  if (!output || !form || !input || !promptLabel || !term) return;

  const files = options.files;
  const host = files["/etc/hostname"]?.text ?? "localhost";
  let cwd = HOME;
  const history: string[] = [];
  let cursor = 0;
  let draft = "";
  // Set by commands that scroll the page, so the prompt does not pull the view back.
  let moved = false;

  const help = `Read-only guest shell. Things that work:

  ls [-la] [path]     list files            cat <file>      print a file
  cd [path]           change directory      pwd             where am I
  whoami, id          who am I              history         what I typed
  finger roberto      who lives here        git log         the career
  git remote -v       where the code is     fastfetch       the short version
  open <window>       jump: ${options.windows.join(" ")}
  theme [name]        ${themes.join(" | ")}
  clear, exit

Tab completes, ↑ ↓ recall.`;

  /* ----- filesystem ----- */

  const resolve = (path: string) => {
    let target = path;
    if (target === "~" || target.startsWith("~/")) target = `/home/${USER}${target.slice(1)}`;
    else if (target.startsWith("~")) target = `/home/${target.slice(1)}`;
    if (!target.startsWith("/")) target = `${cwd}/${target}`;
    const parts: string[] = [];
    for (const part of target.split("/")) {
      if (!part || part === ".") continue;
      if (part === "..") parts.pop();
      else parts.push(part);
    }
    return `/${parts.join("/")}`;
  };

  const isDir = (node: Node) => node.mode.startsWith("d");
  const canRead = (node: Node) => node.owner === USER || node.mode[7] === "r";
  const parentOf = (path: string) => path.slice(0, path.lastIndexOf("/")) || "/";
  const nameOf = (path: string) => path.slice(path.lastIndexOf("/") + 1);
  const children = (path: string) =>
    Object.keys(files)
      .filter((key) => key !== "/" && parentOf(key) === path)
      .sort();

  /** The access log is the visitor's own: what they opened and typed on this page. */
  const accessLogText = () =>
    accessLog
      .slice(-40)
      .map((entry) => `${entry.time.toISOString()} ${USER} "${entry.method} ${entry.path}" ${entry.status}${entry.ms === undefined ? "" : ` ${entry.ms}ms`}`)
      .join("\n") || "(empty)";

  const contentOf = (path: string) => (path === "/var/log/access.log" ? accessLogText() : (files[path].text ?? ""));

  /* ----- rendering ----- */

  const renderPrompt = (target: HTMLElement) => {
    target.textContent = "";
    const span = document.createElement("span");
    span.className = "ps1";
    const who = document.createElement("span");
    who.className = "ps1-user";
    who.textContent = `${USER}@${host}`;
    const path = document.createElement("span");
    path.className = "ps1-path";
    path.textContent = cwd === `/home/${USER}` ? "~" : cwd;
    span.append(who, ":", path, "$");
    target.append(span);
  };

  /** Text only, with bare URLs and site paths turned into links. */
  const appendText = (target: HTMLElement, text: string) => {
    const pattern = /(https?:\/\/[^\s"]+|(?<=\s|^)\/(?:writeups|feed\.xml)[^\s"]*)/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
      const index = match.index ?? 0;
      if (index > last) target.append(text.slice(last, index));
      const link = document.createElement("a");
      link.href = match[0];
      link.textContent = match[0];
      if (match[0].startsWith("http")) link.rel = "noopener";
      target.append(link);
      last = index + match[0].length;
    }
    if (last < text.length) target.append(text.slice(last));
  };

  const print = (...lines: Line[]) => {
    for (const line of lines) {
      const block = document.createElement("pre");
      block.className = "term-block";
      if (typeof line === "string") appendText(block, line);
      else {
        block.classList.add(line.cls);
        appendText(block, line.text);
      }
      output.append(block);
    }
  };

  const fail = (text: string): Line => ({ text, cls: "err" });

  const echo = (command: string) => {
    const row = document.createElement("p");
    row.className = "term-echo";
    const label = document.createElement("span");
    renderPrompt(label);
    const typed = document.createElement("span");
    typed.className = "cmd";
    typed.textContent = command;
    row.append(label, " ", typed);
    output.append(row);
  };

  /* ----- commands ----- */

  const longListing = (path: string, label = nameOf(path)) => {
    const node = files[path];
    const size = String(isDir(node) ? 4096 : contentOf(path).length).padStart(5);
    return `${node.mode} ${node.owner.padEnd(7)} ${size} ${label}${isDir(node) && label !== "." && label !== ".." ? "/" : ""}`;
  };

  const ls = (args: string[]): Line[] => {
    const flags = args.filter((arg) => arg.startsWith("-")).join("");
    const targets = args.filter((arg) => !arg.startsWith("-"));
    const all = flags.includes("a");
    const long = flags.includes("l");
    const out: Line[] = [];
    for (const target of targets.length ? targets : ["."]) {
      const path = resolve(target);
      const node = files[path];
      if (!node) out.push(fail(`ls: cannot access '${target}': No such file or directory`));
      else if (!canRead(node)) out.push(fail(`ls: cannot open directory '${target}': Permission denied`));
      else if (!isDir(node)) out.push(long ? longListing(path) : nameOf(path));
      else {
        const entries = children(path).filter((child) => all || !nameOf(child).startsWith("."));
        if (long) {
          out.push(`total ${entries.length}`);
          if (all) out.push(longListing(path, "."), longListing(parentOf(path), ".."));
          out.push(...entries.map((child) => longListing(child)));
        } else {
          const names = [...(all ? [".", ".."] : []), ...entries.map((child) => nameOf(child) + (isDir(files[child]) ? "/" : ""))];
          if (names.length) out.push(names.join("  "));
        }
      }
    }
    return out;
  };

  /** `head scope/*` on the page works here too: a trailing `*` means every file in that directory. */
  const expand = (target: string) => {
    if (!target.endsWith("/*") && target !== "*") return [target];
    const base = target === "*" ? "." : target.slice(0, -2);
    const directory = files[resolve(base)];
    if (!directory || !isDir(directory) || !canRead(directory)) return [target];
    return children(resolve(base))
      .filter((child) => !isDir(files[child]) && !nameOf(child).startsWith("."))
      .map((child) => (target === "*" ? nameOf(child) : `${base}/${nameOf(child)}`));
  };

  const cat = (name: string, args: string[]): Line[] => {
    const targets = args.filter((arg) => !arg.startsWith("-")).flatMap(expand);
    if (!targets.length) return [fail(`${name}: missing file operand`)];
    return targets.flatMap((target): Line[] => {
      const path = resolve(target);
      const node = files[path];
      if (!node) return [fail(`${name}: ${target}: No such file or directory`)];
      if (isDir(node)) return [fail(`${name}: ${target}: Is a directory`)];
      if (!canRead(node)) return [fail(`${name}: ${target}: Permission denied`)];
      return name === "head" && targets.length > 1 ? [{ text: `==> ${target} <==`, cls: "dim" }, contentOf(path)] : [contentOf(path)];
    });
  };

  const cd = (args: string[]): Line[] => {
    const target = args[0] ?? "~";
    const path = resolve(target);
    const node = files[path];
    if (!node) return [fail(`bash: cd: ${target}: No such file or directory`)];
    if (!isDir(node)) return [fail(`bash: cd: ${target}: Not a directory`)];
    if (!canRead(node)) return [fail(`bash: cd: ${target}: Permission denied`)];
    cwd = path;
    return [];
  };

  const commands: Record<string, (args: string[]) => Line[]> = {
    help: () => [help],
    ls,
    ll: (args) => ls(["-la", ...args]),
    cat: (args) => cat("cat", args),
    head: (args) => cat("head", args),
    tail: (args) => cat("tail", args),
    less: (args) => cat("less", args),
    more: (args) => cat("more", args),
    cd,
    pwd: () => [cwd],
    whoami: () => [USER],
    id: () => ["uid=1001(guest) gid=1001(guest) groups=1001(guest)"],
    hostname: () => [host],
    uname: (args) => [args.includes("-a") ? `Linux ${host} 6.12.0-amd64 #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux` : "Linux"],
    date: () => [new Date().toString()],
    echo: (args) => [args.join(" ")],
    history: () => [history.map((entry, index) => `${String(index + 1).padStart(4)}  ${entry}`).join("\n")],
    clear: () => {
      output.textContent = "";
      return [];
    },
    theme: (args) => {
      if (!args[0]) return [`theme: ${currentTheme()}\navailable: ${themes.join(" ")}`];
      if (!themes.includes(args[0] as Theme)) return [fail(`theme: unknown theme '${args[0]}'. try: ${themes.join(" ")}`)];
      setTheme(args[0] as Theme);
      return [`theme: ${args[0]}`];
    },
    open: (args) => {
      if (!options.goTo(args[0] ?? "")) return [fail(`open: no such window '${args[0] ?? ""}'. try: ${options.windows.join(" ")}`)];
      moved = true;
      return [];
    },
    finger: () => [contentOf(`${HOME}/.plan`)],
    git: (args) => {
      if (args[0] === "log") return [contentOf(`${HOME}/career.log`)];
      if (args[0] === "remote") return [`origin  ${GITHUB} (fetch)\norigin  ${GITHUB} (push)`];
      return [fail("git: only 'git log' and 'git remote' made it into this shell")];
    },
    man: (args) => (args[0] === "roberto" ? [contentOf(`${HOME}/about.txt`)] : [fail(`No manual entry for ${args[0] ?? "nothing"}`)]),
    fastfetch: () => [options.mark, contentOf(`${HOME}/about.txt`).split("\n\n").pop() ?? ""],
    neofetch: () => commands.fastfetch([]),
    sudo: () => [fail(`${USER} is not in the sudoers file.`)],
    su: () => [fail("su: Authentication failure")],
    exit: () => ["logout", "There is nowhere to go. This is a web page."],
    logout: () => commands.exit([])
  };

  const run = (line: string): Line[] => {
    const [name, ...args] = line.trim().split(/\s+/);
    if (!name) return [];
    if (READ_ONLY.includes(name)) return [fail(`${name}: Read-only file system`)];
    const command = commands[name];
    if (!command) return [fail(`bash: ${name}: command not found`)];
    return command(args);
  };

  /* ----- tab completion ----- */

  const complete = () => {
    const before = input.value.slice(0, input.selectionStart ?? input.value.length);
    const tokens = before.split(/\s+/);
    const word = tokens[tokens.length - 1];
    let candidates: string[];
    if (tokens.length === 1) candidates = Object.keys(commands).filter((name) => name.startsWith(word)).map((name) => `${name} `);
    else {
      const slash = word.lastIndexOf("/");
      const base = slash === -1 ? "" : word.slice(0, slash + 1);
      const partial = word.slice(slash + 1);
      const directory = files[resolve(base || ".")];
      if (!directory || !isDir(directory) || !canRead(directory)) return;
      candidates = children(resolve(base || "."))
        .filter((child) => nameOf(child).startsWith(partial) && (partial.startsWith(".") || !nameOf(child).startsWith(".")))
        .map((child) => base + nameOf(child) + (isDir(files[child]) ? "/" : " "));
    }
    if (!candidates.length) return;
    let shared = candidates[0];
    for (const candidate of candidates) while (!candidate.startsWith(shared)) shared = shared.slice(0, -1);
    if (shared.length > word.length) {
      input.value = before.slice(0, before.length - word.length) + shared + input.value.slice(before.length);
    } else if (candidates.length > 1) {
      echo(input.value);
      print(candidates.map((candidate) => candidate.trim().split("/").filter(Boolean).pop() ?? candidate).join("  "));
    }
  };

  /* ----- wiring ----- */

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value;
    input.value = "";
    echo(line);
    const result = run(line);
    if (line.trim()) {
      history.push(line);
      // The visitor's commands land in the access log with the status a server would have given.
      const errors = result.filter((entry): entry is { text: string; cls: string } => typeof entry !== "string" && entry.cls === "err").map((entry) => entry.text);
      const status = !errors.length ? 200 : errors.some((text) => text.includes("not found") || text.includes("No such")) ? 404 : 403;
      log("POST", `/bin/${line.trim().split(/\s+/)[0].replace(/[^\w.-]/g, "").slice(0, 16) || "sh"}`, status);
    }
    cursor = history.length;
    print(...result);
    renderPrompt(promptLabel);
    if (moved) input.blur();
    else input.scrollIntoView({ block: "nearest" });
    moved = false;
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Tab" && input.value) {
      event.preventDefault();
      complete();
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (cursor === history.length) draft = input.value;
      cursor = Math.max(0, Math.min(history.length, cursor + (event.key === "ArrowUp" ? -1 : 1)));
      input.value = cursor === history.length ? draft : history[cursor];
    } else if (event.ctrlKey && event.key === "l") {
      event.preventDefault();
      output.textContent = "";
    } else if (event.ctrlKey && event.key === "c") {
      event.preventDefault();
      echo(`${input.value}^C`);
      input.value = "";
    } else if (event.key === "Escape") input.blur();
  });

  // A click anywhere in the terminal focuses the prompt, unless the visitor is selecting text.
  term.addEventListener("click", (event) => {
    if ((event.target as Element).closest("a")) return;
    if (!getSelection()?.isCollapsed) return;
    input.focus({ preventScroll: true });
  });

  renderPrompt(promptLabel);
};
