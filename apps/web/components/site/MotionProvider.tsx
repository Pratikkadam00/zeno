"use client";

import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import type { ReactNode } from "react";

/**
 * Makes every Motion animation in the tree respect the OS "reduce motion"
 * setting. reducedMotion="user" disables transform/layout animations (the
 * hero tilt, slide transitions, parallax, rises) while keeping opacity fades,
 * so scroll-reveal content still ends up visible rather than stuck at opacity:0.
 *
 * LazyMotion + the lightweight `m` components keep the eager bundle small: only
 * the `domAnimation` feature set is loaded (strict={false} still tolerates any
 * stray `motion.*` usage so a partial conversion can't break rendering).
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict={false}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
