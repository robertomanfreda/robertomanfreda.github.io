import { useEffect, useState } from "react";
import { Layout } from "./components/Layout";
import { useRouteSeo } from "./lib/seo";
import { HomePage } from "./pages/HomePage";
import { LlmCheckerPage } from "./pages/LlmCheckerPage";
import { RespawnPage } from "./pages/RespawnPage";

export type RouteId = "home" | "respawn" | "llm-checker";

const getRoute = (pathname: string): RouteId => {
  const normalized = pathname.replace(/\/index\.html$/, "/").replace(/\/+$/, "") || "/";

  if (normalized === "/respawn" || normalized === "/respawn.html") return "respawn";
  if (normalized === "/llm-model-checker" || normalized === "/llm-model-checker.html") return "llm-checker";
  return "home";
};

export default function App() {
  const [route, setRoute] = useState<RouteId>(() => getRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => setRoute(getRoute(window.location.pathname));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useRouteSeo(route);

  return (
    <Layout route={route}>
      {route === "home" && <HomePage />}
      {route === "respawn" && <RespawnPage />}
      {route === "llm-checker" && <LlmCheckerPage />}
    </Layout>
  );
}
