import type { CheckerInputs, CheckerResult, FitStatus, HardwarePreset, LlmModel } from "../types/checker";

export const DEFAULT_INPUTS: CheckerInputs = {
  presetId: "rtx-4070-12gb",
  mode: "discrete",
  vramGb: 12,
  ramGb: 32,
  bandwidthGbps: 504
};

export const statusRank: Record<FitStatus, number> = {
  Excellent: 0,
  Good: 1,
  Tight: 2,
  "Does not fit": 3
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const numberFormat = new Intl.NumberFormat("en", {
  maximumFractionDigits: 1
});

export const usableMemory = (hardware: CheckerInputs) => {
  if (hardware.mode === "unified") {
    const reserve = Math.max(4, hardware.ramGb * 0.18);
    return Math.max(0, hardware.ramGb - reserve);
  }

  const reserve = Math.max(0.6, Math.min(2, hardware.vramGb * 0.06));
  return Math.max(0, hardware.vramGb - reserve);
};

export const runtimeMargin = (model: LlmModel, mode: CheckerInputs["mode"]) => {
  const params = Math.max(Number(model.paramsB) || 0, (Number(model.q4WeightGb) || 0) / 0.56);
  const context = Number(model.contextWindow) || 8192;
  let margin = 1.2;

  if (params <= 2) margin = 0.7;
  else if (params <= 4) margin = 1.1;
  else if (params <= 9) margin = 1.7;
  else if (params <= 15) margin = 2.2;
  else if (params <= 35) margin = 3.2;
  else if (params <= 75) margin = 5.3;
  else margin = 8.5;

  if (context >= 131072) margin += 1.2;
  else if (context >= 65536) margin += 0.8;
  else if (context >= 32768) margin += 0.4;
  else margin += 0.2;

  if (mode === "unified") margin += 0.8;
  else margin += 0.2;

  return margin;
};

export const activeDecodeFootprint = (model: LlmModel) => {
  const q4Weight = Math.max(Number(model.q4WeightGb) || 1, 0.5);
  const params = Math.max(Number(model.paramsB) || 0, q4Weight / 0.56);
  const activeParams = Number(model.activeParamsB);

  if (!Number.isFinite(activeParams) || activeParams <= 0 || activeParams >= params * 0.92) {
    return q4Weight;
  }

  const activeWeight = q4Weight * clamp(activeParams / Math.max(params, 0.1), 0.015, 1);
  const sharedOverhead = clamp(0.8 + Math.sqrt(q4Weight) * 0.09, 0.9, 2.2);
  return clamp(activeWeight + sharedOverhead, 1, q4Weight);
};

export const hardwareUtilization = (hardware: CheckerInputs) => {
  let factor = hardware.mode === "unified" ? 0.58 : 0.52;

  if (hardware.mode === "unified" && hardware.ramGb >= 96 && hardware.bandwidthGbps >= 220) factor += 0.12;
  if (hardware.mode === "unified" && hardware.bandwidthGbps < 180) factor -= 0.1;
  if (hardware.mode === "discrete" && hardware.bandwidthGbps >= 850) factor += 0.06;
  if (hardware.mode === "discrete" && hardware.bandwidthGbps < 350) factor -= 0.08;
  if (hardware.bandwidthGbps < 140) factor *= 0.55;

  return clamp(factor, 0.25, 0.74);
};

const memoryPressureFactor = (model: LlmModel, hardware: CheckerInputs) => {
  const requiredGb = (Number(model.q4WeightGb) || 0) + runtimeMargin(model, hardware.mode);
  const pressure = requiredGb / Math.max(usableMemory(hardware), 0.1);

  if (pressure > 0.95) return 0.72;
  if (pressure > 0.85) return 0.84;
  if (pressure > 0.75) return 0.92;
  return 1;
};

export const estimateSpeed = (model: LlmModel, hardware: CheckerInputs) => {
  const footprint = activeDecodeFootprint(model);
  const speed = (hardware.bandwidthGbps / footprint) * hardwareUtilization(hardware) * memoryPressureFactor(model, hardware);
  return Math.max(1, Math.round(speed));
};

export const evaluateModel = (model: LlmModel, hardware: CheckerInputs): CheckerResult => {
  const memory = usableMemory(hardware);
  const requiredGb = (Number(model.q4WeightGb) || 0) + runtimeMargin(model, hardware.mode);
  const headroomGb = memory - requiredGb;
  const speedTok = estimateSpeed(model, hardware);
  let status: FitStatus = "Does not fit";

  if (headroomGb >= Math.max(4, requiredGb * 0.32) && speedTok >= 24) {
    status = "Excellent";
  } else if (headroomGb >= Math.max(1.4, requiredGb * 0.12)) {
    status = "Good";
  } else if (headroomGb >= 0) {
    status = "Tight";
  }

  return {
    ...model,
    requiredGb,
    headroomGb,
    speedTok,
    status,
    memoryUsagePct: requiredGb > 0 ? clamp((requiredGb / Math.max(memory, 0.1)) * 100, 0, 999) : 0
  };
};

export const sortResults = (models: CheckerResult[]) =>
  [...models].sort((a, b) => {
    const fitDelta = statusRank[a.status] - statusRank[b.status];
    if (fitDelta !== 0) return fitDelta;

    const aScored = a.qualityScore !== null && a.qualityScore !== undefined;
    const bScored = b.qualityScore !== null && b.qualityScore !== undefined;
    if (aScored !== bScored) return aScored ? -1 : 1;

    const qualityDelta = (b.qualityScore || 0) - (a.qualityScore || 0);
    if (qualityDelta !== 0) return qualityDelta;

    return b.speedTok - a.speedTok;
  });

export const inputsFromPreset = (preset: HardwarePreset): CheckerInputs => ({
  presetId: preset.id,
  mode: preset.kind === "unified" ? "unified" : "discrete",
  vramGb: Number(preset.vramGb) || 0,
  ramGb: Number(preset.ramGb) || 32,
  bandwidthGbps: Number(preset.bandwidthGbps) || 300
});

export const readUrlInputs = (presets: HardwarePreset[]): { inputs: CheckerInputs; showIncompatible: boolean } => {
  const params = new URLSearchParams(window.location.search);
  const presetId = params.get("preset");
  const presetExists = presetId ? presets.some((preset) => preset.id === presetId) : false;
  const fallbackPreset =
    presets.find((preset) => preset.id === presetId) || presets.find((preset) => preset.id === DEFAULT_INPUTS.presetId);
  const base = fallbackPreset ? inputsFromPreset(fallbackPreset) : DEFAULT_INPUTS;
  const mode = params.get("mode");

  return {
    inputs: {
      ...base,
      presetId: presetExists && presetId ? presetId : base.presetId,
      mode: mode === "unified" || mode === "discrete" ? mode : base.mode,
      vramGb: numberParam(params, "vram", base.vramGb),
      ramGb: numberParam(params, "ram", base.ramGb),
      bandwidthGbps: numberParam(params, "bw", base.bandwidthGbps)
    },
    showIncompatible: params.get("all") === "1"
  };
};

const numberParam = (params: URLSearchParams, key: string, fallback: number) => {
  if (!params.has(key)) return fallback;
  const value = Number(params.get(key));
  return Number.isFinite(value) ? value : fallback;
};

export const writeUrlInputs = (inputs: CheckerInputs, showIncompatible: boolean) => {
  const params = new URLSearchParams(window.location.search);
  params.set("preset", inputs.presetId);
  params.set("mode", inputs.mode);
  params.set("vram", String(inputs.vramGb));
  params.set("ram", String(inputs.ramGb));
  params.set("bw", String(inputs.bandwidthGbps));

  if (showIncompatible) params.set("all", "1");
  else params.delete("all");

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", nextUrl);
};
