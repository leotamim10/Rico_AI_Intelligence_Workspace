import type { Variants } from "framer-motion";
import { duration, ease, stagger } from "./easings";

/**
 * Shared Framer Motion variants. Components compose these — they do not
 * define their own entrance geometry. Every motion here moves geometry
 * (transform), never opacity alone.
 */

/** Rise + fade for a single element entering. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.section, ease: ease.out },
  },
};

/** Smaller rise for card-scale entrances. */
export const riseInSm: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.element, ease: ease.out },
  },
};

/** Parent that staggers its children. Pair with a rise* variant on each child. */
export const staggerParent: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: 0.05 },
  },
};

/** Scale-in for surfaces that should feel like they settle into place. */
export const settleIn: Variants = {
  hidden: { opacity: 0, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: duration.element, ease: ease.out },
  },
};

/** Tab / content swap — small horizontal slide, no fade-only. */
export const swap: Variants = {
  enter: { opacity: 0, x: 12 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.element, ease: ease.inOut },
  },
  exit: {
    opacity: 0,
    x: -12,
    transition: { duration: duration.micro, ease: ease.inOut },
  },
};

/** Standard viewport config for scroll-triggered entrances that fire once. */
export const viewportOnce = { once: true, amount: 0.3 } as const;
