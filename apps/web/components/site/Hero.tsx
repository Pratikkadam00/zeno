"use client";

// Zeno hero — "Run your own audit." The centerpiece is a DOCUMENT, not a
// phone: five sample subscriptions as ledger rows with cancel switches.
// Flip one OFF and the cancel flow performs INLINE under the row — fee
// check, retention traps declined with a strike — then the row is only
// marked VERIFIED after a beat, when "the statement shows no charge". The
// app's promise, felt. The monthly total re-tallies live and is carried
// down the page by the running-tally chip (pen.tsx) via LEDGER_EVENT.
//
// SLOP AUDIT — ① Zeno: the hero object is a ledger you operate; money in
// tabular mono; strike → declined traps → verified sequence. ② Tempted by:
// keeping the 3D-tilt phone with glow. ③ Lazy version: gradient headline +
// tilted screenshot + two CTAs.
//
// SSR/no-JS: renders statically with all rows active and the true base
// total (no zero-flash — tweens start FROM the server value). Entrance
// choreography is CSS-only, gated on html.js (layout.tsx sets it before
// paint), so no-JS never sees a hidden hero. Reduced motion: flows are
// skipped, totals jump, strikes appear without animation.

import { Fragment, useEffect, useRef, useState, type CSSProperties } from "react";
import { useReducedMotion } from "motion/react";
import { WaitlistForm } from "./WaitlistForm";
import { TickTag, ColumnHeads } from "./ledger";
import { CANCEL_FLOWS, FLOW_GLYPH, LEDGER_EVENT, SAMPLE_BASE, SAMPLE_SUBS, type FlowLine } from "./sample-ledger";
import styles from "../../app/home.module.css";

const dvar = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

/* Tweens between values on CHANGE only — the server-rendered number is the
   real total, so no-JS and first paint never show a zero. rAF with a timeout
   failsafe (suspended rAF can never strand the number mid-tween). */
function useTweenedNumber(target: number, duration = 380) {
  const [v, setV] = useState(target);
  const prev = useRef(target);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (prev.current === target) return;
    const from = prev.current;
    prev.current = target;
    if (reduce) {
      // Reduced motion: jump straight to the target, no tween. Deliberate.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(from + (target - from) * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const failsafe = setTimeout(() => setV(target), duration + 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
    };
  }, [target, duration, reduce]);
  return v;
}

/* One printed line of the inline cancel flow. Handles its own entrance and,
   for retention traps, the strike + "— DECLINED" a beat after appearing. */
function FlowLogLine({ line }: { line: FlowLine }) {
  const [shown, setShown] = useState(false);
  const [struck, setStruck] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const failsafe = setTimeout(() => setShown(true), 70);
    const t = line.c === "trap" ? window.setTimeout(() => setStruck(true), 240) : 0;
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(failsafe);
      if (t) clearTimeout(t);
    };
  }, [line.c]);
  const tone = line.c === "fee" ? styles.flFee : line.c === "trap" ? styles.flTrap : line.c === "ok" ? styles.flOk : "";
  return (
    <div className={`${styles.fl} ${tone} ${shown ? styles.flIn : ""} ${struck ? styles.flDx : ""}`}>
      <b aria-hidden="true">{FLOW_GLYPH[line.c]}</b>
      <span>
        {line.c === "trap" ? (
          <>
            {line.pre}{" "}
            <span className={styles.flQ}>
              {line.q}
              <i aria-hidden="true" />
            </span>{" "}
            <span className={styles.flDcl}>— DECLINED</span>
          </>
        ) : (
          line.t
        )}
      </span>
    </div>
  );
}

/* The log container — unfolds via grid-template-rows (no height jank). */
function FlowLog({ lines, shown, closing }: { lines: FlowLine[]; shown: number; closing: boolean }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    const failsafe = setTimeout(() => setOpen(true), 70);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(failsafe);
    };
  }, []);
  return (
    <div className={`${styles.aLog} ${open && !closing ? styles.aLogOpen : ""}`}>
      <div>
        <div className={styles.flWrap}>
          {lines.slice(0, shown).map((l, i) => (
            <FlowLogLine key={i} line={l} />
          ))}
        </div>
      </div>
    </div>
  );
}

type RowPhase = "running" | "cancelled" | "verified";

