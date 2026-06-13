"use client";

import { useMemo, useRef, useState } from "react";
import { PAL, type Point } from "./analytics-data";
import styles from "./analytics.module.css";

// Shared geometry for the responsive line/area chart.
const VW = 1000;

function buildPath(values: number[], min: number, max: number, vh: number, pad = 6): { line: string; area: string; xs: number[]; ys: number[] } {
  const n = values.length;
  const span = Math.max(max - min, 1);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < n; i += 1) {
    const x = n === 1 ? VW / 2 : (i / (n - 1)) * VW;
    const y = vh - pad - (((values[i] ?? 0) - min) / span) * (vh - pad * 2);
    xs.push(x);
    ys.push(y);
  }
  // Smooth Catmull-Rom → cubic bezier. Clamp helper keeps indices in range.
  const cx = (i: number) => xs[Math.max(0, Math.min(n - 1, i))] as number;
  const cy = (i: number) => ys[Math.max(0, Math.min(n - 1, i))] as number;
  let line = `M ${cx(0)},${cy(0)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const x0 = cx(i - 1), y0 = cy(i - 1);
    const x1 = cx(i), y1 = cy(i);
    const x2 = cx(i + 1), y2 = cy(i + 1);
    const x3 = cx(i + 2), y3 = cy(i + 2);
    const c1x = x1 + (x2 - x0) / 6;
    const c1y = y1 + (y2 - y0) / 6;
    const c2x = x2 - (x3 - x1) / 6;
    const c2y = y2 - (y3 - y1) / 6;
    line += ` C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  }
  const area = `${line} L ${cx(n - 1)},${vh} L ${cx(0)},${vh} Z`;
  return { line, area, xs, ys };
}

type AreaProps = {
  points: Point[];
  compare?: Point[];
  color: string;
  gradientId: string;
  height?: number;
  formatValue: (v: number) => string;
  showCompare?: boolean;
};

export function AreaChart({ points, compare, color, gradientId, height = 240, formatValue, showCompare = true }: AreaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);

  const { values, min, max, main, cmp } = useMemo(() => {
    const values = points.map((p) => p.value);
    const cmpValues = compare?.map((p) => p.value) ?? [];
    const all = showCompare ? [...values, ...cmpValues] : values;
    const lo = Math.min(...all);
    const hi = Math.max(...all);
    const pad = (hi - lo) * 0.12 || 1;
    const min = Math.max(0, lo - pad);
    const max = hi + pad;
    return {
      values,
      min,
      max,
      main: buildPath(values, min, max, height),
      cmp: compare ? buildPath(cmpValues, min, max, height) : null
    };
  }, [points, compare, height, showCompare]);

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(frac * (points.length - 1)));
  }

  const ax = active !== null ? (main.xs[active] ?? 0) : 0;
  const ay = active !== null ? (main.ys[active] ?? 0) : 0;
  const tooltipLeft = active !== null ? (ax / VW) * 100 : 0;
  const activePoint = active !== null ? points[active] : undefined;
  const activeCompare = active !== null ? compare?.[active] : undefined;

  return (
    <div className={styles.chartWrap} ref={ref} onMouseMove={onMove} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${VW} ${height}`} preserveAspectRatio="none" className={styles.chartSvg} aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.34" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2={VW} y1={height * g} y2={height * g} className={styles.gridLine} />
        ))}
        {showCompare && cmp ? (
          <path d={cmp.line} fill="none" stroke={PAL.quiet} strokeWidth="2" strokeDasharray="5 6" vectorEffect="non-scaling-stroke" opacity="0.65" />
        ) : null}
        <path d={main.area} fill={`url(#${gradientId})`} className={styles.areaFill} />
        <path d={main.line} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" className={styles.areaLine} strokeLinecap="round" />
        {active !== null ? (
          <>
            <line x1={ax} x2={ax} y1="0" y2={height} stroke={color} strokeWidth="1" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" opacity="0.5" />
            <circle cx={ax} cy={ay} r="5" fill={PAL.bg1} stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          </>
        ) : null}
      </svg>
      {activePoint ? (
        <div className={styles.tooltip} style={{ left: `${tooltipLeft}%` }}>
          <span className={styles.tooltipLabel}>{activePoint.label}</span>
          <span className={styles.tooltipValue} style={{ color }}>{formatValue(activePoint.value)}</span>
          {showCompare && activeCompare ? (
            <span className={styles.tooltipCompare}>prev · {formatValue(activeCompare.value)}</span>
          ) : null}
        </div>
      ) : null}
      <div className={styles.axisRow}>
        {points.map((p, i) => (
          (points.length <= 8 || i % Math.ceil(points.length / 6) === 0) ? (
            <span key={p.t} className={styles.axisTick} style={{ left: `${((main.xs[i] ?? 0) / VW) * 100}%` }}>{p.label}</span>
          ) : null
        ))}
      </div>
    </div>
  );
}

