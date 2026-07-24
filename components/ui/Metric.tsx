import type { Kpi } from "@/lib/data/mock";

/**
 * A single KPI cell. Value uses tabular mono numerals; the delta is
 * colored by direction with a small hand-drawn caret (no icon font).
 */
export function Metric({ label, value, delta, unit }: Kpi) {
  const up = delta >= 0;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface-2 p-4 transition-colors duration-150 hover:border-border-strong">
      <span className="text-small text-text-tertiary">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="tabular font-mono text-h2 leading-none text-text-primary">
          {value}
        </span>
        {unit && (
          <span className="tabular font-mono text-small text-text-tertiary">
            {unit}
          </span>
        )}
      </div>
      <span
        className={`tabular inline-flex items-center gap-1 font-mono text-mono ${
          up ? "text-positive" : "text-negative"
        }`}
      >
        <svg width="7" height="7" viewBox="0 0 7 7" aria-hidden fill="none">
          {up ? (
            <path d="M3.5 0.5 L6.5 5.5 L0.5 5.5 Z" fill="currentColor" />
          ) : (
            <path d="M3.5 6.5 L0.5 1.5 L6.5 1.5 Z" fill="currentColor" />
          )}
        </svg>
        {up ? "+" : ""}
        {delta.toFixed(1)}%
      </span>
    </div>
  );
}
