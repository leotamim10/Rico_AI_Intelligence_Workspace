import type { ReactNode } from "react";

/**
 * Small mono stat pill used under section headlines (Hero,
 * SignatureMoment). Tabular numerals, hairline border, surface-2 fill.
 */
export function StatChip({ children }: { children: ReactNode }) {
  return (
    <span className="tabular rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-mono text-text-secondary">
      {children}
    </span>
  );
}