// ── Diverging bars: new (up) vs churned (down) ──────────────────────────────
type DivergingProps = {
  newUsers: Point[];
  churned: Point[];
  height?: number;
};

export function DivergingBars({ newUsers, churned, height = 200 }: DivergingProps) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...newUsers.map((p) => p.value), ...churned.map((p) => p.value), 1);
  const n = newUsers.length;
  const gap = 0.18;
  const bw = (VW / n) * (1 - gap);

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${VW} ${height}`} preserveAspectRatio="none" className={styles.chartSvg} aria-hidden>
        <line x1="0" x2={VW} y1={height / 2} y2={height / 2} className={styles.gridLine} />
        {newUsers.map((p, i) => {
          const x = (i / n) * VW + (VW / n) * (gap / 2);
          const upH = (p.value / max) * (height / 2 - 6);
          const downH = ((churned[i]?.value ?? 0) / max) * (height / 2 - 6);
          const on = active === i;
          return (
            <g key={p.t} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
              <rect x={x} y={height / 2 - upH} width={bw} height={upH} rx="2" fill={PAL.emerald} opacity={on ? 1 : 0.82} />
              <rect x={x} y={height / 2} width={bw} height={downH} rx="2" fill={PAL.rose} opacity={on ? 1 : 0.62} />
              <rect x={x - (VW / n) * (gap / 2)} y="0" width={VW / n} height={height} fill="transparent" />
            </g>
          );
        })}
      </svg>
      {active !== null && newUsers[active] ? (
        <div className={styles.tooltip} style={{ left: `${((active + 0.5) / n) * 100}%` }}>
          <span className={styles.tooltipLabel}>{newUsers[active].label}</span>
          <span className={styles.tooltipValue} style={{ color: PAL.emerald }}>+{newUsers[active].value} new</span>
          <span className={styles.tooltipCompare} style={{ color: PAL.rose }}>−{churned[active]?.value ?? 0} churned</span>
        </div>
      ) : null}
    </div>
  );
}

// ── Donut ───────────────────────────────────────────────────────────────────
type DonutProps = {
  data: { label: string; value: number; color: string }[];
  centerLabel: string;
  formatValue: (v: number) => string;
};

export function Donut({ data, centerLabel, formatValue }: DonutProps) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = data.map((d) => {
    const frac = d.value / Math.max(total, 1);
    const seg = { ...d, frac, dash: frac * c, offset };
    offset += frac * c;
    return seg;
  });
  const shown = active !== null ? data[active] : null;

  return (
    <div className={styles.donutWrap}>
      <svg viewBox="0 0 140 140" className={styles.donutSvg}>
        <g transform="rotate(-90 70 70)">
          {segs.map((s, i) => (
            <circle
              key={s.label}
              cx="70" cy="70" r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={active === i ? 20 : 15}
              strokeDasharray={`${s.dash} ${c - s.dash}`}
              strokeDashoffset={-s.offset}
              className={styles.donutSeg}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
            />
          ))}
        </g>
        <text x="70" y="64" textAnchor="middle" className={styles.donutCenterTop}>
          {shown ? shown.label : centerLabel}
        </text>
        <text x="70" y="84" textAnchor="middle" className={styles.donutCenterVal}>
          {shown ? formatValue(shown.value) : formatValue(total)}
        </text>
      </svg>
      <ul className={styles.donutLegend}>
        {data.map((d, i) => (
          <li
            key={d.label}
            className={styles.legendItem}
            data-active={active === i}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
          >
            <span className={styles.legendDot} style={{ background: d.color }} />
            <span className={styles.legendLabel}>{d.label}</span>
            <span className={styles.legendVal}>{((d.value / Math.max(total, 1)) * 100).toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sparkline (KPI cards) ───────────────────────────────────────────────────
export function Sparkline({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const { line, area } = buildPath(values, min, max, 40, 3);
  const id = `spark-${color.replace(/[^a-z]/gi, "")}-${values.length}-${Math.round(max)}`;
  return (
    <svg viewBox={`0 0 ${VW} 40`} preserveAspectRatio="none" className={styles.sparkSvg} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" />
    </svg>
  );
}
