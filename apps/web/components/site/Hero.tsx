"use client";

import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import { SplitWords } from "./primitives";
import styles from "../../app/home.module.css";

// WebGL scene is client-only; render a CSS gradient until it mounts.
const HeroCanvas = dynamic(() => import("./HeroCanvas"), {
  ssr: false,
  loading: () => <div className={styles.heroCanvasFallback} />
});

export function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroCanvas}><HeroCanvas /></div>
      <div className={styles.heroGlow} />
      <div className={styles.heroInner}>
        <div className={styles.heroContent}>
          <motion.div
            className={styles.heroBadge}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className={styles.heroBadgePill}>SOON</span>
            Launching on iOS &amp; Android — join the waitlist
          </motion.div>

          <h1 className={styles.heroTitle}>
            <SplitWords text="Know what you pay." />
            <br />
            <span className={styles.gradText}><SplitWords text="Cancel before it charges." delay={0.3} /></span>
          </h1>

          <motion.p
            className={styles.heroSub}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            Zeno is the subscription radar that finds every recurring charge, warns you days before each renewal, and gets you to cancel in one tap — without ever touching your bank login.
          </motion.p>

          <motion.div
            className={styles.heroForm}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
            id="waitlist-hero"
          >
            <WaitlistForm />
            <div className={styles.heroNote}>
              <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> No bank login</span>
              <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Scanned on-device</span>
              <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Free to start</span>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        className={styles.scrollCue}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 1 }}
      >
        Scroll
        <span className={styles.scrollLine} />
      </motion.div>
    </header>
  );
}
