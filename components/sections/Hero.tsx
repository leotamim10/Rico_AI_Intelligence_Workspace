"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

import { duration, ease } from "@/lib/motion/easings";
import { riseIn, staggerParent } from "@/lib/motion/variants";
import { useDampedValue } from "@/lib/motion/useDampedValue";

const Scene = dynamic(() => import("@/components/three/Scene"), { ssr: false });

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const { current: progressRef, setTarget } = useDampedValue(0, 0.09);

  const [count, setCount] = useState(6000);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Particle budget + reduced-motion preference resolve on the client.
  useEffect(() => {
    setCount(window.innerWidth < 768 ? 2000 : 6000);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scroll scrubs uProgress 0 → 1 while the section is pinned.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (reduced) {
      setTarget(1); // render the resolved end-state statically
      return;
    }

    let frame: number | null = null;
    const measure = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? -rect.top / travel : 0;
      setTarget(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [reduced, setTarget]);

  // Pause the render loop when the hero is offscreen.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onPointerMove = (e: React.PointerEvent) => {
    if (reduced) return;
    pointerRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -((e.clientY / window.innerHeight) * 2 - 1),
    };
  };

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

        {/* Particle field */}
        <div className="absolute inset-0">
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
            className="text-display text-text-primary"
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
