"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import styles from "../../app/home.module.css";

const ease = [0.16, 1, 0.3, 1] as const;

const SUBS = [
  { n: "Netflix", c: "#E50914", amt: 15.49, d: "1 day", danger: true },
  { n: "Adobe CC", c: "#FF3B30", amt: 55, d: "2 days", danger: true },
  { n: "Midjourney", c: "#8B5CF6", amt: 10.0, d: "5 days", danger: false },
  { n: "Spotify", c: "#1DB954", amt: 10.99, d: "12 days", danger: false }
];
const BASE_SPEND = 107.46;
const SCREENS = ["Dashboard", "Calendar", "Discover", "Cancel"] as const;

// Visually hidden, but still read by screen readers (the standard sr-only
// recipe). Kept inline so this lives entirely in-component and needs no CSS.
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0
};

export function Hero() {
  const [cancelled, setCancelled] = useState<string[]>([]);
  const toggle = (n: string) => setCancelled((c) => (c.includes(n) ? c.filter((x) => x !== n) : [...c, n]));
  const saved = SUBS.filter((s) => cancelled.includes(s.n)).reduce((sum, s) => sum + s.amt, 0);
  const spend = Math.max(0, BASE_SPEND - saved);
  const netflixCancelled = cancelled.includes("Netflix");
  const parts = spend.toFixed(2).split(".");
  const whole = parts[0] ?? "0";
  const cents = parts[1] ?? "00";

  // Auto-advancing screen carousel; pauses on hover and respects reduced-motion
  // (users who prefer less motion drive it manually via the dots below).
  const [slide, setSlide] = useState(0);
  const pausedRef = useRef(false);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => { if (!pausedRef.current) setSlide((s) => (s + 1) % SCREENS.length); }, 3800);
    return () => clearInterval(id);
  }, [reduceMotion]);

  // The interactive mockup is purely visual, so its state changes are invisible
  // to screen-reader users. We mirror them into a polite live region: the active
  // screen name as the carousel advances, and the Netflix cancel/undo toggle.
  // Per-effect mount guards keep the very first render from announcing anything.
  const [announce, setAnnounce] = useState("");
  const slideMounted = useRef(false);
  const cancelMounted = useRef(false);
  useEffect(() => {
    if (!slideMounted.current) { slideMounted.current = true; return; }
    setAnnounce(`${SCREENS[slide]} screen`);
  }, [slide]);
  useEffect(() => {
    if (!cancelMounted.current) { cancelMounted.current = true; return; }
    setAnnounce(netflixCancelled ? "Netflix cancelled" : "reminder restored");
  }, [netflixCancelled]);

  // Cursor-driven 3D tilt + lift.
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
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 18);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 18);
  }
  function onEnter() { pausedRef.current = true; sc.set(1.04); }
  function onLeave() { pausedRef.current = false; rx.set(0); ry.set(0); sc.set(1); }

  return (
    <header className={styles.hero}>
      {/* Mirrors the visual-only mockup state to assistive tech. */}
      <span aria-live="polite" role="status" style={srOnly}>{announce}</span>
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
          <div className={styles.heroCopy}>
            <m.div className={styles.heroBadge} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
              <span className={styles.heroBadgePill}>SOON</span>
              Launching on iOS &amp; Android — join the waitlist
            </m.div>
            <m.h1 className={styles.heroTitle} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.75, delay: 0.08, ease }}>
              Know what you pay.<br />
              <span className={styles.gradText}>Cancel before it charges.</span>
            </m.h1>
            <m.p className={styles.heroSub} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.22, ease }}>
              Zeno is the subscription radar that finds every recurring charge, warns you days before each renewal, and gets you to cancel in one tap — without ever touching your bank login.
            </m.p>
            <m.div className={styles.heroForm} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.34, ease }}>
              <WaitlistForm />
              <div className={styles.heroNote}>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> No bank login</span>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Scanned on-device</span>
                <span className={styles.heroNoteItem}><span className={styles.heroCheck}>✓</span> Free to start</span>
              </div>
            </m.div>
            {/* Hero strip = the promise (how it feels to use Zeno). The hard
                numbers ($219 / catalog size / 3 / 0) live in the Stats band
                below, so these stay action-framed to avoid reading as a
                duplicate. */}
            <m.div className={styles.heroStats} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.46, ease }}>
              <div className={styles.heroStat}><span className={styles.heroStatVal}>1 tap</span><span className={styles.heroStatLabel}>to cancel a renewal</span></div>
              <span className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatVal}>7 days</span><span className={styles.heroStatLabel}>heads-up before it charges</span></div>
              <span className={styles.heroStatDiv} />
              <div className={styles.heroStat}><span className={styles.heroStatVal}>100%</span><span className={styles.heroStatLabel}>on-device &amp; encrypted</span></div>
            </m.div>
          </div>

          {/* Interactive, auto-cycling app mockup */}
          <m.div className={styles.heroMockWrap} initial={{ opacity: 0, y: 40, rotateY: -12 }} animate={{ opacity: 1, y: 0, rotateY: 0 }} transition={{ duration: 1, delay: 0.3, ease }}>
            <m.div ref={tiltRef} className={styles.phoneTilt} style={{ rotateX: srx, rotateY: sry, scale: ssc }} onMouseMove={onTilt} onMouseEnter={onEnter} onMouseLeave={onLeave}>
              <div className={styles.phone}>
                <div className={styles.phoneNotch} />
                <div className={styles.phoneScreen}>
                  <AnimatePresence mode="wait">
                    <m.div
                      key={slide}
                      className={styles.screen}
                      initial={{ opacity: 0, x: 28 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -28 }}
                      transition={{ duration: 0.4, ease }}
                    >
                      {slide === 0 ? <ScreenDashboard whole={whole} cents={cents} cancelled={cancelled} netflixCancelled={netflixCancelled} toggle={toggle} /> : null}
                      {slide === 1 ? <ScreenCalendar /> : null}
                      {slide === 2 ? <ScreenDiscover /> : null}
                      {slide === 3 ? <ScreenCancel /> : null}
                    </m.div>
                  </AnimatePresence>
                </div>
                <div className={styles.slideDots}>
                  {SCREENS.map((s, i) => (
                    <button key={s} className={`${styles.slideDot} ${slide === i ? styles.slideDotActive : ""}`} aria-label={`Show ${s}`} onClick={() => setSlide(i)} />
                  ))}
                </div>
              </div>
            </m.div>
            <span className={styles.phoneGlow} />
          </m.div>
        </div>
      </div>

      <m.div className={styles.scrollCue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2, duration: 1 }}>
        Scroll
        <span className={styles.scrollLine} />
      </m.div>
    </header>
  );
}

