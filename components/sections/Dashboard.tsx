"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { Chart } from "@/components/ui/Chart";
import { Metric } from "@/components/ui/Metric";
import {
  events,
  kpis,
  tabs,
  throughput,
  type EventRow,
  type Severity,
} from "@/lib/data/mock";
import { ease } from "@/lib/motion/easings";
import { riseInSm, staggerParent, swap } from "@/lib/motion/variants";

/* ----------------------------- sidebar ----------------------------- */

type NavKey =
  | "overview"
  | "signals"
  | "anomalies"
  | "routes"
  | "automations"
  | "settings";

const NAV: { key: NavKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "signals", label: "Signals" },
  { key: "anomalies", label: "Anomalies" },
  { key: "routes", label: "Routes" },
  { key: "automations", label: "Automations" },
  { key: "settings", label: "Settings" },
];

function NavGlyph({ name }: { name: NavKey }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.25,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
          <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
          <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
          <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
        </svg>
      );
    case "signals":
      return (
        <svg {...common}>
          <path d="M2.5 13 V9 M7 13 V5 M11.5 13 V7" />
        </svg>
      );
    case "anomalies":
      return (
        <svg {...common}>
          <path d="M8 2.5 L14 13.5 H2 Z" />
          <path d="M8 7 V9.5 M8 11.4 V11.5" />
        </svg>
      );
    case "routes":
      return (
        <svg {...common}>
          <path d="M2.5 8 H6.5 M6.5 8 C10 8 10 4 13.5 4 M6.5 8 C10 8 10 12 13.5 12" />
        </svg>
      );
    case "automations":
      return (
        <svg {...common}>
          <circle cx="4" cy="8" r="1.6" />
          <circle cx="12" cy="4" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <path d="M5.4 7.2 L10.6 4.7 M5.4 8.8 L10.6 11.3" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M2.5 5.5 H13.5 M2.5 10.5 H13.5" />
          <circle cx="6" cy="5.5" r="1.7" fill="var(--surface-1)" />
          <circle cx="10" cy="10.5" r="1.7" fill="var(--surface-1)" />
        </svg>
      );
  }
}

