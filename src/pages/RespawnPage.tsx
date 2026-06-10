import {
  Activity,
  Code2,
  Database,
  FileText,
  Gauge,
  History,
  Image,
  MessageSquareCode,
  Radio,
  Route,
  Search,
  Server,
  ShieldCheck,
  Terminal,
  Wrench
} from "lucide-react";
import { ButtonLink, CodeBlock, IconCard, SectionHeading, TagList } from "../components/ui";
import { JsonLd, SITE_URL } from "../lib/seo";

const highlights = [
  {
    icon: Route,
    title: "Responses gateway",
    text: "OpenAI-shaped /v1/responses with blocking, streaming, background, retrieve, delete, cancel, and input-item flows."
  },
  {
    icon: History,
    title: "Stateful chains",
    text: "previous_response_id chains are stored locally, tenant-checked, reconstructed server-side, and replayed to the backend."
  },
  {
    icon: Radio,
    title: "Normalized streaming",
    text: "Server-Sent Events are rendered as Responses lifecycle events with stable IDs, sequence numbers, deltas, and failure events."
  },
  {
    icon: Wrench,
    title: "Tools protocol",
    text: "Function-call items are validated, stored, streamed, and replayed. Respawn never executes client functions for you."
  },
  {
    icon: Search,
    title: "Local web search",
    text: "Optional Responses web_search can run through mock or SearXNG providers and emit citations without hosted tool execution."
  },
  {
    icon: Image,
    title: "Image generation",
    text: "Optional image_generation routes to local ComfyUI, with Automatic1111 kept as a legacy backend option."
  },
  {
    icon: FileText,
    title: "Files and inputs",
    text: "Local Files API subset, file_id resolution, image input normalization, extracted text, artifacts, and capability checks."
  },
  {
    icon: Activity,
    title: "Operations",
    text: "JSON logs, request IDs, Prometheus metrics, readiness checks, VictoriaMetrics, and a provisioned Grafana dashboard."
  },
  {
    icon: ShieldCheck,
    title: "Compatibility gates",
    text: "Real-backend benchmark suites validate SDK paths, metrics, operations drills, and Responses compatibility coverage."
  }
];

const capabilityStats = [
  ["tracked", "128"],
  ["supported or conditional", "121"],
  ["explicitly unsupported", "7"]
] as const;

const services = [
  ["Respawn", "http://localhost:8080"],
  ["Grafana", "http://localhost:3000"],
  ["VictoriaMetrics", "http://localhost:8428"],
  ["Ollama OpenAI API", "http://localhost:11434/v1"]
] as const;

const endpointGroups = [
  {
    title: "Responses",
    endpoints: [
      "POST /v1/responses",
      "GET /v1/responses/{response_id}",
      "DELETE /v1/responses/{response_id}",
      "POST /v1/responses/{response_id}/cancel",
      "GET /v1/responses/{response_id}/input_items"
    ]
  },
  {
    title: "Context and prompts",
    endpoints: [
      "POST /v1/responses/input_tokens",
      "POST /v1/responses/compact",
      "POST /v1/responses/prompts",
      "GET /v1/responses/prompts",
      "DELETE /v1/responses/prompt_cache"
    ]
  },
  {
    title: "Files and artifacts",
    endpoints: [
      "POST /v1/files",
      "GET /v1/files",
      "GET /v1/files/{file_id}/content",
      "GET /v1/responses/{response_id}/artifacts",
      "GET /v1/responses/{response_id}/artifacts/{artifact_id}/content"
    ]
  },
  {
    title: "Compatibility and ops",
    endpoints: [
      "POST /v1/chat/completions",
      "GET /v1/models",
      "GET /compatibility/responses",
      "GET /readyz",
      "GET /metrics"
    ]
  }
];

