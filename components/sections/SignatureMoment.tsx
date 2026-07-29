"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";

import { StatChip } from "@/components/ui/StatChip";
import { riseIn, staggerParent } from "@/lib/motion/variants";
import { usePinnedParticleProgress } from "@/lib/motion/usePinnedParticleProgress";

const Scene = dynamic(() => import("@/components/three/Scene"), { ssr: false });

export function SignatureMoment() {
  // Continues the same morph: structured (1) → clustered insight (2).
  // Static (small/touch or reduced-motion) → one viewport, resolved state.
  const {
    sectionRef,
    progressRef,
    pointerRef,
    count,
    active,
    staticMode,
    onPointerMove,
  } = usePinnedParticleProgress(1, 2);

  return (
    <section
      ref={sectionRef}
      onPointerMove={onPointerMove}
      className="relative h-screen border-t border-border motion-reduce:h-screen! md:h-[300vh]"
      aria-label="Insight, clustered and in motion"
    >
      <div className="sticky top-0 flex h-screen flex-col items-center justify-center overflow-hidden">
        <div className="hero-glow pointer-events-none absolute inset-0" aria-hidden />

        {/* Same field, driven into its clustered state. Depth fog in the
            shader gives the groups parallax depth. */}
        <div
          className="absolute inset-0"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 14%, black 86%, transparent 100%)",
          }}
        >
          <Scene
            progressRef={progressRef}
            pointerRef={pointerRef}
            count={count}
            active={active}
            parallax={staticMode ? 0 : 0.75}
          />
        </div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className="relative z-10 flex max-w-[52rem] flex-col items-center px-6 text-center"
        >
          <motion.span
            variants={riseIn}
            className="tabular mb-6 font-mono text-mono uppercase tracking-[0.22em] text-text-tertiary"
          >
            Automations
          </motion.span>

          <motion.h2 variants={riseIn} className="font-display text-display text-text-primary">
            Insight, already
            <br />
            in motion.
          </motion.h2>

          <motion.p
            variants={riseIn}
            className="mt-6 max-w-[46ch] text-body text-text-secondary"
          >
            Xai clusters what matters and triggers the automations that act on
            it — routed to your stack before you open the tab.
          </motion.p>

          <motion.div variants={riseIn} className="mt-10 flex items-center gap-3">
            <StatChip>347 automations triggered</StatChip>
            <StatChip>0 manual triage</StatChip>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
