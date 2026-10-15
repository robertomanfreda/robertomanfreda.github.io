import { useEffect, useRef } from "react";

export type ScrollSceneState = { progress: number };
const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** Scroll is native. A single scheduled frame updates composited DOM properties. */
export function useScrollExperience() {
  const root = useRef<HTMLElement>(null);
  const scene = useRef<ScrollSceneState>({ progress: 0 });

  useEffect(() => {
    const main = root.current;
    if (!main) return;
    const intro = main.querySelector<HTMLElement>(".signal-intro")!;
    const hero = main.querySelector<HTMLElement>(".signal-hero")!;
    const identity = main.querySelector<HTMLElement>(".signal-identity")!;
    const invitation = main.querySelector<HTMLElement>(".signal-invitation")!;
    const stage = main.querySelector<HTMLElement>(".orbit-stage")!;
    const chapters = Array.from(main.querySelectorAll<HTMLElement>(".signal-chapter"));
    const indexItems = Array.from(main.querySelectorAll<HTMLElement>(".signal-index span"));
    const progressBar = main.querySelector<HTMLElement>(".signal-page-progress")!;
    const targets = Array.from(main.querySelectorAll<HTMLElement>(
      ".signal-projects h2, .signal-project, .section-heading, .compact-card, .timeline-card, .focus-list li, .tech-grid .card, .contact-band > div, .contact-band > a"
    )).map((element, index) => ({ element, index, top: 0 }));
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0, viewport = innerHeight, distance = viewport * 1.45, introTop = 0;
    let pageHeight = 1;
    const layoutTop = (element: HTMLElement) => {
      let top = 0;
      for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) top += node.offsetTop;
      return top;
    };
    const render = () => {
      frame = 0;
      if (motion.matches || document.hidden) return;
      const y = window.scrollY;
      const p = clamp((y - introTop) / distance);
      const mobile = innerWidth <= 760;
      scene.current.progress = p;
      main.dataset.sceneProgress = p.toFixed(3);
      main.style.setProperty("--scene-progress", String(p));
      indexItems.forEach((item, index) => {
        item.dataset.active = String(p >= 0.13 + index * 0.27 && (index === 2 || p < 0.40 + index * 0.27));
      });
      const opening = clamp(p / 0.24);
      identity.style.transform = `translate3d(0,${-opening * 100}px,0) scale(${1 - opening * 0.12})`;
      identity.style.opacity = String(1 - opening);
      invitation.style.transform = `translate3d(0,${opening * 60}px,0)`;
      invitation.style.opacity = String(1 - opening);
      // Hidden calls to action must not trap pointer or keyboard navigation.
      invitation.inert = opening > 0.96;
      stage.style.transform = `translate3d(${mobile ? 0 : p * 19}%,${viewport * (mobile ? clamp(p / 0.25) * 0.30 : p * 0.18)}px,0)`;
      stage.style.opacity = String(1 - p * (mobile ? 0.45 : 0.16));
      chapters.forEach((chapter, index) => {
        const start = 0.13 + index * 0.27;
        const enter = clamp((p - start) / 0.10);
        const leave = index === 2 ? 0 : clamp((p - start - 0.21) / 0.05);
        chapter.style.opacity = String(enter * (1 - leave));
        chapter.style.transform = `translate3d(${(1 - enter) * 65 - leave * 45}px,${(1 - enter) * 25}px,0)`;
      });
      for (const { element, index, top } of targets) {
        const reveal = clamp((viewport * 0.94 - (top - y)) / (viewport * 0.38));
        const remaining = 1 - reveal;
        const heading = element.classList.contains("section-heading") || element.tagName === "H2";
        const x = heading ? -remaining * 50 : remaining * (index % 2 ? 65 : -65);
        const transform = `translate3d(${x}px,${remaining * 70}px,0) scale(${1 - remaining * 0.045})`;
        // Keep link hit areas stable while their contents move into view.
        if (element.classList.contains("signal-project")) {
          Array.from(element.children).forEach(child => {
            const content = child as HTMLElement | SVGElement;
            if (remaining === 0) content.style.removeProperty("transform");
            else content.style.transform = transform;
          });
        } else element.style.transform = transform;
        element.style.opacity = String(0.10 + reveal * 0.90);
        element.style.setProperty("--reveal", String(reveal));
      }
      progressBar.style.transform = `scaleX(${clamp(y / pageHeight)})`;
    };
    const schedule = () => { if (!frame && !motion.matches) frame = requestAnimationFrame(render); };
    const measure = () => {
      viewport = innerHeight;
      distance = viewport * (innerWidth <= 760 ? 1.15 : 1.45);
      main.style.setProperty("--journey-distance", `${distance}px`);
      main.style.setProperty("--hero-height", `${hero.offsetHeight}px`);
      introTop = layoutTop(intro);
      targets.forEach(target => { target.top = layoutTop(target.element); });
      pageHeight = Math.max(1, document.documentElement.scrollHeight - viewport);
      schedule();
    };
    const reset = () => {
      cancelAnimationFrame(frame); frame = 0;
      main.classList.toggle("motion-enabled", !motion.matches);
      if (motion.matches) {
        scene.current.progress = 0;
        main.dataset.sceneProgress = "0";
        main.style.setProperty("--scene-progress", "0");
        indexItems.forEach(item => { item.dataset.active = "false"; });
        [identity, invitation, stage, ...chapters, ...targets.map(t => t.element), progressBar]
          .forEach(element => { element.style.removeProperty("transform"); element.style.removeProperty("opacity"); });
        main.querySelectorAll<HTMLElement>(".signal-project > *").forEach(element => element.style.removeProperty("transform"));
        invitation.inert = false;
      }
      measure();
    };
    // Focused content is immediately revealed, even when reached with Tab.
    const onFocus = (event: FocusEvent) => {
      const target = (event.target as HTMLElement).closest<HTMLElement>(".signal-project, .contact-band > a");
      if (target && (event.target as HTMLElement).matches(":focus-visible")) {
        target.style.opacity = "1"; target.style.transform = "none";
        Array.from(target.children).forEach(child => (child as HTMLElement).style.removeProperty("transform"));
      }
    };
    const observer = new ResizeObserver(measure);
    reset(); observer.observe(main); observer.observe(hero);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", schedule);
    motion.addEventListener("change", reset);
    main.addEventListener("focusin", onFocus);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", schedule); motion.removeEventListener("change", reset);
      main.removeEventListener("focusin", onFocus);
      main.classList.remove("motion-enabled");
    };
  }, []);

  return { root, scene };
}
