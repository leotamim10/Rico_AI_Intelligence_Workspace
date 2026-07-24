# Xai – Intelligence Workspace · 2-Day Sprint Board

**Strategy:** Build first, document second. Figma is reverse-engineered from working code on Day 2, which turns a design exercise into a mechanical one.

**Non-negotiables — all five must exist by the end of Day 2:**
public repo · live URL · public Figma link · product doc PDF · walkthrough video

---

## Pre-Sprint (45 minutes, do this before Day 1 starts)

- [ ] Create repo, push bare Next.js app, connect Vercel, confirm the live URL loads. **Deployment gate secured on hour one.**
- [ ] Drop `CLAUDE.md` into the repo root (provided separately). Do not prompt Claude Code before this file exists.
- [ ] Sketch the scroll on paper: what's on screen at 0%, 25%, 50%, 75%, 100%. Ten minutes, pen only. This is the one design decision you can't delegate.
- [ ] Pick your accent hue and commit to it. Everything else in the token set is already decided in `CLAUDE.md`.

---

## Day 1 — Ship All Four Sections (≈10h)

Goal at end of day: every required section exists and is deployed. Rough is fine. Missing is not.

### Block 1 · Foundation (1h)
- [ ] Next.js App Router + TypeScript + Tailwind; install `framer-motion`, `gsap`, `three`, `@react-three/fiber`, `@react-three/drei`
- [ ] Port tokens from `CLAUDE.md` into `globals.css` + Tailwind theme
- [ ] Create `lib/motion/easings.ts` and `lib/motion/variants.ts` **before any component** — everything imports from here
- [ ] Scaffold the folder structure exactly as specified in `CLAUDE.md`
- [ ] Commit + deploy. Verify live.

### Block 2 · Hero + particle system (3h — hard stop)
- [ ] `components/three/ParticleField.tsx`: single `Points` with a custom shader
- [ ] Three position attributes baked at init: `aChaos`, `aStructured`, `aClustered`
- [ ] Uniform `uProgress` (0→2) lerps between the three states in the vertex shader
- [ ] Dynamic import with `ssr: false`; `dpr={[1, 2]}`
- [ ] Hero copy + layout, staggered entrance via shared variants
- [ ] Scroll drives `uProgress` 0→1; damped cursor parallax on the camera

> **Hard stop at 3h.** If the shader morph isn't working, switch to SVG paths morphing with GSAP. The brief explicitly permits "advanced SVG + GSAP" as an alternative. A working fallback beats a broken centerpiece.

### Block 3 · Insight Flow (2.5h)
- [ ] Pinned `ScrollTrigger` section, one master timeline scrubbed by scroll
- [ ] Wrap in `gsap.context()` with cleanup on unmount; register plugin client-side only
- [ ] Three stages — Ingest / Analyze / Generate — as states of one system, not three cards
- [ ] Geometry motion only: `stroke-dashoffset` path draws, mask wipes, transforms. **No fade-only transitions.**
- [ ] Active-stage indicator using Framer Motion `layoutId`
- [ ] Hover + focus states on each stage

### Block 4 · Dashboard (2.5h)
- [ ] `lib/data/mock.ts`: one time series, four KPIs, six table rows, three tabs
- [ ] Shell: sidebar, top bar, main grid — spacing and hierarchy matter more than the chart
- [ ] Hand-rolled SVG chart styled to tokens (a default-styled chart library reads as "template" instantly)
- [ ] Tab switching with `layoutId` indicator + content transition
- [ ] Scroll-into-view stagger, fires once
- [ ] Row / card / nav hover feedback at 150ms

> **Test:** screenshot it. Would this pass as a real SaaS product screenshot? If it has a headline and a CTA, it's still a marketing section — fix it.

### Block 5 · Signature moment (1h)
- [ ] Reuse `ParticleField`, drive `uProgress` 1→2 into the clustered state
- [ ] Add fog or depth fade for parallax depth
- [ ] Pin the section so the morph owns the viewport while it happens

**Day 1 exit criteria:** four sections live on the deployed URL. Commit and push before you stop.

---

