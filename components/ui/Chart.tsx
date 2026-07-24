"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { SeriesPoint } from "@/lib/data/mock";
import { duration, ease } from "@/lib/motion/easings";

type Props = { data: SeriesPoint[] };

const W = 760;
const H = 260;
const PAD = { l: 44, r: 16, t: 20, b: 28 };
const PW = W - PAD.l - PAD.r;
const PH = H - PAD.t - PAD.b;

/** Hand-rolled area chart. Line draws on scroll-in; nothing library-styled. */
export function Chart({ data }: Props) {
  const reduced = useReducedMotion();

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = min - (max - min) * 0.25;
  const hi = max + (max - min) * 0.15;

  const x = (i: number) => PAD.l + (i / (data.length - 1)) * PW;
  const y = (v: number) => PAD.t + (1 - (v - lo) / (hi - lo)) * PH;

  const line = data.map((d, i) => `${x(i)} ${y(d.value)}`).join(" L ");
  const linePath = `M ${line}`;
  const areaPath = `M ${x(0)} ${PAD.t + PH} L ${line} L ${x(data.length - 1)} ${
    PAD.t + PH
  } Z`;

  // Four horizontal gridlines with mono value labels.
  const rows = [0, 1, 2, 3].map((k) => {
    const v = lo + ((hi - lo) * k) / 3;
    return { gy: y(v), label: Math.round(v).toLocaleString() };
  });

  const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1];
  const last = data.length - 1;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Daily processed volume trend"
    >
      {/* gridlines + y labels */}
      {rows.map((r, i) => (
        <g key={i}>
          <line
            x1={PAD.l}
            x2={W - PAD.r}
            y1={r.gy}
            y2={r.gy}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={PAD.l - 10}
            y={r.gy + 3}
            textAnchor="end"
            className="tabular"
            fontFamily="var(--font-mono)"
            fontSize="10"
            fill="var(--text-tertiary)"
          >
            {r.label}
          </text>
        </g>
      ))}

      {/* area — flat translucent fill, not a gradient */}
      <motion.path
        d={areaPath}
        fill="var(--accent-glow)"
        initial={reduced ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: duration.section, ease: ease.out, delay: 0.15 }}
      />

      {/* line — draws in via pathLength */}
      <motion.path
        d={linePath}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={reduced ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 1.1, ease: ease.out }}
      />

      {/* last-point marker */}
      <motion.circle
        cx={x(last)}
        cy={y(data[last].value)}
        r={3.5}
        fill="var(--accent)"
        stroke="var(--bg)"
        strokeWidth={2}
        initial={reduced ? false : { opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: duration.element, ease: ease.out, delay: 0.9 }}
        style={{ transformOrigin: `${x(last)}px ${y(data[last].value)}px` }}
      />

      {/* x labels */}
      {ticks.map((t) => (
        <text
          key={t}
          x={x(t)}
          y={H - 8}
          textAnchor={t === 0 ? "start" : t === last ? "end" : "middle"}
          fontFamily="var(--font-mono)"
          fontSize="10"
          fill="var(--text-tertiary)"
        >
          {data[t].t}
        </text>
      ))}
    </svg>
  );
}
