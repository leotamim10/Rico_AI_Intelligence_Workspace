# Figma Reverse-Build Sheet — Xai Intelligence Workspace

Rebuild what already ships in code. No design decisions — every value below is
the live token or the real component. Target ~3h (Block 7). Work top to bottom.

**Create a _design file_, not a Make file:** figma.com → **New design file**
(URL should read `figma.com/design/…`). When done: **Share → Anyone with the
link → Can view**, then open it in a private window to confirm.

---

## 0 · Setup (30m)

- Two pages: **`01 Foundations`** and **`02 Screens`**.
- Open the live site at `reco-ai-intelligence-workspace.vercel.app` and take
  clean full-screen screenshots of: **Hero**, **Insight Flow** (resolved state),
  **Dashboard**. Drop them on a scratch area of `02 Screens` as tracing refs.
- Set the Figma canvas/background to `#08090A` so contrast reads true.
- Fonts: install/enable **Inter**, **Geist**, **Geist Mono** (Figma has all
  three). Weights used: **400 / 500 / 600 only** — never 700+.

---

## 1 · Foundations — Color styles (publish as real styles, not rectangles)

Create each as a **color style** named exactly as below (use `/` for groups).

| Style name | Hex | Use |
|---|---|---|
| `bg` | `#08090A` | Page |
| `surface/1` | `#0E1011` | Raised panel |
| `surface/2` | `#16181A` | Card on panel |
| `surface/3` | `#1E2124` | Hover state |
| `border` | `#232729` | 1px hairlines |
| `border/strong` | `#303538` | Stronger hairline |
| `text/primary` | `#F2F4F5` | Headlines, key text |
| `text/secondary` | `#9BA3A8` | Body |
| `text/tertiary` | `#7B838A` | Labels, metadata (AA-safe) |
| `accent` | `#4F8FF7` | Single accent — ≤3 per viewport |
| `accent/muted` | `#2C4E85` | Muted accent |
| `positive` | `#3FB984` | Positive delta |
| `negative` | `#E5615B` | Negative delta |

> `accent/glow` (`rgba(79,143,247,0.14)`) is a radial fill behind the hero canvas
> only — make it a loose radial ellipse, not a style.

## 1 · Foundations — Text styles (6 max)

Font / size / line-height / weight / letter-spacing. Body & display = Inter/Geist
sans; `mono` = Geist Mono. Set line-height in px where shown.

| Style name | Font | Size | Line | Weight | Tracking |
|---|---|---|---|---|---|
| `display` | Geist | 56 | 59 (1.05) | 600 | -0.03em |
| `h1` | Geist | 40 | 44 (1.10) | 600 | -0.025em |
| `h2` | Geist | 28 | 34 (1.20) | 500 | -0.02em |
| `h3` | Inter | 20 | 26 (1.30) | 500 | -0.01em |
| `body` | Inter | 15 | 23 (1.55) | 400 | 0 |
| `small` | Inter | 13 | 20 (1.50) | 400 | 0 |
| `mono` | Geist Mono | 13 | 18 (1.40) | 400 | 0 (tabular figures) |

> That's 7 rows; the brief caps at "6 sizes max" — if you must trim, merge `h3`
> into `body`-scale and keep display/h1/h2/body/small/mono. Turn on
> **tabular figures** for `mono` (Type settings → Number → Tabular).

## 1 · Foundations — Spacing & radius swatches

- **Spacing scale** (draw as labelled squares): `4 · 8 · 12 · 16 · 24 · 32 · 48 ·
  64 · 96 · 128`. This is the only allowed set.
- **Radius scale**: `sm 6` · `md 10` · `lg 14`. Three rounded swatches, labelled.
- Note on the page: max content width **1200**, section padding **128 / 64**
  (desktop / mobile), dashboard gutter **24**.

---

## 2 · Components with variants (60m — the graded part)

Every component: **Auto Layout on**, use color + text **styles** (never raw
hex), corners from the radius scale. Build the `default` variant, then duplicate
into a **variant set** and adjust. Use a **`State`** property (`default` /
`hover` / `active`) and, where noted, a **`Type`** property.

### Button  → `Type` = primary / ghost / icon · `State` = default / hover
Auto Layout: padding `8` vertical / `16` horizontal (icon: `8` all), gap `8`,
radius `sm (6)`, text `small` weight 500.

