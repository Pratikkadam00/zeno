"use client";

// Zeno — client motion primitives. "Everything settles like paper": rows
// print in, rules wipe, headlines print word by word, digits roll like a
// counter wheel, money tallies. Transform/opacity only; in-view triggers
// fire once; reduced motion collapses everything to static.
//
// Back-compat: Reveal / CountUp / Magnetic / StaggerGroup / staggerChild are
// kept as working exports so files not rewritten in this pass keep compiling.
// Magnetic no longer moves (cursor-magnetism retired — paper doesn't chase
// hands); it renders children unchanged.

import { Fragment, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { m, useInView, useReducedMotion, type Variants } from "motion/react";

const EASE = [0.22, 0.8, 0.26, 1] as const;
const EASE_CSS = "cubic-bezier(0.22, 0.8, 0.26, 1)";

/* PrintIn — a row/section printing onto the page. */
export function PrintIn({
  children,
  delay = 0,
  y = 12,
  className,
  style
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-56px" }}
      transition={{ duration: 0.4, delay, ease: EASE }}
    >
      {children}
    </m.div>
  );
}

/* Back-compat alias (old API: <Reveal delay className>). */
export function Reveal({ children, delay = 0, className, style }: { children: ReactNode; delay?: number; className?: string; style?: CSSProperties }) {
  return (
    <PrintIn delay={delay} className={className} style={style}>
      {children}
    </PrintIn>
  );
}

/* RuleWipe — a hairline (or bar) ruling itself in, left → right. */
export function RuleWipe({ delay = 0, className, style }: { delay?: number; className?: string; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      aria-hidden="true"
      className={className}
      style={{ transformOrigin: "left center", ...style }}
      initial={{ scaleX: reduce ? 1 : 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    />
  );
}

/* PenHead — the section head as the pen writes it: caps-mono kicker fades,
   the trailing hairline rules itself in. (Server-safe static version for
   utility pages: SectionHead in ledger.tsx.) */
export function PenHead({ children, center = false, style }: { children: ReactNode; center?: boolean; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-56px" });
  const reduce = useReducedMotion();
  const on = inView || !!reduce;
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: center ? "center" : undefined, ...style }}>
      <b
        className="money"
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          whiteSpace: "nowrap",
          opacity: on ? 1 : 0,
          transition: `opacity 0.3s ${EASE_CSS}`
        }}
      >
        {children}
      </b>
      {!center ? (
        <i
          aria-hidden="true"
          style={{
            flex: 1,
            borderBottom: "1px solid var(--rule-strong)",
            transform: on ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left center",
            transition: `transform 0.55s ${EASE_CSS} 0.12s`
          }}
        />
      ) : null}
    </div>
  );
}

/* WordsIn — a headline printing word by word (50ms/word). `text` may contain
   "\n" for hard line breaks. Reduced motion / SSR fallback: plain text. */
