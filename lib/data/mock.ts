/**
 * Mock product data for the Dashboard section.
 * Plausible metric names, realistic numbers, no round figures.
 */

export type Kpi = {
  label: string;
  value: string;
  delta: number; // percent change, signed
  unit?: string;
};

export const kpis: Kpi[] = [
  { label: "Signals ingested", value: "48,213", delta: 12.4 },
  { label: "Anomalies surfaced", value: "1,072", delta: 8.1 },
  { label: "Mean time to insight", value: "1.2", delta: -18.6, unit: "s" },
  { label: "Automations triggered", value: "347", delta: 4.9 },
];

/** One time series — daily processed volume over ~5 weeks. */
export type SeriesPoint = { t: string; value: number };

export const throughput: SeriesPoint[] = [
  { t: "Jun 16", value: 3120 },
  { t: "Jun 19", value: 3480 },
  { t: "Jun 22", value: 3305 },
  { t: "Jun 25", value: 3890 },
  { t: "Jun 28", value: 4210 },
  { t: "Jul 01", value: 3975 },
  { t: "Jul 04", value: 4520 },
  { t: "Jul 07", value: 4880 },
  { t: "Jul 10", value: 4655 },
  { t: "Jul 13", value: 5230 },
  { t: "Jul 16", value: 5610 },
  { t: "Jul 19", value: 5380 },
  { t: "Jul 22", value: 6040 },
];

export type Severity = "critical" | "elevated" | "nominal";

export type EventRow = {
  id: string;
  source: string;
  event: string;
  severity: Severity;
  confidence: number; // 0–1
  latency: string;
};

export const events: EventRow[] = [
  {
    id: "evt_9f21",
    source: "Stripe",
    event: "Refund rate deviation",
    severity: "critical",
    confidence: 0.94,
    latency: "0.8s",
  },
  {
    id: "evt_7a03",
    source: "Segment",
    event: "Session drop, EU region",
    severity: "elevated",
    confidence: 0.81,
    latency: "1.1s",
  },
  {
    id: "evt_4c88",
    source: "Snowflake",
    event: "Nightly load completed",
    severity: "nominal",
    confidence: 0.99,
    latency: "2.4s",
  },
  {
    id: "evt_2d15",
    source: "Datadog",
    event: "p99 latency breach",
    severity: "critical",
    confidence: 0.88,
    latency: "0.6s",
  },
  {
    id: "evt_b6e0",
    source: "HubSpot",
    event: "Lead velocity change",
    severity: "elevated",
    confidence: 0.73,
    latency: "1.4s",
  },
  {
    id: "evt_1f47",
    source: "Postgres",
    event: "Replication lag nominal",
    severity: "nominal",
    confidence: 0.97,
    latency: "0.9s",
  },
];

export type Tab = { id: string; label: string };

export const tabs: Tab[] = [
  { id: "signals", label: "Signals" },
  { id: "anomalies", label: "Anomalies" },
  { id: "routes", label: "Routes" },
];