export function Hero() {
  const reduce = useReducedMotion();
  const [cancelled, setCancelled] = useState<string[]>([]);
  const [phase, setPhase] = useState<Record<string, RowPhase>>({});
  const [flows, setFlows] = useState<Record<string, { shown: number; closing: boolean }>>({});
  const timers = useRef<Record<string, number[]>>({});
  const [announce, setAnnounce] = useState("");

  const saved = SAMPLE_SUBS.filter((s) => cancelled.includes(s.n)).reduce((a, s) => a + s.amt, 0);
  const total = useTweenedNumber(SAMPLE_BASE - saved);
  const yearly = useTweenedNumber(saved * 12);

  // Mount guard keeps the live region silent on first render.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const t = timers.current;
    return () => {
      for (const k of Object.keys(t)) for (const id of t[k] ?? []) clearTimeout(id);
    };
  }, []);

  // The running-tally chip (pen.tsx) carries the visitor's edits down the page.
  useEffect(() => {
    if (!mounted.current) return;
    window.dispatchEvent(new CustomEvent(LEDGER_EVENT, { detail: { off: SAMPLE_SUBS.map((s) => cancelled.includes(s.n)) } }));
  }, [cancelled]);

  const later = (n: string, fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    (timers.current[n] ??= []).push(id);
  };
  const clearTimers = (n: string) => {
    for (const id of timers.current[n] ?? []) clearTimeout(id);
    timers.current[n] = [];
  };
  const say = (msg: string) => {
    if (mounted.current) setAnnounce(msg);
  };
  const totalsAfter = (next: string[]) => {
    const s = SAMPLE_SUBS.filter((x) => next.includes(x.n)).reduce((a, x) => a + x.amt, 0);
    return { total: (SAMPLE_BASE - s).toFixed(2), yearly: (s * 12).toFixed(2) };
  };

  const finishCancelled = (name: string, next: string[]) => {
    setPhase((p) => ({ ...p, [name]: "cancelled" }));
    const t = totalsAfter(next);
    say(`${name} cancelled — verifying next statement. Monthly total ${t.total} dollars, ${t.yearly} dollars a year back.`);
    later(
      name,
      () => {
        setPhase((p) => (p[name] ? { ...p, [name]: "verified" } : p));
        say(`${name} verified cancelled — the charge stopped.`);
      },
      4200
    );
  };

  const startFlow = (name: string, next: string[]) => {
    const lines = CANCEL_FLOWS[name] ?? [];
    setPhase((p) => ({ ...p, [name]: "running" }));
    setFlows((f) => ({ ...f, [name]: { shown: 0, closing: false } }));
    say(`Cancelling ${name}…`);
    let at = 200;
    lines.forEach((L, i) => {
      later(name, () => setFlows((f) => (f[name] ? { ...f, [name]: { ...f[name], shown: i + 1 } } : f)), at);
      at += L.c === "trap" ? 430 : 280;
    });
    later(
      name,
      () => {
        finishCancelled(name, next);
        later(name, () => setFlows((f) => (f[name] ? { ...f, [name]: { ...f[name], closing: true } } : f)), 1400);
        later(
          name,
          () =>
            setFlows((f) => {
              const { [name]: _drop, ...rest } = f;
              return rest;
            }),
          1660
        );
      },
      at
    );
  };

  const toggle = (name: string) => {
    if (cancelled.includes(name)) {
      // restore
      clearTimers(name);
      const next = cancelled.filter((x) => x !== name);
      setCancelled(next);
      setPhase((p) => {
        const { [name]: _drop, ...rest } = p;
        return rest;
      });
      setFlows((f) => {
        const { [name]: _drop, ...rest } = f;
        return rest;
      });
      say(`${name} kept. Monthly total ${totalsAfter(next).total} dollars.`);
      return;
    }
    const next = [...cancelled, name];
    setCancelled(next);
    if (!reduce && CANCEL_FLOWS[name]) startFlow(name, next);
    else finishCancelled(name, next);
  };

  const rowDelays = [0.5, 0.57, 0.64, 0.71, 0.78];

  return (
    <header id="ledger" className={`${styles.hero} ${styles.ruled}`}>
      <span aria-live="polite" role="status" style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
        {announce}
      </span>
      <div className={styles.container}>
        <div className={styles.heroGrid}>
          <div>
            <span className={`${styles.heroKick} ${styles.heroPrint}`}>
              <span className={styles.heroKickTick} aria-hidden />
              LAUNCHING ON IOS &amp; ANDROID · WAITLIST OPEN
            </span>
            <h1 className={`${styles.heroTitle} ${styles.heroMask}`} style={dvar(0.1)}>
              <span className={styles.hl}>
                <span>Know what you pay.</span>
              </span>
              <span className={styles.hl}>
                <span>
                  Cancel <span className={styles.penu}>before</span> it charges.
                </span>
              </span>
            </h1>
            <p className={`${styles.heroSub} ${styles.heroPrint}`} style={dvar(0.34)}>
              Zeno is the honest way to take back your subscriptions — discovery from receipts and statements you control, a warning before every renewal,
              and cancellations that aren&rsquo;t called done until the charge actually stops.
            </p>
            <div className={`${styles.heroFormWrap} ${styles.heroPrint}`} style={dvar(0.46)}>
              <WaitlistForm />
            </div>
            <div className={`${styles.heroTicks} ${styles.heroPrint}`} style={dvar(0.56)}>
              <TickTag tone="green">No bank login required</TickTag>
              <TickTag tone="green">Discovery you control</TickTag>
              <TickTag tone="green">Free to start</TickTag>
            </div>
          </div>

          {/* The audit — try it on this sample ledger */}
          <div className={`${styles.audit} ${styles.heroPrint}`} style={dvar(0.25)} role="group" aria-label="Sample ledger — flip a switch to walk the real cancel flow">
            <div className={styles.auditHead}>
              <span className={styles.auditTitle}>YOUR LEDGER · SAMPLE</span>
              <span className={styles.auditTitle}>{SAMPLE_SUBS.length - cancelled.length} BILLING</span>
            </div>
            <ColumnHeads left="SERVICE" right="MONTHLY / KEEP" />
            {SAMPLE_SUBS.map((s, i) => {
              const off = cancelled.includes(s.n);
              const ph = phase[s.n];
              const fl = flows[s.n];
              const flowLines = CANCEL_FLOWS[s.n] ?? [];
              return (
                <Fragment key={s.n}>
                  <div className={`${styles.auditRow} ${styles.heroPrint} ${off ? styles.auditRowOff : ""} ${ph === "verified" ? styles.vflash : ""}`} style={dvar(rowDelays[i] ?? 0)}>
                    <span className={styles.auditBrand} style={{ background: s.c }} aria-hidden>
                      {s.n[0]}
                    </span>
                    <span className={styles.auditNameWrap}>
                      <span className={styles.auditName}>
                        {s.n}
                        <span className={styles.auditStrike} aria-hidden />
                      </span>
                      <span className={styles.auditMeta}>
                        {off ? (
                          <span className={styles.auditVerified}>
                            {ph === "verified"
                              ? "VERIFIED CANCELLED — STATEMENT SHOWED NO CHARGE"
                              : ph === "running"
                                ? "RUNNING THE CANCEL FLOW…"
                                : "CANCELLED — VERIFYING NEXT STATEMENT"}
                          </span>
                        ) : (
                          s.meta
                        )}
                      </span>
                    </span>
                    <span className={`money ${styles.auditAmt}`}>${s.amt.toFixed(2)}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!off}
                      disabled={!!flows[s.n]}
                      aria-label={off ? `Restore ${s.n}, ${s.amt.toFixed(2)} dollars a month` : `Cancel ${s.n}, ${s.amt.toFixed(2)} dollars a month`}
                      className={`${styles.auditSwitch} ${off ? styles.auditSwitchOff : ""}`}
                      onClick={() => toggle(s.n)}
                    >
                      <span className={styles.auditKnob} aria-hidden />
                    </button>
                  </div>
                  {fl ? <FlowLog lines={flowLines} shown={fl.shown} closing={fl.closing} /> : null}
                </Fragment>
              );
            })}
            <div className={`${styles.auditTotals} ${styles.heroPrint}`} style={dvar(0.88)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                <span className={styles.auditTitle}>COMMITTED / MONTH</span>
                <span className={`money ${styles.auditTotalVal}`}>${total.toFixed(2)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginTop: 6 }}>
                <span className={styles.auditTitle} style={{ color: "var(--stamp-verified)" }}>
                  BACK IN YOUR POCKET / YEAR
                </span>
                <span key={saved.toFixed(2)} className={`money ${styles.auditYearly} ${saved > 0 ? styles.pulse : ""}`}>
                  +${yearly.toFixed(2)}
                </span>
              </div>
            </div>
            <p className={`${styles.auditNote} ${styles.heroPrint}`} style={dvar(1)}>
              SAMPLE LEDGER — FLIP A SWITCH OFF TO WALK THE REAL CANCEL FLOW, TRAPS INCLUDED. IN THE APP, A CANCELLATION IS ONLY MARKED VERIFIED AFTER YOUR
              NEXT RECEIPT OR STATEMENT SHOWS NO CHARGE.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
