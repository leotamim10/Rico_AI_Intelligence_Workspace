# Xai — Intelligence Workspace

A single-page interactive product experience that communicates one narrative
through motion: **raw data → structured intelligence → actionable insight → AI
automations.** Built to a product-quality bar (Stripe / Linear / Vercel), not as
a marketing page.

The page is one continuous scroll of four sections. A GPU particle field runs
the spine of the story — it starts as chaotic noise, resolves into a structured
lattice as you scroll the hero, holds steady through the product surface, then
clusters into grouped insight at the close. The same particle system, driven
across a single `uProgress` uniform, bookends the experience.

## Links

| | |
|---|---|
| **Live** | https://reco-ai-intelligence-workspace.vercel.app |
| **Figma** | https://www.figma.com/make/3U24rtY2ZBF17HZqTdjG1n/App-Builder?fullscreen=1 |
| **Walkthrough video** | https://youtu.be/pTYRjmJRxrA |

## Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Static-prerendered single page, RSC by default, `'use client'` only where needed |
| Language | TypeScript 5 (strict, no `any`) | Every component typed |
| Styling | Tailwind CSS v4 (CSS-first `@theme`) | Design tokens defined once in `globals.css`, mirrored into the Tailwind theme |
| Component motion | Framer Motion 12 | Entrance variants, tab/layout animation (`layoutId`), hover/focus |
| Scroll & timelines | GSAP 3 + ScrollTrigger | Pinned sections, scrubbed timelines, SVG path draws |
| 3D | Three.js 0.185 via React Three Fiber 9 + drei | The particle field only |
| Type | Inter (body), Geist (display), Geist Mono (numerals) | Weights 400/500/600 only |

Library ownership is strict — the three animation systems never touch the same
element. GSAP owns pinned scroll, Framer Motion owns component state, R3F owns
the particle field.

## Local setup

Requires Node 20+.

```bash
npm install
npm run dev -- -p 7000      # http://localhost:7000
```

Production build (what the deployed site runs):

```bash
npm run build
npm run start -- -p 7000
```

## Project structure

```
app/
  layout.tsx        fonts + metadata
  page.tsx          composition only — no logic, no styles
  globals.css       design tokens (color, type, spacing, radius) as CSS vars + @theme

components/
  sections/         Hero · InsightFlow · Dashboard · SignatureMoment
  ui/               Chart · Metric · StatChip  (project-specific primitives)
  three/            Scene · ParticleField + GLSL shaders

lib/
  motion/           easings, variants, and the scroll/damping hooks
  data/mock.ts      dashboard mock data
```

Sections compose from `ui/` primitives; repeated markup is extracted (e.g. the
mono stat pills under headlines are one `StatChip`). Three.js is dynamically
imported with `ssr: false`.

## Animation architecture

**Everything imports its motion from `lib/motion/`.** No easing or variant is
ever defined inside a component — `easings.ts` holds the four curves and the
duration bands, `variants.ts` holds the shared Framer Motion variants, and GSAP
tweens read easing strings kept in sync with the same curves.

The four easings, and what each is for:

```ts
out    [0.16, 1, 0.30, 1]   // entrances — fast start, long settle
inOut  [0.65, 0, 0.35, 1]   // state changes, tab swaps
micro  [0.4, 0, 0.2, 1]     // hover, focus, toggles
spring stiffness 260 …      // physical motion, layout shifts
```

Duration bands: micro 120–180ms, element 300–450ms, section 600–900ms, and
`scene` — scroll-scrubbed, where duration *is* scroll distance.

**Why three libraries, each on its own turf:**

- **GSAP + ScrollTrigger** drives Insight Flow — one master timeline, pinned and
  scrubbed by scroll, drawing SVG paths via `stroke-dashoffset`. Wrapped in
  `gsap.context()` with cleanup on unmount; the plugin registers client-side
  only.
- **Framer Motion** drives everything stateful: entrance variants (geometry, not
  opacity alone), the active-stage and active-tab indicators via `layoutId`, and
  hover/focus.
- **R3F / Three.js** owns the particle field and nothing else.

**The shader morph.** One `THREE.Points` with a `BufferGeometry` holds three
baked position attributes per particle — `aChaos` (random cloud),
`aStructured` (grid lattice), `aClustered` (grouped). A single uniform
`uProgress ∈ [0, 2]` is lerped entirely on the GPU in the vertex shader:
`aChaos → aStructured` across `[0,1]`, then `aStructured → aClustered` across
`[1,2]`, with a smoothstep on each leg so points settle rather than arrive
linearly. The **Hero** drives `uProgress` 0→1; the **Signature Moment** drives
1→2 — two ends of the same continuous morph, so they stay in sync. A small
`uTime` sine adds an idle breathing drift. Color and fog are derived in the
shader from a `vStructure` varying, so "how resolved a point is" drives its
appearance without extra CPU work.

Scroll never assigns `uProgress` directly — it sets a target that a damped hook
(`useDampedValue`, lerp ~0.09) eases toward, so scrubbing feels weighted rather
than snapping frame-to-frame.

## Performance notes

- **Render loop parks when offscreen.** `Scene` sets R3F's
  `frameloop="never"` whenever its section leaves the viewport, so no GPU work
  happens for a canvas you can't see.
- **Only `transform` and `opacity`** are animated on DOM elements — never
  `width`/`height`/`top`/`left`. `dpr={[1, 2]}` caps the device-pixel-ratio.
- **Mobile / touch (`≤767px`) unpins.** Tall pinned scroll ranges collapse to a
  single viewport and the particle field snaps to its resolved end-state — no
  scroll-jacking on touch. Particle count drops from ~6000 to ~2000.
- **`prefers-reduced-motion`** renders the final state statically: no scrubbing,
  no parallax, every path drawn.
- **Accessibility.** All interactive controls are real `<button>`s with a
  global keyboard-only `:focus-visible` ring; the SVG chart and diagram carry
  `role="img"` + `aria-label`.

## Deployment

Deployed on Vercel. Production deploys are currently manual from the repo root:

```bash
npx vercel --prod
```
