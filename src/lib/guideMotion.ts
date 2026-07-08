"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import type { Variants } from "framer-motion";

/**
 * Shared framer-motion vocabulary for all visual guides (SPEC v2).
 * Import variants via useGuideMotion() — never define ad-hoc variant objects
 * in guide code. Reduced motion is handled here for every consumer.
 */

/** Canonical cubic-bezier ease for guide transitions. */
export const GUIDE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Canonical viewport config for whileInView entrances. */
export const GUIDE_VIEWPORT = { once: true, amount: 0.3 } as const;

export interface GuideMotionVariants {
  /** Fade in while translating up 14px. Default entrance for sections/rows. */
  fadeUp: Variants;
  /** Opacity-only fade. For elements where translation would distract. */
  fadeIn: Variants;
  /** Parent container that staggers its children by 0.08s. */
  stagger: Variants;
  /** Card entrance: fadeUp plus a slight scale (0.98 → 1). */
  card: Variants;
  /** Spring pop for badges/pills (scale 0.7 → 1). */
  pop: Variants;
}

const REDUCED_VARIANT: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
};

const REDUCED: GuideMotionVariants = {
  fadeUp: REDUCED_VARIANT,
  fadeIn: REDUCED_VARIANT,
  stagger: REDUCED_VARIANT,
  card: REDUCED_VARIANT,
  pop: REDUCED_VARIANT,
};

const NORMAL: GuideMotionVariants = {
  fadeUp: {
    hidden: { opacity: 0, y: 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  },
  stagger: {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.08 },
    },
  },
  card: {
    hidden: { opacity: 0, y: 14, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.45, ease: "easeOut" },
    },
  },
  pop: {
    hidden: { opacity: 0, scale: 0.7 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 300, damping: 22 },
    },
  },
};

/**
 * Returns the shared guide motion variants, automatically swapped to
 * opacity-only (no translation/scale) when the user prefers reduced motion.
 */
export function useGuideMotion(): GuideMotionVariants {
  const reducedMotion = useReducedMotion();
  return useMemo(() => (reducedMotion ? REDUCED : NORMAL), [reducedMotion]);
}
