# Xai – Intelligence Workspace

Single-page interactive product experience. This is a **product-quality UI**, not a landing page and not a marketing site.

**Narrative the page must communicate through motion:**
raw data → structured intelligence → actionable insight → AI automations

**Quality bar:** Stripe, Linear, Vercel. Calm, technically confident, built for decision-makers.

---

## Hard Prohibitions

These are graded against explicitly. Violating any of them fails the submission.

- **No UI kit or component library styling.** No shadcn, no MUI, no DaisyUI, no default Tailwind component patterns. Every component is written for this project.
- **No fade-only transitions.** Opacity alone is a shallow animation. Motion must involve geometry: transforms, path draws, masks, morphs.
- **No stock illustrations, no Lottie files, no icon-in-a-rounded-square marketing cards.**
- **No arbitrary values.** Every size, space, color, duration, and easing comes from the token set below. If a value isn't in the scale, the scale is wrong — change the scale, don't inline the value.
- **No animation defined inside a component.** All easings and variants import from `lib/motion/`.
- **No emoji anywhere in the UI.**
- **No generic AI-product copy.** Never write "Unlock the power of AI", "Transform your data", "Supercharge", "Seamlessly", or "Revolutionize". Write like product UI: specific, short, declarative.

---

## Design Tokens

Define once in `globals.css` as CSS variables and mirror in the Tailwind theme. Never hardcode.

### Color

Dark-first. One accent. Restraint is graded.

```css
--bg:            #08090A;   /* page */
--surface-1:     #0E1011;   /* raised panel */
--surface-2:     #16181A;   /* card on panel */
--surface-3:     #1E2124;   /* hover state */
--border:        #232729;   /* hairlines, 1px */
--border-strong: #303538;

--text-primary:   #F2F4F5;
--text-secondary: #9BA3A8;
--text-tertiary:  #5F676C;

--accent:        #4F8FF7;   /* single accent — adjust hue if you prefer, but keep exactly one */
--accent-muted:  #2C4E85;
--accent-glow:   rgba(79, 143, 247, 0.14);

--positive:      #3FB984;
--negative:      #E5615B;
```

Rules: accent appears on at most three elements per viewport. Borders are 1px and low-contrast. No gradients except a single subtle radial glow behind the hero canvas. No glassmorphism.

### Type

One family: Inter or Geist. Three weights: 400, 500, 600. Never 700+.

```
display   56px / 1.05 / 600 / -0.03em
h1        40px / 1.10 / 600 / -0.025em
h2        28px / 1.20 / 500 / -0.02em
h3        20px / 1.30 / 500 / -0.01em
body      15px / 1.55 / 400 / 0
small     13px / 1.50 / 400 / 0
mono      13px / 1.40 / 400 / 0    (data, labels, metrics — use a mono for numerals)
```

Body copy never exceeds 68 characters per line. Numerals in the dashboard use tabular figures (`font-variant-numeric: tabular-nums`).

### Spacing

8pt base. Allowed values only: `4, 8, 12, 16, 24, 32, 48, 64, 96, 128`.
Section vertical padding: 128px desktop, 64px mobile.
Max content width: 1200px. Dashboard panel gutter: 24px.

### Radius & elevation

```
--radius-sm: 6px    (buttons, inputs, pills)
--radius-md: 10px   (cards)
--radius-lg: 14px   (panels)
```

No box-shadows for elevation. Use `--surface-*` steps and 1px borders instead. Shadows only on floating overlays, and then a single soft one.

---

## Motion Charter

Everything lives in `lib/motion/easings.ts` and `lib/motion/variants.ts`.

### Duration bands

```
micro    120–180ms   hover, focus, toggles, color changes
element  300–450ms   card entrance, tab content swap
section  600–900ms   section entrances, stage transitions
scene    scrubbed    scroll-driven — duration is scroll distance, not time
```

### Easings

```ts
export const ease = {
  out:     [0.16, 1, 0.30, 1],      // entrances — expo-ish, fast start, long settle
  inOut:   [0.65, 0, 0.35, 1],      // state changes, tab swaps
  micro:   [0.4, 0, 0.2, 1],        // hover, focus
  spring:  { type: 'spring', stiffness: 260, damping: 32, mass: 0.9 },
} as const;
```

Never use `linear` except for scroll-scrubbed timelines. Never use default `ease`.

### Rules

- Nothing animates without communicating something. If you can't say what an animation means, delete it.
- Entrances fire once. No looping ambient animation except the particle field's idle drift.
- Stagger children at 40–60ms. Never more than 8 staggered items.
- Only animate `transform` and `opacity` on DOM elements. Never animate `width`, `height`, `top`, or `left`.
- Scroll-driven values are always damped toward a target (lerp ~0.08), never assigned directly.
- Every scroll animation has a `prefers-reduced-motion` path that renders the final state statically.

### Library ownership — do not mix on the same element

- **GSAP + ScrollTrigger** — pinned sections, scrubbed timelines, SVG path drawing
- **Framer Motion** — component state, layout animations (`layoutId`), entrance variants, hover/focus
- **R3F / Three.js** — the particle field only

---

## Architecture

```
app/
  layout.tsx
  page.tsx                  composition only — no logic, no styles
  globals.css               tokens

components/
  sections/
    Hero.tsx
    InsightFlow.tsx
    Dashboard.tsx
    SignatureMoment.tsx
  ui/                       Button, Card, Tab, NavItem, TableRow, Metric, Chart
  three/
    Scene.tsx
    ParticleField.tsx
    shaders/particle.vert.glsl
    shaders/particle.frag.glsl

lib/
  motion/
    easings.ts
    variants.ts
    useScrollProgress.ts
    useDampedValue.ts
  data/mock.ts
```

Rules:
- Sections compose from `ui/` primitives. If markup appears twice, extract it.
- All components typed. No `any`.
- Three.js is dynamically imported with `ssr: false`.
- `'use client'` only where genuinely needed.

---

## Particle System Spec

One system, three states, reused by both Hero and SignatureMoment.

- Single `THREE.Points` with `BufferGeometry`. ~6000 particles desktop, 2000 mobile.
- Three position attributes baked at init: `aChaos` (random cloud), `aStructured` (grid lattice), `aClustered` (k-means-style groups).
- Uniform `uProgress` in `[0, 2]`. Vertex shader lerps `aChaos → aStructured` across `[0,1]` and `aStructured → aClustered` across `[1,2]`. All interpolation on the GPU.
- Hero drives `uProgress` 0→1. SignatureMoment drives 1→2.
- Idle drift via a small `uTime` sine offset. Subtle — it should read as breathing, not floating.
- `dpr={[1, 2]}`. Pause the render loop when the canvas is out of viewport.

---

## Copy Guidelines

Product voice, not marketing voice. Short, concrete, declarative.

Good: "Ingest from 40+ sources." · "Anomalies surfaced in 1.2s." · "Route insights to your stack."
Bad: "Unlock the power of your data." · "AI-powered insights, reimagined."

Dashboard labels must look like a real product: plausible metric names, realistic numbers, no lorem ipsum, no round numbers like 100% or 1,000.

---

## Working Notes for Claude Code

- After building any visual section, ask me to screenshot it and paste it back before iterating. You cannot evaluate spacing or hierarchy from source.
- Build one section per session. Keep context clean.
- Before writing a component, check whether a primitive in `components/ui/` already covers it.
- When you reach for a default pattern — a centered marketing section, an icon card grid, a gradient hero — stop and propose something specific to this product instead.
- If a requirement here conflicts with something I ask for in a prompt, flag the conflict rather than silently picking one.
