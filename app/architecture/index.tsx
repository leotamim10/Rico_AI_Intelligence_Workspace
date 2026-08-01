'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';

import { duration, ease } from '@/lib/motion/easings';
import { riseInSm, settleIn, staggerParent, swap } from '@/lib/motion/variants';

/* ============================================================
   Consumer layer — the four applications that read the catalog.
   Each renders as a small application window. Only tenantWeb has
   a working body (SSO sign-in); the rest are scaffolded surfaces
   showing their title header until they are wired to snapshot v1.
   ============================================================ */

type Status = 'live' | 'migrating' | 'future';

const STATUS: Record<Status, { label: string; dot: string }> = {
  live: { label: 'Live', dot: 'bg-positive' },
  migrating: { label: 'Migrating', dot: 'bg-accent' },
  future: { label: 'Future', dot: 'bg-text-tertiary' },
};

/* ------------------------------ glyphs ----------------------------- */

function LockGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="5.5" width="7" height="5" rx="1.25" />
      <path d="M4 5.5 V4 A2 2 0 0 1 8 4 V5.5" />
    </svg>
  );
}

/* --------------------------- window frame -------------------------- */

type WindowProps = {
  host: string;
  port: number;
  status: Status;
  children: ReactNode;
};

/**
 * Chrome + body for one consumer application. Reused four times.
 * Header reads as a browser frame — window dots, an address pill
 * carrying the monorepo port, and a status light.
 */
function AppWindow({ host, port, status, children }: WindowProps) {
  const s = STATUS[status];
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface-1">
      <header className="flex items-center gap-3 border-b border-border px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full border border-border-strong" />
          <span className="h-2 w-2 rounded-full border border-border-strong" />
          <span className="h-2 w-2 rounded-full border border-border-strong" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-sm border border-border bg-bg px-2 py-1 text-text-tertiary">
          <LockGlyph />
          <span className="tabular truncate font-mono text-mono">
            {host}:{port}
          </span>
        </div>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`}
          title={s.label}
          aria-label={s.label}
        />
      </header>
      <div className="min-h-32 flex-1 p-4">{children}</div>
    </div>
  );
}

/* ------------------------- scaffolded surface ---------------------- */

/* ------------------------- tenantWeb sign-in ----------------------- */

/**
 * Simulated identity-provider latencies. These are domain timings for
 * the mock auth round-trip, not motion-charter durations — named here
 * rather than inlined so the flow reads deliberately.
 */
const SIM = {
  nodeMs: 440, // cadence of the request journey through each spine node
  codeMs: 1000, // wait before the code lands and auto-fills
  fillStepMs: 140, // per-digit cadence as the code populates
  verifyMs: 1400, // code verification
} as const;

const OTP_LENGTH = 6;

type Step = 'idle' | 'journey' | 'otp' | 'verifying' | 'done';

/**
 * The sign-in request journey, mirrored from the reference
 * ecoflow-journey-tenantweb.html spine (id="spineNodes"). Each node is
 * one thing the client is blocked on; the async offshoot is work the
 * client was never waiting on. The terminal streams these in order.
 */
type JPhase = 'client' | 'backend';
const JOURNEY: { phase: JPhase; title: string; surface: string; async?: string }[] = [
  { phase: 'client', title: 'Sign In', surface: 'tenantWeb — /sign-in' },
  { phase: 'backend', title: 'Edge & Transport', surface: 'API gateway' },
  { phase: 'backend', title: 'Boundary — validate → authorise', surface: 'NestJS guard + pipe' },
  { phase: 'backend', title: 'Application Services', surface: 'AuthService.signIn()' },
  {
    phase: 'backend',
    title: 'Persistence',
    surface: 'Prisma → PostgreSQL',
    async: 'Outbox → event bus',
  },
  { phase: 'client', title: 'Session issued', surface: 'SSO / Session Bridge' },
  { phase: 'client', title: 'App Launcher', surface: 'tenantWeb — /dashboard' },
  { phase: 'client', title: 'Satellite Handoff', surface: 'centralBackOffice' },
];

/** Apps the launcher hands off to once the session is issued. */
const LAUNCHER = [
  {
    name: 'Ecoflow admin',
    port: 3003,
    hint: 'Master data console',
    icon: 'admin' as const,
    target: 'admin' as const,
  },
  {
    name: 'EcoFlow real time Dashboard',
    port: 3004,
    hint: 'Live event stream',
    icon: 'chart' as const,
    target: 'dashboard' as const,
  },
];

/* ----------------------- access-grant saga ------------------------- */

type Target = 'admin' | 'dashboard';
type TileStatus = 'idle' | 'pending' | 'granted' | 'denied';
type AccessPhase = 'requesting' | 'awaiting' | 'responding' | 'resolved';

const TARGET_META: Record<Target, { host: string; port: number; app: string }> = {
  admin: { host: 'admin.walton', port: 3003, app: 'Ecoflow admin' },
  dashboard: {
    host: 'dashboard.walton',
    port: 3004,
    app: 'EcoFlow real time Dashboard',
  },
};

/** Access-saga timing (ms) for each animated pass. */
const ACCESS = { forwardMs: 2600, returnMs: 2600, resolveMs: 1200 } as const;

/** A pinned event pushed into the terminal (session or access decision). */
type PinSignal = {
  app: string;
  who: string;
  detail: string;
  tone: 'positive' | 'negative' | 'accent';
  nonce: number;
};

/* --------------------- product born / publish ---------------------- */

/** Scaffold revealed by the "Product Born" animation, stage by stage. */
const BORN_TREE = [
  { dir: 'catalog', items: 'product, variant, media' },
  { dir: 'taxonomy', items: 'category tree, families, bindings' },
  { dir: 'attributes', items: 'definitions, resolution, validation' },
  { dir: 'publishing', items: 'snapshot resolution, outbox writes' },
  { dir: 'masterdata', items: 'location, partner, UoM registries' },
];
const BORN_STEP_MS = 420;

/** The two consumers that read the published snapshot from Redis. */
type Reader = 'centralWeb' | 'dashboard';

/* ----------------- external producers · POS / Walpack -------------- */

type Producer = 'pos' | 'walpack';

type Product = {
  name: string;
  stock: number;
  sold: number;
  received: string;
  stockAge: string;
  lastSold: string;
  transit: string;
};

/** Deterministic seed inventory (no random at init — SSR-safe). */
const INITIAL_INVENTORY: Product[] = [
  { name: 'Desktop PC', stock: 84, sold: 316, received: '2026-06-08', stockAge: '54d', lastSold: '2026-08-01 11:42', transit: 'FAC-02 → WH-CTG-01 → PLZ-041' },
  { name: 'RAM 16GB', stock: 512, sold: 1290, received: '2026-06-21', stockAge: '41d', lastSold: '2026-08-01 12:03', transit: 'FAC-01 → WH-DHK-02 → PLZ-118' },
  { name: 'Monitor 27"', stock: 143, sold: 402, received: '2026-05-30', stockAge: '63d', lastSold: '2026-07-31 18:20', transit: 'FAC-02 → WH-CTG-01 → PLZ-041' },
  { name: 'LED TV 43"', stock: 67, sold: 221, received: '2026-07-02', stockAge: '30d', lastSold: '2026-08-01 09:58', transit: 'FAC-03 → WH-DHK-02 → PLZ-206' },
  { name: 'Router AX', stock: 289, sold: 610, received: '2026-06-15', stockAge: '47d', lastSold: '2026-07-30 16:11', transit: 'FAC-01 → WH-CTG-01 → PLZ-041' },
  { name: 'SSD 1TB', stock: 178, sold: 533, received: '2026-06-27', stockAge: '35d', lastSold: '2026-08-01 10:37', transit: 'FAC-01 → WH-DHK-02 → PLZ-118' },
];

const PRODUCER_META: Record<
  Producer,
  { label: string; app: string; source: string; event: string; title: string }
> = {
  pos: {
    label: 'POS sell',
    app: 'pos.plaza',
    source: 'PLZ-041',
    event: 'sale.completed',
    title: 'POS · sale',
  },
  walpack: {
    label: 'Walpack transport',
    app: 'walpack',
    source: 'batch B-7742',
    event: 'material.received',
    title: 'Walpack · material received',
  },
};

/** A determinate progress line — scaleX only, no loop, no linear. */
function ProgressLine({
  seconds,
  reduced,
}: {
  seconds: number;
  reduced: boolean;
}) {
  return (
    <span className="block h-px w-full overflow-hidden bg-border">
      {reduced ? (
        <span className="block h-full w-full bg-accent" />
      ) : (
        <motion.span
          className="block h-full w-full origin-left bg-accent"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: seconds, ease: ease.inOut }}
        />
      )}
    </span>
  );
}

/** Success check — circle + tick drawn by path length, then held. */
function SuccessMark({ reduced }: { reduced: boolean }) {
  const draw = reduced
    ? { pathLength: 1 }
    : {
        pathLength: [0, 1] as number[],
        transition: { duration: duration.section, ease: ease.out },
      };
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      stroke="var(--positive)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.circle cx="20" cy="20" r="17" initial={false} animate={draw} />
      <motion.path
        d="M13 20.5 L18 25.5 L27.5 15"
        initial={false}
        animate={
          reduced
            ? { pathLength: 1 }
            : {
                pathLength: [0, 1] as number[],
                transition: {
                  duration: duration.element,
                  ease: ease.out,
                  delay: 0.25,
                },
              }
        }
      />
    </svg>
  );
}

function TickGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2.5 6.5 L5 9 L9.5 3.5" />
    </svg>
  );
}

function LauncherGlyph({ kind }: { kind: 'admin' | 'chart' }) {
  const common = {
    width: 15,
    height: 15,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'chart') {
    return (
      <svg {...common}>
        <path d="M3 13 V8.5 M8 13 V4 M13 13 V6.5" />
        <path d="M2.5 13 H13.5" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M2.5 4.5 H13.5 M2.5 8 H13.5 M2.5 11.5 H13.5" />
      <circle cx="6" cy="4.5" r="1.4" fill="var(--surface-3)" />
      <circle cx="10.5" cy="8" r="1.4" fill="var(--surface-3)" />
      <circle cx="5" cy="11.5" r="1.4" fill="var(--surface-3)" />
    </svg>
  );
}

/** One streamed line in the request-journey terminal. */
function JourneyLine({
  node,
  done,
  active,
  reduced,
}: {
  node: (typeof JOURNEY)[number];
  done: boolean;
  active: boolean;
  reduced: boolean;
}) {
  const row = (
    <div className="flex items-baseline gap-2 py-1">
      <span className="shrink-0 text-text-tertiary">[{node.phase}]</span>
      <span className="min-w-0 flex-1 truncate text-text-secondary">
        {node.title} <span className="text-text-tertiary">· {node.surface}</span>
      </span>
      <span className="flex h-3 w-3 shrink-0 items-center justify-center">
        {done ? (
          <span className="text-positive">
            <TickGlyph />
          </span>
        ) : active ? (
          <span className="text-text-tertiary">·</span>
        ) : null}
      </span>
    </div>
  );
  return (
    <div>
      {reduced ? (
        row
      ) : (
        <motion.div variants={riseInSm} initial="hidden" animate="show">
          {row}
        </motion.div>
      )}
      {done && node.async && (
        <div className="flex items-baseline gap-2 py-1 pl-4 text-text-tertiary">
          <span className="shrink-0">└ async</span>
          <span className="min-w-0 flex-1 truncate">{node.async}</span>
        </div>
      )}
    </div>
  );
}

/** Streaming console of the request journey through centralBackOffice. */
function JourneyTerminal({ idx, reduced }: { idx: number; reduced: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [idx]);

  const visible = JOURNEY.slice(0, Math.min(idx + 1, JOURNEY.length));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-small font-medium text-text-primary">
          Verifying identity
        </span>
        <span className="tabular truncate font-mono text-mono text-text-tertiary">
          POST /v1/auth/verify
        </span>
      </div>
      <div
        ref={scrollRef}
        className="h-32 overflow-y-auto rounded-sm border border-border bg-bg p-3 font-mono text-mono"
      >
        {visible.map((node, i) => (
          <JourneyLine
            key={i}
            node={node}
            done={i < idx}
            active={i === idx && idx < JOURNEY.length}
            reduced={reduced}
          />
        ))}
      </div>
    </div>
  );
}

const TILE_STATUS: Record<
  TileStatus,
  { label: string; text: string; dot: string; border: string } | null
> = {
  idle: null,
  pending: {
    label: 'pending',
    text: 'text-accent',
    dot: 'bg-accent',
    border: 'border-border-strong',
  },
  granted: {
    label: 'granted',
    text: 'text-positive',
    dot: 'bg-positive',
    border: 'border-positive',
  },
  denied: {
    label: 'denied',
    text: 'text-negative',
    dot: 'bg-negative',
    border: 'border-negative',
  },
};

/** A launcher app: request access, then reflect the granted/denied verdict. */
function AppTile({
  app,
  reduced,
  status,
  busy,
  onRequest,
}: {
  app: (typeof LAUNCHER)[number];
  reduced: boolean;
  status: TileStatus;
  busy: boolean;
  onRequest: (target: Target) => void;
}) {
  const meta = TILE_STATUS[status];
  const tile = (
    <div
      className={`flex w-full items-center gap-3 rounded-md border bg-surface-2 p-3 transition-colors duration-150 ${
        meta?.border ?? 'border-border'
      }`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border bg-surface-3 ${
          status === 'granted'
            ? 'border-positive text-positive'
            : status === 'denied'
              ? 'border-negative text-negative'
              : 'border-border-strong text-text-secondary'
        }`}
      >
        <LauncherGlyph kind={app.icon} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small font-medium text-text-primary">
          {app.name}
        </span>
        <span className="tabular truncate font-mono text-mono text-text-tertiary">
          localhost:{app.port} · {app.hint}
        </span>
      </span>
      {meta ? (
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-mono ${meta.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => onRequest(app.target)}
          className="shrink-0 rounded-sm border border-border bg-surface-1 px-2 py-1 font-mono text-mono text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"
        >
          Request access
        </button>
      )}
    </div>
  );
  return reduced ? tile : <motion.div variants={riseInSm}>{tile}</motion.div>;
}

