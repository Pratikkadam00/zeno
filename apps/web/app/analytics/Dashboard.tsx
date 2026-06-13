"use client";

import { useMemo, useState } from "react";
import { AreaChart, DivergingBars, Donut, Sparkline } from "./charts";
import styles from "./analytics.module.css";
import {
  accentHex,
  AS_OF_LABEL,
  fmtMoney,
  fmtNum,
  fmtPct,
  getChannels,
  getCohorts,
  getGeography,
  getKpis,
  getMrrMovement,
  getPlanBreakdown,
  getRangeData,
  getTopServices,
  getTransactions,
  PAL,
  RANGES,
  relativeTime,
  type RangeKey,
  type Txn
} from "./analytics-data";

type SortKey = "user" | "plan" | "amount" | "status" | "minutesAgo";

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("30D");
  const [showCompare, setShowCompare] = useState(true);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "minutesAgo", dir: 1 });

  const data = useMemo(() => getRangeData(range), [range]);
  const kpis = useMemo(() => getKpis(range), [range]);
  const movement = useMemo(() => getMrrMovement(range), [range]);
  const plans = useMemo(() => getPlanBreakdown(), []);
  const channels = useMemo(() => getChannels(), []);
  const geo = useMemo(() => getGeography(), []);
  const services = useMemo(() => getTopServices(), []);
  const cohorts = useMemo(() => getCohorts(), []);
  const txns = useMemo(() => getTransactions(), []);

  const netMovement = movement.reduce((s, m) => s + m.value, 0);
  const moveMax = Math.max(...movement.map((m) => Math.abs(m.value)), 1);

  const sortedTxns = useMemo(() => {
    const copy = [...txns];
    copy.sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
    return copy;
  }, [txns, sort]);

  function toggleSort(key: SortKey) {
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));
  }

  const servicesMax = Math.max(...services.map((s) => s.tracked));

  return (
    <main className={styles.shell}>
      <div className={styles.bg} aria-hidden>
        <span className={`${styles.amesh} ${styles.ameshA}`} />
        <span className={`${styles.amesh} ${styles.ameshB}`} />
        <span className={`${styles.amesh} ${styles.ameshC}`} />
      </div>
      <div className={styles.inner}>
        <div className={styles.glowTop} />
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLead}>
            <span className={styles.eyebrow}><span className={styles.eyebrowDot} />Growth analytics</span>
            <h1 className={styles.title}>Revenue &amp; <span className={styles.titleGrad}>growth.</span></h1>
            <p className={styles.lead}>
              The live numbers behind Zeno — MRR, retention, churn and acquisition, wired to one source.
              <br />
              <span className={styles.live}><span className={styles.liveDot} />Live</span>
              {"  ·  "}as of <span className={styles.asOf}>{AS_OF_LABEL}</span>
            </p>
          </div>
          <div className={styles.rangeToggle} role="tablist" aria-label="Time range">
            {RANGES.map((r) => (
              <button
                key={r.key}
                role="tab"
                aria-selected={range === r.key}
                className={`${styles.rangeBtn} ${range === r.key ? styles.rangeBtnActive : ""}`}
                onClick={() => setRange(r.key)}
              >
                {r.key}
              </button>
            ))}
          </div>
        </header>

        {/* KPI grid */}
        <section className={styles.kpiGrid}>
          {kpis.map((k, i) => {
            const good = k.delta >= 0 === k.positiveIsGood;
            return (
              <article
                key={k.key}
                className={styles.kpiCard}
                style={{ ["--kpi-accent" as string]: accentHex[k.accent], animationDelay: `${i * 45}ms` }}
              >
                <div className={styles.kpiTop}>
                  <span className={styles.kpiLabel}>{k.label}</span>
                  <span className={`${styles.kpiDelta} ${good ? styles.deltaUp : styles.deltaDown}`}>
                    {k.delta >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(k.delta))}
                  </span>
                </div>
                <div className={styles.kpiValue}>{k.value}</div>
                <div className={styles.kpiSpark}>
                  <Sparkline values={k.spark} color={accentHex[k.accent]} />
                </div>
              </article>
            );
          })}
        </section>

        {/* Revenue + MRR movement */}
        <section className={styles.grid2}>
          <article className={styles.card} style={{ animationDelay: "120ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>Revenue over time</div>
                <div className={styles.cardSub}>Gross processed · {RANGES.find((r) => r.key === range)!.label}</div>
              </div>
              <div className={styles.legendToggles}>
                <button className={styles.toggle} data-on={showCompare} onClick={() => setShowCompare((v) => !v)}>
                  <span className={styles.toggleDash} /> Prev period
                </button>
              </div>
            </div>
            <AreaChart
              points={data.revenue}
              compare={data.revenuePrev}
              showCompare={showCompare}
              color={PAL.blue}
              gradientId="revGrad"
              formatValue={(v) => fmtMoney(v, { compact: true })}
            />
          </article>

          <article className={styles.card} style={{ animationDelay: "160ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>MRR movement</div>
                <div className={styles.cardSub}>Net new recurring revenue</div>
              </div>
            </div>
            <div className={styles.moveList}>
              {movement.map((m, i) => {
                const color = m.kind === "new" ? PAL.emerald : m.kind === "expansion" ? PAL.cyan : m.kind === "contraction" ? PAL.amber : PAL.rose;
                return (
                  <div key={m.label} className={styles.moveRow}>
                    <span className={styles.moveLabel}>{m.label}</span>
                    <div className={styles.moveTrack}>
                      <div
                        className={styles.moveFill}
                        style={{ width: `${(Math.abs(m.value) / moveMax) * 100}%`, background: color, animationDelay: `${i * 80}ms` }}
                      />
                    </div>
                    <span className={styles.moveVal} style={{ color }}>
                      {m.value >= 0 ? "+" : "−"}{fmtMoney(Math.abs(m.value), { compact: true })}
                    </span>
                  </div>
                );
              })}
              <div className={styles.moveNet}>
                <span className={styles.moveNetLabel}>Net MRR added</span>
                <span className={styles.moveNetVal} style={{ color: netMovement >= 0 ? PAL.emerald : PAL.rose }}>
                  {netMovement >= 0 ? "+" : "−"}{fmtMoney(Math.abs(netMovement), { compact: true })}
                </span>
              </div>
            </div>
          </article>
        </section>

        {/* User growth + plan donut */}
        <section className={styles.grid2}>
          <article className={styles.card} style={{ animationDelay: "180ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>Subscriber growth</div>
                <div className={styles.cardSub}>New vs. churned per bucket</div>
              </div>
              <div>
                <div className={styles.cardBig}>{fmtNum(data.activeUsers[data.activeUsers.length - 1]?.value ?? 0, true)}</div>
                <div className={styles.cardBigSub}>active subscribers</div>
              </div>
            </div>
            <DivergingBars newUsers={data.newUsers} churned={data.churnedUsers} />
          </article>

          <article className={styles.card} style={{ animationDelay: "220ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>Revenue by plan</div>
                <div className={styles.cardSub}>Monthly recurring</div>
              </div>
            </div>
            <Donut
              data={plans.map((p) => ({ label: p.plan, value: p.revenue, color: p.color }))}
              centerLabel="Total MRR"
              formatValue={(v) => fmtMoney(v, { compact: true })}
            />
          </article>
        </section>

        {/* Channels / Geography / Services */}
        <section className={styles.grid3}>
          <article className={styles.card} style={{ animationDelay: "240ms" }}>
            <div className={styles.cardHead}><div><div className={styles.cardTitle}>Acquisition channels</div><div className={styles.cardSub}>New users by source</div></div></div>
            <div className={styles.rankList}>
              {channels.map((c, i) => (
                <div key={c.name} className={styles.rankRow}>
                  <span className={styles.rankName}>{c.name}</span>
                  <span className={styles.rankVal}>{fmtNum(c.users, true)} · {c.pct.toFixed(0)}%</span>
                  <div className={styles.rankTrack}><div className={styles.rankFill} style={{ width: `${c.pct}%`, animationDelay: `${i * 60}ms` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card} style={{ animationDelay: "280ms" }}>
            <div className={styles.cardHead}><div><div className={styles.cardTitle}>Top geographies</div><div className={styles.cardSub}>Subscribers by country</div></div></div>
            <div className={styles.rankList}>
              {geo.map((g, i) => (
                <div key={g.country} className={styles.rankRow}>
                  <span className={styles.rankName}><span className={styles.rankFlag}>{g.flag}</span>{g.country}</span>
                  <span className={styles.rankVal}>{g.pct.toFixed(1)}%</span>
                  <div className={styles.rankTrack}><div className={`${styles.rankFill} ${styles.rankFillAlt}`} style={{ width: `${g.pct * 4}%`, animationDelay: `${i * 60}ms` }} /></div>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.card} style={{ animationDelay: "320ms" }}>
            <div className={styles.cardHead}><div><div className={styles.cardTitle}>Most-tracked services</div><div className={styles.cardSub}>Across all users</div></div></div>
            <div className={styles.rankList}>
              {services.map((s, i) => (
                <div key={s.name} className={styles.rankRow}>
                  <span className={styles.rankName}>{s.name}</span>
                  <span className={styles.rankVal}>{fmtNum(s.tracked, true)}</span>
                  <div className={styles.rankTrack}><div className={styles.rankFill} style={{ width: `${(s.tracked / servicesMax) * 100}%`, animationDelay: `${i * 50}ms` }} /></div>
                </div>
              ))}
            </div>
          </article>
        </section>

        {/* Cohort retention */}
        <section className={styles.grid2} style={{ gridTemplateColumns: "1fr" }}>
          <article className={styles.card} style={{ animationDelay: "340ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>Cohort retention</div>
                <div className={styles.cardSub}>% of each signup cohort still subscribed, by months since signup</div>
              </div>
            </div>
            <div className={styles.cohortScroll}>
              <table className={styles.cohortTable}>
                <thead>
                  <tr>
                    <th className={styles.cohortHeadCell}>Cohort</th>
                    {Array.from({ length: 6 }, (_, i) => <th key={i}>M{i}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.label}>
                      <td className={styles.cohortHeadCell}>
                        <div className={styles.cohortLabel}>{c.label}</div>
                        <div className={styles.cohortSize}>{fmtNum(c.size)} users</div>
                      </td>
                      {Array.from({ length: 6 }, (_, i) => {
                        const v = c.retention[i];
                        if (v === undefined) return <td key={i}><div className={`${styles.cohortCell} ${styles.cohortEmpty}`} /></td>;
                        const alpha = 0.16 + (v / 100) * 0.84;
                        return (
                          <td key={i}>
                            <div className={styles.cohortCell} style={{ background: `rgba(52, 211, 153, ${alpha})`, color: v > 55 ? "#04110c" : "#cdeee0" }}>
                              {v}%
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        {/* Transactions */}
        <section className={styles.grid2} style={{ gridTemplateColumns: "1fr" }}>
          <article className={styles.card} style={{ animationDelay: "360ms" }}>
            <div className={styles.cardHead}>
              <div>
                <div className={styles.cardTitle}>Recent transactions</div>
                <div className={styles.cardSub}>{txns.length} latest billing events · click a header to sort</div>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <Th label="Customer" k="user" sort={sort} onSort={toggleSort} />
                    <Th label="Plan" k="plan" sort={sort} onSort={toggleSort} />
                    <Th label="Amount" k="amount" sort={sort} onSort={toggleSort} />
                    <Th label="Status" k="status" sort={sort} onSort={toggleSort} />
                    <Th label="When" k="minutesAgo" sort={sort} onSort={toggleSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedTxns.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <div className={styles.txnUser}>
                          <span className={styles.txnName}>{t.flag} {t.user}</span>
                          <span className={styles.txnEmail}>{t.email}</span>
                        </div>
                      </td>
                      <td><span className={styles.planPill}>{t.plan}</span></td>
                      <td><span className={styles.txnAmount}>{t.amount === 0 ? "—" : fmtMoney(t.amount, { cents: true })}</span></td>
                      <td><StatusCell status={t.status} /></td>
                      <td><span className={styles.txnTime}>{relativeTime(t.minutesAgo)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>

        <p className={styles.footnote}>
          Zeno Growth Analytics · figures are deterministic sample data generated in <code>analytics-data.ts</code>, wired to every chart, KPI and table on this page.
        </p>
      </div>
    </main>
  );
}

function Th({ label, k, sort, onSort }: { label: string; k: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (k: SortKey) => void }) {
  return (
    <th onClick={() => onSort(k)}>
      {label}
      {sort.key === k ? <span className={styles.sortCaret}>{sort.dir === 1 ? "↑" : "↓"}</span> : null}
    </th>
  );
}

function StatusCell({ status }: { status: Txn["status"] }) {
  const map = {
    succeeded: { cls: styles.stSucceeded, dot: PAL.emerald, label: "Succeeded" },
    refunded: { cls: styles.stRefunded, dot: PAL.amber, label: "Refunded" },
    failed: { cls: styles.stFailed, dot: PAL.rose, label: "Failed" },
    trial: { cls: styles.stTrial, dot: PAL.cyan, label: "Trial" }
  }[status];
  return (
    <span className={`${styles.statusPill} ${map.cls}`}>
      <span className={styles.statusDot} style={{ background: map.dot }} />
      {map.label}
    </span>
  );
}
