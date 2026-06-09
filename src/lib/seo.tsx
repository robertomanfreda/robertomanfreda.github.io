import { useEffect } from "react";
import type { RouteId } from "../App";

export const SITE_URL = "https://robertomanfreda.github.io";

const routeSeo: Record<RouteId, { title: string; description: string; path: string; image: string }> = {
  home: {
    title: "Roberto Manfreda | DevOps, Architecture, Performance, AI",
    description:
      "Personal website of Roberto Manfreda, DevOps Engineer at Aruba with experience in software architecture, cloud-native platforms, performance, and AI projects.",
    path: "/",
    image: "/assets/roberto-manfreda.png"
  },
  respawn: {
    title: "Respawn | Local OpenAI Responses API Gateway",
    description:
      "Respawn is a local OpenAI-shaped API gateway for self-hosted LLM backends, with stateful Responses, streaming, local tools, Files API support, observability, and compatibility gates.",
    path: "/respawn/",
    image: "/assets/project-respawn.png"
  },
  "llm-checker": {
    title: "LLM Model Checker | What LLM Can I Run?",
    description:
      "Check which local LLMs can run on your GPU, VRAM, RAM, memory bandwidth, or unified memory system. Static, private, and built for Ollama and GGUF-style local inference.",
    path: "/llm-model-checker/",
    image: "/assets/roberto-manfreda.png"
  }
};

const setMeta = (selector: string, attribute: "content" | "href", value: string) => {
  const element = document.querySelector<HTMLMetaElement | HTMLLinkElement>(selector);
  if (element) {
    element.setAttribute(attribute, value);
  }
};

export const useRouteSeo = (route: RouteId) => {
  useEffect(() => {
    const seo = routeSeo[route];
    const url = `${SITE_URL}${seo.path}`;
    const image = seo.image.startsWith("http") ? seo.image : `${SITE_URL}${seo.image}`;

    document.title = seo.title;
    setMeta('meta[name="description"]', "content", seo.description);
    setMeta('meta[property="og:title"]', "content", seo.title);
    setMeta('meta[property="og:description"]', "content", seo.description);
    setMeta('meta[property="og:url"]', "content", url);
    setMeta('meta[property="og:image"]', "content", image);
    setMeta('link[rel="canonical"]', "href", url);
  }, [route]);
};

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
