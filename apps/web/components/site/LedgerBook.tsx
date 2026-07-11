"use client";

// The Ledger Book — a progressive enhancement that presents the homepage as a
// pad of ledger sheets you leaf through. It is STRICTLY GATED: book mode turns
// on only after hydration, only when motion is welcome, the browser can run the
// fold (WAAPI + IntersectionObserver), and the pointer is fine on a wide screen.
// In every other case — no-JS, crawlers, reduced-motion, touch/mobile, narrow
// viewports — it renders the exact same scrolling document the site already
// shipped, so SEO, Core Web Vitals, and the a11y floor are untouched by
// construction. The document is always the base; the book is paint on top.
//
// Deliberately bounded vs the standalone prototype: the turn is a single
// CSS-3D fold around the spine (backface-visibility hides the page past 90°, so
// no preserve-3d/overflow flattening gotchas and no two-segment paper-bend rig),
// and input is keys / pager / wheel-at-scroll-boundary — in-page scrolling
// always wins, no drag-physics, no mobile touch. That keeps the highest-bug-risk
// pieces out while preserving the leaf-through feel where it reads best.

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { MarginIndex, PenRule, RunningTally } from "./pen";
import { LEDGER_EVENT, SAMPLE_SUBS } from "./sample-ledger";
import styles from "../../app/book.module.css";

export type Sheet = { id: string; label: string; node: ReactNode };

const TURN_MS = 720;

