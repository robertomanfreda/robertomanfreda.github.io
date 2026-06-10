import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, BookOpenCheck, Copy, Cpu, FolderGit2, Gauge, Link } from "lucide-react";
import { ButtonLink, SectionHeading, TagList } from "../components/ui";
import {
  DEFAULT_INPUTS,
  clamp,
  evaluateModel,
  inputsFromPreset,
  numberFormat,
  readUrlInputs,
  sortResults,
  statusRank,
  usableMemory,
  writeUrlInputs
} from "../lib/checker";
import { JsonLd, SITE_URL } from "../lib/seo";
import type { CheckerInputs, CheckerResult, HardwarePreset, HardwarePresetsPayload, LlmCatalogPayload } from "../types/checker";

const customPreset: HardwarePreset = {
  id: "custom",
  label: "Custom hardware",
  vendor: "Custom",
  kind: "discrete",
  vramGb: 12,
  ramGb: 32,
  bandwidthGbps: 500,
  aliases: []
};

const statusClass = (status: CheckerResult["status"]) => status.toLowerCase().replace(/\s+/g, "-");

const architectureText = (model: CheckerResult) => {
  const params = Number(model.paramsB) || 0;
  const activeParams = Number(model.activeParamsB);

  if (Number.isFinite(activeParams) && activeParams > 0 && activeParams < params * 0.92) {
    return `${numberFormat.format(params)}B total, ${numberFormat.format(activeParams)}B active`;
  }

  return `${numberFormat.format(params)}B parameters`;
};

const sizeBuckets = [
  { value: "all", label: "All sizes" },
  { value: "small", label: "Small <= 4B" },
  { value: "medium", label: "Medium 4-15B" },
  { value: "large", label: "Large 15-70B" },
  { value: "huge", label: "Huge 70B+" }
] as const;

type SizeBucket = (typeof sizeBuckets)[number]["value"];

const architectureFilters = [
  { value: "all", label: "All architectures" },
  { value: "moe", label: "Active-param estimate" },
  { value: "dense", label: "Full-footprint estimate" }
] as const;

type ArchitectureFilter = (typeof architectureFilters)[number]["value"];

const speedFilters = [
  { value: "all", label: "Any speed", min: 0 },
  { value: "usable", label: "20+ tok/s", min: 20 },
  { value: "fast", label: "40+ tok/s", min: 40 },
  { value: "very-fast", label: "80+ tok/s", min: 80 }
] as const;

type SpeedFilter = (typeof speedFilters)[number]["value"];

const viewModes = [
  { value: "recommended", label: "Recommended" },
  { value: "speed", label: "Fastest" },
  { value: "quality", label: "Best quality" },
  { value: "smallest", label: "Smallest Q4" },
  { value: "memory", label: "Lowest memory" }
] as const;

type ViewMode = (typeof viewModes)[number]["value"];
type SortKey = "fit" | "speed" | "memory" | "quality";
type SortDirection = "asc" | "desc";

interface TableSort {
  key: SortKey;
  direction: SortDirection;
}

