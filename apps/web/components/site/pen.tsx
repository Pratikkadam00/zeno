"use client";

// Zeno — the pen chrome. Three fixed elements that make the page read as a
// document being worked through by a pen:
//   PenRule      — the 2px ink rule across the top: scroll progress as ruling.
//   MarginIndex  — a document index in the left margin (≥1360px), scroll-spied.
//   RunningTally — the signature moment: a chip that rides the pen tip and
//                  tallies the hero's sample bill as each section passes.
//                  Flip switches in the hero and the chip carries YOUR total
//                  down to the pricing section.
//
// All three are enhancement-only. They render hidden (CSS shows them under
// html.js), never shift layout (fixed, transform-positioned), use passive
// rAF-throttled listeners, and the chip sits out entirely under reduced
// motion. Number/position writes are imperative (refs) so scrolling never
// re-renders the tree.

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LEDGER_EVENT, SAMPLE_SUBS } from "./sample-ledger";
import styles from "../../app/home.module.css";

const SPY = [
  ["case", "01", "THE CASE"],
  ["how", "02", "THE METHOD"],
  ["refusal", "03", "THE REFUSAL"],
  ["pricing", "04", "THE BILL"],
  ["faq", "05", "QUESTIONS"]
] as const;

/* ── The pen rule ────────────────────────────────────────────────────── */
export function PenRule() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
        if (ref.current) ref.current.style.transform = `scaleX(${p})`;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return <div ref={ref} className={styles.penRule} aria-hidden="true" />;
}

/* ── The margin index ────────────────────────────────────────────────── */
// Duplicate navigation (the nav owns the canonical links), so the whole
// margin is aria-hidden and its links are removed from the tab order.
export function MarginIndex() {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          const ix = SPY.findIndex(([id]) => id === en.target.id);
          if (ix > -1) setActive(ix);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    for (const [id] of SPY) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, []);
  return (
    <div className={styles.marginIx} aria-hidden="true">
      <span
        className={styles.marginMk}
        style={{ opacity: active > -1 ? 1 : 0, transform: `translateY(${Math.max(active, 0) * 38 + 4}px)` }}
      />
      {SPY.map(([id, num, label], i) => (
        <a key={id} href={`#${id}`} tabIndex={-1} className={i === active ? styles.marginOn : undefined}>
          <b>{num}</b> {label}
        </a>
      ))}
    </div>
  );
}

/* ── The running tally ───────────────────────────────────────────────── */
export function RunningTally() {
  const reduce = useReducedMotion();
  const root = useRef<HTMLAnchorElement>(null);
  const amt = useRef<HTMLSpanElement>(null);
  const float = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (reduce) return;
    const chip = root.current, amtEl = amt.current, floatEl = float.current;
    if (!chip || !amtEl || !floatEl) return;

    const secs = SPY.map(([id]) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
    const hero = document.getElementById("ledger");
    if (!hero || secs.length === 0) return;

    const off = SAMPLE_SUBS.map(() => false);
    const sumFirst = (n: number) => SAMPLE_SUBS.slice(0, n).reduce((a, s, i) => a + (off[i] ? 0 : s.amt), 0);

    let shown = 0, val = 0, w = 150, raf = 0, snap = 0, ticking = false;

    const tween = (to: number) => {
      cancelAnimationFrame(raf);
      clearTimeout(snap);
      const from = val, t0 = performance.now(), dur = 420;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        val = from + (to - from) * e;
        amtEl.textContent = `$${val.toFixed(2)}`;
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      snap = window.setTimeout(() => {
        cancelAnimationFrame(raf);
        val = to;
        amtEl.textContent = `$${to.toFixed(2)}`;
      }, dur + 200);
    };

    const replay = (el: Element, cls: string) => {
      el.classList.remove(cls);
      void (el as HTMLElement).offsetWidth;
      el.classList.add(cls);
    };

    const update = () => {
      chip.classList.toggle(styles.penTallyShow as string, hero.getBoundingClientRect().bottom < 64);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      const x = Math.min(Math.max(p * window.innerWidth - w, 10), window.innerWidth - w - 10);
      chip.style.transform = `translateX(${x}px)`;
      let n = 0;
      for (const s of secs) if (s.getBoundingClientRect().top < window.innerHeight * 0.6) n++;
      if (n !== shown) {
        const grew = n > shown;
        shown = n;
        tween(sumFirst(n));
        replay(chip, styles.penTallyTick as string);
        if (grew && n > 0) {
          const sub = SAMPLE_SUBS[n - 1];
          const isOff = off[n - 1] ?? false;
          floatEl.textContent = isOff ? "CANCELLED · $0.00" : `+ $${sub ? sub.amt.toFixed(2) : "0.00"}`;
          floatEl.classList.toggle(styles.ptFloatOk as string, isOff);
          replay(floatEl, styles.ptFloatGo as string);
        }
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };
    const onResize = () => {
      w = chip.offsetWidth || 150;
      update();
    };
    const onLedger = (e: Event) => {
      const d = (e as CustomEvent).detail as { off?: boolean[] } | undefined;
      if (!d?.off) return;
      d.off.forEach((v, i) => {
        if (i < off.length) off[i] = v;
      });
      tween(sumFirst(shown)); // re-tally the carried total, no float
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener(LEDGER_EVENT, onLedger);
    const t = window.setTimeout(onResize, 120); // measure after fonts settle

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener(LEDGER_EVENT, onLedger);
      clearTimeout(t);
      clearTimeout(snap);
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  if (reduce) return null;

  return (
    <a ref={root} href="#ledger" className={styles.penTally} aria-label="Running sample bill — back to the ledger">
      <span ref={float} className={`money ${styles.ptFloat}`} aria-hidden="true" />
      <span className={styles.ptIn}>
        <b>STILL BILLING /MO</b>
        <span ref={amt} className={`money ${styles.ptAmt}`}>
          $0.00
        </span>
      </span>
    </a>
  );
}
