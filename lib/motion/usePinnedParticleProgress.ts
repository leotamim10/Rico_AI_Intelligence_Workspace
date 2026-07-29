"use client";

import { useEffect, useRef, useState } from "react";

import { useDampedValue } from "./useDampedValue";

/**
 * Shared driver for a pinned particle scene. Scroll through the section
 * scrubs uProgress from `from` to `to` (damped); the render loop parks
 * when offscreen; cursor parallax is exposed via pointerRef. Under
 * reduced-motion the progress snaps to `to` (the resolved end-state) and
 * parallax is disabled.
 *
 * Used by both Hero (0 → 1) and SignatureMoment (1 → 2) so the two ends
 * of the same morph stay in sync.
 */
export function usePinnedParticleProgress(from: number, to: number, lerp = 0.09) {
  const sectionRef = useRef<HTMLElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const { current: progressRef, setTarget } = useDampedValue(from, lerp);

  const [count, setCount] = useState(6000);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setCount(window.innerWidth < 768 ? 2000 : 6000);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Scroll scrubs progress across the pinned range.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (reduced) {
      setTarget(to);
      return;
    }

    let frame: number | null = null;
    const measure = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      const p = travel > 0 ? -rect.top / travel : 0;
      const clamped = Math.min(1, Math.max(0, p));
      setTarget(from + (to - from) * clamped);
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
  }, [reduced, from, to, setTarget]);

  // Park the render loop when offscreen.
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

  return {
    sectionRef,
    progressRef,
    pointerRef,
    count,
    active,
    reduced,
    onPointerMove,
  };
}