export function WordsIn({
  text,
  as: Tag = "h2",
  className,
  style,
  step = 0.05
}: {
  text: string;
  as?: "h1" | "h2" | "h3" | "p" | "div";
  className?: string;
  style?: CSSProperties;
  step?: number;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-56px" });
  const reduce = useReducedMotion();
  const lines = text.split("\n");
  if (reduce) {
    return (
      <Tag className={className} style={style}>
        {lines.map((l, i) => (
          <Fragment key={i}>
            {l}
            {i < lines.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </Tag>
    );
  }
  let w = 0;
  return (
    <Tag ref={ref as never} className={className} style={style}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {line.split(" ").map((word, wi) => {
            const d = w++ * step;
            return (
              <Fragment key={wi}>
                {wi > 0 ? " " : null}
                <span
                  style={{
                    display: "inline-block",
                    opacity: inView ? 1 : 0,
                    transform: inView ? "none" : "translateY(0.5em)",
                    transition: `opacity 0.4s ${EASE_CSS} ${d}s, transform 0.4s ${EASE_CSS} ${d}s`
                  }}
                >
                  {word}
                </span>
              </Fragment>
            );
          })}
          {li < lines.length - 1 ? <br /> : null}
        </Fragment>
      ))}
    </Tag>
  );
}

/* MaskLines — headline lines rising out of an overflow mask (the final CTA;
   the hero's copy uses the CSS-driven variant in home.module.css so its
   markup stays static for SSR/no-JS). */
export function MaskLines({ lines, delay = 0, className, style }: { lines: ReactNode[]; delay?: number; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const inView = useInView(ref, { once: true, margin: "-56px" });
  const reduce = useReducedMotion();
  const on = inView || !!reduce;
  return (
    <h2 ref={ref} className={className} style={style}>
      {lines.map((line, i) => (
        <span key={i} style={{ display: "block", overflow: "hidden", paddingBottom: "0.06em", marginBottom: "-0.06em" }}>
          <span
            style={{
              display: "block",
              transform: on ? "none" : "translateY(114%)",
              transition: reduce ? undefined : `transform 0.68s ${EASE_CSS} ${delay + i * 0.09}s`
            }}
          >
            {line}
          </span>
        </span>
      ))}
    </h2>
  );
}

/* DrawBar — a vertical rule drawing itself top → down (the indictment quote,
   the featured plan's edge). Absolute-positioned; parent must be relative. */
export function DrawBar({ color = "var(--stamp-alert)", top = 2, bottom = 2, delay = 0, style }: { color?: string; top?: number; bottom?: number; delay?: number; style?: CSSProperties }) {
  const reduce = useReducedMotion();
  return (
    <m.span
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top, bottom, width: 3, background: color, transformOrigin: "top center", ...style }}
      initial={{ scaleY: reduce ? 1 : 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true, margin: "-48px" }}
      transition={{ duration: 0.55, delay, ease: EASE }}
    />
  );
}

/* PenLedgerLine — the Refusal's dotted leader, drawn: label prints, dots
   rule themselves in, the verdict stamps down a beat later. (Static version
   for server pages: LedgerLine in ledger.tsx.) */
export function PenLedgerLine({
  label,
  sub,
  value,
  valueColor,
  strong = false,
  delay = 0
}: {
  label: ReactNode;
  sub?: ReactNode;
  value: ReactNode;
  valueColor?: string;
  strong?: boolean;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-56px" });
  const reduce = useReducedMotion();
  const on = inView || !!reduce;
  const t = (extra: number, dur: number, prop: string) => (reduce ? undefined : `${prop} ${dur}s ${EASE_CSS} ${delay + extra}s`);
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "8px 0" }}>
      <span
        style={{
          flex: "none",
          fontSize: 15,
          fontWeight: strong ? 700 : 500,
          color: strong ? "var(--ink)" : "var(--ink-2)",
          opacity: on ? 1 : 0,
          transition: t(0, 0.3, "opacity")
        }}
      >
        {label}
        {sub ? (
          <span className="money" style={{ fontSize: 10, fontWeight: 700, color: "var(--ink-3)", marginLeft: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {sub}
          </span>
        ) : null}
      </span>
      <span
        aria-hidden="true"
        style={{
          flex: 1,
          borderBottom: "2px dotted var(--rule-strong)",
          minWidth: 14,
          transform: on ? "translateY(-3px) scaleX(1)" : "translateY(-3px) scaleX(0)",
          transformOrigin: "left center",
          transition: t(0.1, 0.5, "transform")
        }}
      />
      <span
        className="money"
        style={{ flex: "none", fontSize: 16, fontWeight: 700, color: valueColor ?? "var(--ink)", opacity: on ? 1 : 0, transition: t(0.5, 0.26, "opacity") }}
      >
        {value}
      </span>
    </div>
  );
}

/* Odometer — digits roll into place like a counter wheel, then settle back
   to plain text (restores kerning + clean copy for selection). SSR and
   reduced motion render the real value as plain text — never a zero. */
const ODO_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export function Odometer({ value, className, style }: { value: number | string; className?: string; style?: CSSProperties }) {
  const s = String(value);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-56px" });
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<"static" | "roll" | "done">("static");
  const [go, setGo] = useState(false);

  useEffect(() => {
    if (!inView || reduce) return;
    setPhase("roll");
    const r = requestAnimationFrame(() => requestAnimationFrame(() => setGo(true)));
    const t = setTimeout(() => setPhase("done"), 1900);
    return () => {
      cancelAnimationFrame(r);
      clearTimeout(t);
    };
  }, [inView, reduce]);

  return (
    <span ref={ref} className={`money ${className ?? ""}`} style={{ whiteSpace: "nowrap", ...style }} aria-label={phase === "roll" ? s : undefined}>
      {phase !== "roll"
        ? s
        : [...s].map((ch, i) =>
            /\d/.test(ch) ? (
              <span key={i} aria-hidden="true" style={{ display: "inline-block", overflow: "hidden", height: "1em", verticalAlign: "top" }}>
                <span
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    transform: go ? `translateY(-${ch}em)` : "none",
                    transition: `transform ${850 + i * 220}ms ${EASE_CSS}`
                  }}
                >
                  {ODO_DIGITS.map((d) => (
                    <span key={d} style={{ display: "block", height: "1em", lineHeight: 1 }}>
                      {d}
                    </span>
                  ))}
                </span>
              </span>
            ) : (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            )
          )}
    </span>
  );
}

/* StampIn — spring thunk for an earned verified moment. (The homepage's
   verified beat now lives INSIDE the hero ledger's cancel flow; this stays
   for utility pages and future earned moments.) */
export function StampIn({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={className}
      style={{ display: "inline-flex" }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.7 }}
      whileInView={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-64px" }}
      transition={reduce ? { duration: 0.2, delay } : { type: "spring", stiffness: 420, damping: 16, delay }}
    >
      {children}
    </m.div>
  );
}

/* Tally — adding-machine count-up in tabular mono. SSR/no-JS renders the
   REAL value (never a zero); in view, the count runs 0 → value. rAF with a
   timeout failsafe so suspended rAF can never strand the number. */
export function Tally({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 700,
  className,
  style
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [v, setV] = useState(to);

  useEffect(() => {
    if (!inView || reduce) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setV(to * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const failsafe = setTimeout(() => setV(to), duration + 300);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(failsafe);
    };
  }, [inView, reduce, to, duration]);

  return (
    <span ref={ref} className={`money ${className ?? ""}`} style={style}>
      {prefix}
      {v.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* Back-compat alias (old API: <CountUp to prefix suffix>). */
export function CountUp({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  return <Tally to={to} prefix={prefix} suffix={suffix} />;
}

/* Magnetic — retired interaction, preserved API. Paper doesn't chase hands. */
export function Magnetic({ children }: { children: ReactNode; strength?: number }) {
  return <>{children}</>;
}

/* Stagger group — rows print in sequence (45ms family stagger, like the app). */
export function StaggerGroup({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  return (
    <m.div
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-48px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.045 } } }}
    >
      {children}
    </m.div>
  );
}

export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } }
};
