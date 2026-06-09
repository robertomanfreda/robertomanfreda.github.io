#!/usr/bin/env python3
"""Build the static LLM checker catalog from Ollama library tags and public metadata."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "public" / "data"
OVERRIDES_PATH = DATA_DIR / "model-overrides.json"
OUTPUT_PATH = DATA_DIR / "llm-models.json"

HF_ROWS_URL = (
    "https://datasets-server.huggingface.co/rows"
    "?dataset=open-llm-leaderboard/contents&config=default&split=train"
    "&offset={offset}&length=100"
)
HF_MODEL_URL = "https://huggingface.co/api/models/{model_id}"
HF_SEARCH_URL = "https://huggingface.co/api/models?{query}"
OLLAMA_TAGS_URL = "https://ollama.com/library/{family}/tags"
HF_LEADERBOARD_VIEWER_URL = "https://huggingface.co/datasets/open-llm-leaderboard/contents/viewer/default/train?row={row_idx}"

USER_AGENT = "robertomanfreda-llm-checker/2.0"
MAX_MODELS = 180

FAMILY_CONFIGS: list[dict[str, Any]] = [
    {"ollama": "gpt-oss", "display": "GPT-OSS", "family": "GPT-OSS", "hf_owner": "openai", "hf_prefix": "gpt-oss-"},
    {"ollama": "qwen3.5", "display": "Qwen3.5", "family": "Qwen", "hf_owner": "Qwen", "hf_prefix": "Qwen3.5-"},
    {"ollama": "qwen3", "display": "Qwen3", "family": "Qwen", "hf_owner": "Qwen", "hf_prefix": "Qwen3-"},
    {"ollama": "qwen2.5", "display": "Qwen2.5", "family": "Qwen", "hf_owner": "Qwen", "hf_prefix": "Qwen2.5-"},
    {"ollama": "qwen2.5-coder", "display": "Qwen2.5 Coder", "family": "Qwen Coder", "hf_owner": "Qwen", "hf_prefix": "Qwen2.5-Coder-"},
    {"ollama": "llama4", "display": "Llama 4", "family": "Llama"},
    {"ollama": "llama3.3", "display": "Llama 3.3", "family": "Llama"},
    {"ollama": "llama3.1", "display": "Llama 3.1", "family": "Llama"},
    {"ollama": "llama3.2", "display": "Llama 3.2", "family": "Llama"},
    {"ollama": "deepseek-r1", "display": "DeepSeek R1", "family": "DeepSeek"},
    {"ollama": "deepseek-v3", "display": "DeepSeek V3", "family": "DeepSeek"},
    {"ollama": "mistral-small", "display": "Mistral Small", "family": "Mistral"},
    {"ollama": "magistral", "display": "Magistral", "family": "Mistral"},
    {"ollama": "mistral-nemo", "display": "Mistral Nemo", "family": "Mistral"},
    {"ollama": "mistral", "display": "Mistral", "family": "Mistral"},
    {"ollama": "gemma3", "display": "Gemma 3", "family": "Gemma"},
    {"ollama": "gemma2", "display": "Gemma 2", "family": "Gemma"},
    {"ollama": "phi4", "display": "Phi-4", "family": "Phi"},
    {"ollama": "phi4-mini", "display": "Phi-4 Mini", "family": "Phi"},
    {"ollama": "phi3.5", "display": "Phi-3.5", "family": "Phi"},
    {"ollama": "nemotron", "display": "Llama 3.1 Nemotron", "family": "Nemotron"},
    {"ollama": "nemotron-mini", "display": "Nemotron Mini", "family": "Nemotron"},
    {"ollama": "nemotron-cascade-2", "display": "Nemotron Cascade 2", "family": "Nemotron"},
    {"ollama": "nemotron-3-nano", "display": "Nemotron 3 Nano", "family": "Nemotron"},
    {"ollama": "nemotron-3-super", "display": "Nemotron 3 Super", "family": "Nemotron"},
    {"ollama": "nemotron-3-ultra", "display": "Nemotron 3 Ultra", "family": "Nemotron"},
    {"ollama": "nemotron3", "display": "Nemotron 3 Nano Omni", "family": "Nemotron"},
    {"ollama": "mixtral", "display": "Mixtral", "family": "Mixtral"},
    {"ollama": "yi", "display": "Yi", "family": "Yi"},
    {"ollama": "command-r", "display": "Command R", "family": "Command R"},
    {"ollama": "granite3.3", "display": "Granite 3.3", "family": "Granite"},
    {"ollama": "codestral", "display": "Codestral", "family": "Mistral"},
    {"ollama": "starcoder2", "display": "StarCoder2", "family": "StarCoder"},
]

DROP_TAG_PARTS = (
    "fp16",
    "bf16",
    "q2_",
    "q3_",
    "q4_",
    "q5_",
    "q6_",
    "q8_",
    "int4",
    "int8",
    "mlx",
    "mxfp8",
    "nvfp4",
    "qat",
    "cloud",
)
DROP_TAG_WORDS = ("base", "uncensored", "abliterated", "heretic")
CAPABILITY_WORDS = ("instruct", "reasoning", "thinking", "coder", "code", "coding", "vision", "tool", "rag")
KNOWN_ACTIVE_PARAMS_B: dict[str, float] = {
    # Official architecture metadata for sparse MoE models whose Ollama tag does
    # not encode the active parameter count.
    "gpt-oss:120b": 5.1,
    "gpt-oss:20b": 3.6,
    "nemotron-cascade-2:30b": 3,
    "nemotron-3-super:120b": 12,
    "nemotron-3-super:120b-a12b": 12,
}


def fetch_text(url: str, timeout: int = 30) -> str:
    request = Request(url, headers={"Accept": "text/html,application/json", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return response.read().decode("utf-8", "replace")


def fetch_json(url: str, timeout: int = 30) -> Any:
    request = Request(url, headers={"Accept": "application/json", "User-Agent": USER_AGENT})
    with urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def safe_fetch_json(url: str, timeout: int = 30, attempts: int = 3) -> Any | None:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return fetch_json(url, timeout=timeout)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < attempts:
                time.sleep(attempt * 2)

    print(f"warning: could not fetch {url}: {last_error}", file=sys.stderr)
    return None


def safe_fetch_text(url: str, timeout: int = 30) -> str:
    try:
        return fetch_text(url, timeout=timeout)
    except (HTTPError, URLError, TimeoutError) as exc:
        print(f"warning: could not fetch {url}: {exc}", file=sys.stderr)
        return ""


def numeric(value: Any) -> float | None:
    if isinstance(value, bool) or value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def rounded(value: float, digits: int = 1) -> float:
    return round(value + 1e-9, digits)


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def parse_size_gb(value: str) -> float | None:
    match = re.search(r"([\d.]+)\s*([KMGT]?B)", value, re.I)
    if not match:
        return None
    amount = float(match.group(1))
    unit = match.group(2).upper()
    if unit == "KB":
        return rounded(amount / (1024 * 1024), 2)
    if unit == "MB":
        return rounded(amount / 1024, 2)
    if unit == "TB":
        return rounded(amount * 1024, 1)
    return rounded(amount, 1)


def parse_context(value: str) -> int:
    match = re.search(r"([\d.]+)\s*([KM]?)", value, re.I)
    if not match:
        return 8192
    amount = float(match.group(1))
    suffix = match.group(2).upper()
    if suffix == "M":
        return int(amount * 1_000_000)
    if suffix == "K":
        return int(amount * 1024)
    return int(amount)


def parse_params_b(tag: str, fallback_weight_gb: float | None = None) -> float:
    moe = re.search(r"(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)b", tag, re.I)
    if moe:
        return rounded(float(moe.group(1)) * float(moe.group(2)))
    match = re.search(r"(\d+(?:\.\d+)?)b", tag, re.I)
    if match:
        return rounded(float(match.group(1)))
    match = re.search(r"(\d+(?:\.\d+)?)m", tag, re.I)
    if match:
        return rounded(float(match.group(1)) / 1000, 2)
    if fallback_weight_gb:
        return rounded(fallback_weight_gb / 0.56)
    return 1


def parse_active_params_b(tag: str, family: str, ollama_name: str) -> float | None:
    if ollama_name in KNOWN_ACTIVE_PARAMS_B:
        return KNOWN_ACTIVE_PARAMS_B[ollama_name]

    active = re.search(r"(?:^|[-_])a(\d+(?:\.\d+)?)b(?:$|[-_])", tag, re.I)
    if active:
        return rounded(float(active.group(1)))

    experts = re.search(r"(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)b", tag, re.I)
    if experts:
        expert_size = float(experts.group(2))
        if family == "llama4":
            return rounded(expert_size)
        return rounded(min(parse_params_b(tag), expert_size * 2))

    return None


def is_canonical_tag(tag: str) -> bool:
    lowered = tag.lower()
    if lowered == "latest":
        return False
    if any(part in lowered for part in DROP_TAG_PARTS):
        return False
    if re.search(r"(^|[-_])q[2-8](?:_[a-z0-9]+)?($|[-_])", lowered):
        return False
    if any(re.search(rf"(^|[-_]){word}($|[-_])", lowered) for word in DROP_TAG_WORDS):
        return False
    if not re.search(r"(\d+(?:\.\d+)?[bm])|(\d+x\d+b)", lowered):
        return False
    return True


def tag_priority(tag: str) -> tuple[int, int, str]:
    lowered = tag.lower()
    variant_penalty = 0 if not any(word in lowered for word in CAPABILITY_WORDS) else 1
    size_penalty = 0 if parse_params_b(tag) >= 1 else 1
    return (variant_penalty, size_penalty, tag)


def extract_ollama_tags(family: str) -> list[dict[str, Any]]:
    url = OLLAMA_TAGS_URL.format(family=quote(family, safe=""))
    page = safe_fetch_text(url, timeout=45)
    if not page:
        return []

    pattern = re.compile(
        rf'<a href="/library/{re.escape(family)}:(?P<tag>[^"]+)"\s+class="md:hidden[^"]*"[^>]*>.*?'
        r'<span class="font-mono">\s*(?P<digest>[^<]+)</span>\s*'
        r'•\s*(?P<size>[^•]+?)\s*•\s*(?P<context>[^•]+?)\s+context window',
        re.S,
    )
    seen: dict[str, dict[str, Any]] = {}
    for match in pattern.finditer(page):
        tag = html.unescape(match.group("tag")).strip()
        if not is_canonical_tag(tag):
            continue
        size_gb = parse_size_gb(match.group("size"))
        if size_gb is None:
            continue
        seen[tag] = {
            "tag": tag,
            "sizeGb": size_gb,
            "contextWindow": parse_context(match.group("context")),
        }

    alias_targets = {
        "qwen3": {"30b": "30b-a3b", "235b": "235b-a22b"},
        "qwen3.5": {"35b": "35b-a3b", "122b": "122b-a10b"},
        "nemotron-3-super": {"120b": "120b-a12b"},
    }
    for alias, target in alias_targets.get(family, {}).items():
        if alias in seen and target in seen:
            del seen[alias]

    return [seen[tag] for tag in sorted(seen, key=tag_priority)]


def fetch_leaderboard() -> dict[str, dict[str, Any]]:
    rows_by_model: dict[str, dict[str, Any]] = {}
    for offset in range(0, 5000, 100):
        payload = safe_fetch_json(HF_ROWS_URL.format(offset=offset), timeout=45)
        if not payload:
            break

        rows = payload.get("rows", [])
        if not rows:
            break

        for row in rows:
            item = row.get("row", {})
            if not item or item.get("Flagged"):
                continue

            model_id = item.get("fullname") or item.get("Model")
            if not model_id:
                continue

            current = rows_by_model.get(model_id)
            score = numeric(item.get("Average ⬆️"))
            current_score = numeric(current.get("Average ⬆️")) if current else None
            if current is None or (score is not None and (current_score is None or score > current_score)):
                row_idx = row.get("row_idx")
                if isinstance(row_idx, int):
                    item["_benchmarkUrl"] = HF_LEADERBOARD_VIEWER_URL.format(row_idx=row_idx)
                rows_by_model[model_id] = item

        if len(rows) < 100:
            break

    return rows_by_model


def fetch_model_info(model_id: str) -> dict[str, Any]:
    encoded = quote(model_id, safe="/")
    payload = safe_fetch_json(HF_MODEL_URL.format(model_id=encoded), timeout=30)
    if not isinstance(payload, dict):
        return {}
    return payload


def search_hf_model(query: str, owner: str | None = None) -> str | None:
    params = {"search": query, "limit": "10"}
    if owner:
        params["author"] = owner
    payload = safe_fetch_json(HF_SEARCH_URL.format(query=urlencode(params)), timeout=25, attempts=1)
    if not isinstance(payload, list):
        return None

    for item in payload:
        model_id = item.get("modelId")
        if isinstance(model_id, str):
            lowered = model_id.lower()
            if any(bad in lowered for bad in ("uncensored", "abliterated", "gguf", "gptq", "awq")):
                continue
            return model_id
    return None


def normalize_license(value: Any) -> str | None:
    if isinstance(value, str) and value:
        return value.replace("license:", "")
    if isinstance(value, list):
        for item in value:
            if isinstance(item, str) and item.startswith("license:"):
                return item.replace("license:", "")
    return None


def load_overrides() -> dict[str, dict[str, Any]]:
    if not OVERRIDES_PATH.exists():
        return {}
    payload = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    overrides: dict[str, dict[str, Any]] = {}
    for item in payload.get("models", []):
        name = item.get("ollamaName")
        if isinstance(name, str):
            overrides[name] = item
    return overrides


def load_existing_catalog_scores() -> dict[str, dict[str, Any]]:
    if not OUTPUT_PATH.exists():
        return {}

    try:
        payload = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    scores: dict[str, dict[str, Any]] = {}
    for item in payload.get("models", []):
        if not isinstance(item, dict) or numeric(item.get("qualityScore")) is None:
            continue

        cached = {
            "qualityScore": item.get("qualityScore"),
            "benchmarkSource": item.get("benchmarkSource"),
            "benchmarkUrl": item.get("benchmarkUrl"),
        }
        for key in ("ollamaName", "hfId"):
            value = item.get(key)
            if isinstance(value, str) and value:
                scores[value] = cached

    return scores


def display_name(config: dict[str, Any], tag: str) -> str:
    if config["ollama"] == "llama4":
        if tag.startswith("16x17b"):
            return "Llama 4 Scout 17B 16E"
        if tag.startswith("128x17b"):
            return "Llama 4 Maverick 17B 128E"

    label = tag
    label = re.sub(r"(\d+(?:\.\d+)?)b", lambda m: f"{m.group(1)}B", label, flags=re.I)
    label = re.sub(r"(\d+(?:\.\d+)?)m", lambda m: f"{m.group(1)}M", label, flags=re.I)
    label = label.replace("-", " ")
    words = []
    for word in label.split():
        lowered = word.lower()
        if lowered in {"a3b", "a10b", "a22b", "qwen3", "qwen2.5"}:
            words.append(word.upper().replace("A", "A"))
        elif lowered in {"it"}:
            words.append("IT")
        elif lowered in {"rag"}:
            words.append("RAG")
        elif lowered in {"moe"}:
            words.append("MoE")
        else:
            words.append(word[:1].upper() + word[1:])
    return f"{config['display']} {' '.join(words)}".strip()


def infer_tags(config: dict[str, Any], tag: str) -> list[str]:
    text = f"{config['ollama']} {tag}".lower()
    tags: list[str] = []
    if any(word in text for word in ("coder", "code", "coding", "codestral", "starcoder")):
        tags.append("code")
    if any(word in text for word in ("reasoning", "thinking", "deepseek-r1", "gpt-oss", "magistral")):
        tags.append("reasoning")
    if any(word in text for word in ("vision", "image", "gemma3", "qwen3.5", "llama4", "mistral-small")):
        tags.append("multimodal")
    if any(word in text for word in ("command-r", "rag")):
        tags.append("rag")
    if "tool" in text:
        tags.append("tool-use")
    if "granite" in text:
        tags.append("enterprise")
    if parse_params_b(tag) <= 4:
        tags.append("small")
    if parse_params_b(tag) >= 35:
        tags.append("large")
    if re.search(r"a\d+b|x\d+b", text):
        tags.append("moe")
    if "general" not in tags and "code" not in tags and "reasoning" not in tags:
        tags.append("general")
    return list(dict.fromkeys(tags))


def qwen_hf_id(prefix: str, tag: str, owner: str) -> str:
    main = tag
    for suffix in ("-instruct-2507", "-thinking-2507", "-instruct", "-thinking", "-coding"):
        main = main.replace(suffix, "")
    parts = [part.upper() if re.fullmatch(r"a\d+b", part, re.I) else re.sub(r"b$", "B", part, flags=re.I) for part in main.split("-")]
    return f"{owner}/{prefix}{'-'.join(parts)}"


def infer_hf_id(config: dict[str, Any], tag: str) -> str | None:
    family = config["ollama"]
    if family == "gpt-oss":
        main = tag.replace("-cloud", "")
        return f"openai/gpt-oss-{main}"
    if family in {"qwen3.5", "qwen3", "qwen2.5", "qwen2.5-coder"}:
        return qwen_hf_id(config["hf_prefix"], tag, config["hf_owner"])
    if family == "llama4":
        if "scout" in tag or "16x17b" in tag:
            return "meta-llama/Llama-4-Scout-17B-16E-Instruct"
        if "maverick" in tag or "128x17b" in tag:
            return "meta-llama/Llama-4-Maverick-17B-128E-Instruct"
    if family == "deepseek-r1":
        if "671b" in tag:
            return "deepseek-ai/DeepSeek-R1"
        if "70b" in tag:
            return "deepseek-ai/DeepSeek-R1-Distill-Llama-70B"
        if "8b" in tag:
            return "deepseek-ai/DeepSeek-R1-Distill-Llama-8B"
        if any(size in tag for size in ("1.5b", "7b", "14b", "32b")):
            size = re.search(r"(\d+(?:\.\d+)?b)", tag, re.I)
            if size:
                return f"deepseek-ai/DeepSeek-R1-Distill-Qwen-{size.group(1).upper()}"
    if family == "deepseek-v3":
        return "deepseek-ai/DeepSeek-V3"
    if family == "phi4":
        if "reasoning-plus" in tag:
            return "microsoft/Phi-4-reasoning-plus"
        if "reasoning" in tag:
            return "microsoft/Phi-4-reasoning"
        return "microsoft/phi-4"
    if family == "phi4-mini":
        return "microsoft/Phi-4-mini-instruct"
    if family == "phi3.5":
        return "microsoft/Phi-3.5-mini-instruct"
    if family == "nemotron":
        return "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF"
    if family == "nemotron-mini":
        return "nvidia/Nemotron-Mini-4B-Instruct"
    if family == "nemotron-cascade-2":
        return "nvidia/Nemotron-Cascade-2-30B-A3B"
    if family == "nemotron-3-nano":
        if "4b" in tag:
            return "nvidia/Nemotron-3-Nano-4B"
        return "nvidia/Nemotron-3-Nano-30B-A3B"
    if family == "nemotron-3-super":
        return "nvidia/Nemotron-3-Super-120B-A12B"
    if family == "nemotron3":
        return "nvidia/Nemotron-3-Nano-Omni-33B"
    if family == "codestral":
        return "mistralai/Codestral-22B-v0.1"
    if family == "command-r":
        return "CohereForAI/c4ai-command-r-v01"
    if family == "mistral-nemo":
        return "mistralai/Mistral-Nemo-Instruct-2407"
    if family == "magistral":
        return search_hf_model(f"Magistral {tag}", owner="mistralai")
    if family == "mistral-small":
        return search_hf_model(f"Mistral Small {tag}", owner="mistralai")
    if family == "gemma3":
        size = re.search(r"(\d+(?:\.\d+)?[bm])", tag, re.I)
        if size:
            return f"google/gemma-3-{size.group(1).lower()}-it"
    if family == "gemma2":
        size = re.search(r"(\d+(?:\.\d+)?[bm])", tag, re.I)
        if size:
            return f"google/gemma-2-{size.group(1).lower()}-it"
    if family == "granite3.3":
        size = re.search(r"(\d+(?:\.\d+)?b)", tag, re.I)
        if size:
            return f"ibm-granite/granite-3.3-{size.group(1).lower()}-instruct"
    return search_hf_model(f"{config['display']} {tag}")


def build_discovered_models() -> list[dict[str, Any]]:
    overrides = load_overrides()
    discovered: dict[str, dict[str, Any]] = {}

    for config in FAMILY_CONFIGS:
        tags = extract_ollama_tags(config["ollama"])
        if not tags:
            continue

        for tag_data in tags:
            tag = tag_data["tag"]
            ollama_name = f"{config['ollama']}:{tag}"
            override = overrides.get(ollama_name, {})
            params_b = override.get("paramsB") or parse_params_b(tag, tag_data["sizeGb"])
            active_params_b = override.get("activeParamsB") or parse_active_params_b(tag, config["ollama"], ollama_name)
            tags = sorted(set([*infer_tags(config, tag), *override.get("tags", [])]))
            if active_params_b and "moe" not in tags:
                tags.append("moe")
            model = {
                "id": override.get("id") or slug(ollama_name),
                "displayName": override.get("displayName") or display_name(config, tag),
                "family": override.get("family") or config["family"],
                "hfId": override.get("hfId") or infer_hf_id(config, tag),
                "ollamaName": ollama_name,
                "paramsB": params_b,
                "activeParamsB": active_params_b,
                "contextWindow": override.get("contextWindow") or tag_data["contextWindow"],
                "tags": sorted(tags),
                "q4WeightGb": override.get("q4WeightGb") or tag_data["sizeGb"],
                "ollamaTag": tag,
                "ollamaUrl": f"https://ollama.com/library/{config['ollama']}:{tag}",
                "catalogSource": "ollama-library",
            }
            discovered[ollama_name] = model

    return list(discovered.values())


def enrich_models(models: list[dict[str, Any]], include_hub: bool = True) -> list[dict[str, Any]]:
    leaderboard = fetch_leaderboard()
    cached_scores = load_existing_catalog_scores()
    enriched = []

    for model in models:
        hf_id = model.get("hfId")
        row = leaderboard.get(hf_id, {}) if hf_id else {}
        hub = fetch_model_info(hf_id) if include_hub and hf_id else {}

        cached_score = cached_scores.get(model.get("ollamaName")) or cached_scores.get(hf_id)
        quality = numeric(row.get("Average ⬆️")) or numeric(model.get("qualityScore")) or numeric(cached_score.get("qualityScore") if cached_score else None)
        license_name = normalize_license(row.get("Hub License")) or normalize_license(hub.get("tags")) or normalize_license(hub.get("cardData", {}).get("license"))

        model["paramsB"] = rounded(float(model["paramsB"]))
        if model.get("activeParamsB") is not None:
            model["activeParamsB"] = rounded(float(model["activeParamsB"]))
        model["q4WeightGb"] = rounded(float(model["q4WeightGb"]))
        model["qualityScore"] = rounded(quality, 1) if quality is not None else None
        model["license"] = license_name
        model["hfUrl"] = f"https://huggingface.co/{hf_id}" if hf_id and hub else model.get("ollamaUrl")
        model["ollamaCommand"] = f"ollama run {model['ollamaName']}"
        model["downloads"] = hub.get("downloads")
        model["likes"] = hub.get("likes") or row.get("Hub ❤️")
        model["benchmarkSource"] = "open-llm-leaderboard/contents" if row else (cached_score.get("benchmarkSource") if cached_score else None)
        model["benchmarkUrl"] = row.get("_benchmarkUrl") or (cached_score.get("benchmarkUrl") if cached_score else None)
        model["metadataSource"] = "huggingface-hub" if hub else model.get("catalogSource", "ollama-library")
        model["updatedAt"] = hub.get("lastModified") or row.get("Submission Date")

        enriched.append(model)
        if include_hub and hf_id:
            time.sleep(0.05)

    return enriched


def model_sort_key(item: dict[str, Any]) -> tuple[Any, ...]:
    updated = item.get("updatedAt") or ""
    return (
        item.get("qualityScore") is None,
        -(item.get("qualityScore") or 0),
        -int(bool(updated)),
        -(item.get("downloads") or 0),
        item.get("q4WeightGb") or 999,
        item.get("displayName", ""),
    )


def build_catalog(include_hub: bool = True) -> dict[str, Any]:
    models = enrich_models(build_discovered_models(), include_hub=include_hub)
    models.sort(key=model_sort_key)

    return {
        "version": 2,
        "updatedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "defaultQuantization": "Q4",
        "discovery": {
            "strategy": "Automatically discover canonical Ollama library tags from a curated family allowlist, then enrich with Hugging Face metadata when a trusted mapping is available.",
            "maxModels": MAX_MODELS,
        },
        "estimation": {
            "q4Weight": "Estimated from Ollama tag size when available; otherwise from 4-bit GGUF/INT4 model weight footprint.",
            "runtimeMargin": "Applied in the browser from model size, memory mode, and system reserves.",
            "speed": "Estimated from memory bandwidth and active decode footprint. Sparse MoE models use activeParamsB when known; dense models use the full Q4 footprint.",
        },
        "sources": [
            {
                "name": "Ollama library tag pages",
                "url": "https://ollama.com/library",
            },
            {
                "name": "Hugging Face Open LLM Leaderboard contents",
                "url": "https://huggingface.co/datasets/open-llm-leaderboard/contents",
            },
            {
                "name": "Hugging Face Hub model metadata",
                "url": "https://huggingface.co/docs/hub/api",
            },
            {
                "name": "Optional curated metadata overrides",
                "url": "/data/model-overrides.json",
            },
        ],
        "models": models[:MAX_MODELS],
    }


def validate_catalog(catalog: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    models = catalog.get("models")
    if not isinstance(models, list) or not models:
        errors.append("catalog must contain at least one model")
        return errors

    required = ("id", "displayName", "family", "ollamaName", "paramsB", "q4WeightGb", "hfUrl", "ollamaCommand")
    seen: set[str] = set()
    for index, model in enumerate(models):
        if not isinstance(model, dict):
            errors.append(f"model #{index} must be an object")
            continue
        for field in required:
            if model.get(field) in (None, ""):
                errors.append(f"{model.get('id', f'model #{index}')} missing {field}")
        model_id = model.get("id")
        if model_id in seen:
            errors.append(f"duplicate model id: {model_id}")
        if isinstance(model_id, str):
            seen.add(model_id)
        if (numeric(model.get("paramsB")) or 0) <= 0:
            errors.append(f"{model.get('id', f'model #{index}')} has invalid paramsB")
        active_params = numeric(model.get("activeParamsB"))
        if active_params is not None and active_params <= 0:
            errors.append(f"{model.get('id', f'model #{index}')} has invalid activeParamsB")
        if active_params is not None and active_params > (numeric(model.get("paramsB")) or 0):
            errors.append(f"{model.get('id', f'model #{index}')} has activeParamsB greater than paramsB")
        if (numeric(model.get("q4WeightGb")) or 0) <= 0:
            errors.append(f"{model.get('id', f'model #{index}')} has invalid q4WeightGb")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    parser.add_argument("--check", action="store_true", help="Validate the generated catalog without writing it.")
    parser.add_argument("--no-hub", action="store_true", help="Skip per-model Hugging Face Hub metadata calls.")
    args = parser.parse_args()

    catalog = build_catalog(include_hub=not args.no_hub)
    errors = validate_catalog(catalog)
    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    rendered = json.dumps(catalog, indent=2, ensure_ascii=True, sort_keys=False) + "\n"

    if args.check:
        print(f"catalog valid with {len(catalog['models'])} models")
        return 0

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(rendered, encoding="utf-8")
    print(f"wrote {args.output.relative_to(ROOT)} with {len(catalog['models'])} models")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