function AppTop({ title }: { title?: string }) {
  return (
    <div className={styles.appTop}>
      {title ? <span className={styles.appScreenTitle}>{title}</span> : <span className={styles.appBrand}>zeno</span>}
      <span className={styles.appAvatar}>Z</span>
    </div>
  );
}

function ScreenDashboard({ whole, cents, cancelled, netflixCancelled, toggle }: { whole: string; cents: string; cancelled: string[]; netflixCancelled: boolean; toggle: (n: string) => void }) {
  return (
    <>
      <AppTop />
      <div className={styles.appLabel}>Monthly spend</div>
      <div className={styles.appSpend}>${whole}<span>.{cents}</span></div>
      <div className={styles.appMeta}>{5 - cancelled.length} subscriptions · {cancelled.length ? `${cancelled.length} cancelled` : "3 renewing this week"}</div>
      <AnimatePresence mode="wait" initial={false}>
        {netflixCancelled ? (
          <m.div key="done" className={styles.appAlertDone} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
            <span className={styles.appAlertIconDone}>✓</span>
            <div className={styles.appAlertText}><strong>Netflix cancelled</strong><span>You just saved ${(15.49 * 12).toFixed(0)}/yr</span></div>
            <button className={styles.appUndo} onClick={() => toggle("Netflix")}>Undo</button>
          </m.div>
        ) : (
          <m.div key="warn" className={styles.appAlert} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease }}>
            <span className={styles.appAlertIcon}>⚠</span>
            <div className={styles.appAlertText}><strong>Netflix renews in 1 day</strong><span>$15.49 · dark-pattern cancel</span></div>
            <button className={styles.appCancel} onClick={() => toggle("Netflix")}>Cancel</button>
          </m.div>
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
    </>
  );
}

