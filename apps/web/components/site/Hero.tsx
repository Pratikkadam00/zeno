"use client";

import { motion } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import styles from "../../app/home.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

// App mockup rows (mirrors the real Zeno dashboard).
const SUBS = [
  { n: "Netflix", c: "#E50914", a: "$15.49", d: "1 day", danger: true },
  { n: "Adobe CC", c: "#FF3B30", a: "$54.99", d: "2 days", danger: true },
  { n: "Midjourney", c: "#8B5CF6", a: "$10.00", d: "5 days", danger: false },
  { n: "Spotify", c: "#1DB954", a: "$10.99", d: "12 days", danger: false }
];

export function Hero() {
  return (
    <header className={styles.hero}>
      {/* Full-bleed pure-CSS animated background */}
      <div className={styles.heroBg} aria-hidden>
        <span className={`${styles.mesh} ${styles.meshA}`} />
        <span className={`${styles.mesh} ${styles.meshB}`} />
        <span className={`${styles.mesh} ${styles.meshC}`} />
        <span className={`${styles.mesh} ${styles.meshD}`} />
        <span className={styles.heroSheen} />
        <span className={styles.heroGridFull} />
        <span className={styles.heroVignette} />
      </div>

      <div className={styles.heroInner}>
        <div className={styles.heroGrid}>
          {/* Left: copy */}
          <div className={styles.heroCopy}>
            <motion.div className={styles.heroBadge} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
              <span className={styles.heroBadgePill}>SOON</span>
              Launching on iOS &amp; Android — join the waitlist
            </motion.div>

            <motion.h1 className={styles.heroTitle} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.08, ease }}>
              Know what you pay.<br />
              <span className={styles.gradText}>Cancel before it charges.</span>
            </motion.h1>

            <motion.p className={styles.heroSub} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22, ease }}>
              Zeno is the subscription radar that finds every recurring charge, warns you days before each renewal, and gets you to cancel in one tap — without ever touching your bank login.
            </motion.p>

            <motion.div className={styles.heroForm} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34, ease }}>
              <WaitlistForm />
              <div className={styles.heroNote}>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> No bank login</span>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Scanned on-device</span>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Free to start</span>
              </div>
            </motion.div>

            <motion.div className={styles.heroStats} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.46, ease }}>
              <div className={styles.heroStat}><span className={styles.heroStatVal}>$219</span><span className={styles.heroStatLabel}>wasted / year, avg.</span></div>
              <span className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatVal}>600+</span><span className={styles.heroStatLabel}>services tracked</span></div>
              <span className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatVal}>0</span><span className={styles.heroStatLabel}>bank logins</span></div>
            </motion.div>
          </div>

          {/* Right: app mockup */}
          <motion.div
            className={styles.heroMockWrap}
            initial={{ opacity: 0, y: 40, rotateY: -12 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            <div className={styles.phone}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <div className={styles.appTop}>
                  <span className={styles.appBrand}>zeno</span>
                  <span className={styles.appAvatar}>Z</span>
                </div>
                <div className={styles.appLabel}>Monthly spend</div>
                <div className={styles.appSpend}>$107<span>.46</span></div>
                <div className={styles.appMeta}>5 subscriptions · 3 renewing this week</div>

                <div className={styles.appAlert}>
                  <span className={styles.appAlertIcon}>⚠</span>
                  <div className={styles.appAlertText}>
                    <strong>Netflix renews in 1 day</strong>
                    <span>$15.49 · dark-pattern cancel</span>
                  </div>
                  <span className={styles.appCancel}>Cancel</span>
                </div>

                <div className={styles.appListLabel}>Upcoming renewals</div>
                {SUBS.map((s) => (
                  <div key={s.n} className={styles.appRow}>
                    <span className={styles.appIcon} style={{ background: `${s.c}22`, color: s.c }}>{s.n[0]}</span>
                    <span className={styles.appName}>{s.n}</span>
                    <span className={styles.appAmt}>{s.a}</span>
                    <span className={styles.appDays} data-danger={s.danger}>{s.d}</span>
                  </div>
                ))}
              </div>
            </div>
            <span className={styles.phoneGlow} />
          </motion.div>
        </div>
      </div>

      <motion.div className={styles.scrollCue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
        Scroll
        <span className={styles.scrollLine} />
      </motion.div>
    </header>
  );
}
