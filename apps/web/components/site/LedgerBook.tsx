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
// and input is keys / pager / wheel-at-scroll-boundary PLUS edge-drag: hold the
// mouse on a page edge and the sheet follows your hand, release past halfway (or
// flick) to commit. In-page scrolling always wins — the middle of the sheet never
// drags, so clicks, text selection and the ledger stay usable. Touch gets a
// horizontal swipe to turn, with vertical scrolling still winning in-page.

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

  // ── Edge-drag page turning ───────────────────────────────────────────────
  // Ported from the design prototype (website-v3-book.js). The sheet tracks the
  // pointer while held on an edge; releasing past ~halfway, or flicking, commits.
  // Everything is driven straight onto the DOM node via a ref during the drag so
  // a pointermove never triggers a React re-render.
  const dragRef = useRef<{
    zone: 1 | -1;
    id: number;
    pending: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    vel: number;
    prog: number;
    from: number;
    raf: number;
    safety: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);

  // Commit or revert a drag: animate the sheet the rest of the way, then either
  // advance the page or snap back — reusing the same failsafe-timer discipline
  // as go() so a dropped frame can never wedge the book.
  const settleDrag = useCallback(
    (from: number, to: number, fromProg: number, commit: boolean) => {
      const node = sheetRefs.current[from];
      const toProg = commit ? 1 : 0;
      const duration = Math.max(180, Math.min(540, Math.abs(toProg - fromProg) * 640));
      if (node) {
        node.style.transition = `transform ${duration}ms cubic-bezier(0.22,0.8,0.26,1)`;
        node.style.transform = `rotateY(${-toProg * 180}deg)`;
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        turningRef.current = false;
        if (!mountedRef.current) return;
        if (node) {
          node.style.transition = "";
          node.style.transform = "";
        }
        setDragging(false);
        setTurn(null);
        if (commit) {
          setCur(to);
          say(`Page ${to + 1} of ${N} — ${sheets[to]?.label ?? ""}`);
          if (typeof history !== "undefined" && history.replaceState) {
            history.replaceState(null, "", `#${sheets[to]?.id ?? ""}`);
          }
          const sc = scrollersRef.current[to];
          if (sc) sc.scrollTop = 0;
        }
      }, duration + 40);
    },
    [N, sheets, say]
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

  // ── Pointer: grab a page EDGE and drag the sheet with your hand ──
  useEffect(() => {
    if (!book) return;

    const edgeW = () => Math.min(110, Math.max(56, window.innerWidth * 0.07));

    // Which edge (if any) is under the pointer: +1 = right edge (forward),
    // -1 = left edge (back). The middle of the sheet is deliberately dead so
    // clicks, text selection and the sample ledger keep working.
    const zoneAt = (x: number, y: number): 0 | 1 | -1 => {
      const node = sheetRefs.current[cur];
      if (!node) return 0;
      const r = node.getBoundingClientRect();
      if (y < r.top || y > r.bottom) return 0;
      const w = edgeW();
      if (x >= r.right - w && x <= r.right + 8 && cur < N - 1) return 1;
      if (x <= r.left + w && x >= r.left - 8 && cur > 0) return -1;
      return 0;
    };

    const clamp = (v: number) => Math.max(0, Math.min(1, v));

    const endDrag = () => {
      const d = dragRef.current;
      if (!d) return;
      dragRef.current = null;
      clearTimeout(d.safety);
      if (d.raf) cancelAnimationFrame(d.raf);
      document.documentElement.classList.remove("znGrab");
      if (d.pending) return; // never crossed the threshold — treat as a plain click
      // A flick commits on direction alone; otherwise it's whether the sheet
      // travelled past the halfway-ish point.
      const flick = Math.abs(d.vel) > 0.5;
      const commit = flick ? (d.zone === 1 ? d.vel < 0 : d.vel > 0) : d.prog > 0.42;
      settleDrag(d.from, cur + d.zone, d.prog, commit);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return; // touch keeps native scroll
      if (e.button !== 0 || turningRef.current || dragRef.current) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("button, a, input, textarea, select, nav, label")) return;
      const zone = zoneAt(e.clientX, e.clientY);
      if (!zone) return;
      try { t?.setPointerCapture?.(e.pointerId); } catch { /* capture is best-effort */ }
      dragRef.current = {
        zone, id: e.pointerId, pending: true,
        startX: e.clientX, startY: e.clientY,
        lastX: e.clientX, lastT: performance.now(),
        vel: 0, prog: 0, from: cur, raf: 0, safety: 0
      };
    };

    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d || e.pointerId !== d.id) return;
      if (!d.pending && e.buttons === 0) { endDrag(); return; } // a lost pointerup
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (d.pending) {
        // Vertical intent means the reader is scrolling — in-page scroll wins.
        if (Math.abs(dy) > 16 && Math.abs(dy) > Math.abs(dx)) { dragRef.current = null; return; }
        if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
        if ((d.zone === 1 && dx > 0) || (d.zone === -1 && dx < 0)) { dragRef.current = null; return; }
        const to = cur + d.zone;
        if (to < 0 || to >= N) { dragRef.current = null; return; }
        d.pending = false;
        turningRef.current = true;
        setDragging(true);
        setArmed(false);
        setTurn({ to, dir: d.zone });
        document.documentElement.classList.add("znGrab");
      }
      e.preventDefault();
      clearTimeout(d.safety);
      d.safety = window.setTimeout(endDrag, 4000); // stale-drag failsafe
      const now = performance.now();
      d.vel = (e.clientX - d.lastX) / Math.max(1, now - d.lastT); // px/ms
      d.lastX = e.clientX;
      d.lastT = now;
      const node = sheetRefs.current[d.from];
      const span = (node?.getBoundingClientRect().width ?? window.innerWidth) * 0.85;
      d.prog = clamp(d.zone === 1 ? -dx / span : dx / span);
      if (!d.raf) {
        d.raf = requestAnimationFrame(() => {
          const cd = dragRef.current;
          if (!cd) return;
          cd.raf = 0;
          const el = sheetRefs.current[cd.from];
          if (el) {
            el.style.transition = "none";
            el.style.transform = `rotateY(${-cd.prog * 180}deg)`;
          }
        });
      }
    };

    const onUp = (e: PointerEvent) => { if (dragRef.current?.id === e.pointerId) endDrag(); };

    // Cursor affordance: show a grab hand only where a drag would actually start.
    let hoverRaf = 0;
    const onHover = (e: PointerEvent) => {
      if (hoverRaf || dragRef.current) return;
      hoverRaf = requestAnimationFrame(() => {
        hoverRaf = 0;
        const t = e.target as HTMLElement | null;
        const can = !turningRef.current && zoneAt(e.clientX, e.clientY) !== 0 &&
          !t?.closest?.("button, a, input, textarea, select, nav, label");
        document.documentElement.classList.toggle("znCanGrab", Boolean(can));
      });
    };

    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("blur", endDrag);
    window.addEventListener("pointermove", onHover, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("blur", endDrag);
      window.removeEventListener("pointermove", onHover);
      if (hoverRaf) cancelAnimationFrame(hoverRaf);
      document.documentElement.classList.remove("znCanGrab", "znGrab");
    };
  }, [book, cur, N, settleDrag]);

  // ── Touch: a horizontal swipe turns the page like a book; a vertical swipe
  //    scrolls the sheet and only turns AT its boundary (in-page scroll wins,
  //    same rule as the wheel and keyboard handlers). Listeners stay passive —
  //    the gesture is decided on touchend, so native scrolling is never blocked. ──
  useEffect(() => {
    if (!book) return;
    let startX = 0, startY = 0, endX = 0, endY = 0;
    let boundNext = false, boundPrev = false;

    const atBoundary = (sc: HTMLDivElement, dir: number) =>
      dir > 0 ? sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2 : sc.scrollTop <= 2;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      if (!t) return;
      startX = endX = t.clientX;
      startY = endY = t.clientY;
      const sc = scrollersRef.current[cur];
      // Remember whether the sheet was ALREADY at its boundary when the gesture
      // began, so a scroll that merely arrives at the end doesn't also turn.
      boundNext = sc ? atBoundary(sc, 1) : true;
      boundPrev = sc ? atBoundary(sc, -1) : true;
    };

    const onMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!t) return;
      endX = t.clientX;
      endY = t.clientY;
    };

    const onEnd = () => {
      if (turningRef.current) return;
      const dy = startY - endY;
      const dx = endX - startX;
      // Clearly horizontal → turn. Swipe left goes forward, like a real page.
      if (Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        if (dx < 0) next(); else prev();
        return;
      }
      if (Math.abs(dy) < 64 || Math.abs(dy) < Math.abs(dx)) return;
      const sc = scrollersRef.current[cur];
      const dir = dy > 0 ? 1 : -1;
      const boundAtStart = dir > 0 ? boundNext : boundPrev;
      if (boundAtStart && (!sc || atBoundary(sc, dir))) {
        if (dir > 0) next(); else prev();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [book, cur, next, prev]);

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
          // While a drag is live the transform is written straight onto the node
          // each frame, so React must not fight it with its own transform or a
          // transition — the sheet has to track the hand exactly.
          const style: CSSProperties | undefined = turning
            ? dragging
              ? {
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                  willChange: "transform"
                }
              : {
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
