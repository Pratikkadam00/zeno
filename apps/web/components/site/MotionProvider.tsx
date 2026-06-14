"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Makes every Motion animation in the tree respect the OS "reduce motion"
 * setting. reducedMotion="user" disables transform/layout animations (the
 * hero tilt, slide transitions, parallax, rises) while keeping opacity fades,
 * so scroll-reveal content still ends up visible rather than stuck at opacity:0.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
