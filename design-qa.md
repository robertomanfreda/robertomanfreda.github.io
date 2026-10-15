# Cyberpunk revision — design QA

final result: passed

## Visual target and evidence

- Approved source: `/home/roman/.codex/generated_images/01a13f8b-3b4d-74b0-812a-165dadb7574d/exec-488e86f2-9012-484a-afa8-98ef185e0db5.png`.
- Local implementation: `http://127.0.0.1:4173/`.
- Matching opening composition: `/tmp/cyber-qa/static.png`, captured with reduced motion from a fresh navigation. Both source and implementation are 1487 × 1058 pixels, 1487 × 1058 CSS viewport, device scale factor 1. No density normalization necessary.
- Full comparison: `/tmp/cyber-qa/comparison-final.jpg`, source left and implementation right, opened and inspected together.
- Focused comparisons: `/tmp/cyber-qa/type-comparison.jpg` and `/tmp/cyber-qa/cta-projects-comparison.jpg`, inspected for display typography, control shape, row alignment, hierarchy and legibility.
- Animated opening: `/tmp/cyber-qa/home.png`; platforms chapter: `/tmp/cyber-qa/chapter.png`.
- Mobile opening: `/tmp/cyber-qa/mobile.png`; mobile chapter: `/tmp/cyber-qa/mobile-chapter.png` (390 × 844, device scale factor 1).
- End-to-end scroll recording: `/tmp/cyber-qa/scroll-demo.mp4`.

The static reference shows the hero and projects together. The existing user-approved animated experience intentionally keeps the hero pinned for three chapters before exposing the project list. Reduced motion matches the reference's static content state; normal-motion stages were reviewed separately. Local Playwright was explicitly authorized by the user after the integrated browser was unavailable.

## Findings and comparison history

No actionable P0/P1/P2 findings remain.

First comparison (`/tmp/cyber-qa/comparison-v1.jpg`) found:

1. **P2 — Opening height clipped the second project.** Reduced overline spacing, stage height and invitation margin. Final static screenshot shows both complete project rows.
2. **P2 — Reduced-motion canvas clipped outer arcs.** Removed the clipping rule after converting the drawing surface to transparency; content remains in higher stacking layers. Revised outer-ring tilt keeps the calibration ring away from the title. Final screenshot shows a complete orbital assembly.
3. **P2 — Core became too large and pale during zoom.** Reduced core expansion and normalized face shading against scale. Chapter and mobile captures confirm clearer text separation and controlled illumination.
4. **P2 — Rectangular CTA drifted from the approved beveled design.** Added native beveled corners with a square-corner fallback. Focused comparison confirms the intended shape in Chromium.
5. **P2 — Two background instances created a visible seam in static mode.** Unified the static backdrop on the page body; the pinned hero retains its own backdrop only during the moving sequence. Final combined comparison confirms the seam is gone.
6. **P2 — Initial display weight was too light.** Added the locally hosted bold weight for the name and chapter headlines; focused typography comparison confirms the stronger hierarchy.

## Required fidelity surfaces

- **Fonts and typography:** Chakra Petch provides the angular display forms in the approved direction, bold for primary/chapter titles and semibold for project/section headings; system monospace remains for labels and supporting text. Exact generated glyph contours are not a real identifiable font. No headline overflow at 320, 390, 768, 1440 or 1487 px. Labels are intentionally subordinate; body and calls to action remain legible.
- **Spacing and layout:** Centered identity, large orbital hero, chapter index at the side, right-hand scroll affordance, centered CTA and thin project rows match the approved hierarchy. Both projects fit in the matching static viewport. On mobile, side annotations move to the bottom and category metadata is hidden to preserve usable row widths.
- **Colors and tokens:** Near-black surface, ivory text, cyan calibrated paths and magenta nodes/stripes follow the source. Text stays above the canvas; project hit areas remain stationary during reveals. Background markings are decorative.
- **Images and motion:** Built-in ImageGen produced the real WebP technical backdrop and no-Canvas fallback from the approved reference. The live orbital mechanism is an extension of the explicitly requested, already approved procedural animation: true perspective projection, depth-sorted faces, layered rings, moving segments and light trails. Rasterizing it would lose the required camera behavior. No new rendering engine or runtime dependency was added.
- **Copy and content:** Name, roles, navigation, tagline, primary action and real project descriptions are retained. Category labels correspond to the projects. Decorative chapter labels reflect the actual three scroll chapters. Extra generated filler prose and fake telemetry were not added.

## Verification

- `npm run build` passed (includes TypeScript checking).
- `git diff --check` passed.
- `/tmp/signal-motion/test.cjs` passed: sticky chapters, reverse scrolling, reveals, native anchor shortcut, responsive overflow checks, reduced-motion layout and live preference switching.
- `/tmp/signal-qa/flows.cjs` passed: visible motion, pixel-stable pause, resume, stopping offscreen, Respawn navigation and Quick start, LLM Checker search and hardware input, keyboard skip link, no-Canvas fallback, no homepage loading of project modules/catalog.
- Tested widths: 320, 390, 768, 1440 and 1487 px. No horizontal overflow.
- Browser console errors and uncaught page errors: none.
- Current homepage JS: about 71.4 KB gzip; CSS about 7.3 KB gzip. The two WebP assets total about 58 KB, local fonts about 20 KB. These are build/asset sizes, not a claim of measured device performance.

## Follow-up polish and limits

- P3: The generated concept has photographic glow/reflections; the live geometry uses restrained halos and flat shaded facets to retain the lightweight renderer requested by the user. Orbit phase changes frame to frame, so exact pixel alignment with the static mock is not expected.
- P3: Background micro-traces and nonessential decorative annotations differ from the generated concept. The visual hierarchy and palette are preserved.
- Chromium desktop and mobile viewport emulation were tested. Physical mobile hardware, Safari and Firefox were not tested. Browsers without `corner-shape` retain a functional square CTA.

## Implementation checklist

- [x] Approved cyberpunk visual direction applied.
- [x] Existing scroll choreography and functional routes preserved.
- [x] Generated assets placed, compressed and inspected.
- [x] Matching full and focused comparisons completed after corrections.
- [x] Browser interaction and accessibility regression checks passed.
- [x] Local preview left running; no publication performed.
