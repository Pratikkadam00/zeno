"use client";

import { animate, motion, useInView, useMotionValue, useSpring, useTransform, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

// ── Reveal: fade + rise into view, once ─────────────────────────────────────
export function Reveal({
  children,
  delay = 0,
  y = 22,
  className,
  as = "div"
}: { children: ReactNode; delay?: number; y?: number; className?: string | undefined; as?: "div" | "span" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const MotionTag = motion[as] as typeof motion.div;
  return (
    <MotionTag
      ref={ref}
      className={className}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </MotionTag>
  );
}

// ── Staggered container + child ─────────────────────────────────────────────
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } }
};
export const staggerChild: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

export function StaggerGroup({ children, className }: { children: ReactNode; className?: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  return (
    <motion.div ref={ref} className={className} variants={staggerParent} initial="hidden" animate={inView ? "show" : "hidden"}>
      {children}
    </motion.div>
  );
}

// ── Word-by-word headline reveal ────────────────────────────────────────────
export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string | undefined; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const words = text.split(" ");
  return (
    <span ref={ref} className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }} aria-hidden>
          <motion.span
            style={{ display: "inline-block" }}
            initial={{ y: "110%" }}
            animate={inView ? { y: 0 } : {}}
            transition={{ duration: 0.8, delay: delay + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// ── Magnetic wrapper (buttons / chips) ──────────────────────────────────────
export function Magnetic({ children, strength = 0.4, className }: { children: ReactNode; strength?: number; className?: string | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 14, mass: 0.3 });
  const sy = useSpring(y, { stiffness: 180, damping: 14, mass: 0.3 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

// ── Count-up number (animates when scrolled into view) ──────────────────────
export function CountUp({
  to, prefix = "", suffix = "", decimals = 0, duration = 1.8, className
}: { to: number; prefix?: string; suffix?: string; decimals?: number; duration?: number; className?: string | undefined }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setVal(v)
    });
    return () => controls.stop();
  }, [inView, to, duration]);

  const formatted = val.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>;
}

// ── Infinite marquee ────────────────────────────────────────────────────────
export function Marquee({ children, speed = 38, reverse = false, className }: { children: ReactNode; speed?: number; reverse?: boolean; className?: string | undefined }) {
  return (
    <div className={className} style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
      <motion.div
        style={{ display: "inline-flex", gap: "0", whiteSpace: "nowrap", willChange: "transform" }}
        animate={{ x: reverse ? ["-50%", "0%"] : ["0%", "-50%"] }}
        transition={{ duration: speed, ease: "linear", repeat: Infinity }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}

// ── Parallax on scroll (subtle) ─────────────────────────────────────────────
export function useParallax(distance = 60) {
  const ref = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = 1 - (rect.top + rect.height / 2) / window.innerHeight;
      y.set(progress * distance);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [distance, y]);
  const sy = useSpring(y, { stiffness: 60, damping: 20 });
  return { ref, y: sy };
}

export { motion, useTransform };