export function RespawnPage() {
  return (
    <main>
      <section className="hero project-hero" aria-labelledby="respawn-title">
        <div className="hero-copy">
          <p className="eyebrow">Spotlight project</p>
          <div className="project-title-lockup">
            <img src="/assets/respawn.png" alt="" aria-hidden="true" />
            <h1 id="respawn-title">Respawn</h1>
          </div>
          <p className="hero-text">
            A local OpenAI-shaped API gateway for self-hosted LLM backends. Respawn gives OpenAI SDKs a familiar /v1
            surface while keeping model execution, state, tools, files, and observability inside your own stack.
          </p>
          <div className="button-row" role="group" aria-label="Respawn actions">
            <ButtonLink href="https://github.com/robertomanfreda/respawn" icon={Code2} external>
              Open on GitHub
            </ButtonLink>
            <ButtonLink href="#quick-start" variant="secondary" icon={Terminal}>
              Quick start
            </ButtonLink>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="what-title">
        <SectionHeading eyebrow="What it is" title="The compatibility and operations layer for local LLMs" id="what-title">
          Ollama, vLLM, and similar servers load models and generate tokens. Respawn sits in front of a backend and adds
          OpenAI-style Responses behavior, persistent state, SDK ergonomics, local tools, and production signals.
        </SectionHeading>
        <div className="three-grid">
          <article className="card compact-card">
            <h3>Gateway, not runtime</h3>
            <p>
              Respawn does not load models, schedule GPU work, batch tokens, quantize weights, or manage KV cache. Those jobs
              stay in the model backend underneath it.
            </p>
          </article>
          <article className="card compact-card">
            <h3>OpenAI-shaped platform</h3>
            <p>
              It exposes Responses objects, request IDs, idempotency keys, tenant scoping, OpenAI-shaped errors, Chat
              Completions compatibility, and SDK contract paths.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Local-first control</h3>
            <p>
              State can live in Postgres or SQLite, tools are opt-in and local, files stay tenant-scoped, and observability is
              available through Prometheus-style metrics and Grafana.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="highlights-title">
        <SectionHeading eyebrow="Current scope" title="Responses state, tools, files, prompts, metrics, and gates" id="highlights-title" />
        <div className="tech-grid">
          {highlights.map((item) => (
            <IconCard key={item.title} icon={item.icon} title={item.title}>
              {item.text}
            </IconCard>
          ))}
        </div>
      </section>

      <section id="quick-start" className="section" aria-labelledby="quick-title">
        <SectionHeading eyebrow="Quick start" title="Run the full local stack, then use the OpenAI SDK" id="quick-title">
          The default Docker setup starts the gateway, Ollama, Postgres, VictoriaMetrics, and Grafana. It preloads
          gpt-oss:120b for text/reasoning/tools/file-text scenarios and moondream:latest for vision smoke tests.
        </SectionHeading>
        <div className="code-layout">
          <CodeBlock title="Docker stack">{`cd infra/docker
make env
make up-build
make ready

make ps
make models
make grafana`}</CodeBlock>
          <CodeBlock title="OpenAI Python SDK">{`from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8080/v1",
    api_key="local-dev-key",
)

response = client.responses.create(
    model="gpt-oss:120b",
    input="Explain Kubernetes in one sentence.",
)

print(response.output_text)`}</CodeBlock>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="stack-title">
        <SectionHeading eyebrow="Docker stack" title="Gateway, backend, persistence, metrics, dashboard" id="stack-title" />
        <div className="code-layout">
          <div className="two-stack">
            {services.map(([name, url]) => (
              <article className="card compact-card" key={name}>
                <h3>{name}</h3>
                <p>
                  <code>{url}</code>
                </p>
              </article>
            ))}
          </div>
          <CodeBlock title="Useful commands">{`cd infra/docker
make logs-respawn
make metrics
make ready
make benchmark-real
make down`}</CodeBlock>
        </div>
      </section>

      <section className="section" aria-labelledby="features-title">
        <SectionHeading eyebrow="Behavior" title="What Respawn adds above a direct backend API" id="features-title" />
        <div className="three-grid">
          <article className="card compact-card">
            <h3>Stateful Responses</h3>
            <p>
              A request with previous_response_id loads the stored chain, validates tenant access and deletion state, rebuilds
              history, appends new input, and forwards the complete context to the backend.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Background and streaming</h3>
            <p>
              background=true creates a pollable stored response. Streaming uses OpenAI-shaped lifecycle events, text deltas,
              incomplete events, failure events, and function-call argument deltas.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Function tool protocol</h3>
            <p>
              Clients define functions, the model emits function_call output items, clients execute the functions themselves,
              and follow-up requests submit function_call_output items.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Multimodal and files</h3>
            <p>
              Respawn handles input_image and local input_file parts, file_id lookup, text extraction where supported, artifact
              records, and model capability checks. Audio input remains out of scope.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Prompts and context</h3>
            <p>
              Prompt templates use simple variables, context planning can estimate tokens and compact input, and prompt-cache
              accounting reports local prefix hits without pretending to reuse backend KV tensors.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Reasoning metadata</h3>
            <p>
              Responses reasoning settings are accepted and mapped to backend capabilities when available. Ollama thinking
              output can be tracked as local reasoning items without exposing raw chain-of-thought.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="compatibility-title">
        <SectionHeading eyebrow="Compatibility" title="Machine-readable coverage, human-readable boundaries" id="compatibility-title">
          The project tracks supported, conditional, and unsupported Responses behavior in docs and through
          GET /compatibility/responses.
        </SectionHeading>
        <div className="three-grid">
          {capabilityStats.map(([label, value]) => (
            <article className="card compact-card" key={label}>
              <p className="card-kicker">{label}</p>
              <h3>{value}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="api-title">
        <SectionHeading eyebrow="API surface" title="The practical endpoints exposed by Respawn" id="api-title" />
        <div className="three-grid">
          {endpointGroups.map((group) => (
            <article className="card compact-card" key={group.title}>
              <h3>{group.title}</h3>
              <div className="endpoint-list">
                {group.endpoints.map((endpoint) => (
                  <code key={endpoint}>{endpoint}</code>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-muted" aria-labelledby="ops-title">
        <SectionHeading eyebrow="Operations" title="Release checks and production signals for local inference" id="ops-title" />
        <div className="code-layout">
          <CodeBlock title="Benchmark gates">{`cd infra/docker
make benchmark-real
make benchmark
make benchmark-mock

RESPAWN_BENCHMARK_INCLUDE_TAGS=streaming make benchmark
RESPAWN_BENCHMARK_EXCLUDE_TAGS=reasoning make benchmark`}</CodeBlock>
          <div className="two-stack">
            <article className="card compact-card">
              <h3>Metrics</h3>
              <p>
                HTTP, endpoint, feature-family, latency, backend, model, streaming, background job, prompt-cache, file-storage,
                readiness, and operational-failure metrics.
              </p>
            </article>
            <article className="card compact-card">
              <h3>Dashboard</h3>
              <p>
                The Compose stack provisions VictoriaMetrics and a Grafana dashboard named Respawn Model Gateway with backend
                and model variables.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="limits-title">
        <SectionHeading eyebrow="Boundaries" title="Intentionally local, intentionally narrow" id="limits-title" />
        <ul className="limitation-list">
          <li>Respawn is an API gateway, not an inference runtime.</li>
          <li>It currently targets one gateway instance connected to one configured backend.</li>
          <li>Function tools are protocol data; client functions are not executed by the gateway.</li>
          <li>Hosted tools, shell, filesystem, browser, code interpreter, MCP hosting, audio, realtime, and Conversations API are out of scope.</li>
          <li>Model quality, tool-call quality, and throughput still depend on the local model backend.</li>
        </ul>
      </section>

      <section className="section contact-band" aria-labelledby="respawn-contact-title">
        <div>
          <p className="eyebrow">Repository</p>
          <h2 id="respawn-contact-title">Read the code, run the gateway.</h2>
          <p>
            The repository includes the FastAPI gateway, Docker stack, compatibility manifest, operations docs, observability
            setup, tests, migrations, and real-backend benchmark suite.
          </p>
        </div>
        <div className="button-row" role="group" aria-label="Respawn follow-up actions">
          <ButtonLink href="https://github.com/robertomanfreda/respawn" icon={Code2} external>
            Open repository
          </ButtonLink>
          <ButtonLink href="/llm-model-checker/" variant="secondary" icon={Gauge}>
            Check models
          </ButtonLink>
        </div>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareSourceCode",
          name: "Respawn",
          description: "A local OpenAI-shaped API gateway for self-hosted LLM backends.",
          codeRepository: "https://github.com/robertomanfreda/respawn",
          programmingLanguage: ["Python", "Docker"],
          runtimePlatform: ["FastAPI", "Ollama", "Postgres", "SQLite", "ComfyUI"],
          author: {
            "@type": "Person",
            name: "Roberto Manfreda",
            url: SITE_URL
          }
        }}
      />
    </main>
  );
}