const CAL_DOTS: Record<number, string> = { 14: "#fb7185", 15: "#fb7185", 18: "#fbbf24", 22: "#34d399", 27: "#5b8cff" };
function ScreenCalendar() {
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const lead = 6; // June 2026 starts mid-week (visual)
  return (
    <>
      <AppTop title="Calendar" />
      <div className={styles.calKpis}>
        <div><div className={styles.calKpiVal}>$107.46</div><div className={styles.calKpiLab}>this month</div></div>
        <div><div className={styles.calKpiVal} style={{ color: "var(--z-rose)" }}>$80.48</div><div className={styles.calKpiLab}>next 7 days</div></div>
      </div>
      <div className={styles.calMonth}>June 2026</div>
      <div className={styles.calGrid}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className={styles.calHead}>{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {days.map((d) => (
          <span key={d} className={styles.calCell} data-today={d === 13}>
            {d}
            {CAL_DOTS[d] ? <span className={styles.calDot} style={{ background: CAL_DOTS[d] }} /> : null}
          </span>
        ))}
      </div>
    </>
  );
}

function ScreenDiscover() {
  return (
    <>
      <AppTop title="Discover" />
      <div className={styles.discIntro}>Find every subscription you pay for.</div>
      <div className={styles.discCard}>
        <div className={styles.discTop}><span className={styles.discIco} style={{ background: "rgba(52,211,153,0.14)" }}>🏦</span><div><div className={styles.discName}>Import bank statement</div><div className={styles.discSub}>Catches every recurring charge</div></div></div>
        <div className={styles.discBtn} style={{ background: "var(--z-emerald)", color: "#04110c" }}>Import CSV</div>
      </div>
      <div className={styles.discCard}>
        <div className={styles.discTop}><span className={styles.discIco} style={{ background: "rgba(91,140,255,0.14)" }}>✉</span><div><div className={styles.discName}>Scan Gmail receipts</div><div className={styles.discSub}>Read-only · on your device</div></div></div>
        <div className={styles.discBtn}>Connect Gmail</div>
      </div>
    </>
  );
}

const CANCEL_STEPS = ["Go to account.adobe.com/plans", "Manage plan → Cancel", "Decline the retention offers", "Confirm — check your email"];
function ScreenCancel() {
  return (
    <>
      <AppTop title="Cancel" />
      <div className={styles.cgHero}>
        <span className={styles.cgIco} style={{ background: "rgba(255,59,48,0.14)", color: "#FF6B60" }}>A</span>
        <div className={styles.cgName}>Adobe Creative Cloud</div>
        <div className={styles.cgMeta}>$55 · monthly</div>
        <span className={styles.cgBadge}>⚠ Dark pattern</span>
      </div>
      <div className={styles.cgSave}>Cancelling saves you <strong>$660/yr</strong></div>
      <div className={styles.appListLabel}>How to cancel</div>
      {CANCEL_STEPS.map((s, i) => (
        <div key={s} className={styles.cgStep}><span className={styles.cgStepNum}>{i + 1}</span>{s}</div>
      ))}
      <div className={styles.cgBtn}>Open cancellation page →</div>
    </>
  );
}