export function LlmCheckerPage() {
  const [catalog, setCatalog] = useState<LlmCatalogPayload | null>(null);
  const [presets, setPresets] = useState<HardwarePreset[]>([]);
  const [inputs, setInputs] = useState<CheckerInputs>(DEFAULT_INPUTS);
  const [showIncompatible, setShowIncompatible] = useState(false);
  const [status, setStatus] = useState("Loading model catalog.");
  const [helperText, setHelperText] = useState("Pick a preset or edit the hardware values manually.");
  const [query, setQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [capabilityFilter, setCapabilityFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState<SizeBucket>("all");
  const [architectureFilter, setArchitectureFilter] = useState<ArchitectureFilter>("all");
  const [speedFilter, setSpeedFilter] = useState<SpeedFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("recommended");
  const [tableSort, setTableSort] = useState<TableSort | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([fetch("/data/llm-models.json"), fetch("/data/hardware-presets.json")])
      .then(async ([modelsResponse, presetsResponse]) => {
        if (!modelsResponse.ok || !presetsResponse.ok) {
          throw new Error("Could not load checker data.");
        }

        const [modelsPayload, presetsPayload] = (await Promise.all([
          modelsResponse.json(),
          presetsResponse.json()
        ])) as [LlmCatalogPayload, HardwarePresetsPayload];

        if (cancelled) return;
        setCatalog(modelsPayload);
        setPresets(presetsPayload.presets);
        const initial = readUrlInputs(presetsPayload.presets);
        setInputs(initial.inputs);
        setShowIncompatible(initial.showIncompatible);
        setHelperText("Checker data loaded. Choose the closest preset, then adjust the values if needed.");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("Data load failed.");
        setHelperText("Model catalog unavailable. Manual hardware controls still work.");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!presets.length) return;
    writeUrlInputs(inputs, showIncompatible);
  }, [inputs, presets.length, showIncompatible]);

  const presetOptions = presets.length ? presets : [customPreset];
  const evaluated = useMemo(() => {
    if (!catalog) return [];
    return sortResults(catalog.models.map((model) => evaluateModel(model, inputs)));
  }, [catalog, inputs]);

  const families = useMemo(() => uniqueSorted(evaluated.map((model) => model.family)), [evaluated]);
  const capabilities = useMemo(() => uniqueSorted(evaluated.flatMap((model) => model.tags || [])), [evaluated]);
  const filtered = useMemo(
    () =>
      evaluated.filter((model) => {
        const normalizedQuery = query.trim().toLowerCase();
        const queryTerms = normalizedQuery ? normalizedQuery.split(/\s+/) : [];
        const searchable = [
          model.displayName,
          model.family,
          model.ollamaName,
          model.hfId,
          model.tags?.join(" "),
          model.license
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (queryTerms.length && !queryTerms.every((term) => searchable.includes(term))) return false;
        if (familyFilter !== "all" && model.family !== familyFilter) return false;
        if (capabilityFilter !== "all" && !(model.tags || []).includes(capabilityFilter)) return false;
        if (!matchesSizeBucket(model, sizeFilter)) return false;
        if (!matchesArchitecture(model, architectureFilter)) return false;
        if (!matchesSpeed(model, speedFilter)) return false;
        return true;
      }),
    [architectureFilter, capabilityFilter, evaluated, familyFilter, query, sizeFilter, speedFilter]
  );
  const visible = useMemo(() => {
    const rows = showIncompatible ? filtered : filtered.filter((model) => model.status !== "Does not fit");
    return applyTableSort(sortByViewMode(rows, viewMode), tableSort);
  }, [filtered, showIncompatible, tableSort, viewMode]);
  const fitting = filtered.filter((model) => model.status !== "Does not fit");
  const best = fitting[0];

  useEffect(() => {
    if (!catalog) return;
    const hidden = filtered.length - visible.length;
    setStatus(
      `${visible.length} of ${filtered.length} matching models shown${hidden > 0 ? `, ${hidden} incompatible hidden` : ""}. Catalog has ${evaluated.length} models.`
    );
  }, [catalog, evaluated.length, filtered.length, visible.length]);

  const applyPreset = (presetId: string) => {
    const preset = presetOptions.find((item) => item.id === presetId) || customPreset;
    setInputs(inputsFromPreset(preset));
  };

  const setNumberInput = (key: "vramGb" | "ramGb" | "bandwidthGbps", value: string) => {
    const numeric = Number(value);
    setInputs((current) => ({
      ...current,
      [key]: Number.isFinite(numeric) ? numeric : current[key]
    }));
  };

  const copyShareLink = async () => {
    writeUrlInputs(inputs, showIncompatible);
    const url = window.location.href;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setHelperText("Share link copied. It contains only the visible hardware values.");
    } catch {
      setHelperText(`Share link ready: ${url}`);
    }
  };

  const updatedAt = catalog?.updatedAt ? formatDate(catalog.updatedAt) : "-";
  const availableMemoryLabel = `${numberFormat.format(usableMemory(inputs))} GB ${inputs.mode === "unified" ? "usable shared" : "usable VRAM"}`;
  const resetFilters = () => {
    setQuery("");
    setFamilyFilter("all");
    setCapabilityFilter("all");
    setSizeFilter("all");
    setArchitectureFilter("all");
    setSpeedFilter("all");
    setViewMode("recommended");
    setTableSort(null);
    setShowIncompatible(false);
  };

  const updateViewMode = (nextMode: ViewMode) => {
    setViewMode(nextMode);
    setTableSort(null);
  };

  const toggleTableSort = (key: SortKey) => {
    setTableSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: key === "speed" || key === "quality" ? "desc" : "asc" };
      }

      return {
        key,
        direction: current.direction === "asc" ? "desc" : "asc"
      };
    });
  };

  return (
    <main>
      <section className="hero project-hero" aria-labelledby="checker-hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Local AI tool</p>
          <div className="project-title-lockup">
            <img src="/assets/llm-checker.png" alt="" aria-hidden="true" />
            <h1 id="checker-hero-title" className="single-line-title">
              LLM Model Checker
            </h1>
          </div>
          <p className="hero-text">
            Estimate which local models fit your hardware before downloading giant weights. Built for Q4 GGUF/Ollama-style
            inference, discrete GPUs, and unified memory systems.
          </p>
          <div className="button-row" role="group" aria-label="Checker actions">
            <ButtonLink href="#checker" icon={Gauge}>
              Check hardware
            </ButtonLink>
            <ButtonLink href="#methodology" variant="secondary" icon={BookOpenCheck}>
              Methodology
            </ButtonLink>
          </div>
        </div>
      </section>

      <section id="checker" className="section checker-section" aria-labelledby="checker-title">
        <SectionHeading eyebrow="What LLM can I run?" title="Hardware fit, model quality, estimated speed" id="checker-title">
          Select a preset or edit the numbers manually. Results are calculated in your browser from static data files.
        </SectionHeading>

        <div className="checker-workspace">
          <section className="checker-toolbar" aria-label="Hardware and search controls">
            <div className="toolbar-header">
              <div className="control-heading">
                <Cpu aria-hidden="true" />
                <div>
                  <h3>Hardware and search</h3>
                  <p>{helperText}</p>
                </div>
              </div>

              <dl className="checker-kpis" aria-label="Checker summary">
                <div>
                  <dt>Fits</dt>
                  <dd>{catalog ? `${fitting.length} / ${evaluated.length}` : "-"}</dd>
                </div>
                <div>
                  <dt>Best</dt>
                  <dd>{best ? best.displayName : catalog ? "No fit" : "Loading"}</dd>
                </div>
                <div>
                  <dt>Memory</dt>
                  <dd>{availableMemoryLabel}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{updatedAt}</dd>
                </div>
              </dl>
            </div>

            <div className="hardware-toolbar" aria-label="Hardware controls">
              <div className="toolbar-row hardware-top-row">
                <label className="control-field preset-field" htmlFor="hardware-preset">
                  <span>Preset</span>
                  <select id="hardware-preset" name="hardware-preset" value={inputs.presetId} onChange={(event) => applyPreset(event.target.value)}>
                    {presetOptions.map((preset) => (
                      <option value={preset.id} key={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>

                <fieldset className="control-field mode-field">
                  <legend>Memory mode</legend>
                  <div className="segmented-control">
                    <label>
                      <input
                        type="radio"
                        name="memory-mode"
                        value="discrete"
                        checked={inputs.mode === "discrete"}
                        onChange={() => setInputs((current) => ({ ...current, mode: "discrete" }))}
                      />
                      <span>Discrete GPU</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="memory-mode"
                        value="unified"
                        checked={inputs.mode === "unified"}
                        onChange={() => setInputs((current) => ({ ...current, mode: "unified" }))}
                      />
                      <span>Unified memory</span>
                    </label>
                  </div>
                </fieldset>
              </div>

              <div className="toolbar-row hardware-bottom-row">
                <label className="control-field compact-field" htmlFor="vram-gb">
                  <span>VRAM / pool</span>
                  <input
                    id="vram-gb"
                    type="number"
                    min="0"
                    max="748"
                    step="1"
                    value={inputs.vramGb}
                    onChange={(event) => setNumberInput("vramGb", event.target.value)}
                  />
                </label>
                <label className="control-field compact-field" htmlFor="ram-gb">
                  <span>RAM</span>
                  <input
                    id="ram-gb"
                    type="number"
                    min="4"
                    max="1024"
                    step="1"
                    value={inputs.ramGb}
                    onChange={(event) => setNumberInput("ramGb", event.target.value)}
                  />
                </label>
                <label className="control-field compact-field" htmlFor="bandwidth-gbps">
                  <span>GB/s</span>
                  <input
                    id="bandwidth-gbps"
                    type="number"
                    min="20"
                    max="4000"
                    step="1"
                    value={inputs.bandwidthGbps}
                    onChange={(event) => setNumberInput("bandwidthGbps", event.target.value)}
                  />
                </label>

                <button className="button primary share-button" type="button" onClick={copyShareLink}>
                  <Link aria-hidden="true" />
                  <span>Share link</span>
                </button>
              </div>
            </div>

            <div className="search-toolbar" aria-label="Model catalog filters">
              <div className="toolbar-row search-top-row">
                <label className="control-field search-field" htmlFor="model-search">
                  <span>Search</span>
                  <input
                    id="model-search"
                    type="search"
                    placeholder="qwen3.5 122b, gpt-oss, code, moe..."
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <label className="control-field" htmlFor="family-filter">
                  <span>Family</span>
                  <select id="family-filter" value={familyFilter} onChange={(event) => setFamilyFilter(event.target.value)}>
                    <option value="all">All families</option>
                    {families.map((family) => (
                      <option value={family} key={family}>
                        {family}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control-field" htmlFor="capability-filter">
                  <span>Capability</span>
                  <select id="capability-filter" value={capabilityFilter} onChange={(event) => setCapabilityFilter(event.target.value)}>
                    <option value="all">All capabilities</option>
                    {capabilities.map((capability) => (
                      <option value={capability} key={capability}>
                        {capability}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control-field" htmlFor="view-mode">
                  <span>View mode</span>
                  <select id="view-mode" value={viewMode} onChange={(event) => updateViewMode(event.target.value as ViewMode)}>
                    {viewModes.map((mode) => (
                      <option value={mode.value} key={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="toolbar-row search-bottom-row">
                <label className="control-field" htmlFor="architecture-filter">
                  <span>Architecture</span>
                  <select
                    id="architecture-filter"
                    value={architectureFilter}
                    onChange={(event) => setArchitectureFilter(event.target.value as ArchitectureFilter)}
                  >
                    {architectureFilters.map((architecture) => (
                      <option value={architecture.value} key={architecture.value}>
                        {architecture.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control-field" htmlFor="speed-filter">
                  <span>Speed</span>
                  <select id="speed-filter" value={speedFilter} onChange={(event) => setSpeedFilter(event.target.value as SpeedFilter)}>
                    {speedFilters.map((speed) => (
                      <option value={speed.value} key={speed.value}>
                        {speed.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control-field" htmlFor="size-filter">
                  <span>Size</span>
                  <select id="size-filter" value={sizeFilter} onChange={(event) => setSizeFilter(event.target.value as SizeBucket)}>
                    {sizeBuckets.map((bucket) => (
                      <option value={bucket.value} key={bucket.value}>
                        {bucket.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="check-row catalog-check">
                  <input type="checkbox" checked={showIncompatible} onChange={(event) => setShowIncompatible(event.target.checked)} />
                  <span>Include no-fit</span>
                </label>
                <button className="filter-reset" type="button" onClick={resetFilters}>
                  Reset
                </button>
              </div>
            </div>
          </section>

          <section className="checker-results-panel table-panel" aria-labelledby="results-title">
            <div className="results-heading">
              <div>
                <p className="eyebrow">Model catalog</p>
                <h2 id="results-title">Filtered results</h2>
              </div>
              <p role="status">{status}</p>
            </div>

            <div aria-live="polite">
              {!catalog && <div className="empty-state">Loading checker data.</div>}
              {catalog && visible.length === 0 && (
                <div className="empty-state">No models match these filters. Broaden the search, include incompatible models, or increase memory.</div>
              )}
              {catalog && visible.length > 0 && <ModelTable models={visible} tableSort={tableSort} onSort={toggleTableSort} />}
            </div>
          </section>
        </div>
      </section>

      <section id="methodology" className="section section-muted" aria-labelledby="methodology-title">
        <SectionHeading eyebrow="Methodology" title="Conservative estimates, practical defaults" id="methodology-title">
          The checker ranks local models by memory fit, public benchmark quality where available, and an active-footprint speed
          estimate.
        </SectionHeading>
        <div className="three-grid">
          <article className="card compact-card">
            <h3>Q4 footprint</h3>
            <p>
              Model weights use Ollama tag size when available, otherwise an approximate 4-bit GGUF/INT4 size. The fit calculation
              adds runtime and context margin, so results are intentionally more conservative than file size alone.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Decode speed</h3>
            <p>
              Dense models use their full Q4 footprint. Sparse MoE models use active parameters when the catalog knows them, then
              apply hardware utilization and memory-pressure factors.
            </p>
          </article>
          <article className="card compact-card">
            <h3>Private by design</h3>
            <p>
              There is no backend request for your hardware. The share link contains only the hardware numbers visible in the form.
            </p>
          </article>
        </div>
      </section>

      <section className="section contact-band" aria-labelledby="checker-contact-title">
        <div>
          <p className="eyebrow">Local inference</p>
          <h2 id="checker-contact-title">Found a model that fits?</h2>
          <p>Use the Ollama command from the result row, then point Respawn or any OpenAI-compatible client at your local runtime.</p>
        </div>
        <ButtonLink href="/respawn/" icon={FolderGit2}>
          Open Respawn
        </ButtonLink>
      </section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "LLM Model Checker",
          url: `${SITE_URL}/llm-model-checker/`,
          applicationCategory: "DeveloperApplication",
          operatingSystem: "Any",
          author: {
            "@type": "Person",
            name: "Roberto Manfreda"
          }
        }}
      />
    </main>
  );
}

function ModelTable({
  models,
  tableSort,
  onSort
}: {
  models: CheckerResult[];
  tableSort: TableSort | null;
  onSort: (key: SortKey) => void;
}) {
  return (
    <div className="model-table-wrap">
      <table className="model-table">
        <thead>
          <tr>
            <th scope="col">Model</th>
            <SortableHeader label="Fit" sortKey="fit" activeSort={tableSort} onSort={onSort} />
            <SortableHeader label="Speed" sortKey="speed" activeSort={tableSort} onSort={onSort} />
            <SortableHeader label="Memory" sortKey="memory" activeSort={tableSort} onSort={onSort} />
            <SortableHeader label="Quality" sortKey="quality" activeSort={tableSort} onSort={onSort} />
            <th scope="col">Tags</th>
            <th scope="col">Run</th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <ModelRow key={model.id} model={model} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  sortKey,
  activeSort,
  onSort
}: {
  label: string;
  sortKey: SortKey;
  activeSort: TableSort | null;
  onSort: (key: SortKey) => void;
}) {
  const isActive = activeSort?.key === sortKey;
  const Icon = !isActive ? ArrowUpDown : activeSort.direction === "asc" ? ArrowUp : ArrowDown;
  const nextDirection = isActive && activeSort.direction === "asc" ? "descending" : "ascending";

  return (
    <th scope="col" aria-sort={isActive ? (activeSort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button className="table-sort-button" type="button" onClick={() => onSort(sortKey)} aria-label={`Sort by ${label} ${nextDirection}`}>
        <span>{label}</span>
        <Icon aria-hidden="true" />
      </button>
    </th>
  );
}

function ModelRow({ model }: { model: CheckerResult }) {
  const meterWidth = clamp(model.memoryUsagePct, 0, 100);

  return (
    <tr className={model.status === "Does not fit" ? "is-muted" : ""}>
      <td className="model-name-cell">
        <strong>{model.displayName}</strong>
        <span>{architectureText(model)}</span>
        <em>{model.family}</em>
      </td>
      <td>
        <span className={`status-pill status-${statusClass(model.status)}`}>{model.status}</span>
      </td>
      <td className="numeric-cell">
        <strong>~{model.speedTok}</strong>
        <span>tok/s</span>
      </td>
      <td className="memory-cell">
        <strong>{numberFormat.format(model.requiredGb)} GB</strong>
        <span>{numberFormat.format(model.q4WeightGb)} GB Q4</span>
        <div className="memory-meter table-meter" aria-label="Estimated memory usage">
          <span style={{ width: `${meterWidth}%` }} />
        </div>
      </td>
      <td>
        <QualityCell model={model} />
      </td>
      <td>
        <TagList items={(model.tags || []).slice(0, 3)} className="compact-tags table-tags" />
      </td>
      <td className="command-cell">
        <code title={model.ollamaCommand}>{model.ollamaCommand}</code>
        <div className="row-actions">
          <button
            type="button"
            aria-label={`Copy ${model.ollamaCommand}`}
            onClick={() => {
              void navigator.clipboard?.writeText(model.ollamaCommand);
            }}
          >
            <Copy aria-hidden="true" />
            <span>Copy</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

function QualityCell({ model }: { model: CheckerResult }) {
  const score = Number(model.qualityScore);
  if (!Number.isFinite(score)) return <span className="quality-empty">-</span>;

  const label = numberFormat.format(score);
  if (!model.benchmarkUrl) return <span className="quality-score">{label}</span>;

  return (
    <a className="quality-score quality-link" href={model.benchmarkUrl} target="_blank" rel="noreferrer" title="Open benchmark row">
      {label}
    </a>
  );
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function matchesSizeBucket(model: CheckerResult, bucket: SizeBucket) {
  if (bucket === "all") return true;
  const params = Number(model.paramsB) || 0;
  if (bucket === "small") return params <= 4;
  if (bucket === "medium") return params > 4 && params <= 15;
  if (bucket === "large") return params > 15 && params <= 70;
  return params > 70;
}

function matchesArchitecture(model: CheckerResult, filter: ArchitectureFilter) {
  if (filter === "all") return true;
  const params = Number(model.paramsB) || 0;
  const activeParams = Number(model.activeParamsB);
  const isMoe = Number.isFinite(activeParams) && activeParams > 0 && activeParams < params * 0.92;
  return filter === "moe" ? isMoe : !isMoe;
}

function matchesSpeed(model: CheckerResult, filter: SpeedFilter) {
  const speed = speedFilters.find((item) => item.value === filter);
  return !speed || model.speedTok >= speed.min;
}

function sortByViewMode(models: CheckerResult[], mode: ViewMode) {
  const rows = [...models];
  if (mode === "recommended") return rows;
  if (mode === "speed") return rows.sort((a, b) => b.speedTok - a.speedTok);
  if (mode === "quality") return rows.sort((a, b) => (b.qualityScore ?? -1) - (a.qualityScore ?? -1) || b.speedTok - a.speedTok);
  if (mode === "smallest") return rows.sort((a, b) => a.q4WeightGb - b.q4WeightGb);
  return rows.sort((a, b) => a.requiredGb - b.requiredGb);
}

function applyTableSort(models: CheckerResult[], tableSort: TableSort | null) {
  if (!tableSort) return models;

  const direction = tableSort.direction === "asc" ? 1 : -1;
  return [...models].sort((a, b) => {
    if (tableSort.key === "fit") {
      const fitDelta = statusRank[a.status] - statusRank[b.status];
      if (fitDelta !== 0) return fitDelta * direction;
      return b.speedTok - a.speedTok;
    }

    if (tableSort.key === "speed") {
      const speedDelta = a.speedTok - b.speedTok;
      if (speedDelta !== 0) return speedDelta * direction;
      return statusRank[a.status] - statusRank[b.status];
    }

    if (tableSort.key === "quality") {
      const aScore = Number(a.qualityScore);
      const bScore = Number(b.qualityScore);
      const aScored = Number.isFinite(aScore);
      const bScored = Number.isFinite(bScore);
      if (aScored !== bScored) return aScored ? -1 : 1;
      if (!aScored || !bScored) return b.speedTok - a.speedTok;

      const qualityDelta = aScore - bScore;
      if (qualityDelta !== 0) return qualityDelta * direction;
      return b.speedTok - a.speedTok;
    }

    const memoryDelta = a.requiredGb - b.requiredGb;
    if (memoryDelta !== 0) return memoryDelta * direction;
    return b.speedTok - a.speedTok;
  });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}
