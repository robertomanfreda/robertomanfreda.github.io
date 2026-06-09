export type MemoryMode = "discrete" | "unified";

export type FitStatus = "Excellent" | "Good" | "Tight" | "Does not fit";

export interface HardwarePreset {
  id: string;
  label: string;
  vendor: string;
  kind: MemoryMode;
  vramGb: number;
  ramGb: number;
  bandwidthGbps: number;
  aliases: string[];
}

export interface HardwarePresetsPayload {
  version: number;
  updatedAt: string;
  presets: HardwarePreset[];
}

export interface LlmModel {
  id: string;
  displayName: string;
  family: string;
  hfId?: string | null;
  ollamaName: string;
  paramsB: number;
  activeParamsB?: number | null;
  contextWindow: number;
  tags: string[];
  q4WeightGb: number;
  qualityScore: number | null;
  license: string | null;
  hfUrl: string;
  ollamaCommand: string;
  downloads?: number | null;
  likes?: number | null;
  benchmarkSource?: string | null;
  benchmarkUrl?: string | null;
  metadataSource?: string | null;
  updatedAt?: string | null;
}

export interface LlmCatalogPayload {
  version: number;
  updatedAt: string;
  defaultQuantization: string;
  models: LlmModel[];
}

export interface CheckerInputs {
  presetId: string;
  mode: MemoryMode;
  vramGb: number;
  ramGb: number;
  bandwidthGbps: number;
}

export interface CheckerResult extends LlmModel {
  requiredGb: number;
  headroomGb: number;
  speedTok: number;
  status: FitStatus;
  memoryUsagePct: number;
}