| Type · State | Fill | Text / icon | Border |
|---|---|---|---|
| primary · default | `accent` | `bg` (#08090A) | none |
| primary · hover | `accent` @ 92% + subtle lift | `bg` | none |
| ghost · default | none | `text/secondary` | `1px border` |
| ghost · hover | `surface/2` | `text/primary` | `1px border` |
| icon · default | none | `text/secondary` glyph | `1px border`, 1:1 |
| icon · hover | `surface/2` | `text/primary` glyph | `1px border`, 1:1 |

> The live page is intentionally CTA-free, so Button is a system primitive — the
> nav items and tabs below are the real on-page instances of the pattern.

### Card  → `State` = default / hover
The dashboard KPI tile / panel. Auto Layout vertical, padding `16` (or `20`),
gap `8`, radius `md (10)`.

| State | Fill | Border |
|---|---|---|
| default | `surface/2` | `1px border` |
| hover | `surface/3` | `1px border` |

Contents: label in `small` `text/secondary`; value in `mono`-scale (or 28/500)
`text/primary`; delta chip in `mono` with `positive`/`negative`.

### Nav item  → `State` = default / active  (Dashboard sidebar)
Auto Layout horizontal, gap `12`, padding `8` v / `8` h, radius `sm (6)`, icon
16px + label `small`.

| State | Fill | Text + icon | Marker |
|---|---|---|---|
| default | none | `text/secondary` | — |
| hover | `surface/2` | `text/primary` | — |
| active | `surface/2` | icon `accent`, label `text/primary` | — |

> On the live site the active marker animates via `layoutId`; in Figma just show
> the `surface/2` fill + accent icon as the resting active state.

### Tab  → `State` = default / active  (Dashboard view switcher)
Auto Layout, padding `6` v / `12` h, radius `sm (6)`, text `small`.

| State | Fill | Text |
|---|---|---|
| default | none | `text/tertiary` |
| hover | none | `text/secondary` |
| active | `surface/3` | `text/primary` |

### Table row  → `State` = default / hover  (Signals table)
Auto Layout horizontal, 5 cells, `1px border` **top** only, cell padding `12`
v / `16` h. Columns: Source · Event · Severity · Confidence · Latency.

| State | Fill |
|---|---|
| default | none (`bg`) |
| hover | `surface/3` |

Cells: Source `small text/secondary`; Event `small text/primary`; Severity =
dot + label (`negative` = Critical, `accent`/amber = Elevated, `positive` =
Nominal); Confidence & Latency in `mono` right-aligned, tabular.

---

## 3 · Screen frames (45m) — rebuild from screenshots, use your components

Three frames on `02 Screens`, each **1440 × 900** (desktop), fill `bg`.

1. **Hero** — centered column, max width ~832 (`max-w-208`). Top to bottom:
   eyebrow (`mono` `text/tertiary`, letter-spaced, uppercase "Intelligence
   Workspace") → `display` headline "From raw signal to decided action." →
   `body` `text/secondary` subcopy (≤68 char lines) → two **StatChip** pills.
   Behind it, a faint `accent/glow` radial + scattered dots to suggest the
   particle field.
2. **Insight Flow** — full-width with `1px border` top and left/right rails
   inside a 1200 column. Left: stage index list (01 Ingest / 02 Analyze / 03
   Generate) with the active one marked. Right: the sources→hub→destinations
   node diagram (nodes + connecting paths).
3. **Dashboard** — use **Auto Layout** for the grid. Sidebar (**Nav item** ×6)
   → main: breadcrumb + "Updated 12s ago" → KPI row (**Card** ×4: Signals
   ingested 48,213 / Anomalies 1,072 / Mean time to insight 1.2s / Automations
   347) → throughput chart panel → tab bar (**Tab** ×3) + signals table
   (**Table row** ×6). Panel radius `lg (14)`, gutter `24`.

---

## 4 · Hygiene + share (30m)

- **Rename every layer and frame.** No "Frame 47", no "Group 12". Name by role:
  `Hero / Headline`, `Dashboard / KPI / Signals ingested`, etc. This is graded.
- Reorder the layer panel so it reads top-to-bottom like the design.
- **Share → Anyone with the link → Can view.** Copy the link.
- **Open the link in a private/incognito window** — confirm it shows the file,
  not a "Sign up or Log in" wall.
- Paste the `figma.com/design/…` link to me; I embed it and export the final PDF.

---

### Quick reference — numbers you'll retype most

```
Radius   sm 6 · md 10 · lg 14
Spacing  4 8 12 16 24 32 48 64 96 128
Accent   #4F8FF7   Page #08090A
Text     primary #F2F4F5 · secondary #9BA3A8 · tertiary #7B838A
Surface  1 #0E1011 · 2 #16181A · 3 #1E2124   Border #232729
```
