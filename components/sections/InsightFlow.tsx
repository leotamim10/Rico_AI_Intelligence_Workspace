"use client";

import { motion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";

import { ease, gsapEase } from "@/lib/motion/easings";

/* ------------------------------------------------------------------ *
 * Geometry for the single system diagram (viewBox 900 x 560).
 * Sources flow into an entry, self-organize into a hub network,
 * then route out to destinations. Coordinates are authored once here.
 * ------------------------------------------------------------------ */

type P = { x: number; y: number };

const ENTRY: P = { x: 355, y: 290 };

const SOURCES: P[] = [
  { x: 70, y: 120 },
  { x: 70, y: 210 },
  { x: 70, y: 300 },
  { x: 70, y: 390 },
  { x: 70, y: 470 },
];

const HUB: P[] = [
  { x: 395, y: 225 },
  { x: 500, y: 205 },
  { x: 455, y: 300 },
  { x: 545, y: 335 },
  { x: 405, y: 360 },
  { x: 565, y: 270 },
];

const EXIT: P = HUB[5];

const DESTS: P[] = [
  { x: 835, y: 150 },
  { x: 835, y: 255 },
  { x: 835, y: 360 },
  { x: 835, y: 455 },
];

/** Analyze edges as index pairs into HUB, plus the entry link (-1). */
const EDGES: [number, number][] = [
  [-1, 2],
  [2, 0],
  [0, 1],
  [1, 5],
  [5, 3],
  [3, 2],
  [2, 4],
  [4, -1],
];

const hubPoint = (i: number): P => (i === -1 ? ENTRY : HUB[i]);

/** Horizontal S-curve between two points. */
function curve(a: P, b: P): string {
  const mx = (a.x + b.x) / 2;
  return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
}

const STAGES = [
  {
    id: "ingest",
    label: "Ingest",
    body: "Pull events, logs, and tables from 40+ sources into one stream.",
  },
  {
    id: "analyze",
    label: "Analyze",
    body: "Correlate signals, cluster the noise, and surface the anomalies.",
  },
  {
    id: "generate",
    label: "Generate",
    body: "Route the resolved insight to the automations in your stack.",
  },
] as const;

/** Shared draw-in styling for an SVG path. pathLength=1 normalizes length. */
const drawProps = {
  pathLength: 1,
  style: { strokeDasharray: 1, strokeDashoffset: 1 } as React.CSSProperties,
};

export function InsightFlow() {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;
    if (!root || !pin) return;

    gsap.registerPlugin(ScrollTrigger);
    // Skip the pin + scrub for reduced-motion and small/touch screens —
    // scroll-jacking a stacked column on mobile is the "broken pinning"
    // failure mode. Render the resolved diagram statically instead.
    const staticMode =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      window.matchMedia("(max-width: 767px)").matches;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(root);

      if (staticMode) {
        // Static resolved end-state: everything drawn, every node present.
        gsap.set(q(".draw"), { strokeDashoffset: 0 });
        gsap.set(q(".source-node,.hub-node"), { attr: { r: 5 } });
        gsap.set(q(".dest-node"), { attr: { r: 6 } });
        setActive(2);
        return;
      }

      gsap.set(q(".source-node,.hub-node,.dest-node"), { attr: { r: 0 } });

      const tl = gsap.timeline({
        defaults: { ease: "none" }, // scrubbed — linear is correct here
        scrollTrigger: {
          trigger: pin,
          start: "top top",
          end: "+=2600",
          scrub: 0.5,
          pin: true,
          anticipatePin: 1,
          onUpdate: (self) => {
            const p = self.progress;
            const s = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
            setActive((prev) => (prev === s ? prev : s));
          },
        },
      });

      // Ingest — sources appear, feed lines draw toward the entry.
      tl.to(q(".source-node"), { attr: { r: 5 }, stagger: 0.08, duration: 0.5 }, 0)
        .to(q(".ingest-path"), { strokeDashoffset: 0, stagger: 0.1, duration: 1 }, 0.1)
        // Analyze — hub nodes resolve, network edges wire up.
        .to(q(".hub-node"), { attr: { r: 5 }, stagger: 0.07, duration: 0.5 }, 1)
        .to(q(".analyze-edge"), { strokeDashoffset: 0, stagger: 0.09, duration: 1 }, 1.1)
        // Generate — routes draw out, destinations light up.
        .to(q(".generate-path"), { strokeDashoffset: 0, stagger: 0.1, duration: 1 }, 2)
        .to(q(".dest-node"), { attr: { r: 6 }, stagger: 0.08, duration: 0.5 }, 2.1);

      stRef.current = tl.scrollTrigger ?? null;
    }, root);

    return () => ctx.revert();
  }, []);

  // Click a stage → scrub to its segment.
  const goToStage = (i: number) => {
    const st = stRef.current;
    if (!st) return;
    const target = st.start + ((i + 0.5) / 3) * (st.end - st.start);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section ref={rootRef} aria-label="How Xai turns signal into insight">
      <div
        ref={pinRef}
        className="border-t border-border md:h-screen md:overflow-hidden"
      >
        {/* Framed content column — hairline rails, Clerk/Linear rhythm.
            Pinned + centered on desktop; normal-flow with padding on
            mobile so the stacked column isn't clipped. */}
        <div className="mx-auto flex h-full max-w-[1200px] items-center border-x border-border px-6 py-24 sm:px-12 md:py-0">
          <div className="flex w-full flex-col gap-16 md:flex-row md:items-center md:gap-24">
          {/* Left — stage index with a layoutId active marker */}
          <div className="w-full shrink-0 md:w-[340px]">
            <span className="font-mono text-mono uppercase tracking-[0.22em] text-text-tertiary">
              The pipeline
            </span>
            <h2 className="mt-4 font-display text-h2 text-text-primary">
              One system,
              <br />
              three states.
            </h2>

            <ul className="mt-10 flex flex-col gap-1">
              {STAGES.map((stage, i) => {
                const isActive = active === i;
                return (
                  <li key={stage.id}>
                    <button
                      type="button"
                      onClick={() => goToStage(i)}
                      aria-current={isActive ? "step" : undefined}
                      className="group relative flex w-full items-start gap-4 rounded-md border border-transparent px-4 py-3 text-left transition-colors duration-[160ms] hover:bg-surface-2 focus-visible:bg-surface-2"
                    >
                      {/* active marker travels between stages */}
                      <span className="absolute left-0 top-3 h-[calc(100%-24px)] w-px">
                        {isActive && (
                          <motion.span
                            layoutId="insight-stage-marker"
                            className="absolute inset-0 bg-accent"
                            transition={ease.spring}
                          />
                        )}
                      </span>
                      <span
                        className={`tabular mt-0.5 font-mono text-mono transition-colors duration-[160ms] ${
                          isActive ? "text-accent" : "text-text-tertiary"
                        }`}
                      >
                        0{i + 1}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span
                          className={`text-h3 transition-colors duration-[160ms] ${
                            isActive ? "text-text-primary" : "text-text-secondary"
                          }`}
                        >
                          {stage.label}
                        </span>
                        <span className="text-small text-text-tertiary">
                          {stage.body}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right — the single system diagram */}
          <div className="min-w-0 flex-1">
            <svg
              viewBox="61 51 783 487"
              className="h-auto w-full"
              fill="none"
              role="img"
              aria-label="Sources feeding an analysis network that routes to destinations"
            >
              {/* Ingest paths */}
              {SOURCES.map((s, i) => (
                <path
                  key={`in-${i}`}
                  className="ingest-path draw"
                  d={curve(s, ENTRY)}
                  stroke="var(--border-strong)"
                  strokeWidth={1.25}
                  {...drawProps}
                />
              ))}

              {/* Analyze edges */}
              {EDGES.map(([a, b], i) => (
                <path
                  key={`ed-${i}`}
                  className="analyze-edge draw"
                  d={curve(hubPoint(a), hubPoint(b))}
                  stroke="var(--accent-muted)"
                  strokeWidth={1.25}
                  {...drawProps}
                />
              ))}

              {/* Generate paths */}
              {DESTS.map((dst, i) => (
                <path
                  key={`out-${i}`}
                  className="generate-path draw"
                  d={curve(EXIT, dst)}
                  stroke="var(--border-strong)"
                  strokeWidth={1.25}
                  {...drawProps}
                />
              ))}

              {/* Nodes */}
              {SOURCES.map((s, i) => (
                <circle
                  key={`sn-${i}`}
                  className="source-node"
                  cx={s.x}
                  cy={s.y}
                  r={0}
                  fill="var(--surface-3)"
                  stroke="var(--text-tertiary)"
                  strokeWidth={1}
                />
              ))}
              {HUB.map((h, i) => (
                <circle
                  key={`hn-${i}`}
                  className="hub-node"
                  cx={h.x}
                  cy={h.y}
                  r={0}
                  fill="var(--bg)"
                  stroke="var(--accent)"
                  strokeWidth={1.25}
                />
              ))}
              {DESTS.map((d, i) => (
                <circle
                  key={`dn-${i}`}
                  className="dest-node"
                  cx={d.x}
                  cy={d.y}
                  r={0}
                  fill="var(--surface-3)"
                  stroke="var(--text-secondary)"
                  strokeWidth={1}
                />
              ))}
            </svg>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}
