/**
 * Motion charter — easings and duration bands.
 * Every animation in the app pulls its curve and timing from here.
 * Nothing defines an easing inline.
 */

export const ease = {
  /** entrances — expo-ish, fast start, long settle */
  out: [0.16, 1, 0.3, 1],
  /** state changes, tab swaps */
  inOut: [0.65, 0, 0.35, 1],
  /** hover, focus, micro-interactions */
  micro: [0.4, 0, 0.2, 1],
  /** physical motion — drags, layout shifts */
  spring: { type: "spring", stiffness: 260, damping: 32, mass: 0.9 },
} as const;

/**
 * Duration bands (seconds, for Framer Motion).
 * micro   120–180ms  hover, focus, toggles
 * element 300–450ms  card entrance, tab content swap
 * section 600–900ms  section entrances, stage transitions
 * scene   scrubbed   scroll-driven (no fixed duration)
 */
export const duration = {
  micro: 0.16,
  element: 0.4,
  section: 0.75,
} as const;

/** Stagger step for grouped children (40–60ms). Never more than 8 items. */
export const stagger = 0.05;

/** GSAP-flavoured easing strings, kept in sync with the curves above. */
export const gsapEase = {
  out: "expo.out",
  inOut: "power3.inOut",
  micro: "power2.inOut",
} as const;
