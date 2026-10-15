import { useEffect, useRef, useState, type RefObject } from "react";
import { Pause, Play } from "lucide-react";

import type { ScrollSceneState } from "./useScrollExperience";

type Point = [number, number, number];
const PHI = (1 + Math.sqrt(5)) / 2;
const vertices: Point[] = [
  [-1, PHI, 0], [1, PHI, 0], [-1, -PHI, 0], [1, -PHI, 0],
  [0, -1, PHI], [0, 1, PHI], [0, -1, -PHI], [0, 1, -PHI],
  [PHI, 0, -1], [PHI, 0, 1], [-PHI, 0, -1], [-PHI, 0, 1]
];
const faces = [
  [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
  [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
  [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
  [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
];

/** A small perspective renderer: no WebGL engine, textures or external requests. */
export function OrbitScene({ scrollScene }: { scrollScene: RefObject<ScrollSceneState> }) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const element = canvas.current;
    const container = host.current;
    const ctx = element?.getContext("2d");
    if (!element || !container || !ctx) return;
    setAvailable(true);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1, height = 1, padding = 0, frame = 0, visible = false;
    let phase = phaseRef.current, lastTime = 0, previousDraw = 0;
    let pointerX = 0, pointerY = 0;
    const stars = Array.from({ length: 30 }, (_, i) => ({
      x: ((i * 137.508) % 100) / 100,
      y: ((i * 71.313 + 13) % 100) / 100,
      opacity: 0.12 + (i % 4) * 0.1
    }));

    const draw = () => {
      const progress = motion.matches ? 0 : scrollScene.current.progress;
      const baseUnit = Math.min(width / 1000, (height - padding * 2) / 390);
      const unit = baseUnit * (1 + progress * 0.85);
      const tilt = 1.28 - progress * 1.25 + pointerY * 0.035;
      const turn = 0.30 + progress * 2.7 + pointerX * 0.025;
      const centerX = width / 2, centerY = height / 2 - 14 * unit;
      ctx.clearRect(0, 0, width, height);
      for (const star of stars) {
        ctx.fillStyle = `rgba(166,213,225,${star.opacity})`;
        ctx.fillRect(star.x * width, star.y * height, 1, 1);
      }
      const project = ([x, y, z]: Point) => {
        const depth = 3200 / (3200 + z);
        return [centerX + x * unit * depth, centerY + y * unit * depth, z];
      };
      const ringPoint = (angle: number, radius: number, offset = 0): Point => {
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * Math.cos(tilt + offset);
        const z = Math.sin(angle) * radius * Math.sin(tilt + offset);
        return [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn), z];
      };
      const line = (from: number[], to: number[], color: string, weight = 1) => {
        ctx.strokeStyle = color; ctx.lineWidth = weight;
        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();
      };
      // Separate front/back passes put the moving core inside a layered mechanism.
      const ring = (radius: number, offset: number, style: "solid" | "dotted" | "outer", front: boolean) => {
        const count = 144;
        for (let i = 0; i < count; i++) {
          const a = i / count * Math.PI * 2;
          const p = ringPoint(a, radius, offset);
          if ((p[2] < 0) !== front) continue;
          if (style === "dotted" && i % 2) continue;
          const q = ringPoint(a + Math.PI * 2 / count * (style === "dotted" ? 0.4 : 1), radius, offset);
          const brightness = style === "solid" ? 0.45 + 0.5 * Math.pow(Math.cos(a + phase * 0.3), 6) : style === "outer" ? 0.38 : 0.48;
          line(project(p), project(q), `rgba(137,235,242,${brightness})`, style === "solid" ? 1.3 : 0.7);
        }
      };
      const mechanism = (front: boolean) => {
        ring(400, 0, "solid", front);
        ring(333, 0.07, "dotted", front);
        ring(443, 0.06, "outer", front);
        ring(280, 0.18, "outer", front);
        // Individually projected metallic segments create depth as the camera turns.
        for (let i = 0; i < 80; i++) {
          const a = i / 80 * Math.PI * 2 + phase * 0.055;
          if ((ringPoint(a, 370)[2] < 0) !== front) continue;
          const corners = [ringPoint(a, 365), ringPoint(a + 0.018, 365), ringPoint(a + 0.018, 380), ringPoint(a, 380)].map(project);
          const magenta = i % 20 === 0;
          ctx.fillStyle = magenta ? "#d65ba7" : front ? "#48636d" : "#24383f";
          ctx.strokeStyle = magenta ? "#ffa0df" : "#7eafb8"; ctx.lineWidth = 0.45;
          ctx.beginPath(); corners.forEach((p, j) => { if (j === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]); });
          ctx.closePath(); ctx.fill(); ctx.stroke();
          const lower = corners.map(p => [p[0], p[1] + 4 * unit]);
          line(corners[2], lower[2], "#2e4a52"); line(lower[2], lower[3], "#2e4a52");
        }
        for (let i = 0; i < 72; i++) {
          const a = i / 72 * Math.PI * 2;
          if ((ringPoint(a, 455, 0.06)[2] < 0) !== front) continue;
          line(project(ringPoint(a, 450, 0.06)), project(ringPoint(a, i % 6 === 0 ? 468 : 458, 0.06)), "rgba(126,199,211,0.38)", 0.7);
        }
        // Short light trails rotate independently of the calibrated rings.
        for (let j = 0; j < 3; j++) {
          for (let i = 0; i < 36; i++) {
            const a = phase * (j === 1 ? -0.15 : 0.12) + j * 2.1 + i * 0.012;
            const radius = j === 1 ? 443 : 400, offset = j === 1 ? 0.06 : 0;
            if ((ringPoint(a, radius, offset)[2] < 0) !== front) continue;
            line(project(ringPoint(a, radius, offset)), project(ringPoint(a + 0.013, radius, offset)),
              j === 1 ? `rgba(246,93,192,${i / 37})` : `rgba(173,255,255,${i / 37})`, 2.3);
          }
        }
      };
      // A single soft stroke per ring half gives the light rail a restrained halo.
      const halo = (front: boolean) => {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 144; i++) {
          const p = ringPoint(i / 144 * Math.PI * 2, 400);
          if ((p[2] < 0) !== front) { started = false; continue; }
          const q = project(p);
          if (started) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
          started = true;
        }
        ctx.strokeStyle = "rgba(158,248,255,0.65)"; ctx.lineWidth = 0.8;
        ctx.shadowColor = "#70dce7"; ctx.shadowBlur = 5; ctx.stroke(); ctx.shadowBlur = 0;
      };
      mechanism(false); halo(false);
      // Rotate and depth-sort the twenty faces of a genuine icosahedron.
      const angle = phase * 0.23 + progress * 4.5 + 0.2;
      const points = vertices.map(([x, y, z]): Point => {
        const a = x * Math.cos(angle) + z * Math.sin(angle);
        const b = z * Math.cos(angle) - x * Math.sin(angle);
        const expansion = 1 + progress * 0.5;
        return [a * 43 * expansion, (y * Math.cos(0.28) - b * Math.sin(0.28)) * 43 * expansion, (y * Math.sin(0.28) + b * Math.cos(0.28)) * 43 * expansion];
      });
      const sortedFaces = faces.map(indices => ({ indices, depth: indices.reduce((sum, i) => sum + points[i][2], 0) }))
        .sort((a, b) => b.depth - a.depth);
      for (const { indices } of sortedFaces) {
        const [a, b, c] = indices.map(i => points[i]);
        const normal = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
        if (normal > 0) continue;
        const shade = Math.round(Math.max(6, Math.min(96, 24 - (a[1] + b[1] + c[1]) / (3 * (1 + progress * 0.5)) * 1.1)));
        ctx.fillStyle = `rgb(${shade},${shade + 12},${shade + 16})`;
        ctx.strokeStyle = "rgba(138,235,246,0.7)";
        ctx.lineWidth = 0.85;
        ctx.beginPath();
        indices.forEach((index, i) => {
          const p = project(points[index]);
          if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
        });
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      mechanism(true); halo(true);
      // Satellites and leader lines remain part of the same projected coordinate space.
      for (let i = 0; i < 3; i++) {
        const a = phase * 0.08 + i * Math.PI * 2 / 3 + 0.4;
        const p = project(ringPoint(a, 443, 0.06));
        const radius = (i === 1 ? 11 : 7) * Math.max(unit, 0.65);
        ctx.strokeStyle = "rgba(141,219,231,0.55)"; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.arc(p[0], p[1], radius, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(p[0], p[1], radius * 0.4, radius, 0.35, 0, Math.PI * 2); ctx.stroke();
        line([p[0] - radius, p[1]], [p[0] + radius, p[1]], "rgba(141,219,231,0.4)", 0.6);
      }
      if (width > 700) {
        const labels = ["// SYSTEMS", "// INTELLIGENCE", "// PLATFORMS"];
        labels.forEach((label, i) => {
          const p = project(ringPoint(i * 2.1 + 1.2, 305, 0.07));
          const side = p[0] > centerX ? 1 : -1;
          const elbow = [p[0] + side * 30 * unit, p[1] - 25 * unit];
          line(p, elbow, "rgba(131,196,208,0.4)", 0.6);
          line(elbow, [elbow[0] + side * 90, elbow[1]], "rgba(131,196,208,0.4)", 0.6);
          ctx.fillStyle = "#8dbec7"; ctx.font = "9px monospace";
          ctx.textAlign = side > 0 ? "left" : "right";
          ctx.fillText(label, elbow[0], elbow[1] - 7);
        });
      }
      for (const offset of [0, Math.PI]) {
        const p = project(ringPoint(phase * 0.18 + offset, 400));
        ctx.shadowBlur = 16; ctx.shadowColor = "#ff55bc";
        ctx.fillStyle = "#ffc0eb";
        ctx.beginPath(); ctx.arc(p[0], p[1], 3.5 * Math.max(unit, 0.6), 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.strokeStyle = "rgba(151,204,214,0.5)";
      ctx.lineWidth = 0.8;
      for (const direction of [-1, 1]) {
        const y = centerY + direction * 150 * unit;
        ctx.beginPath(); ctx.moveTo(centerX - 5, y); ctx.lineTo(centerX + 5, y);
        ctx.moveTo(centerX, y - 5); ctx.lineTo(centerX, y + 5); ctx.stroke();
      }
      container.dataset.ready = "true";
    };
    const tick = (time: number) => {
      frame = 0;
      if (!visible || document.hidden || paused || motion.matches) return;
      if (time - previousDraw >= 1000 / 30) {
        phase += lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
        lastTime = previousDraw = time;
        draw();
      }
      frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0;
      const running = visible && !document.hidden && !paused && !motion.matches;
      container.dataset.animating = String(running);
      if (visible && !document.hidden) draw();
      if (running) frame = requestAnimationFrame(tick);
    };
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      padding = Math.min(300, innerHeight * 0.3);
      height = entry.contentRect.height + padding * 2;
      element.style.height = `${height}px`;
      element.style.top = `${-padding}px`;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      element.width = Math.round(width * ratio); element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
    });
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); });
    const pointer = (event: PointerEvent) => {
      if (event.pointerType === "touch" || motion.matches) return;
      const rect = container.getBoundingClientRect();
      pointerX = (event.clientX - rect.left) / rect.width - 0.5;
      pointerY = (event.clientY - rect.top) / rect.height - 0.5;
    };
    const resetPointer = () => { pointerX = 0; pointerY = 0; };
    const onMotion = () => { setReduced(motion.matches); sync(); };
    setReduced(motion.matches);
    resize.observe(container); observer.observe(container);
    container.addEventListener("pointermove", pointer, { passive: true });
    container.addEventListener("pointerleave", resetPointer);
    document.addEventListener("visibilitychange", sync);
    motion.addEventListener("change", onMotion);
    return () => {
      phaseRef.current = phase;
      cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect();
      container.removeEventListener("pointermove", pointer); container.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", sync); motion.removeEventListener("change", onMotion);
    };
  }, [paused, scrollScene]);

  return (
    <>
    <div className="orbit-stage" ref={host}>
      <img className="orbit-fallback" src="/assets/orbit-fallback.webp" alt="" width="1200" height="480" />
      <canvas ref={canvas} aria-hidden="true" />
    </div>
      {available && !reduced && <button className="orbit-motion" type="button" onClick={() => setPaused(value => !value)}
        aria-label={paused ? "Resume animation" : "Pause animation"} aria-pressed={paused}>
        {paused ? <Play size={13} /> : <Pause size={13} />}<span>{paused ? "Resume" : "Pause"}</span>
      </button>}
    </>
  );
}
