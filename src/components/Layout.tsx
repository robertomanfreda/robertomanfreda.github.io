import { ArrowUpLeft, Code2 } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { RouteId } from "../App";

type LayoutProps = PropsWithChildren<{
  route: RouteId;
}>;

const isActive = (route: RouteId, target: RouteId) => (route === target ? "page" : undefined);

export function Layout({ children, route }: LayoutProps) {
  return (
    <>
      <a className="skip-link" href="#top">Skip to content</a>
      <header className="signal-header">
        <a className="signal-brand" href="/" aria-label="Roberto Manfreda home">
          <span className="signal-monogram">RM</span><span className="signal-slash" aria-hidden="true">/</span>
          <span className="signal-brand-name">Roberto Manfreda</span>
        </a>
        <nav aria-label="Main navigation">
          <a href={route === "home" ? "#profile" : "/#profile"}>Profile</a>
          <a href={route === "home" ? "#projects" : "/#projects"}>Projects</a>
          <a href="https://github.com/robertomanfreda" target="_blank" rel="noreferrer">GitHub</a>
        </nav>
      </header>
      {route !== "home" && <nav className="project-switcher" aria-label="Project navigation">
        <a className="project-back" href="/#projects"><ArrowUpLeft size={16} aria-hidden="true" />All projects</a>
        <div>
          <a href="/respawn/" aria-current={isActive(route, "respawn")}><span aria-hidden="true">01 / </span>Respawn</a>
          <a href="/llm-model-checker/" aria-current={isActive(route, "llm-checker")}><span aria-hidden="true">02 / </span>LLM Checker</a>
        </div>
      </nav>}

      {children}

      <footer className="site-footer">
        <span>Copyright {new Date().getFullYear()} Roberto Manfreda</span>
        <a href="https://github.com/robertomanfreda/robertomanfreda.github.io" target="_blank" rel="noreferrer">
          <Code2 size={16} aria-hidden="true" />
          Source
        </a>
      </footer>
    </>
  );
}
