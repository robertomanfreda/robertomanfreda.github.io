import { Code2, ExternalLink } from "lucide-react";
import type { PropsWithChildren } from "react";
import type { RouteId } from "../App";

type LayoutProps = PropsWithChildren<{
  route: RouteId;
}>;

const isActive = (route: RouteId, target: RouteId) => (route === target ? "page" : undefined);

export function Layout({ children, route }: LayoutProps) {
  return (
    <>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Roberto Manfreda home">
          <img className="brand-mark" src="/assets/favicon.svg" alt="" aria-hidden="true" />
          <span>Roberto Manfreda</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <a className="nav-link" href="/#profile">
            Profile
          </a>
          <a className="nav-link" href="/#experience">
            Experience
          </a>
          <a className="nav-link" href="/#projects">
            Projects
          </a>
          <a className="nav-link" href="/#stack">
            Stack
          </a>
          <a className="nav-link" href="/respawn/" aria-current={isActive(route, "respawn")}>
            Respawn
          </a>
          <a className="nav-link nav-tool" href="/llm-model-checker/" aria-current={isActive(route, "llm-checker")}>
            LLM Checker
          </a>
        </nav>
        <div className="header-actions" aria-label="Social links">
          <a className="icon-link" href="https://github.com/robertomanfreda" target="_blank" rel="noreferrer" aria-label="GitHub profile">
            <Code2 size={17} aria-hidden="true" />
          </a>
          <a className="icon-link" href="https://www.linkedin.com/in/roberto-manfreda/" target="_blank" rel="noreferrer" aria-label="LinkedIn profile">
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        </div>
      </header>

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
