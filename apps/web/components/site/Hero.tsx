"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import styles from "../../app/home.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

const SUBS = [
  { n: "Netflix", c: "#E50914", amt: 15.49, d: "1 day", danger: true },
  { n: "Adobe CC", c: "#FF3B30", amt: 54.99, d: "2 days", danger: true },
  { n: "Midjourney", c: "#8B5CF6", amt: 10.0, d: "5 days", danger: false },
  { n: "Spotify", c: "#1DB954", amt: 10.99, d: "12 days", danger: false }
];
const BASE_SPEND = 107.46;

export function Hero() {
  // The mockup is interactive: hover rows, click a row (or the Cancel button)
  // to cancel it — the total drops and the alert flips to a savings confirmation.
  const [cancelled, setCancelled] = useState<string[]>([]);
  const toggle = (n: string) => setCancelled((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));

  const saved = SUBS.filter((s) => cancelled.includes(s.n)).reduce((sum, s) => sum + s.amt, 0);
  const spend = Math.max(0, BASE_SPEND - saved);
  const netflixCancelled = cancelled.includes("Netflix");
  const [whole, cents] = spend.toFixed(2).split(".");

  // Cursor-driven 3D tilt + lift on the floating phone.
  const tiltRef = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sc = useMotionValue(1);
  const srx = useSpring(rx, { stiffness: 140, damping: 14, mass: 0.4 });
  const sry = useSpring(ry, { stiffness: 140, damping: 14, mass: 0.4 });
  const ssc = useSpring(sc, { stiffness: 200, damping: 18 });
  function onTilt(e: React.MouseEvent) {
    const el = tiltRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 20);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 20);
  }
  function onEnter() { sc.set(1.04); }
  function onLeave() { rx.set(0); ry.set(0); sc.set(1); }

  return (
    <header className={styles.hero}>
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

          {/* Right: interactive app mockup */}
          <motion.div
            className={styles.heroMockWrap}
            initial={{ opacity: 0, y: 40, rotateY: -12 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            <motion.div
              ref={tiltRef}
              className={styles.phoneTilt}
              style={{ rotateX: srx, rotateY: sry, scale: ssc }}
              onMouseMove={onTilt}
              onMouseEnter={onEnter}
              onMouseLeave={onLeave}
            >
            <div className={styles.phone}>
              <div className={styles.phoneNotch} />
              <div className={styles.phoneScreen}>
                <div className={styles.appTop}>
                  <span className={styles.appBrand}>zeno</span>
                  <span className={styles.appAvatar}>Z</span>
                </div>
                <div className={styles.appLabel}>Monthly spend</div>
                <div className={styles.appSpend}>${whole}<span>.{cents}</span></div>
                <div className={styles.appMeta}>{5 - cancelled.length} subscriptions · {cancelled.length ? `${cancelled.length} cancelled` : "3 renewing this week"}</div>

                {/* Alert flips between warning and savings confirmation */}
                <AnimatePresence mode="wait" initial={false}>
                  {netflixCancelled ? (
                    <motion.div key="done" className={styles.appAlertDone} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
                      <span className={styles.appAlertIconDone}>✓</span>
                      <div className={styles.appAlertText}>
                        <strong>Netflix cancelled</strong>
                        <span>You just saved ${(15.49 * 12).toFixed(0)}/yr</span>
                      </div>
                      <button className={styles.appUndo} onClick={() => toggle("Netflix")}>Undo</button>
                    </motion.div>
                  ) : (
                    <motion.div key="warn" className={styles.appAlert} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
                      <span className={styles.appAlertIcon}>⚠</span>
                      <div className={styles.appAlertText}>
                        <strong>Netflix renews in 1 day</strong>
                        <span>$15.49 · dark-pattern cancel</span>
                      </div>
                      <button className={styles.appCancel} onClick={() => toggle("Netflix")}>Cancel</button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={styles.appListLabel}>Upcoming renewals · tap to cancel</div>
                {SUBS.map((s) => {
                  const off = cancelled.includes(s.n);
                  return (
                    <button key={s.n} className={styles.appRow} data-cancelled={off} onClick={() => toggle(s.n)} type="button">
                      <span className={styles.appIcon} style={{ background: `${s.c}22`, color: s.c }}>{s.n[0]}</span>
                      <span className={styles.appName}>{s.n}</span>
                      <span className={styles.appAmt}>${s.amt.toFixed(2)}</span>
                      <span className={styles.appDays} data-danger={s.danger} data-off={off}>{off ? "✓ cancelled" : s.d}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            </motion.div>
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