function Sidebar() {
  const [active, setActive] = useState<NavKey>("overview");
  return (
    <nav className="hidden w-52 shrink-0 flex-col gap-1 border-r border-border p-4 md:flex">
      <div className="mb-4 flex items-center gap-2 px-2">
        <span className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-small font-medium text-text-primary">Xai</span>
      </div>
      {NAV.map((item) => {
        const isActive = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setActive(item.key)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex items-center gap-3 rounded-sm px-2 py-2 text-small transition-colors duration-150 ${
              isActive
                ? "text-text-primary"
                : "text-text-tertiary hover:bg-surface-2 hover:text-text-secondary"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="dash-nav-active"
                className="absolute inset-0 -z-10 rounded-sm bg-surface-2"
                transition={ease.spring}
              />
            )}
            <span className={isActive ? "text-accent" : ""}>
              <NavGlyph name={item.key} />
            </span>
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/* ------------------------------ table ------------------------------ */

const SEVERITY: Record<Severity, { label: string; cls: string }> = {
  critical: { label: "Critical", cls: "text-negative" },
  elevated: { label: "Elevated", cls: "text-text-secondary" },
  nominal: { label: "Nominal", cls: "text-positive" },
};

function filterRows(tab: string): EventRow[] {
  if (tab === "anomalies") return events.filter((e) => e.severity !== "nominal");
  if (tab === "routes") return events.filter((e) => e.confidence >= 0.85);
  return events;
}

function EventsTable({ rows }: { rows: EventRow[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="text-mono uppercase tracking-wider text-text-tertiary">
          <th className="py-2 pr-4 font-normal">Source</th>
          <th className="py-2 pr-4 font-normal">Event</th>
          <th className="py-2 pr-4 font-normal">Severity</th>
          <th className="py-2 pr-4 text-right font-normal">Confidence</th>
          <th className="py-2 text-right font-normal">Latency</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const sev = SEVERITY[row.severity];
          return (
            <tr
              key={row.id}
              className="border-t border-border transition-colors duration-150 hover:bg-surface-3"
            >
              <td className="py-3 pr-4 text-small text-text-secondary">
                {row.source}
              </td>
              <td className="py-3 pr-4 text-small text-text-primary">
                {row.event}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex items-center gap-1.5 text-small ${sev.cls}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {sev.label}
                </span>
              </td>
              <td className="tabular py-3 pr-4 text-right font-mono text-mono text-text-secondary">
                {(row.confidence * 100).toFixed(0)}%
              </td>
              <td className="tabular py-3 text-right font-mono text-mono text-text-secondary">
                {row.latency}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/* ---------------------------- dashboard ---------------------------- */

const SUBTITLE: Record<string, string> = {
  signals: "All ingested signals, most recent first",
  anomalies: "Signals flagged above nominal severity",
  routes: "High-confidence signals routed to automations",
};

export function Dashboard() {
  const reduced = useReducedMotion();
  const [tab, setTab] = useState(tabs[0].id);
  const rows = filterRows(tab);

  const container = reduced ? undefined : staggerParent;
  const item = reduced ? undefined : riseInSm;

  return (
    <section
      aria-label="Xai workspace dashboard"
      className="border-t border-border"
    >
      <div className="mx-auto max-w-[1200px] border-x border-border px-6 py-24 sm:px-12 md:py-32">
        <motion.div
          variants={container}
          initial={reduced ? undefined : "hidden"}
          whileInView={reduced ? undefined : "show"}
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* section label */}
          <motion.div
            variants={item}
            className="mb-8 flex items-end justify-between gap-4"
          >
            <div className="flex flex-col gap-2">
              <span className="font-mono text-mono uppercase tracking-[0.22em] text-text-tertiary">
                The workspace
              </span>
              <h2 className="text-h2 text-text-primary">
                Every signal, one surface.
              </h2>
            </div>
            <span className="hidden items-center gap-2 rounded-sm border border-border bg-surface-1 px-3 py-1.5 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              <span className="tabular font-mono text-mono text-text-secondary">
                Live · Last 30 days
              </span>
            </span>
          </motion.div>

          {/* product panel */}
          <motion.div
            variants={item}
            className="overflow-hidden rounded-lg border border-border bg-surface-1"
          >
            <div className="flex">
              <Sidebar />

              <div className="min-w-0 flex-1 p-4 sm:p-6">
                {/* top bar */}
                <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-4">
                  <div className="flex items-center gap-2 text-small">
                    <span className="text-text-tertiary">Workspace</span>
                    <span className="text-text-tertiary">/</span>
                    <span className="text-text-primary">Overview</span>
                  </div>
                  <span className="tabular hidden font-mono text-mono text-text-tertiary sm:block">
                    Updated 12s ago
                  </span>
                </div>

                {/* KPI row */}
                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {kpis.map((kpi) => (
                    <Metric key={kpi.label} {...kpi} />
                  ))}
                </div>

                {/* chart card */}
                <div className="mb-6 rounded-md border border-border bg-surface-2 p-4 sm:p-5">
                  <div className="mb-4 flex items-baseline justify-between">
                    <span className="text-small text-text-secondary">
                      Throughput
                    </span>
                    <span className="tabular font-mono text-mono text-text-tertiary">
                      events / day
                    </span>
                  </div>
                  <Chart data={throughput} />
                </div>

                {/* tabbed table card */}
                <div className="rounded-md border border-border bg-surface-2 p-4 sm:p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* segmented control with layoutId indicator */}
                    <div className="flex items-center gap-1 rounded-sm border border-border bg-surface-1 p-1">
                      {tabs.map((t) => {
                        const isActive = tab === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setTab(t.id)}
                            className={`relative rounded-[4px] px-3 py-1.5 text-small transition-colors duration-150 ${
                              isActive
                                ? "text-text-primary"
                                : "text-text-tertiary hover:text-text-secondary"
                            }`}
                          >
                            {isActive && (
                              <motion.span
                                layoutId="dash-view-active"
                                className="absolute inset-0 rounded-[4px] bg-surface-3"
                                transition={ease.spring}
                              />
                            )}
                            <span className="relative z-10">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-small text-text-tertiary">
                      {SUBTITLE[tab]}
                    </span>
                  </div>

                  {/* outer clip absorbs the ±12px slide so it never
                      reaches the body; inner scroll keeps the table
                      responsive on narrow screens */}
                  <div className="overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={tab}
                        variants={reduced ? undefined : swap}
                        initial={reduced ? undefined : "enter"}
                        animate={reduced ? undefined : "center"}
                        exit={reduced ? undefined : "exit"}
                      >
                        <div className="overflow-x-auto">
                          <EventsTable rows={rows} />
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
