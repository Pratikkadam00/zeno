"use client";

import { motion } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import { SplitWords } from "./primitives";
import styles from "../../app/home.module.css";

// Renewal dots placed around the orbit (angle in deg + color). Rendered as a
// pure-CSS scene — no canvas, no WebGL, no animation loop — so it cannot crash
// or leak across navigations and is safe to remount any number of times.
const DOTS = [
  { a: 0, c: "#34d399" },
  { a: 52, c: "#5b8cff" },
  { a: 104, c: "#fbbf24" },
  { a: 155, c: "#22d3ee" },
  { a: 206, c: "#fb7185" },
  { a: 257, c: "#a78bfa" },
  { a: 309, c: "#34d399" }
];

export function Hero() {
  return (
    <header className={styles.hero}>
      {/* Pure-CSS animated scene */}
      <div className={styles.heroScene} aria-hidden>
        <span className={`${styles.aurora} ${styles.auroraA}`} />
        <span className={`${styles.aurora} ${styles.auroraB}`} />
        <span className={`${styles.aurora} ${styles.auroraC}`} />
        <div className={styles.radar}>
          <div className={styles.disc}>
            <span className={`${styles.ring} ${styles.ring1}`} />
            <span className={`${styles.ring} ${styles.ring2}`} />
            <span className={`${styles.ring} ${styles.ring3}`} />
            <span className={styles.sweep} />
            <div className={styles.orbit}>
              {DOTS.map((d, i) => (
                <span key={i} className={styles.dot} style={{ ["--a" as string]: `${d.a}deg`, ["--c" as string]: d.c }} />
              ))}
            </div>
          </div>
          <span className={styles.orb} />
        </div>
        <span className={styles.heroGrain} />
      </div>

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
