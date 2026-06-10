import { useEffect, useState } from "react";
import {
  Activity,
  Boxes,
  BrainCircuit,
  Code2,
  Database,
  FolderGit2,
  Gauge,
  Network,
  ServerCog,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { ButtonLink, IconCard, SectionHeading, TagList, TerminalPanel, TextLink } from "../components/ui";
import { JsonLd, SITE_URL } from "../lib/seo";

const profileCards = [
  {
    title: "Development and architecture",
    text: "Sustainable technical choices, clear integrations, and code that stays understandable as the product grows."
  },
  {
    title: "Technical leadership",
    text: "Explicit decisions, careful trade-off analysis, and close collaboration with the people building and operating the system."
  },
  {
    title: "DevOps and performance",
    text: "Cloud-native systems, scalable platforms, operability, and performance work with data in hand."
  }
];

const techCards = [
  {
    icon: Code2,
    title: "Languages",
    text: "Backend, automation, CLI tooling, scripting, and integration work.",
    items: ["Java", "Go", "Python", "Bash"]
  },
  {
    icon: Boxes,
    title: "Platforms",
    text: "Cloud-native runtime foundations, containers, and Linux-based operations.",
    items: ["Kubernetes", "Docker", "Docker Swarm", "Linux"]
  },
  {
    icon: Workflow,
    title: "Delivery",
    text: "Automation pipelines, GitOps workflows, repeatable builds, and release discipline.",
    items: ["GitLab CI", "GitHub Actions", "Jenkins", "Tekton", "ArgoCD", "Makefile"]
  },
  {
    icon: Activity,
    title: "Observability",
    text: "Metrics, traces, logs, load testing, and bottleneck diagnosis.",
    items: ["Prometheus", "Grafana", "Jaeger", "ELK", "JMeter", "k6"]
  },
  {
    icon: ShieldCheck,
    title: "Security",
    text: "DevSecOps practices, application security checks, auth, and hardening work.",
    items: ["OWASP", "SAST", "DAST", "Burp Suite", "Keycloak", "JWT"]
  },
  {
    icon: Database,
    title: "Data",
    text: "Persistence, caching, event streaming, and enterprise data integrations.",
    items: ["PostgreSQL", "MySQL", "Oracle", "MongoDB", "Redis", "Kafka"]
  }
];

export function HomePage() {
  const [githubSignal, setGithubSignal] = useState("Public GitHub profile");

  useEffect(() => {
    const controller = new AbortController();

    fetch("https://api.github.com/users/robertomanfreda", { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile: { followers?: number; location?: string } | null) => {
        if (!profile) return;
        const followers = typeof profile.followers === "number" ? `${profile.followers} GitHub followers` : "Public GitHub profile";
        setGithubSignal(followers);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  return (
    <main id="top">
      <section className="hero home-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">DevOps Engineer at Aruba - Software Architect - AI Builder</p>
          <h1 id="hero-title">Roberto Manfreda</h1>
          <p className="hero-text">
            I build solid, readable, measurable systems: from application code to platforms, with constant attention to
            performance, operability, and architecture quality.
          </p>
          <div className="button-row" role="group" aria-label="Primary actions">
            <ButtonLink href="/respawn/" icon={FolderGit2}>
              Respawn
            </ButtonLink>
            <ButtonLink href="/llm-model-checker/" variant="secondary" icon={Gauge}>
              LLM Checker
            </ButtonLink>
            <ButtonLink href="https://github.com/robertomanfreda" variant="quiet" icon={Code2} external>
              GitHub
            </ButtonLink>
          </div>
        </div>

        <aside className="hero-panel" aria-label="Profile summary">
          <img className="portrait" src="/assets/roberto-manfreda.png" alt="Roberto Manfreda" />
          <ul className="signal-list">
            <li>DevOps Engineer at Aruba</li>
            <li>Italy</li>
            <li>{githubSignal}</li>
            <li>Respawn spotlight</li>
          </ul>
          <TerminalPanel
            title="~/ops/roberto"
            lines={[
              ["$", "deploy --measure --learn"],
              ["latency", "p95: 42ms"],
              ["trace", "api.gateway.ready"],
              ["model", "local.responses.online"]
            ]}
          />
        </aside>
      </section>

      <section id="profile" className="section" aria-labelledby="profile-title">
        <SectionHeading eyebrow="Profile" title="From design to runtime" id="profile-title" />
        <div className="three-grid">
          {profileCards.map((card) => (
            <article className="card compact-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="experience" className="section split-section" aria-labelledby="experience-title">
        <SectionHeading eyebrow="Experience" title="Enterprise systems, cloud-native platforms" id="experience-title">
          My path combines hands-on software engineering, DevOps practices, and architectural support across production
          systems where reliability, delivery flow, and performance matter.
        </SectionHeading>
        <div className="experience-list">
          <article className="timeline-card">
            <span>Current</span>
            <h3>DevOps Engineer - Aruba</h3>
            <p>Software engineering and DevOps on cloud-native systems, automation, deployment workflows, and platform reliability.</p>
          </article>
          <article className="timeline-card">
            <span>Previously</span>
            <h3>Consultant - Alten Italia</h3>
            <p>Enterprise consulting across gaming, cloud, IoT, ticketing, management software, and digital services.</p>
          </article>
          <article className="timeline-card">
            <span>Scope</span>
            <h3>Backend, DevOps, Kubernetes, CI/CD, DevSecOps</h3>
            <TagList items={["Backend architecture", "Kubernetes", "CI/CD", "DevSecOps", "Observability", "Performance tuning"]} />
          </article>
        </div>
      </section>

      <section className="section focus-band" aria-labelledby="focus-title">
        <SectionHeading eyebrow="Direction" title="Practical technology, high curiosity" id="focus-title" compact />
        <ul className="focus-list">
          <li>
            <ServerCog aria-hidden="true" /> Platform engineering
          </li>
          <li>
            <Activity aria-hidden="true" /> Performance
          </li>
          <li>
            <Network aria-hidden="true" /> Distributed systems
          </li>
          <li>
            <BrainCircuit aria-hidden="true" /> Local AI and agents
          </li>
        </ul>
      </section>

      <section id="projects" className="section" aria-labelledby="projects-title">
        <SectionHeading eyebrow="Projects and tools" title="Respawn and local AI utilities" id="projects-title">
          Local-first AI work: a Responses API compatible gateway and a hardware checker for choosing self-hosted models
          before downloading them.
        </SectionHeading>

        <div className="project-grid">
          <article className="card project-card featured-project">
            <a className="project-media" href="/respawn/" aria-label="Open the Respawn project page">
              <img src="/assets/respawn.png" alt="" aria-hidden="true" />
            </a>
            <div>
              <div className="card-kicker">
                <span>AI gateway</span>
                <span>2026</span>
              </div>
              <h3>Respawn</h3>
              <p>
                Local gateway compatible with the OpenAI Responses API for self-hosted LLMs: conversational state, SSE
                streaming, tool calls, structured outputs, Prometheus metrics, and a Docker Compose stack.
              </p>
              <TagList items={["OpenAI API", "FastAPI", "Postgres", "Ollama"]} />
              <TextLink href="/respawn/">Read project page</TextLink>
            </div>
          </article>

          <article className="card project-card">
            <a className="checker-mini" href="/llm-model-checker/" aria-label="Open the LLM Model Checker">
              <span>VRAM</span>
              <strong>12 GB</strong>
              <span>Q4 fit</span>
              <strong>Good</strong>
            </a>
            <div>
              <div className="card-kicker">
                <span>Local AI tool</span>
                <span>2026</span>
              </div>
              <h3>LLM Model Checker</h3>
              <p>
                Estimate which Ollama and GGUF-style local models fit a GPU, unified memory system, or CPU-only setup with
                Q4 footprint and speed estimates.
              </p>
              <TagList items={["Ollama", "GGUF", "VRAM", "Hugging Face"]} />
              <TextLink href="/llm-model-checker/">Open checker</TextLink>
            </div>
          </article>
        </div>
      </section>

      <section id="stack" className="section" aria-labelledby="stack-title">
        <SectionHeading eyebrow="Technology stack" title="Technologies I use to build, run, and measure systems" id="stack-title">
          A practical stack shaped by backend engineering, DevOps, cloud-native platforms, performance work, security
          automation, and production observability.
        </SectionHeading>
        <div className="tech-grid">
          {techCards.map((card) => (
            <IconCard icon={card.icon} title={card.title} key={card.title}>
              {card.text}
              <TagList items={card.items} className="compact-tags" />
            </IconCard>
          ))}
        </div>
      </section>

      <section className="section contact-band" aria-labelledby="contact-title">
        <div>
          <p className="eyebrow">Contact</p>
          <h2 id="contact-title">Code, platforms, performance.</h2>
          <p>The most direct way to follow what I am building is GitHub: repositories, experiments, and technical notes live there.</p>
        </div>
        <ButtonLink href="https://github.com/robertomanfreda" icon={Code2} external>
          Go to GitHub
        </ButtonLink>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Roberto Manfreda",
          url: SITE_URL,
          image: `${SITE_URL}/assets/roberto-manfreda.png`,
          sameAs: [
            "https://github.com/robertomanfreda",
            "https://www.linkedin.com/in/roberto-manfreda/",
            "https://stackoverflow.com/users/9935369/roberto-manfreda"
          ],
          jobTitle: "DevOps Engineer",
          worksFor: {
            "@type": "Organization",
            name: "Aruba"
          },
          knowsAbout: [
            "Software Architecture",
            "DevOps",
            "Kubernetes",
            "CI/CD",
            "Cloud-native platforms",
            "Observability",
            "Performance testing",
            "DevSecOps",
            "Artificial Intelligence",
            "Linux"
          ]
        }}
      />
    </main>
  );
}