## Day 2 — Polish, Then Deliverables (≈9h)

### Block 6 · Quality pass (2h)
- [ ] Chrome DevTools performance profile; hold 60fps
- [ ] Pause the render loop when the canvas is offscreen
- [ ] `prefers-reduced-motion`: render static end-states, no scrubbing
- [ ] Responsive: reduce particle count and unpin sections on small screens rather than shipping broken pinning
- [ ] Keyboard reachability + visible focus rings
- [ ] Strip console logs and dead code; extract any repeated JSX into `components/ui`
- [ ] Lighthouse desktop: Performance ≥ 85, CLS 0
- [ ] Safari check — WebGL and `backdrop-filter` break there first

### Block 7 · Figma reverse-build (3h)
Rebuild what already exists. No design decisions required — you're documenting.

- [ ] **30m** — File setup: pages `01 Foundations`, `02 Screens`. Take clean screenshots of your live site for reference.
- [ ] **45m** — Foundations page: color styles, text styles (6 sizes max), spacing scale swatches, radius scale. Publish as real Figma styles, not rectangles.
- [ ] **60m** — Components with variants (this is the specific thing the brief checks):
  - Button — primary / ghost / icon × default / hover
  - Card — default / hover
  - Nav item — default / active
  - Tab — default / active
  - Table row — default / hover
  - Auto Layout on every one
- [ ] **45m** — Three screen frames rebuilt from screenshots: Hero, Insight Flow, Dashboard. Use your components. Use auto layout for the dashboard grid.
- [ ] **20m** — Rename every layer and frame properly. "Frame 47" is the thing that reads as careless.
- [ ] **10m** — Set link sharing to *Anyone with the link → can view*. **Verify in a private browser window.**

### Block 8 · Product doc PDF (1.5h)
Write it in Markdown, export to PDF. Six sections:

- [ ] Product idea — what Xai is, who the decision-maker is, what they get
- [ ] How the narrative (raw data → structured intelligence → actionable insight → automations) decomposed into four page sections
- [ ] Page structure and the scroll as a user flow
- [ ] Design system: type scale, spacing scale, color logic, and *why* each
- [ ] Motion rationale: your easing curves, duration bands, and what each animation communicates
- [ ] Trade-offs and what you'd do with more time — **name the 2-day constraint honestly here.** Stated trade-offs read as engineering judgment; unexplained gaps read as sloppiness.
- [ ] Embed the Figma link inside the doc, export PDF

### Block 9 · README (45m)
- [ ] Overview, live URL, Figma link, video link
- [ ] Stack table
- [ ] Local setup steps
- [ ] **Animation architecture section** — how `lib/motion` centralizes easings and variants, why GSAP owns pinned scroll and Framer Motion owns component state, how the particle shader morph works
- [ ] Performance notes

### Block 10 · Video (1h)
- [ ] 3–5 min screen recording. Scroll the page once end to end, then narrate: why these easings, why geometry motion over fades, how the shader morph works. Show the shader and the GSAP timeline briefly.
- [ ] Upload to YouTube (unlisted) or Drive
- [ ] **Verify the link in a private window**

### Block 11 · Final audit (45m)
- [ ] Fresh clone into a new folder → `npm install` → `npm run dev`. If that fails, nothing else matters.
- [ ] Production deploy from `main`; walk the live site on a phone
- [ ] All five links tested in a private window
- [ ] Submission email: five links in a clean list, one short paragraph of context

---

## Cut List (in this order, if you fall behind)

1. Third dashboard tab
2. Safari-specific polish
3. Mobile responsive → ship desktop-only and say so in the doc
4. Dashboard entrance stagger
5. Cursor parallax on the hero

**Never cut:** any of the four sections · deployment · Figma link · README · video · product doc

---

## The Two Failure Modes to Watch

**Generated output looks like a template.** The brief penalizes this explicitly. Mitigation is `CLAUDE.md` plus one rule: after each section, screenshot it and ask yourself whether it could be any other AI product's site. If yes, change the typography or spacing until it couldn't be.

**Time disappears into the shader.** The 3h hard stop exists for exactly this reason. Set an actual timer.
