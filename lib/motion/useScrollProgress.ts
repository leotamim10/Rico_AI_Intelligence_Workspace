"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Tracks an element's scroll progress through the viewport, in [0, 1].
 *
 *  0  → the element's top just reached the bottom of the viewport
 *  1  → the element's bottom just left the top of the viewport
 *
 * Uses a rAF-throttled scroll listener. For heavy scrubbing prefer piping
 * the raw progress into useDampedValue rather than driving DOM directly.
 */
export function useScrollProgress<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame: number | null = null;

    const measure = () => {
      frame = null;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height + vh;
      const seen = vh - rect.top;
      const p = Math.min(1, Math.max(0, seen / total));
      setProgress(p);
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
  }, []);

  return { ref, progress };
}