/** SSO sign-in — credentials → request journey → code → launcher. */
function TenantSignIn({
  onConsumingChange,
  onAuthEvent,
  tileStatus,
  busy,
  onRequest,
}: {
  onConsumingChange: (consuming: boolean) => void;
  onAuthEvent: (email: string) => void;
  tileStatus: Record<Target, TileStatus>;
  busy: boolean;
  onRequest: (target: Target) => void;
}) {
  const reduced = useReducedMotion() ?? false;
  const [step, setStep] = useState<Step>('idle');
  const [email, setEmail] = useState('you@walton.com');
  const [otp, setOtp] = useState<string[]>(() => Array(OTP_LENGTH).fill(''));
  const [journeyIdx, setJourneyIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // one place to schedule and, on unmount, to tear down every timeout
  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  // the centralBackOffice pulse runs while a request is in flight — the
  // whole authenticating sequence, off only when idle or signed in
  useEffect(() => {
    onConsumingChange(step !== 'idle' && step !== 'done');
  }, [step, onConsumingChange]);

  const start = () => {
    if (step !== 'idle') return;
    setEmail(inputRef.current?.value.trim() || 'you@walton.com');
    setStep('journey');
  };

  // stream the request through every spine node, then hand off to the code.
  // journeyIdx starts at 0 (node 0 already "running"); we only schedule
  // forward — no synchronous setState in the effect body.
  useEffect(() => {
    if (step !== 'journey') return;
    if (reduced) {
      after(0, () => setJourneyIdx(JOURNEY.length));
      after(SIM.nodeMs, () => setStep('otp'));
      return;
    }
    for (let i = 1; i <= JOURNEY.length; i++) {
      after(SIM.nodeMs * i, () => setJourneyIdx(i));
    }
    after(SIM.nodeMs * (JOURNEY.length + 1), () => setStep('otp'));
  }, [step, reduced]);

  // when the code screen mounts, the code "arrives" and fills itself
  useEffect(() => {
    if (step !== 'otp') return;
    after(SIM.codeMs, () => {
      const code = Array.from({ length: OTP_LENGTH }, () =>
        String(Math.floor(Math.random() * 10)),
      );
      code.forEach((digit, i) => {
        after(SIM.fillStepMs * (i + 1), () => {
          setOtp(prev => {
            const next = [...prev];
            next[i] = digit;
            return next;
          });
          if (i === OTP_LENGTH - 1) after(SIM.fillStepMs * 2, () => setStep('verifying'));
        });
      });
    });
  }, [step]);

  useEffect(() => {
    if (step !== 'verifying') return;
    after(SIM.verifyMs, () => {
      setStep('done');
      onAuthEvent(email); // correlate the real login into the event log
    });
  }, [step, email, onAuthEvent]);

  const panel: 'credentials' | 'journey' | 'code' | 'done' =
    step === 'idle'
      ? 'credentials'
      : step === 'journey'
        ? 'journey'
        : step === 'done'
          ? 'done'
          : 'code';

  const activeBox = step === 'otp' ? otp.indexOf('') : -1;

  const swapProps = reduced
    ? {}
    : {
        variants: swap,
        initial: 'enter' as const,
        animate: 'center' as const,
        exit: 'exit' as const,
      };

  return (
    <div className="flex h-full flex-col justify-center overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        {/* ---------- credentials ---------- */}
        {panel === 'credentials' && (
          <motion.div key="credentials" {...swapProps} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-small font-medium text-text-primary">
                Sign in to Ecoflow
              </span>
              <span className="text-small text-text-tertiary">
                One identity across every app
              </span>
            </div>

            <form
              className="flex flex-col gap-3"
              onSubmit={e => {
                e.preventDefault();
                start();
              }}
            >
              <label className="flex flex-col gap-2">
                <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
                  Work email
                </span>
                <input
                  ref={inputRef}
                  type="email"
                  inputMode="email"
                  defaultValue="you@walton.com"
                  className="w-full rounded-sm border border-border bg-bg px-3 py-2 text-small text-text-primary transition-colors duration-150 placeholder:text-text-tertiary hover:border-border-strong"
                />
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2 text-small font-medium text-text-primary transition-colors duration-150 hover:bg-accent-muted"
              >
                <LockGlyph />
                Continue with SSO
              </button>
            </form>

            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-mono text-text-tertiary">SAML · SCIM</span>
              <span className="h-px flex-1 bg-border" />
            </div>
          </motion.div>
        )}

        {/* ---------- request journey ---------- */}
        {panel === 'journey' && (
          <motion.div key="journey" {...swapProps}>
            <JourneyTerminal idx={journeyIdx} reduced={reduced} />
          </motion.div>
        )}

        {/* ---------- verification code ---------- */}
        {panel === 'code' && (
          <motion.div key="code" {...swapProps} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-small font-medium text-text-primary">
                Enter verification code
              </span>
              <span className="tabular truncate text-small text-text-tertiary">
                Sent to {email}
              </span>
            </div>

            <div className="flex gap-2" role="group" aria-label="One-time code">
              {otp.map((digit, i) => {
                const isActive = i === activeBox;
                return (
                  <div
                    key={i}
                    className={`flex aspect-square flex-1 items-center justify-center rounded-sm border bg-bg transition-colors duration-150 ${
                      isActive ? 'border-accent' : 'border-border'
                    }`}
                  >
                    {digit ? (
                      reduced ? (
                        <span className="tabular font-mono text-h3 text-text-primary">
                          {digit}
                        </span>
                      ) : (
                        <motion.span
                          variants={settleIn}
                          initial="hidden"
                          animate="show"
                          className="tabular font-mono text-h3 text-text-primary"
                        >
                          {digit}
                        </motion.span>
                      )
                    ) : (
                      <span className="h-px w-3 bg-border-strong" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex h-4 items-center">
              {step === 'verifying' ? (
                <div className="flex w-full flex-col gap-2">
                  <span className="font-mono text-mono text-text-tertiary">Verifying…</span>
                  <ProgressLine seconds={SIM.verifyMs / 1000} reduced={reduced} />
                </div>
              ) : (
                <span className="font-mono text-mono text-text-tertiary">
                  Waiting for code…
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* ---------- signed in · app launcher ---------- */}
        {panel === 'done' && (
          <motion.div key="done" {...swapProps} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <SuccessMark reduced={reduced} />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-small font-medium text-text-primary">
                  Signed in
                </span>
                <span className="tabular truncate text-small text-text-tertiary">
                  {email}
                </span>
              </div>
            </div>

            <motion.div
              variants={reduced ? undefined : staggerParent}
              initial={reduced ? undefined : 'hidden'}
              animate={reduced ? undefined : 'show'}
              className="flex flex-col gap-2"
            >
              <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
                App launcher
              </span>
              {LAUNCHER.map(app => (
                <AppTile
                  key={app.name}
                  app={app}
                  reduced={reduced}
                  status={tileStatus[app.target]}
                  busy={busy}
                  onRequest={onRequest}
                />
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------- backend · centralBackOffice ------------------- */

/**
 * The Publishing "push machine" diagram — its own 820×220 coordinate
 * space. One trace enters from the portal (left, inbound); three fan out
 * to Worker Transform, the Redpanda event backbone, and PostgreSQL. A
 * fourth, dashed, is reserved for the future realtime-consumer link.
 */
const ROUTES = [
  { key: 'portal', d: 'M8 110 H48' }, // request in, from the portal
  { key: 'worker', d: 'M224 110 H430 L470 44 H560' },
  { key: 'redpanda', d: 'M224 110 H560' },
  { key: 'postgres', d: 'M224 110 H430 L470 180 H560' },
] as const;

const PORTS: [number, number][] = [
  [8, 110],
  [560, 44],
  [560, 110],
  [560, 180],
  [224, 110],
];

const FUTURE_TRACE = 'M736 44 H794';

/** Access-drain paths lit during a request: push -> Redpanda -> Worker. */
const REDPANDA_D = 'M224 110 H560';
const DRAIN = 'M620 86 C 660 82 660 72 700 68';

/** Worker -> Redis cache, lit while a product publish is caching. */
const WORKER_REDIS = 'M694 68 C 716 104 720 130 712 158';

/** Flow timing (seconds) — pulses sweep only while a request is served. */
const FLOW = { cycle: 3.2, gap: 0.5, stagger: 0.5 } as const;

/** Flip to true in future to light the realtime-consumer link with a pulse. */
const REALTIME_ACTIVE = false;

/** Synthetic auth traffic streamed into the Redpanda-fed event terminal. */
const LOG_SOURCES: { app: string; who: string }[] = [
  { app: 'tenantWeb', who: 'you@walton.com' },
  { app: 'posUi', who: 'cashier@PLZ-041' },
  { app: 'admin', who: 'ops@walton' },
  { app: 'dashboard', who: 'viewer@walton' },
  { app: 'posUi', who: 'cashier@PLZ-118' },
  { app: 'centralWeb', who: 'guest@web' },
];
const DENY = ['mfa_required', 'bad_credential', 'rate_limited'] as const;

function ServerGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="11" height="4.5" rx="1" />
      <rect x="2.5" y="9" width="11" height="4.5" rx="1" />
      <circle cx="5" cy="4.75" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="5" cy="11.25" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * centralBackOffice reads as a server (rack chrome, running LED), not a
 * browser window. Its body composes the push machine and the event log.
 */
function ServerContainer({
  host,
  port,
  children,
}: {
  host: string;
  port: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border-strong bg-surface-1">
      <header className="flex items-center gap-3 border-b border-border bg-surface-2 px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface-3 text-text-secondary">
          <ServerGlyph />
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-small font-medium text-text-primary">
            centralBackOffice
          </span>
          <span className="tabular truncate font-mono text-mono text-text-tertiary">
            server · NestJS · {host}:{port}
          </span>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-sm border border-border bg-surface-1 px-2 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          <span className="tabular font-mono text-mono text-text-secondary">
            running
          </span>
        </span>
      </header>
      <div className="flex flex-col gap-6 p-4 sm:p-6">{children}</div>
    </div>
  );
}

/** A single glowing dash sweeping one route; length-normalised so every
 *  route (short or long) reads at the same tempo. */
function FlowPulse({ d, delay }: { d: string; delay: number }) {
  return (
    <motion.path
      d={d}
      fill="none"
      stroke="var(--accent)"
      strokeWidth={2}
      strokeLinecap="round"
      pathLength={1}
      style={{
        strokeDasharray: '0.08 1',
        filter: 'drop-shadow(0 0 5px var(--accent))',
      }}
      initial={{ strokeDashoffset: 0.08 }}
      animate={{ strokeDashoffset: [0.08, -1] }}
      transition={{
        duration: FLOW.cycle,
        ease: ease.inOut,
        repeat: Infinity,
        repeatDelay: FLOW.gap,
        delay,
      }}
    />
  );
}

const SVG_TEXT = { fontFamily: 'var(--font-geist-mono)' } as const;

/**
 * The push machine: portal request in on the left; Worker Transform,
 * Redpanda and PostgreSQL fanned out on the right. Pulses sweep only
 * while `active`. `portRef` marks the left port so the cross-layout
 * connector to the tenantWeb window can attach there.
 */
function PublishingMachine({
  active,
  draining,
  caching,
  reduced,
  portRef,
  workerPortRef,
  redisPortRef,
}: {
  active: boolean;
  draining: boolean;
  caching: boolean;
  reduced: boolean;
  portRef: RefObject<HTMLSpanElement | null>;
  workerPortRef: RefObject<HTMLSpanElement | null>;
  redisPortRef: RefObject<HTMLSpanElement | null>;
}) {
  const showPublish = active && !reduced;
  const showDrain = (draining || caching) && !reduced;
  const showCache = caching && !reduced;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-small font-medium text-text-primary">
          Publishing · push machine
        </h3>
        <span className="tabular font-mono text-mono text-text-tertiary">
          {caching
            ? 'caching snapshot…'
            : draining
              ? 'draining events…'
              : active
                ? 'serving request…'
                : 'idle · no requests'}
        </span>
      </div>

      <div className="pointer-events-none relative select-none" aria-hidden>
        <span ref={portRef} className="absolute left-0" style={{ top: '50%' }} />
        <span
          ref={workerPortRef}
          className="absolute"
          style={{ left: '96.8%', top: '20%' }}
        />
        <span
          ref={redisPortRef}
          className="absolute"
          style={{ left: '86.8%', top: '72.7%' }}
        />
        <svg
          viewBox="0 0 820 220"
          preserveAspectRatio="xMidYMid meet"
          className="w-full"
          style={{ aspectRatio: '820 / 220' }}
        >
          {/* rails */}
          {ROUTES.map(r => (
            <path
              key={`rail-${r.key}`}
              d={r.d}
              fill="none"
              stroke="var(--border-strong)"
              strokeWidth={1.25}
            />
          ))}
          {/* Redpanda -> Worker drain link */}
          <path
            d={DRAIN}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={1.25}
          />
          {/* Worker -> Redis cache link */}
          <path
            d={WORKER_REDIS}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={1.25}
          />
          {/* future realtime-consumer link — dashed, awaiting wiring */}
          <path
            d={FUTURE_TRACE}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth={1.25}
            strokeDasharray="4 5"
          />
          <circle
            cx={794}
            cy={44}
            r={3}
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <text
            x={765}
            y={60}
            textAnchor="middle"
            fontSize={9.5}
            fill="var(--text-tertiary)"
            style={SVG_TEXT}
          >
            future
          </text>

          {/* ports */}
          {PORTS.map(([cx, cy], i) => (
            <circle
              key={`port-${i}`}
              cx={cx}
              cy={cy}
              r={3}
              fill="var(--surface-3)"
              stroke="var(--border-strong)"
            />
          ))}

          {/* central push machine */}
          <rect
            x={48}
            y={78}
            width={176}
            height={64}
            rx={8}
            fill="var(--surface-3)"
            stroke="var(--border-strong)"
          />
          <text
            x={136}
            y={106}
            textAnchor="middle"
            fontSize={14}
            fill="var(--text-primary)"
            style={SVG_TEXT}
          >
            Publishing
          </text>
          <text
            x={136}
            y={124}
            textAnchor="middle"
            fontSize={10.5}
            fill="var(--text-tertiary)"
            style={SVG_TEXT}
          >
            push machine
          </text>

          {/* Worker Transform */}
          <rect
            x={560}
            y={20}
            width={176}
            height={48}
            rx={8}
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <text x={578} y={41} fontSize={13} fill="var(--text-secondary)" style={SVG_TEXT}>
            Worker Transform
          </text>
          <text x={578} y={57} fontSize={10.5} fill="var(--text-tertiary)" style={SVG_TEXT}>
            realtime transform
          </text>

          {/* Redpanda event backbone */}
          <rect
            x={560}
            y={86}
            width={176}
            height={48}
            rx={8}
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <path
            d="M572 104 h10 M572 110 h10 M572 116 h10"
            stroke="var(--accent-muted)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
          <text x={592} y={107} fontSize={13} fill="var(--text-secondary)" style={SVG_TEXT}>
            Redpanda
          </text>
          <text x={592} y={123} fontSize={10.5} fill="var(--text-tertiary)" style={SVG_TEXT}>
            event backbone
          </text>

          {/* PostgreSQL */}
          <path
            d="M560 160 V200 A48 8 0 0 0 656 200 V160"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <ellipse
            cx={608}
            cy={160}
            rx={48}
            ry={8}
            fill="var(--surface-3)"
            stroke="var(--border-strong)"
          />
          <text
            x={608}
            y={186}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-secondary)"
            style={SVG_TEXT}
          >
            PostgreSQL
          </text>
          <text
            x={608}
            y={215}
            textAnchor="middle"
            fontSize={10.5}
            fill="var(--text-tertiary)"
            style={SVG_TEXT}
          >
            writes
          </text>

          {/* Redis cache — read layer beside PostgreSQL */}
          <path
            d="M668 160 V196 A44 7 0 0 0 756 196 V160"
            fill="var(--surface-2)"
            stroke="var(--border-strong)"
          />
          <ellipse
            cx={712}
            cy={160}
            rx={44}
            ry={7}
            fill="var(--surface-3)"
            stroke="var(--border-strong)"
          />
          <text
            x={712}
            y={184}
            textAnchor="middle"
            fontSize={12}
            fill="var(--text-secondary)"
            style={SVG_TEXT}
          >
            Redis
          </text>
          <text
            x={712}
            y={215}
            textAnchor="middle"
            fontSize={10.5}
            fill="var(--text-tertiary)"
            style={SVG_TEXT}
          >
            snapshot cache
          </text>

          {/* publish pulses — snapshot fanning out to every consumer */}
          {showPublish &&
            ROUTES.map((r, i) => (
              <FlowPulse key={`pub-${r.key}`} d={r.d} delay={i * FLOW.stagger} />
            ))}
          {/* drain pulses — an event: push -> Redpanda -> Worker */}
          {showDrain && (
            <>
              <FlowPulse d={REDPANDA_D} delay={0} />
              <FlowPulse d={DRAIN} delay={0.35} />
            </>
          )}
          {/* cache pulse — a publish resolving into Redis */}
          {showCache && <FlowPulse d={WORKER_REDIS} delay={0.7} />}
          {REALTIME_ACTIVE && !reduced && <FlowPulse d={FUTURE_TRACE} delay={0} />}
        </svg>
      </div>
    </div>
  );
}

type LogLine = {
  id: number;
  time: string;
  app: string;
  who: string;
  detail: string;
  tone: PinSignal['tone'];
};

const toneClass = (tone: LogLine['tone']) =>
  tone === 'positive'
    ? 'text-positive'
    : tone === 'negative'
      ? 'text-negative'
      : 'text-accent';

/**
 * The Redpanda-fed event terminal (code / code-bar chrome). Continuously
 * appends synthetic traffic, and — when `pin` changes — lands a real
 * event (sign-in / access decision) in a pinned strip that never rotates
 * out of the log window.
 */
function EventTerminal({
  reduced,
  pin,
}: {
  reduced: boolean;
  pin: PinSignal | null;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [pinned, setPinned] = useState<LogLine[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);
  const clock = useRef(43800); // seconds past midnight, marches forward

  const buildLine = useCallback(
    (over?: {
      app: string;
      who: string;
      detail: string;
      tone: LogLine['tone'];
    }): LogLine => {
      const src = LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)];
      const ok = Math.random() > 0.28;
      clock.current += 2 + Math.floor(Math.random() * 37);
      const t = clock.current;
      const pad = (n: number) => String(n).padStart(2, '0');
      const sess = Math.floor(Math.random() * 0xffffff)
        .toString(16)
        .padStart(6, '0');
      return {
        id: seq.current++,
        time: `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`,
        app: over?.app ?? src.app,
        who: over?.who ?? src.who,
        detail:
          over?.detail ??
          (ok
            ? `session sess_${sess} issued`
            : `denied · ${DENY[Math.floor(Math.random() * DENY.length)]}`),
        tone: over?.tone ?? (ok ? 'positive' : 'negative'),
      };
    },
    [],
  );

  // background traffic — seed then stream (deferred: no sync setState in effect)
  useEffect(() => {
    const seed = setTimeout(
      () => setLines(Array.from({ length: 7 }, () => buildLine())),
      0,
    );
    const id = setInterval(
      () => setLines(prev => [...prev.slice(-40), buildLine()]),
      reduced ? 3200 : 1900,
    );
    return () => {
      clearTimeout(seed);
      clearInterval(id);
    };
  }, [reduced, buildLine]);

  // real events are pinned so they never rotate out (keep the last few)
  useEffect(() => {
    if (!pin) return;
    const t = setTimeout(
      () =>
        setPinned(prev => [
          ...prev.slice(-2),
          buildLine({
            app: pin.app,
            who: pin.who,
            detail: pin.detail,
            tone: pin.tone,
          }),
        ]),
      0,
    );
    return () => clearTimeout(t);
  }, [pin, buildLine]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="overflow-hidden rounded-md border border-border">
      {/* code-bar */}
      <div className="flex items-center gap-2 border-b border-border bg-bg px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-negative" />
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ background: '#febc2e' }}
          />
          <span className="h-2.5 w-2.5 rounded-full bg-positive" />
        </span>
        <span className="ml-1 font-mono text-mono text-text-tertiary">
          auth.events.log
        </span>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-positive" />
          <span className="tabular font-mono text-mono text-text-tertiary">
            Redpanda · group: audit
          </span>
        </span>
      </div>

      {/* pinned — real events, held so they never rotate out */}
      {pinned.length > 0 && (
        <div
          className="border-b border-border px-3 py-2 font-mono text-mono"
          style={{ background: 'var(--accent-glow)' }}
        >
          <div className="mb-1 flex items-center gap-2 text-text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>pinned · recent events</span>
          </div>
          {pinned.map(l => (
            <div
              key={l.id}
              className="flex items-baseline gap-2 whitespace-nowrap"
            >
              <span className="shrink-0 text-text-tertiary">{l.time}</span>
              <span className="shrink-0 text-accent">{l.app}</span>
              <span className="shrink-0 text-text-tertiary">{l.who}</span>
              <span className={toneClass(l.tone)}>{l.detail}</span>
            </div>
          ))}
        </div>
      )}

      {/* live stream */}
      <div
        ref={bodyRef}
        className="h-32 overflow-auto bg-bg px-3 py-3 font-mono text-mono leading-relaxed"
      >
        {lines.map(l => (
          <div key={l.id} className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="shrink-0 text-text-tertiary">{l.time}</span>
            <span className="shrink-0 text-text-secondary">{l.app}</span>
            <span className="shrink-0 text-text-tertiary">{l.who}</span>
            <span className={toneClass(l.tone)}>{l.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** centralBackOffice as a server: push machine diagram + event terminal. */
function BackendServer({
  reduced,
  active,
  draining,
  caching,
  portRef,
  workerPortRef,
  redisPortRef,
  pin,
}: {
  reduced: boolean;
  active: boolean;
  draining: boolean;
  caching: boolean;
  portRef: RefObject<HTMLSpanElement | null>;
  workerPortRef: RefObject<HTMLSpanElement | null>;
  redisPortRef: RefObject<HTMLSpanElement | null>;
  pin: PinSignal | null;
}) {
  return (
    <ServerContainer host="api.walton" port={3002}>
      <PublishingMachine
        active={active}
        draining={draining}
        caching={caching}
        reduced={reduced}
        portRef={portRef}
        workerPortRef={workerPortRef}
        redisPortRef={redisPortRef}
      />
      <EventTerminal reduced={reduced} pin={pin} />
    </ServerContainer>
  );
}

/**
 * A cross-layout wire between two elements, measured relative to the
 * stage and redrawn on resize. `flow` runs a pulse along it: 'fwd'
 * from→to, 'rev' to→from, null for a static (or hidden) wire.
 */
function Wire({
  stageRef,
  fromRef,
  toRef,
  fromSide,
  toSide,
  flow,
  reduced,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null> | null;
  fromSide: 'center' | 'bottom';
  toSide: 'center' | 'bottom';
  flow: 'fwd' | 'rev' | null;
  reduced: boolean;
}) {
  const [d, setD] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      const stage = stageRef.current;
      const from = fromRef.current;
      const to = toRef?.current;
      if (!stage || !from || !to) {
        setD(null);
        return;
      }
      const s = stage.getBoundingClientRect();
      const point = (el: HTMLElement, side: 'center' | 'bottom') => {
        const r = el.getBoundingClientRect();
        return [
          r.left + r.width / 2 - s.left,
          (side === 'bottom' ? r.bottom : r.top + r.height / 2) - s.top,
        ] as const;
      };
      const [x0, y0] = point(from, fromSide);
      const [x1, y1] = point(to, toSide);
      const my = (y0 + y1) / 2;
      setD(`M ${x0} ${y0} C ${x0} ${my}, ${x1} ${my}, ${x1} ${y1}`);
    };
    compute();
    const settle = setTimeout(compute, 500); // after the entrance settles
    const ro = new ResizeObserver(compute);
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', compute);
    return () => {
      clearTimeout(settle);
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [stageRef, fromRef, toRef, fromSide, toSide]);

  if (!d) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke="var(--border-strong)"
        strokeWidth={1.5}
        strokeDasharray="4 5"
      />
      {flow && !reduced && (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2.5}
          strokeLinecap="round"
          pathLength={1}
          style={{
            strokeDasharray: '0.1 1',
            filter: 'drop-shadow(0 0 5px var(--accent))',
          }}
          initial={{ strokeDashoffset: flow === 'fwd' ? 0.1 : -1 }}
          animate={{
            strokeDashoffset: flow === 'fwd' ? [0.1, -1] : [-1, 0.1],
          }}
          transition={{
            duration: 1.8,
            ease: ease.inOut,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      )}
    </svg>
  );
}

/** The Accept/Reject card a target consumer shows for an access request. */
function NotificationCard({
  req,
  onDecide,
  reduced,
}: {
  req: { fromApp: string; targetApp: string; eventId: string };
  onDecide: (d: 'granted' | 'denied') => void;
  reduced: boolean;
}) {
  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-accent" />
        <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
          access request
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-small font-medium text-text-primary">
          {req.fromApp} requests access
        </span>
        <span className="tabular truncate font-mono text-mono text-text-tertiary">
          evt_{req.eventId} · {req.targetApp}
        </span>
      </div>
      <div className="mt-auto flex gap-2">
        <button
          type="button"
          onClick={() => onDecide('denied')}
          className="flex-1 rounded-sm border border-border bg-surface-1 px-3 py-2 text-small text-text-secondary transition-colors duration-150 hover:border-negative hover:text-negative"
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => onDecide('granted')}
          className="flex-1 rounded-sm bg-accent px-3 py-2 text-small font-medium text-text-primary transition-colors duration-150 hover:bg-accent-muted"
        >
          Accept
        </button>
      </div>
    </div>
  );
  return reduced ? (
    body
  ) : (
    <motion.div
      variants={settleIn}
      initial="hidden"
      animate="show"
      className="h-full"
    >
      {body}
    </motion.div>
  );
}

/**
 * A read-only consumer window. Pops an access-request card when targeted;
 * once a product is published it reads the snapshot from Redis (never
 * Postgres) — shown as a badge and an interactive "Read snapshot".
 */
function ConsumerWindow({
  host,
  port,
  role,
  title,
  note,
  awaiting,
  onDecide,
  published,
  onRead,
  reading,
  reduced,
}: {
  host: string;
  port: number;
  role: string;
  title: string;
  note: string;
  awaiting: { fromApp: string; targetApp: string; eventId: string } | null;
  onDecide: (d: 'granted' | 'denied') => void;
  published: boolean;
  onRead: () => void;
  reading: boolean;
  reduced: boolean;
}) {
  return (
    <AppWindow host={host} port={port} status="live">
      {awaiting ? (
        <NotificationCard req={awaiting} onDecide={onDecide} reduced={reduced} />
      ) : (
        <div className="flex h-full flex-col">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
              {role}
            </span>
            <h3 className="font-claude text-h3 text-text-primary">{title}</h3>
          </div>
          <div className="mt-auto flex flex-col gap-2 border-t border-border pt-4">
            {published ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
                  <span className="font-mono text-mono text-text-tertiary">
                    snapshot v1 · Redis (read-only)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onRead}
                  disabled={reading}
                  className="self-start rounded-sm border border-border bg-surface-1 px-2 py-1 font-mono text-mono text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary disabled:opacity-40"
                >
                  {reading ? 'reading…' : 'Read snapshot'}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
                <span className="font-mono text-mono text-text-tertiary">
                  {note}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </AppWindow>
  );
}

/** The born-scaffold tree revealed stage by stage. */
function BornTree({ idx, reduced }: { idx: number; reduced: boolean }) {
  const visible = BORN_TREE.slice(0, Math.min(idx, BORN_TREE.length));
  return (
    <div className="rounded-sm border border-border bg-bg p-3 font-mono text-mono">
      <div className="mb-1 text-text-tertiary">ecoflow/</div>
      {visible.map((s, i) => {
        const row = (
          <div className="flex items-baseline gap-2 whitespace-nowrap py-0.5">
            <span className="shrink-0 text-text-tertiary">
              {i === BORN_TREE.length - 1 ? '└──' : '├──'}
            </span>
            <span className="shrink-0 text-accent">{s.dir}/</span>
            <span className="min-w-0 flex-1 truncate text-text-tertiary">
              {s.items}
            </span>
            <span className="shrink-0 text-positive">
              <TickGlyph />
            </span>
          </div>
        );
        return reduced ? (
          <div key={s.dir}>{row}</div>
        ) : (
          <motion.div
            key={s.dir}
            variants={riseInSm}
            initial="hidden"
            animate="show"
          >
            {row}
          </motion.div>
        );
      })}
    </div>
  );
}

/**
 * admin.walton's master-data console: born a product (animated scaffold),
 * then publish it. Also pops the access-request card when targeted.
 */
function AdminConsole({
  awaiting,
  onDecide,
  publishing,
  published,
  busy,
  onPublish,
  reduced,
}: {
  awaiting: { fromApp: string; targetApp: string; eventId: string } | null;
  onDecide: (d: 'granted' | 'denied') => void;
  publishing: boolean;
  published: boolean;
  busy: boolean;
  onPublish: () => void;
  reduced: boolean;
}) {
  const [bornPhase, setBornPhase] = useState<'idle' | 'animating' | 'ready'>(
    'idle',
  );
  const [bornIdx, setBornIdx] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const after = (ms: number, fn: () => void) =>
    timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (bornPhase !== 'animating') return;
    if (reduced) {
      after(0, () => setBornIdx(BORN_TREE.length));
      after(BORN_STEP_MS, () => setBornPhase('ready'));
      return;
    }
    for (let i = 1; i <= BORN_TREE.length; i++) {
      after(BORN_STEP_MS * i, () => setBornIdx(i));
    }
    after(BORN_STEP_MS * (BORN_TREE.length + 1), () => setBornPhase('ready'));
  }, [bornPhase, reduced]);

  if (awaiting) {
    return <NotificationCard req={awaiting} onDecide={onDecide} reduced={reduced} />;
  }

  const btn =
    'flex w-full items-center justify-center gap-2 rounded-sm bg-accent px-3 py-2 text-small font-medium text-text-primary transition-colors duration-150 hover:bg-accent-muted disabled:opacity-40 disabled:hover:bg-accent';

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
          Master data console
        </span>
        <h3 className="font-claude text-h3 text-text-primary">Ecoflow admin</h3>
      </div>

      {bornPhase === 'idle' ? (
        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setBornPhase('animating')}
            disabled={busy}
            className={btn}
          >
            Product Born
          </button>
        </div>
      ) : (
        <>
          <BornTree idx={bornIdx} reduced={reduced} />
          <div className="mt-auto">
            {published ? (
              <span className="inline-flex items-center gap-2 font-mono text-mono text-positive">
                <span className="h-1.5 w-1.5 rounded-full bg-positive" />
                Published · snapshot v1
              </span>
            ) : publishing ? (
              <span className="inline-flex items-center gap-2 font-mono text-mono text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                publishing…
              </span>
            ) : bornPhase === 'ready' ? (
              <button
                type="button"
                onClick={onPublish}
                disabled={busy}
                className={btn}
              >
                Publish
              </button>
            ) : (
              <span className="font-mono text-mono text-text-tertiary">
                scaffolding…
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ProducerGlyph({ kind }: { kind: Producer }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.25,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
  if (kind === 'walpack') {
    return (
      <svg {...common}>
        <path d="M1.5 4 H9 V11 H1.5 Z M9 6.5 H12.5 L14.5 9 V11 H9 Z" />
        <circle cx="4" cy="12.5" r="1.2" fill="var(--surface-2)" />
        <circle cx="11.5" cy="12.5" r="1.2" fill="var(--surface-2)" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M4 2 H12 V14 L10.5 13 L9 14 L7 13 L5.5 14 L4 13 Z" />
      <path d="M6 5 H10 M6 8 H10 M6 11 H8.5" />
    </svg>
  );
}

/** The printed receipt (POS) / manifest slip (Walpack) that prints out. */
function ReceiptPrint({
  producer,
  product,
  qty,
  eventId,
  reduced,
}: {
  producer: Producer;
  product: string;
  qty: number;
  eventId: string;
  reduced: boolean;
}) {
  const m = PRODUCER_META[producer];
  const card = (
    <div className="w-56 rounded-sm border border-border-strong bg-surface-2 p-3 font-mono text-mono shadow-lg">
      <div className="mb-2 flex items-center justify-between border-b border-dashed border-border pb-2">
        <span className="text-text-primary">{m.title}</span>
        <span className="text-text-tertiary">{m.source}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2 py-0.5">
        <span className="min-w-0 flex-1 truncate text-text-secondary">
          {qty} × {product}
        </span>
        <span className={producer === 'pos' ? 'text-negative' : 'text-positive'}>
          {producer === 'pos' ? `−${qty}` : `+${qty}`}
        </span>
      </div>
      <div className="mt-2 border-t border-dashed border-border pt-2 text-text-tertiary">
        {m.event} evt_{eventId}
      </div>
    </div>
  );
  return reduced ? (
    card
  ) : (
    <motion.div variants={settleIn} initial="hidden" animate="show">
      {card}
    </motion.div>
  );
}

/** External event producers footer: POS sell + Walpack transport. */
function ProducerBar({
  onProduce,
  busy,
}: {
  onProduce: (kind: Producer) => void;
  busy: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-1 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-text-tertiary" />
        <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
          external event producers
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(['pos', 'walpack'] as Producer[]).map(kind => (
          <button
            key={kind}
            type="button"
            disabled={busy}
            onClick={() => onProduce(kind)}
            className="inline-flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-3 py-2 text-small text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary disabled:opacity-40 disabled:hover:border-border disabled:hover:text-text-secondary"
          >
            <ProducerGlyph kind={kind} />
            {PRODUCER_META[kind].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** One inventory row; flashes with the signed delta when a producer hits it. */
function InventoryRow({
  product,
  flash,
  onHistory,
}: {
  product: Product;
  flash: { kind: Producer; qty: number } | null;
  onHistory: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-sm px-1.5 py-1.5 transition-colors duration-150"
      style={flash ? { background: 'var(--accent-glow)' } : undefined}
    >
      <span className="min-w-0 flex-1 truncate text-small text-text-primary">
        {product.name}
      </span>
      <span className="tabular shrink-0 font-mono text-mono text-text-secondary">
        {product.stock}
      </span>
      {flash && (
        <span
          className={`tabular shrink-0 font-mono text-mono ${
            flash.kind === 'pos' ? 'text-negative' : 'text-positive'
          }`}
        >
          {flash.kind === 'pos' ? '−' : '+'}
          {flash.qty}
        </span>
      )}
      <button
        type="button"
        onClick={onHistory}
        className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-mono text-text-tertiary transition-colors duration-150 hover:border-border-strong hover:text-text-secondary"
      >
        history
      </button>
    </div>
  );
}

/** The per-product history panel. */
function HistoryPanel({
  product,
  onBack,
  reduced,
}: {
  product: Product;
  onBack: () => void;
  reduced: boolean;
}) {
  const rows: [string, string][] = [
    ['Received', product.received],
    ['Stock age', product.stockAge],
    ['Last sold', product.lastSold],
    ['In stock', String(product.stock)],
    ['Total sold', String(product.sold)],
    ['Transit', product.transit],
  ];
  const body = (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-mono text-text-tertiary transition-colors duration-150 hover:border-border-strong hover:text-text-secondary"
        >
          ← back
        </button>
        <span className="min-w-0 flex-1 truncate text-small font-medium text-text-primary">
          {product.name}
        </span>
      </div>
      <div className="flex flex-col gap-1.5 overflow-auto font-mono text-mono">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between gap-2">
            <span className="shrink-0 text-text-tertiary">{k}</span>
            <span className="min-w-0 truncate text-right text-text-secondary">
              {v}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
  return reduced ? (
    body
  ) : (
    <motion.div
      variants={swap}
      initial="enter"
      animate="center"
      className="h-full"
    >
      {body}
    </motion.div>
  );
}

/** dashboard.walton — the realtime sales/inventory list fed by POS/Walpack. */
function DashboardWindow({
  inventory,
  flash,
  awaiting,
  onDecide,
  published,
  onRead,
  reading,
  reduced,
}: {
  inventory: Product[];
  flash: { idx: number; kind: Producer; qty: number } | null;
  awaiting: { fromApp: string; targetApp: string; eventId: string } | null;
  onDecide: (d: 'granted' | 'denied') => void;
  published: boolean;
  onRead: () => void;
  reading: boolean;
  reduced: boolean;
}) {
  const [historyIdx, setHistoryIdx] = useState<number | null>(null);
  return (
    <AppWindow host="dashboard.walton" port={3004} status="live">
      {awaiting ? (
        <NotificationCard req={awaiting} onDecide={onDecide} reduced={reduced} />
      ) : historyIdx !== null ? (
        <HistoryPanel
          product={inventory[historyIdx]}
          onBack={() => setHistoryIdx(null)}
          reduced={reduced}
        />
      ) : (
        <div className="flex h-full flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
              Realtime sales
            </span>
            <span className="tabular font-mono text-mono text-text-tertiary">
              {inventory.length} SKUs
            </span>
          </div>
          <div className="flex flex-col gap-0.5 overflow-auto">
            {inventory.map((p, i) => (
              <InventoryRow
                key={p.name}
                product={p}
                flash={
                  flash?.idx === i ? { kind: flash.kind, qty: flash.qty } : null
                }
                onHistory={() => setHistoryIdx(i)}
              />
            ))}
          </div>
          {published && (
            <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
              <span className="font-mono text-mono text-text-tertiary">
                snapshot v1 · Redis
              </span>
              <button
                type="button"
                onClick={onRead}
                disabled={reading}
                className="ml-auto shrink-0 rounded-sm border border-border bg-surface-1 px-2 py-0.5 font-mono text-mono text-text-secondary transition-colors duration-150 hover:border-border-strong hover:text-text-primary disabled:opacity-40"
              >
                {reading ? 'reading…' : 'Read snapshot'}
              </button>
            </div>
          )}
        </div>
      )}
    </AppWindow>
  );
}

/* ------------------------------ section ---------------------------- */

export default function ArchitectureConsumers() {
  const reduced = useReducedMotion();
  const container = reduced ? undefined : staggerParent;
  const item = reduced ? undefined : riseInSm;

  // tenantWeb reports when its sign-in request is in flight; the backend
  // pulse lights up only then — one shared "a request is being served"
  const [consuming, setConsuming] = useState(false);

  // events pinned into the terminal (sign-in + access decisions)
  const [pin, setPin] = useState<PinSignal | null>(null);
  const emitPin = useCallback(
    (p: Omit<PinSignal, 'nonce'>) =>
      setPin(prev => ({ ...p, nonce: (prev?.nonce ?? 0) + 1 })),
    [],
  );
  const emitAuth = useCallback(
    (email: string) =>
      emitPin({
        app: 'tenantWeb',
        who: email,
        detail: 'session issued',
        tone: 'positive',
      }),
    [emitPin],
  );

  // access-grant saga: request -> await consumer -> respond -> resolve
  const [tileStatus, setTileStatus] = useState<Record<Target, TileStatus>>({
    admin: 'idle',
    dashboard: 'idle',
  });
  const [saga, setSaga] = useState<{
    target: Target;
    phase: AccessPhase;
    decision?: 'granted' | 'denied';
    eventId: string;
  } | null>(null);
  const sagaRef = useRef(saga);
  useEffect(() => {
    sagaRef.current = saga;
  }, [saga]);

  const request = useCallback(
    (target: Target) => {
      if (sagaRef.current) return; // one saga at a time
      const eventId = Math.floor(Math.random() * 0xffff)
        .toString(16)
        .padStart(4, '0');
      sagaRef.current = { target, phase: 'requesting', eventId };
      setTileStatus(s => ({ ...s, [target]: 'pending' }));
      setSaga({ target, phase: 'requesting', eventId });
      const m = TARGET_META[target];
      emitPin({
        app: 'tenantWeb',
        who: `→ ${m.host}:${m.port}`,
        detail: `access.requested evt_${eventId}`,
        tone: 'accent',
      });
    },
    [emitPin],
  );

  const decide = useCallback((decision: 'granted' | 'denied') => {
    setSaga(s =>
      s && s.phase === 'awaiting' ? { ...s, phase: 'responding', decision } : s,
    );
  }, []);

  // phase-driven timers: forward pass -> await; response pass -> resolve
  useEffect(() => {
    if (!saga) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (saga.phase === 'requesting') {
      timers.push(
        setTimeout(
          () =>
            setSaga(s =>
              s && s.phase === 'requesting' ? { ...s, phase: 'awaiting' } : s,
            ),
          ACCESS.forwardMs,
        ),
      );
    } else if (saga.phase === 'responding') {
      const m = TARGET_META[saga.target];
      timers.push(
        setTimeout(
          () =>
            emitPin({
              app: m.host,
              who: 'tenantWeb',
              detail: `access.${saga.decision} evt_${saga.eventId}`,
              tone: saga.decision === 'granted' ? 'positive' : 'negative',
            }),
          0,
        ),
      );
      timers.push(
        setTimeout(() => {
          setTileStatus(st => ({ ...st, [saga.target]: saga.decision! }));
          setSaga(s => (s ? { ...s, phase: 'resolved' } : s));
        }, ACCESS.returnMs),
      );
    } else if (saga.phase === 'resolved') {
      timers.push(setTimeout(() => setSaga(null), ACCESS.resolveMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [saga, emitPin]);

  // product publish saga — one-way: push -> Redpanda -> worker -> Redis
  // -> the two reader consumers, then resolve.
  const [publish, setPublish] = useState<{
    phase: 'publishing' | 'resolved';
    eventId: string;
  } | null>(null);
  const [published, setPublished] = useState(false);
  const [reading, setReading] = useState<Reader | null>(null);
  const publishRef = useRef(publish);
  useEffect(() => {
    publishRef.current = publish;
  }, [publish]);

  const doPublish = useCallback(() => {
    if (publishRef.current || sagaRef.current) return;
    const eventId = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
    publishRef.current = { phase: 'publishing', eventId };
    setPublish({ phase: 'publishing', eventId });
    emitPin({
      app: 'admin.walton',
      who: 'product.published',
      detail: `snapshot.resolved evt_${eventId}`,
      tone: 'accent',
    });
  }, [emitPin]);

  useEffect(() => {
    if (!publish) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (publish.phase === 'publishing') {
      timers.push(
        setTimeout(
          () =>
            emitPin({
              app: 'redis.walton',
              who: 'cache',
              detail: `snapshot v1 cached evt_${publish.eventId}`,
              tone: 'positive',
            }),
          Math.round(ACCESS.forwardMs * 0.55),
        ),
      );
      timers.push(
        setTimeout(() => {
          setPublished(true);
          setPublish(p => (p ? { ...p, phase: 'resolved' } : p));
        }, ACCESS.forwardMs),
      );
    } else if (publish.phase === 'resolved') {
      timers.push(setTimeout(() => setPublish(null), ACCESS.resolveMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [publish, emitPin]);

  const read = useCallback(
    (who: Reader) => setReading(prev => prev ?? who),
    [],
  );
  useEffect(() => {
    if (!reading) return;
    const t = setTimeout(() => setReading(null), 2200);
    return () => clearTimeout(t);
  }, [reading]);

  // external producers (POS sell / Walpack transport) -> dashboard:3004
  const [inventory, setInventory] = useState<Product[]>(INITIAL_INVENTORY);
  const [producer, setProducer] = useState<{
    kind: Producer;
    phase: 'running' | 'resolved';
    eventId: string;
    idx: number;
    qty: number;
    product: string;
  } | null>(null);
  const [flash, setFlash] = useState<{
    idx: number;
    kind: Producer;
    qty: number;
  } | null>(null);
  const producerRef = useRef(producer);
  useEffect(() => {
    producerRef.current = producer;
  }, [producer]);

  const doProduce = useCallback(
    (kind: Producer) => {
      if (producerRef.current || sagaRef.current || publishRef.current) return;
      const eventId = Math.floor(Math.random() * 0xffff)
        .toString(16)
        .padStart(4, '0');
      const idx = Math.floor(Math.random() * inventory.length);
      const qty = 1 + Math.floor(Math.random() * 5);
      producerRef.current = {
        kind,
        phase: 'running',
        eventId,
        idx,
        qty,
        product: inventory[idx].name,
      };
      setProducer(producerRef.current);
      const m = PRODUCER_META[kind];
      emitPin({
        app: m.app,
        who: m.source,
        detail: `${m.event} evt_${eventId}`,
        tone: 'accent',
      });
    },
    [inventory, emitPin],
  );

  useEffect(() => {
    if (!producer) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (producer.phase === 'running') {
      timers.push(
        setTimeout(() => {
          setInventory(inv =>
            inv.map((p, i) =>
              i === producer.idx
                ? producer.kind === 'pos'
                  ? {
                      ...p,
                      stock: Math.max(0, p.stock - producer.qty),
                      sold: p.sold + producer.qty,
                    }
                  : { ...p, stock: p.stock + producer.qty }
                : p,
            ),
          );
          setFlash({ idx: producer.idx, kind: producer.kind, qty: producer.qty });
        }, ACCESS.forwardMs),
      );
      timers.push(
        setTimeout(
          () => setProducer(p => (p ? { ...p, phase: 'resolved' } : p)),
          ACCESS.forwardMs + 120,
        ),
      );
    } else if (producer.phase === 'resolved') {
      timers.push(setTimeout(() => setProducer(null), ACCESS.resolveMs));
    }
    return () => timers.forEach(clearTimeout);
  }, [producer]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [flash]);

  // refs for the cross-layout wires
  const stageRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<HTMLSpanElement>(null);
  const workerPortRef = useRef<HTMLSpanElement>(null);
  const redisPortRef = useRef<HTMLSpanElement>(null);
  const centralWebRef = useRef<HTMLDivElement>(null);
  const adminRef = useRef<HTMLDivElement>(null);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // derived backend + wire state
  const producing = producer?.phase === 'running';
  const backendDraining =
    (!!saga && (saga.phase === 'requesting' || saga.phase === 'responding')) ||
    !!producing;
  const portalFlow: 'fwd' | 'rev' | null =
    consuming || saga?.phase === 'requesting'
      ? 'fwd'
      : saga?.phase === 'responding'
        ? 'rev'
        : null;
  const workerTarget: Target | null =
    saga && saga.phase !== 'resolved' ? saga.target : null;
  const workerFlow: 'fwd' | 'rev' | null =
    saga?.phase === 'requesting'
      ? 'fwd'
      : saga?.phase === 'responding'
        ? 'rev'
        : null;
  const targetRef =
    workerTarget === 'admin'
      ? adminRef
      : workerTarget === 'dashboard'
        ? dashboardRef
        : null;
  const awaitingFor = (t: Target) =>
    saga?.phase === 'awaiting' && saga.target === t
      ? {
          fromApp: 'tenantWeb',
          targetApp: `${TARGET_META[t].host}:${TARGET_META[t].port}`,
          eventId: saga.eventId,
        }
      : null;

  const publishing = publish?.phase === 'publishing';
  const busy = !!saga || !!publish || !!producer;
  const readRef =
    reading === 'centralWeb'
      ? centralWebRef
      : reading === 'dashboard'
        ? dashboardRef
        : null;

  return (
    <section
      aria-label="EcoFlow consumer applications"
      className="border-t border-border"
    >
      <div className="w-full px-6 py-24 sm:px-12 md:py-32">
        <motion.div
          variants={container}
          initial={reduced ? undefined : 'hidden'}
          whileInView={reduced ? undefined : 'show'}
          viewport={{ once: true, amount: 0.15 }}
        >
          {/* section label */}
          <motion.div
            variants={item}
            className="mb-8 flex items-end justify-between gap-4"
          >
            <div className="flex flex-col gap-2">
              <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
                Consumer layer
              </span>
              <h2 className="font-claude text-h1 font-black text-claude md:text-display">
                Four surfaces, one source of truth.
              </h2>
            </div>
            <span className="hidden items-center gap-2 rounded-sm border border-border bg-surface-1 px-3 py-1.5 sm:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-positive" />
              <span className="tabular font-mono text-mono text-text-secondary">
                Snapshot v1 · read-only
              </span>
            </span>
          </motion.div>

          {/* consumers on top, the backend they all read on the bottom */}
          <div ref={stageRef} className="relative flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <motion.div ref={portalRef} variants={item}>
                <AppWindow host="portal.walton" port={3000} status="live">
                  <TenantSignIn
                    onConsumingChange={setConsuming}
                    onAuthEvent={emitAuth}
                    tileStatus={tileStatus}
                    busy={busy}
                    onRequest={request}
                  />
                </AppWindow>
              </motion.div>

              <motion.div ref={centralWebRef} variants={item}>
                <ConsumerWindow
                  host="walton"
                  port={3001}
                  role="Catalog site"
                  title="centralWeb"
                  note="Reads snapshot v1"
                  awaiting={null}
                  onDecide={decide}
                  published={published}
                  onRead={() => read('centralWeb')}
                  reading={reading === 'centralWeb'}
                  reduced={reduced ?? false}
                />
              </motion.div>

              <motion.div ref={adminRef} variants={item}>
                <AppWindow host="admin.walton" port={3003} status="live">
                  <AdminConsole
                    awaiting={awaitingFor('admin')}
                    onDecide={decide}
                    publishing={publishing}
                    published={published}
                    busy={busy}
                    onPublish={doPublish}
                    reduced={reduced ?? false}
                  />
                </AppWindow>
              </motion.div>

              <motion.div ref={dashboardRef} variants={item}>
                <DashboardWindow
                  inventory={inventory}
                  flash={flash}
                  awaiting={awaitingFor('dashboard')}
                  onDecide={decide}
                  published={published}
                  onRead={() => read('dashboard')}
                  reading={reading === 'dashboard'}
                  reduced={reduced ?? false}
                />
              </motion.div>
            </div>

            <motion.div variants={item}>
              <BackendServer
                reduced={reduced ?? false}
                active={consuming}
                draining={backendDraining}
                caching={publishing}
                portRef={portRef}
                workerPortRef={workerPortRef}
                redisPortRef={redisPortRef}
                pin={pin}
              />
            </motion.div>

            {producer && (
              <ReceiptPrint
                key={producer.eventId}
                producer={producer.kind}
                product={producer.product}
                qty={producer.qty}
                eventId={producer.eventId}
                reduced={reduced ?? false}
              />
            )}

            <motion.div variants={item}>
              <ProducerBar onProduce={doProduce} busy={busy} />
            </motion.div>

            {/* portal <-> push machine */}
            <Wire
              stageRef={stageRef}
              fromRef={portalRef}
              toRef={portRef}
              fromSide="bottom"
              toSide="center"
              flow={portalFlow}
              reduced={reduced ?? false}
            />
            {/* worker -> the access target */}
            <Wire
              stageRef={stageRef}
              fromRef={workerPortRef}
              toRef={targetRef}
              fromSide="center"
              toSide="bottom"
              flow={workerFlow}
              reduced={reduced ?? false}
            />
            {/* worker -> the two publish readers, in parallel */}
            {publishing && (
              <>
                <Wire
                  stageRef={stageRef}
                  fromRef={workerPortRef}
                  toRef={centralWebRef}
                  fromSide="center"
                  toSide="bottom"
                  flow="fwd"
                  reduced={reduced ?? false}
                />
                <Wire
                  stageRef={stageRef}
                  fromRef={workerPortRef}
                  toRef={dashboardRef}
                  fromSide="center"
                  toSide="bottom"
                  flow="fwd"
                  reduced={reduced ?? false}
                />
              </>
            )}
            {/* worker -> dashboard for a POS / Walpack producer event */}
            {producing && (
              <Wire
                stageRef={stageRef}
                fromRef={workerPortRef}
                toRef={dashboardRef}
                fromSide="center"
                toSide="bottom"
                flow="fwd"
                reduced={reduced ?? false}
              />
            )}
            {/* Redis -> a consumer reading the snapshot back */}
            <Wire
              stageRef={stageRef}
              fromRef={redisPortRef}
              toRef={readRef}
              fromSide="center"
              toSide="bottom"
              flow={reading ? 'fwd' : null}
              reduced={reduced ?? false}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
