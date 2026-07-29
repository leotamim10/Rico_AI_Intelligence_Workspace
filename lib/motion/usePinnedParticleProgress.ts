"use client";

import { useEffect, useRef, useState } from "react";

import { useDampedValue } from "./useDampedValue";

/**
 * Shared driver for a pinned particle scene. Scroll through the section
 * scrubs uProgress from `from` to `to` (damped); the render loop parks
 * when offscreen; cursor parallax is exposed via pointerRef.
 *
 * When the scene is "static" — reduced-motion OR a small/touch screen —
 * progress snaps to `to` (the resolved end-state), the scroll listener is
 * skipped, and parallax is disabled. Small screens unpin (the section is
 * only one viewport tall via responsive CSS) rather than ship broken
 * pinning + scroll-jacking on touch.
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
  // `staticMode` collapses scrubbing for reduced-motion and small screens.
  const [staticMode, setStaticMode] = useState(false);

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => {
      setCount(mobile.matches ? 2000 : 6000);
      setStaticMode(rm.matches || mobile.matches);
    };
    sync();
    mobile.addEventListener("change", sync);
    rm.addEventListener("change", sync);
    return () => {
      mobile.removeEventListener("change", sync);
      rm.removeEventListener("change", sync);
    };
  }, []);

  // Scroll scrubs progress across the pinned range.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    if (staticMode) {
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
  }, [staticMode, from, to, setTarget]);

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
    if (staticMode) return;
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
    staticMode,
    onPointerMove,
  };
}