export function LedgerBook({ sheets, footer }: { sheets: Sheet[]; footer: ReactNode }) {
  const [book, setBook] = useState(false); // false until proven eligible post-hydration
  const [cur, setCur] = useState(0);
  const [turn, setTurn] = useState<{ to: number; dir: 1 | -1 } | null>(null);
  const [armed, setArmed] = useState(false); // two-frame trick: false = start angle, true = end angle
  const N = sheets.length;
  const liveRef = useRef<HTMLParagraphElement | null>(null);
  const scrollersRef = useRef<(HTMLDivElement | null)[]>([]);
  const sheetRefs = useRef<(HTMLElement | null)[]>([]);
  const timerRef = useRef<number | null>(null);
  const turningRef = useRef(false);
  const mountedRef = useRef(true);
  const firstFocusRef = useRef(true);
  const [viewportW, setViewportW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));

  // Track mount and clear any pending turn timer on unmount — a committed turn
  // must never run setState / replaceState / scrollTop onto a detached tree.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Eligibility: decided once, client-side, after mount ──
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.matchMedia("(min-width: 900px) and (pointer: fine)").matches;
    const capable = "animate" in Element.prototype && "IntersectionObserver" in window;
    if (!reduce && wide && capable) {
      // Deliberate mount-time init: resume on the hashed sheet and enable book
      // mode once the environment is confirmed able to run it.
      const hashIx = sheets.findIndex((s) => s.id === window.location.hash.slice(1));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (hashIx > 0) setCur(hashIx);
      setBook(true);
    }
    // Decided once on mount — a mid-session resize doesn't rip the book out from
    // under the reader (or force it on). A reload re-evaluates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Book mode: lock document scroll while the stage owns the viewport ──
  useEffect(() => {
    if (!book) return;
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [book]);

  // ── Two-frame arm: when a turn begins render at the START angle, then flip to
  //    ARMED next frame so the CSS transition animates start → end. ──
  useEffect(() => {
    // Reset to the start angle, then flip to armed next frame so the CSS
    // transition animates start → end. Deliberate sync state, not a cascade.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArmed(false);
    if (!turn) return;
    let r2 = 0;
    const r1 = requestAnimationFrame(() => { r2 = requestAnimationFrame(() => setArmed(true)); });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [turn]);

  const say = useCallback((msg: string) => {
    if (liveRef.current) liveRef.current.textContent = msg;
  }, []);

  const go = useCallback(
    (to: number) => {
      // turningRef is set synchronously so a second call in the same batch (or
      // before the turn state flushes) short-circuits regardless of state timing.
      if (turningRef.current || turn || to === cur || to < 0 || to >= N) return;
      turningRef.current = true;
      const dir: 1 | -1 = to > cur ? 1 : -1;
      setArmed(false);
      setTurn({ to, dir });
      say(`Page ${to + 1} of ${N} — ${sheets[to]?.label ?? ""}`);
      // Commit on a tracked failsafe timer (the book can never wedge on a dropped
      // frame). Tracked + cleared so it never fires onto an unmounted tree.
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        turningRef.current = false;
        if (!mountedRef.current) return;
        setCur(to);
        setTurn(null);
        if (typeof history !== "undefined" && history.replaceState) {
          history.replaceState(null, "", `#${sheets[to]?.id ?? ""}`);
        }
        const sc = scrollersRef.current[to];
        if (sc) sc.scrollTop = 0;
      }, TURN_MS + 60);
    },
    [turn, cur, N, sheets, say]
  );

  const next = useCallback(() => go(cur + 1), [go, cur]);
  const prev = useCallback(() => go(cur - 1), [go, cur]);

  // ── Keyboard nav — ←/→ are explicit page turns; Space/PageDown/↓ (and their
  //    reverses) scroll the sheet and only turn AT its scroll boundary, so a
  //    keyboard user can read a long sheet before the page turns (in-page scroll
  //    wins, matching the wheel handler). ──
  useEffect(() => {
    if (!book) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const sc = scrollersRef.current[cur];
      const atBoundary = (dir: number) => !sc || (dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 2);
      const scrollOrTurn = (dir: 1 | -1) => {
        if (atBoundary(dir)) { e.preventDefault(); if (dir > 0) next(); else prev(); }
        // Instant (not "smooth") — native PageDown is instant, and smooth
        // scrollBy is silently dropped in some renderers, which would strand a
        // keyboard user on a long sheet with no way to scroll or turn.
        else if (sc) { e.preventDefault(); sc.scrollBy({ top: dir * sc.clientHeight * 0.9, behavior: "auto" }); }
      };
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(N - 1); }
      else if (e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey)) scrollOrTurn(1);
      else if (e.key === "PageUp" || e.key === "ArrowUp" || (e.key === " " && e.shiftKey)) scrollOrTurn(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [book, cur, next, prev, go, N]);

  // ── Focus follows the turn: after a commit, move focus to the new sheet so a
  //    keyboard/screen-reader user's place isn't orphaned to <body>. Skips the
  //    initial mount so the cover isn't force-focused on load. ──
  useEffect(() => {
    if (!book) return;
    if (firstFocusRef.current) { firstFocusRef.current = false; return; }
    sheetRefs.current[cur]?.focus({ preventScroll: true });
  }, [book, cur]);

  // ── Keep the running-tally chip positioned across a resize (its translateX is
  //    derived from the viewport width). ──
  useEffect(() => {
    if (!book) return;
    const onResize = () => setViewportW(window.innerWidth);
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [book]);

  // ── Wheel nav — turns only when the sheet is at its scroll boundary in the
  //    wheel direction; otherwise the sheet scrolls normally (in-page wins). ──
  useEffect(() => {
    if (!book) return;
    let last = 0;
    let used = false;
    let eligible = false;
    let acc = 0;
    const atBoundary = (sc: HTMLDivElement, dir: number) =>
      dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 2;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const sc = scrollersRef.current[cur];
      if (!sc) return;
      const now = performance.now();
      const fresh = now - last > 240;
      last = now;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (fresh) { used = false; acc = 0; eligible = atBoundary(sc, dir); }
      if (turn) { e.preventDefault(); return; }
      if (used) { e.preventDefault(); return; }
      if (!eligible) return; // let the sheet scroll
      e.preventDefault();
      acc += e.deltaY;
      if (Math.abs(acc) > 80) { used = true; if (dir > 0) next(); else prev(); }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [book, cur, turn, next, prev]);

  // ── Running-tally chip: mirror the hero's sample-ledger edits ──
  const [offMask, setOffMask] = useState<boolean[]>(() => SAMPLE_SUBS.map(() => false));
  useEffect(() => {
    if (!book) return;
    const onLedger = (e: Event) => {
      const detail = (e as CustomEvent<{ off?: boolean[] }>).detail;
      if (detail && Array.isArray(detail.off)) setOffMask(detail.off);
    };
    window.addEventListener(LEDGER_EVENT, onLedger as EventListener);
    return () => window.removeEventListener(LEDGER_EVENT, onLedger as EventListener);
  }, [book]);

  const chipTotal = useMemo(() => {
    const rowsRead = Math.min(cur, SAMPLE_SUBS.length);
    let sum = 0;
    for (let i = 0; i < rowsRead; i++) if (!offMask[i]) sum += SAMPLE_SUBS[i]?.amt ?? 0;
    return sum;
  }, [cur, offMask]);

  const progress = N > 1 ? cur / (N - 1) : 0;

  // ── Document mode (the always-on base + fallback) ──
  if (!book) {
    return (
      <>
        <PenRule />
        <MarginIndex />
        <RunningTally />
        <main id="main">{sheets.map((s) => <div key={s.id}>{s.node}</div>)}</main>
        {footer}
      </>
    );
  }

  const chipX = Math.min(Math.max(progress * viewportW - 150, 10), viewportW - 160);

  // ── Book mode ──
  return (
    <>
      <p aria-live="polite" role="status" style={SR_ONLY} ref={liveRef} />
      <span className={styles.penRule} style={{ transform: `scaleX(${progress})` }} aria-hidden />
      <div id="main" className={styles.book} role="region" aria-roledescription="ledger book" aria-label="Zeno — the audit, as a leafable ledger">
        <span className={`${styles.edge} ${styles.edgeR}`} style={{ width: `${(N - 1 - cur) * 3}px` }} aria-hidden />
        <span className={`${styles.edge} ${styles.edgeL}`} style={{ width: `${cur * 3}px` }} aria-hidden />
        {sheets.map((s, i) => {
          const isFrom = turn?.dir === 1 && i === cur; // folds away to the left
          const isTo = turn?.dir === -1 && i === turn.to; // folds in from the left
          const turning = isFrom || isTo;
          const beneath = turn ? (turn.dir === 1 ? i === turn.to : i === cur) : false;
          // Every sheet stays mounted (state — e.g. the hero's cancel edits —
          // persists across turns, matching the prototype); only the visible
          // ones get sheetShown (display:block). Hidden sheets are aria-hidden so
          // a screen reader only reads the current page (navigate with the pager).
          const visible = i === cur || turning || beneath;
          // Forward: from-sheet rotates 0 → −180 (past 90° backface hides it).
          // Back: to-sheet rotates −180 → 0 (unfolds in from the spine).
          const endAngle = isFrom ? -180 : 0;
          const startAngle = isFrom ? 0 : -180;
          const angle = turning ? (armed ? endAngle : startAngle) : 0;
          const style: CSSProperties | undefined = turning
            ? {
                transform: `rotateY(${angle}deg)`,
                transition: `transform ${TURN_MS}ms cubic-bezier(0.55,0.06,0.28,1)`,
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                willChange: "transform"
              }
            : undefined;
          return (
            <section
              key={s.id}
              id={`sheet-${s.id}`}
              ref={(el) => { sheetRefs.current[i] = el; }}
              tabIndex={-1}
              className={`${styles.sheet} ${visible ? styles.sheetShown : ""} ${turning ? styles.sheetTurning : ""}`}
              aria-label={`Page ${i + 1} of ${N}: ${s.label}`}
              aria-hidden={visible ? undefined : true}
              style={style}
            >
              <div className={styles.scroll} ref={(el) => { scrollersRef.current[i] = el; }}>
                <span className={styles.pageNum} aria-hidden>{String(i + 1).padStart(2, "0")} / {String(N).padStart(2, "0")}</span>
                {s.node}
                {i === N - 1 ? footer : null}
              </div>
              {turning ? <div className={styles.foldShade} aria-hidden style={{ opacity: armed === isFrom ? 0.55 : 0 }} /> : null}
            </section>
          );
        })}
      </div>

      {cur >= 1 ? (
        <a
          href={`#${sheets[1]?.id ?? "case"}`}
          className={`${styles.chip} ${styles.chipShow}`}
          aria-label={`Running total: ${chipTotal.toFixed(2)} dollars a month`}
          style={{ transform: `translateX(${chipX}px)` }}
        >
          <span className={styles.chipIn}>
            <b>COMMITTED / MO</b>
            <span className={styles.chipAmt}>${chipTotal.toFixed(2)}</span>
          </span>
        </a>
      ) : null}

      <nav className={styles.pager} aria-label="Ledger pages">
        <button type="button" aria-label="Previous page" disabled={cur === 0} onClick={prev}>‹</button>
        <span className={styles.pn}>{String(cur + 1).padStart(2, "0")}<small> / {String(N).padStart(2, "0")}</small></span>
        <button type="button" aria-label="Next page" disabled={cur === N - 1} onClick={next}>›</button>
        <span className={styles.pl}>{sheets[cur]?.label}</span>
      </nav>

      {cur === 0 ? <div className={styles.hint}>SCROLL OR PRESS → TO TURN</div> : null}
    </>
  );
}

const SR_ONLY: CSSProperties = {
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
