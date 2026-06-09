import { ArrowRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { HTMLAttributes, PropsWithChildren } from "react";

type Icon = LucideIcon;

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon: IconComponent,
  external = false
}: PropsWithChildren<{
  href: string;
  variant?: "primary" | "secondary" | "quiet";
  icon?: Icon;
  external?: boolean;
}>) {
  return (
    <a className={`button ${variant}`} href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>
      {IconComponent ? <IconComponent aria-hidden="true" /> : null}
      <span>{children}</span>
    </a>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  children,
  id,
  compact = false
}: PropsWithChildren<{
  eyebrow: string;
  title: string;
  id?: string;
  compact?: boolean;
}>) {
  return (
    <div className={`section-heading ${compact ? "compact" : ""}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id}>{title}</h2>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function TagList({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={`tags ${className}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function TerminalPanel({ title, lines }: { title: string; lines: Array<[string, string]> }) {
  return (
    <div className="terminal-shell">
      <div className="terminal-top">
        <span />
        <span />
        <span />
        <code>{title}</code>
      </div>
      <div className="terminal-stream">
        {lines.map(([label, value]) => (
          <span key={`${label}-${value}`}>
            <b>{label}</b> {value}
          </span>
        ))}
      </div>
    </div>
  );
}

export function IconCard({
  icon: IconComponent,
  title,
  children,
  className = ""
}: PropsWithChildren<{
  icon?: Icon;
  title: string;
  className?: string;
}>) {
  return (
    <article className={`card icon-card ${className}`}>
      {IconComponent ? <IconComponent aria-hidden="true" /> : null}
      <h3>{title}</h3>
      <div className="card-content">{children}</div>
    </article>
  );
}

export function TextLink({ href, children }: PropsWithChildren<{ href: string }>) {
  return (
    <a className="text-link" href={href}>
      <span>{children}</span>
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

export function CodeBlock({ title, children }: PropsWithChildren<{ title: string }>) {
  return (
    <div className="code-panel">
      <div className="code-title">{title}</div>
      <pre>
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function SplitSection({ children, className = "", ...props }: PropsWithChildren<HTMLAttributes<HTMLElement>>) {
  return (
    <section className={`section ${className}`} {...props}>
      {children}
    </section>
  );
}
