import {
  Activity,
  ArrowDown,
  ArrowRight,
  Boxes,
  BrainCircuit,
  Code2,
  Database,
  Network,
  ServerCog,
  ShieldCheck,
  Workflow
} from "lucide-react";
import { ButtonLink, IconCard, SectionHeading, TagList } from "../components/ui";
import { useScrollExperience } from "../components/useScrollExperience";
import { OrbitScene } from "../components/OrbitScene";
import "../home.css";
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
  const { root, scene } = useScrollExperience();
  return (
    <main id="top" className="signal-home" ref={root}>
      <div className="signal-page-progress" aria-hidden="true" />
      <div className="signal-intro">
      <section className="signal-hero" aria-labelledby="hero-title">
        <div className="signal-identity">
        <p className="signal-overline">Engineering / Systems / Intelligence</p>
        <h1 id="hero-title">Roberto Manfreda</h1>
        <p className="signal-role"><span className="signal-role-item">DevOps Engineer</span> / <span className="signal-role-item">Software Architect</span> / <span className="signal-role-item">AI Builder</span></p>
        </div>
        <div className="signal-index" aria-hidden="true">
          <span data-chapter="0">01 / Architecture</span>
          <span data-chapter="1">02 / Platforms</span>
          <span data-chapter="2">03 / Exploration</span>
        </div>
        <p className="signal-manifesto" aria-hidden="true">Build<br />Deploy<br />Scale<br />Learn<br />Repeat</p>
        <OrbitScene scrollScene={scene} />
        <div className="signal-invitation">
        <p className="signal-tagline">From code to cloud. Built to perform.</p>
        <a className="signal-cta" href="#projects">Explore my work <ArrowRight size={19} strokeWidth={1} aria-hidden="true" /></a>
        <a className="signal-down" href="#projects" aria-label="Scroll to selected projects"><ArrowDown size={25} strokeWidth={1} /></a>
        </div>
        <div className="signal-chapters" aria-hidden="true">
          <div className="signal-chapter"><span>01 / Architecture</span><h2>Code that<br />lasts.</h2><p>Clear decisions. Solid foundations.<br />Built for what comes next.</p></div>
          <div className="signal-chapter"><span>02 / Platforms</span><h2>Systems<br />that scale.</h2><p>From the first deployment<br />to the demands of production.</p></div>
          <div className="signal-chapter"><span>03 / Exploration</span><h2>AI you<br />can run.</h2><p>Local models. Practical tools.<br />Ideas made real.</p></div>
        </div>
        <a className="signal-scroll" href="#projects" aria-label="Scroll to selected projects"><span />Scroll</a>
      </section>
      </div>

      <section id="projects" className="signal-projects" aria-labelledby="projects-title">
        <h2 id="projects-title">Selected projects</h2>
        <a className="signal-project" href="/respawn/">
          <span className="project-number">01</span>
          <span className="project-name">Respawn</span>
          <span className="project-description">Your local AI gateway.</span>
          <span className="project-category">AI / DevOps / Tools</span>
          <ArrowRight size={28} strokeWidth={1} aria-hidden="true" />
        </a>
        <a className="signal-project" href="/llm-model-checker/">
          <span className="project-number">02</span>
          <span className="project-name">LLM Checker</span>
          <span className="project-description">Local AI, measured.</span>
          <span className="project-category">AI / Evaluation / Open source</span>
          <ArrowRight size={28} strokeWidth={1} aria-hidden="true" />
        </a>
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
          image: `${SITE_URL}/assets/robertomanfreda.png`,
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
