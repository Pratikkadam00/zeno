"use client";

import { useEffect, useRef } from "react";

// A hand-built Canvas-2D "subscription radar": a glowing orb, orbiting renewal
// dots on a tilted ring, a sweeping arc, and drifting particles, with pointer
// parallax. Deliberately NOT WebGL/three.js — 2D canvases have no context cap
// and tear down cleanly, so navigating in and out can never exhaust GPU
// contexts or leave a dead canvas behind (the old WebGL hero's crash class).
const DOTS = [
  { a: 0.0, color: "#34d399", r: 6 },
  { a: 0.9, color: "#5b8cff", r: 5 },
  { a: 1.8, color: "#fbbf24", r: 4 },
  { a: 2.6, color: "#22d3ee", r: 5.5 },
  { a: 3.6, color: "#fb7185", r: 4 },
  { a: 4.6, color: "#a78bfa", r: 5 },
  { a: 5.4, color: "#34d399", r: 3.5 }
];

export default function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const node = canvasRef.current;
    if (!node) return;
    const el: HTMLCanvasElement = node;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const g: CanvasRenderingContext2D = ctx;

    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let w = 0, h = 0, dpr = 1;
    let t = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

    // Background star/particle field (seeded, stable).
    const particles = Array.from({ length: 70 }, (_, i) => ({
      x: ((i * 73) % 100) / 100,
      y: ((i * 137) % 100) / 100,
      s: 0.4 + ((i * 31) % 100) / 140,
      tw: ((i * 17) % 100) / 100
    }));

    function resize() {
      const rect = el.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      el.width = Math.max(1, Math.floor(w * dpr));
      el.height = Math.max(1, Math.floor(h * dpr));
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function onPointer(e: PointerEvent) {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    }

    function draw() {
      t += reduce ? 0 : 0.016;
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;

      g.clearRect(0, 0, w, h);

      // Scene centered toward the right; parallax with the pointer.
      const cx = w * 0.66 + pointer.x * 26;
      const cy = h * 0.46 + pointer.y * 20;
      const baseR = Math.min(w, h) * 0.32;

      // Background particles
      for (const p of particles) {
        const px = p.x * w + pointer.x * 10 * p.s;
        const py = p.y * h + pointer.y * 10 * p.s;
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 0.8 + p.tw * 6.28));
        g.globalAlpha = 0.18 * tw;
        g.fillStyle = "#9fb3ff";
        g.beginPath();
        g.arc(px, py, p.s, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;

      // Tilted orbit rings (ellipses) for depth
      const tilt = 0.42;
      for (let i = 0; i < 3; i++) {
        const rr = baseR * (1 + i * 0.34);
        g.strokeStyle = `rgba(120,150,230,${0.12 - i * 0.03})`;
        g.lineWidth = 1;
        g.beginPath();
        g.ellipse(cx, cy, rr, rr * tilt, 0, 0, Math.PI * 2);
        g.stroke();
      }

      // Central glow
      const glow = g.createRadialGradient(cx, cy, 0, cx, cy, baseR * 1.6);
      glow.addColorStop(0, "rgba(91,140,255,0.42)");
      glow.addColorStop(0.4, "rgba(42,78,208,0.16)");
      glow.addColorStop(1, "rgba(7,8,12,0)");
      g.fillStyle = glow;
      g.beginPath();
      g.arc(cx, cy, baseR * 1.6, 0, Math.PI * 2);
      g.fill();

      // Orb body
      const orbR = baseR * 0.52;
      const body = g.createRadialGradient(cx - orbR * 0.3, cy - orbR * 0.4, orbR * 0.1, cx, cy, orbR);
      body.addColorStop(0, "#7ea2ff");
      body.addColorStop(0.45, "#3a5fe0");
      body.addColorStop(1, "#16277a");
      g.fillStyle = body;
      g.beginPath();
      g.arc(cx, cy, orbR, 0, Math.PI * 2);
      g.fill();
      // rim light
      g.strokeStyle = "rgba(150,180,255,0.5)";
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, orbR, 0, Math.PI * 2);
      g.stroke();

      // Radar sweep (rotating gradient wedge)
      const sweepA = t * 0.6;
      const sweep = g.createConicGradient ? g.createConicGradient(sweepA, cx, cy) : null;
      if (sweep) {
        sweep.addColorStop(0, "rgba(52,211,153,0.32)");
        sweep.addColorStop(0.08, "rgba(52,211,153,0)");
        sweep.addColorStop(1, "rgba(52,211,153,0)");
        g.save();
        g.beginPath();
        g.ellipse(cx, cy, baseR * 1.34, baseR * 1.34 * tilt, 0, 0, Math.PI * 2);
        g.clip();
        g.fillStyle = sweep;
        g.fillRect(cx - baseR * 1.4, cy - baseR * 1.4, baseR * 2.8, baseR * 2.8);
        g.restore();
      }

      // Orbiting renewal dots on the tilted ring
      const ringR = baseR * 1.34;
      const dotsSorted = [...DOTS].map((d) => {
        const ang = d.a + t * 0.5;
        const x = cx + Math.cos(ang) * ringR;
        const y = cy + Math.sin(ang) * ringR * tilt;
        const depth = (Math.sin(ang) + 1) / 2; // 0 back .. 1 front
        return { ...d, x, y, depth };
      }).sort((p, q) => p.depth - q.depth);

      for (const d of dotsSorted) {
        const scale = 0.6 + d.depth * 0.7;
        g.globalAlpha = 0.5 + d.depth * 0.5;
        g.shadowColor = d.color;
        g.shadowBlur = 16 * d.depth;
        g.fillStyle = d.color;
        g.beginPath();
        g.arc(d.x, d.y, d.r * scale, 0, Math.PI * 2);
        g.fill();
      }
      g.shadowBlur = 0;
      g.globalAlpha = 1;

      if (!reduce) raf = requestAnimationFrame(draw);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener("pointermove", onPointer, { passive: true });
    raf = requestAnimationFrame(draw);
    if (reduce) draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      g.clearRect(0, 0, w, h);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} aria-hidden />;
}
