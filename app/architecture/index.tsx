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

/** Body for a consumer not yet wired: title header + a single note. */
function SurfaceHeader({
  role,
  title,
  note,
  status,
}: {
  role: string;
  title: string;
  note: string;
  status: Status;
}) {
  const s = STATUS[status];
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-mono uppercase tracking-wider text-text-tertiary">
          {role}
        </span>
        <h3 className="font-claude text-h3 text-text-primary">{title}</h3>
      </div>
      <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.dot}`} />
        <span className="font-mono text-mono text-text-tertiary">{note}</span>
      </div>
    </div>
  );
}

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
  { name: 'Ecoflow admin', port: 3003, hint: 'Master data console', icon: 'admin' as const },
  {
    name: 'EcoFlow real time Dashboard',
    port: 3004,
    hint: 'Live event stream',
    icon: 'chart' as const,
  },
];

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

function ChevronGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4.5 2.5 L8 6 L4.5 9.5" />
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

/** A launched satellite app, offered by the launcher after sign-in. */
function AppTile({ app, reduced }: { app: (typeof LAUNCHER)[number]; reduced: boolean }) {
  const tile = (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-md border border-border bg-surface-2 p-3 text-left transition-colors duration-150 hover:border-border-strong"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface-3 text-text-secondary">
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
      <span className="shrink-0 text-text-tertiary">
        <ChevronGlyph />
      </span>
    </button>
  );
  return reduced ? (
    tile
  ) : (
    <motion.div variants={riseInSm}>{tile}</motion.div>
  );
}

/** SSO sign-in — credentials → request journey → code → launcher. */
function TenantSignIn({
  onConsumingChange,
  onAuthEvent,
}: {
  onConsumingChange: (consuming: boolean) => void;
  onAuthEvent: (email: string) => void;
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
                <AppTile key={app.name} app={app} reduced={reduced} />
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
  reduced,
  portRef,
}: {
  active: boolean;
  reduced: boolean;
  portRef: RefObject<HTMLSpanElement | null>;
}) {
  const showPulses = active && !reduced;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-small font-medium text-text-primary">
          Publishing · push machine
        </h3>
        <span className="tabular font-mono text-mono text-text-tertiary">
          {active ? 'serving request…' : 'idle · no requests'}
        </span>
      </div>

      <div className="pointer-events-none relative select-none" aria-hidden>
        <span
          ref={portRef}
          className="absolute left-0"
          style={{ top: '50%' }}
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

          {/* pulses */}
          {showPulses &&
            ROUTES.map((r, i) => (
              <FlowPulse key={`pulse-${r.key}`} d={r.d} delay={i * FLOW.stagger} />
            ))}
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
  ok: boolean;
  detail: string;
  highlight?: boolean;
};

/**
 * The Redpanda-fed event terminal (code / code-bar chrome). Continuously
 * appends synthetic auth traffic, and — when `live` changes — lands the
 * real tenantWeb sign-in as a highlighted line correlated to the flow.
 */
function EventTerminal({
  reduced,
  live,
}: {
  reduced: boolean;
  live: { email: string; nonce: number } | null;
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
      ok: boolean;
      highlight: boolean;
    }): LogLine => {
      const src = LOG_SOURCES[Math.floor(Math.random() * LOG_SOURCES.length)];
      const ok = over?.ok ?? Math.random() > 0.28;
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
        ok,
        detail: ok
          ? `session sess_${sess} issued`
          : `denied · ${DENY[Math.floor(Math.random() * DENY.length)]}`,
        highlight: over?.highlight,
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

  // live correlation — the real tenantWeb sign-in is pinned so it never
  // rotates out of the log window (keep the few most recent sessions)
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(
      () =>
        setPinned(prev => [
          ...prev.slice(-2),
          buildLine({
            app: 'tenantWeb',
            who: live.email,
            ok: true,
            highlight: true,
          }),
        ]),
      0,
    );
    return () => clearTimeout(t);
  }, [live, buildLine]);

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

      {/* pinned — the real sign-in, held so it never rotates out */}
      {pinned.length > 0 && (
        <div
          className="border-b border-border px-3 py-2 font-mono text-mono"
          style={{ background: 'var(--accent-glow)' }}
        >
          <div className="mb-1 flex items-center gap-2 text-text-tertiary">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            <span>pinned · this session</span>
          </div>
          {pinned.map(l => (
            <div
              key={l.id}
              className="flex items-baseline gap-2 whitespace-nowrap"
            >
              <span className="shrink-0 text-text-tertiary">{l.time}</span>
              <span className="shrink-0 text-text-tertiary">auth.attempt</span>
              <span className="shrink-0 text-accent">{l.app}</span>
              <span className="shrink-0 text-text-tertiary">{l.who}</span>
              <span className="text-positive">{l.detail}</span>
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
            <span className="shrink-0 text-text-tertiary">auth.attempt</span>
            <span className="shrink-0 text-text-secondary">{l.app}</span>
            <span className="shrink-0 text-text-tertiary">{l.who}</span>
            <span className={l.ok ? 'text-positive' : 'text-negative'}>
              {l.detail}
            </span>
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
  portRef,
  live,
}: {
  reduced: boolean;
  active: boolean;
  portRef: RefObject<HTMLSpanElement | null>;
  live: { email: string; nonce: number } | null;
}) {
  return (
    <ServerContainer host="api.walton" port={3002}>
      <PublishingMachine active={active} reduced={reduced} portRef={portRef} />
      <EventTerminal reduced={reduced} live={live} />
    </ServerContainer>
  );
}

/**
 * The cross-layout wire from the tenantWeb window down to the push
 * machine's left port. Measured relative to the stage and redrawn on
 * resize; a pulse flows portal → server while a request is in flight.
 */
function ConnectorOverlay({
  stageRef,
  portalRef,
  portRef,
  active,
  reduced,
}: {
  stageRef: RefObject<HTMLDivElement | null>;
  portalRef: RefObject<HTMLDivElement | null>;
  portRef: RefObject<HTMLSpanElement | null>;
  active: boolean;
  reduced: boolean;
}) {
  const [d, setD] = useState<string | null>(null);

  useEffect(() => {
    const compute = () => {
      const stage = stageRef.current;
      const portal = portalRef.current;
      const port = portRef.current;
      if (!stage || !portal || !port) return;
      const s = stage.getBoundingClientRect();
      const p = portal.getBoundingClientRect();
      const q = port.getBoundingClientRect();
      const sx = p.left + p.width / 2 - s.left;
      const sy = p.bottom - s.top;
      const ex = q.left + q.width / 2 - s.left;
      const ey = q.top + q.height / 2 - s.top;
      const my = sy + (ey - sy) / 2;
      setD(`M ${sx} ${sy} C ${sx} ${my}, ${ex} ${my}, ${ex} ${ey}`);
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
  }, [stageRef, portalRef, portRef]);

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
      {active && !reduced && (
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
          initial={{ strokeDashoffset: 0.1 }}
          animate={{ strokeDashoffset: [0.1, -1] }}
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

/* ------------------------------ section ---------------------------- */

export default function ArchitectureConsumers() {
  const reduced = useReducedMotion();
  const container = reduced ? undefined : staggerParent;
  const item = reduced ? undefined : riseInSm;

  // tenantWeb reports when its sign-in request is in flight; the backend
  // pulse lights up only then — one shared "a request is being served"
  const [consuming, setConsuming] = useState(false);

  // the real sign-in, relayed to the event terminal as a highlighted line
  const [liveAuth, setLiveAuth] = useState<{
    email: string;
    nonce: number;
  } | null>(null);
  const emitAuth = useCallback((email: string) => {
    setLiveAuth(prev => ({ email, nonce: (prev?.nonce ?? 0) + 1 }));
  }, []);

  // refs for the cross-layout wire: tenantWeb window → push-machine port
  const stageRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const portRef = useRef<HTMLSpanElement>(null);

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
                  />
                </AppWindow>
              </motion.div>

              <motion.div variants={item}>
                <AppWindow host="walton" port={3001} status="live">
                  <SurfaceHeader
                    role="Catalog site"
                    title="centralWeb"
                    note="Reads snapshot v1"
                    status="live"
                  />
                </AppWindow>
              </motion.div>

              <motion.div variants={item}>
                <AppWindow host="admin.walton" port={3003} status="live">
                  <SurfaceHeader
                    role="Master data console"
                    title="Ecoflow admin"
                    note="Authors product master"
                    status="live"
                  />
                </AppWindow>
              </motion.div>

              <motion.div variants={item}>
                <AppWindow host="dashboard.walton" port={3004} status="live">
                  <SurfaceHeader
                    role="Realtime analytics"
                    title="EcoFlow real time Dashboard"
                    note="Streams sale.completed.v1"
                    status="live"
                  />
                </AppWindow>
              </motion.div>
            </div>

            <motion.div variants={item}>
              <BackendServer
                reduced={reduced ?? false}
                active={consuming}
                portRef={portRef}
                live={liveAuth}
              />
            </motion.div>

            <ConnectorOverlay
              stageRef={stageRef}
              portalRef={portalRef}
              portRef={portRef}
              active={consuming}
              reduced={reduced ?? false}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
