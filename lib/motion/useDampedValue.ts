"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Damps a target value toward its destination on a rAF loop (lerp).
 * Scroll-driven values are never assigned directly — they are eased
 * toward a target so motion always has weight.
 *
 * Returns a ref holding the current damped value and a setter for the
 * target. Reads happen inside your own rAF / render — this hook does not
 * trigger React re-renders (by design, for 60fps scrubbing).
 */
export function useDampedValue(initial = 0, lerp = 0.08) {
  const current = useRef(initial);
  const target = useRef(initial);
  const frame = useRef<number | null>(null);

  const setTarget = useCallback((value: number) => {
    target.current = value;
  }, []);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      if (prefersReduced) {
        // Snap to final state, no easing.
        current.current = target.current;
      } else {
        current.current += (target.current - current.current) * lerp;
      }
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [lerp]);

  return { current, setTarget };
}
