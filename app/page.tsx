/**
 * Page composition. No logic, no styles beyond layout ordering.
 * Sections are added block by block:
 *   Hero · InsightFlow · Dashboard · SignatureMoment
 */
export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Foundation placeholder — replaced by <Hero /> in Block 2. */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <span className="tabular font-mono text-small uppercase tracking-[0.2em] text-text-tertiary">
            Foundation ready
          </span>
          <h1 className="text-display text-text-primary">Xai</h1>
          <p className="max-w-[42ch] text-body text-text-secondary">
            Raw data to structured intelligence to actionable insight. Tokens,
            motion library, and structure are in place.
          </p>
          <div className="mt-2 flex items-center gap-3">
            <span className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-mono text-text-secondary">
              Ingest from 40+ sources
            </span>
            <span className="rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-mono text-text-secondary">
              Anomalies surfaced in 1.2s
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
