# robertomanfreda.github.io

Personal GitHub Pages site for Roberto Manfreda.

The site is a static React app built with Vite, TypeScript, and plain CSS. The build produces `dist/`; `npm run materialize-pages` copies that output to the repository root served by GitHub Pages. Run both commands before committing a site release.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm run preview
```

Public routes are `/`, `/respawn/`, and `/llm-model-checker/`. Legacy `respawn.html` and `llm-model-checker.html` redirect to the clean routes.

The LLM Model Checker reads static JSON from `public/data/`. `scripts/update-llm-data.py` refreshes the model catalog from public Hugging Face metadata and the curated Ollama/GGUF mapping.

## Homepage motion

The orbital hero uses a small Canvas 2D perspective renderer for an animated icosahedron and orbital paths, without a 3D runtime dependency. The opening stays pinned for a three-chapter scroll sequence: the name fades out, architecture/platform/AI copy enters, and the camera zooms and rotates. Project rows, section headings, cards, and experience entries reveal progressively and reverse when scrolling back. Native scrolling and anchor shortcuts remain available. A single requestAnimationFrame callback handles scroll-driven DOM transforms without React rerenders; clickable project hit areas remain stationary. Reduced motion also removes the pinned sequence and its extra scroll distance. The renderer is capped at 30 fps and 1.5 device pixel ratio, stops outside the viewport or in a hidden tab, and respects `prefers-reduced-motion`. A pause control is available next to the scene. If Canvas is unavailable, `public/assets/orbit-fallback.webp` supplies the static visual.

Project pages load on demand so the homepage does not download their code or the model catalog. Existing project routes and data behavior are retained.

The cyberpunk revision adds independently moving segmented rings, light trails, calibrated arcs, satellites and chapter indicators. The circuit/grid backdrop and Canvas fallback are optimized WebP assets (about 58 KB combined); the live orbital apparatus remains procedural so its perspective can follow scrolling. Chakra Petch is served locally in two WOFF2 weights (about 20 KB combined), with its SIL Open Font License in `public/fonts/ChakraPetch-OFL.txt`; source: [Google Fonts](https://github.com/google/fonts/tree/main/ofl/chakrapetch). There are no remote font requests or new runtime dependencies. The beveled CTA uses CSS `corner-shape` and falls back to square corners in browsers that do not support it.

Respawn and LLM Checker share the homepage navigation, display fonts, technical backdrop and cyan/magenta accents. Route-specific styling in `src/project.css` loads with the project pages; documentation, code blocks and checker controls use the same theme with readable working surfaces. Project navigation highlights the current route, and each project has section shortcuts. Reduced motion disables the project entrance animation; the checker's status labels retain distinct success, warning and no-fit colors.
