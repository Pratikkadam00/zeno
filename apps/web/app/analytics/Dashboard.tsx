"use client";

import { useMemo, useState } from "react";
import { AreaChart } from "./charts";
import styles from "./analytics.module.css";
import {
  AS_OF_LABEL,
  fmtMoney,
  fmtNum,
  getKpis,
  getPlanBreakdown,
  getRangeData,
  PAL,
  RANGES,
  type Kpi,
  type RangeKey
} from "./analytics-data";

const HERO_KEYS = ["mrr", "active", "revenue", "churn"] as const;
const SECONDARY_KEYS = ["arr", "new", "arpu", "ltv", "trial"] as const;

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("30D");
  const data = useMemo(() => getRangeData(range), [range]);
  const kpis = useMemo(() => getKpis(range), [range]);
  const plans = useMemo(() => getPlanBreakdown(), []);

  const byKey = useMemo(() => Object.fromEntries(kpis.map((k) => [k.key, k])) as Record<string, Kpi>, [kpis]);
  const hero = HERO_KEYS.map((k) => byKey[k]).filter((k): k is Kpi => Boolean(k));
  const secondary = SECONDARY_KEYS.map((k) => byKey[k]).filter((k): k is Kpi => Boolean(k));

  const planTotal = plans.reduce((s, p) => s + p.revenue, 0);
  const planMax = Math.max(...plans.map((p) => p.revenue), 1);
  const activeNow = data.activeUsers[data.activeUsers.length - 1]?.value ?? 0;

  return (
    <main className={styles.shell}>
      <div className={styles.glow} aria-hidden />
      <div className={styles.inner}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Growth analytics</span>
            <h1 className={styles.title}>Revenue &amp; <span className={styles.titleGrad}>growth.</span></h1>
            <p className={styles.lead}>
              <span className={styles.live}><span className={styles.liveDot} />Live</span>
              {"  ·  "}as of {AS_OF_LABEL}
            </p>
          </div>
          <div className={styles.rangeToggle} role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button key={r.key} role="tab" aria-selected={range === r.key} className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ""}`} onClick={() => setRange(r.key)}>
                {r.key}
              </button>
            ))}
          </div>
        </header>

        {/* Four headline metrics */}
        <section className={styles.kpiRow}>
          {hero.map((k) => {
            const good = (k.delta >= 0) === k.positiveIsGood;
            return (
              <div key={k.key} className={styles.kpi}>
                <div className={styles.kpiLabel}>{k.label}</div>
                <div className={styles.kpiValue}>{k.value}</div>
                <div className={`${styles.kpiDelta} ${good ? styles.up : styles.down}`}>
                  {k.delta >= 0 ? "↑" : "↓"} {Math.abs(k.delta).toFixed(1)}%
                  <span className={styles.kpiDeltaNote}>vs prev</span>
                </div>
              </div>
            );
          })}
        </section>

        {/* Revenue + plan breakdown */}
        <section className={styles.split}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Revenue over time</h2>
                <p className={styles.panelSub}>Gross processed · {RANGES.find((r) => r.key === range)!.label}</p>
              </div>
              <div className={styles.panelFig}>{fmtMoney(data.revenue.reduce((s, p) => s + p.value, 0), { compact: true })}</div>
            </div>
            <AreaChart points={data.revenue} color={PAL.blue} gradientId="rev" height={260} showCompare={false} formatValue={(v) => fmtMoney(v, { compact: true })} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Revenue by plan</h2>
                <p className={styles.panelSub}>Monthly recurring</p>
              </div>
            </div>
            <div className={styles.bars}>
              {plans.map((p) => (
                <div key={p.plan} className={styles.bar}>
                  <div className={styles.barTop}>
                    <span className={styles.barName}><span className={styles.barDot} style={{ background: p.color }} />{p.plan}</span>
                    <span className={styles.barVal}>{planTotal ? Math.round((p.revenue / planTotal) * 100) : 0}%</span>
                  </div>
                  <div className={styles.barTrack}>
                    <div className={styles.barFill} style={{ width: `${(p.revenue / planMax) * 100}%`, background: p.color }} />
                  </div>
                  <div className={styles.barAmt}>{fmtMoney(p.revenue, { compact: true })}/mo · {fmtNum(p.subscribers, true)} subs</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Subscriber growth + secondary metrics */}
        <section className={styles.split}>
          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Subscriber growth</h2>
                <p className={styles.panelSub}>Active subscribers over {RANGES.find((r) => r.key === range)!.label}</p>
              </div>
              <div className={styles.panelFig}>{fmtNum(activeNow, true)}</div>
            </div>
            <AreaChart points={data.activeUsers} color={PAL.emerald} gradientId="subs" height={260} showCompare={false} formatValue={(v) => fmtNum(v, true)} />
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Key metrics</h2>
                <p className={styles.panelSub}>This period</p>
              </div>
            </div>
            <div className={styles.metrics}>
              {secondary.map((k) => {
                const good = (k.delta >= 0) === k.positiveIsGood;
                return (
                  <div key={k.key} className={styles.metric}>
                    <span className={styles.metricLabel}>{k.label}</span>
                    <span className={styles.metricValue}>{k.value}</span>
                    <span className={`${styles.metricDelta} ${good ? styles.up : styles.down}`}>{k.delta >= 0 ? "↑" : "↓"} {Math.abs(k.delta).toFixed(1)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <p className={styles.foot}>Sample data, wired live to every metric on this page · <code>analytics-data.ts</code></p>
      </div>
    </main>
  );
}
