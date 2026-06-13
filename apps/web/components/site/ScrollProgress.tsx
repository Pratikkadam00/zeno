"use client";

import { motion, useScroll, useSpring } from "motion/react";
import styles from "../../app/home.module.css";

// Thin gradient progress bar pinned to the very top of the page.
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return <motion.div className={styles.scrollProgress} style={{ scaleX }} aria-hidden />;
}
