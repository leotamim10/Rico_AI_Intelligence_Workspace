"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import { duration, ease } from "@/lib/motion/easings";
import { riseIn, staggerParent } from "@/lib/motion/variants";
import { usePinnedParticleProgress } from "@/lib/motion/usePinnedParticleProgress";

const Scene = dynamic(() => import("@/components/three/Scene"), { ssr: false });

export function Hero() {
  // Scroll scrubs the particle field from chaos (0) to structured (1).
  const {
    sectionRef,
    progressRef,
    pointerRef,
    count,
    active,
    reduced,
    onPointerMove,
  } = usePinnedParticleProgress(0, 1);

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      className="relative h-[340vh]"
      aria-label="Xai — intelligence workspace"
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        {/* Single subtle radial glow behind the field. */}
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />

        {/* Particle field — edges feathered so the canvas dissolves into
            the background instead of cutting off with a hard rectangle. */}
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 80%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 12%, black 80%, transparent 100%)",
          }}
        >
          <Scene
            progressRef={progressRef}
            pointerRef={pointerRef}
            count={count}
            active={active}
            parallax={reduced ? 0 : 0.6}
          />
        </div>

        {/* Copy */}
        <motion.div
          variants={staggerParent}
          initial="hidden"
          animate="show"
          className="relative z-10 flex max-w-[52rem] flex-col items-center px-6 text-center"
        >
          <motion.span
            variants={riseIn}
            className="tabular mb-6 font-mono text-mono uppercase tracking-[0.22em] text-text-tertiary"
          >
            Intelligence workspace
          </motion.span>

          <motion.h1
            variants={riseIn}
            className="font-display text-display text-text-primary"
          >
            From raw signal
            <br />
            to decided action.
          </motion.h1>

          <motion.p
            variants={riseIn}
            className="mt-6 max-w-[46ch] text-body text-text-secondary"
          >
            Xai ingests from 40+ sources, structures the noise, and routes the
            insight to your stack. Scroll to watch the data resolve.
          </motion.p>

          <motion.div
            variants={riseIn}
            className="mt-10 flex items-center gap-3"
          >
            <span className="tabular rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-mono text-text-secondary">
              48,213 signals / day
            </span>
            <span className="tabular rounded-sm border border-border bg-surface-2 px-3 py-1.5 font-mono text-mono text-text-secondary">
              1.2s to insight
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll cue — geometry motion, not a fade. */}
        {!reduced && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: duration.element, ease: ease.out }}
            className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
            aria-hidden
          >
            <div className="relative h-10 w-px overflow-hidden bg-border">
              <motion.div
                className="absolute inset-x-0 top-0 h-3 bg-accent"
                animate={{ y: [-12, 40] }}
                transition={{
                  duration: 1.8,
                  ease: ease.inOut,
                  repeat: Infinity,
                  repeatDelay: 0.2,
                }}
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
