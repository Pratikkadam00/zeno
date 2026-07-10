/* Zeno — Calendar: the renewal register. Month grid with renewal ticks
   (solid=renewal, hollow=trial, red=hike), day rows grouped by week.
   SLOP AUDIT — ① Zeno: tick marks under dates (not dots), ledger rows with
   date column, caps week heads. ② Tempted by: stat-card trio → one ledger
   summary block. ③ Lazy: dots-on-calendar + card list. */
function CalendarScreen({ onOpen }) {
  const Z = window.ZENO;
  const subs = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const [sel, setSel] = React.useState(null);
  // July 2026: 1st = Wednesday. Renewal days from data (Jul only).
  const marks = {}; // day → [{type}]
  subs.forEach(s => {
    const m = /Jul (\d+)/.exec(s.next);
    if (m) (marks[+m[1]] = marks[+m[1]] || []).push(s.status === "trial" ? "trial" : (s.priceHike ? "hike" : "renew"));
  });
  const monthTotal = subs.reduce((a, s) => a + s.amount, 0);
  const week = subs.filter(s => { const m = /Jul (\d+)/.exec(s.next); return m && +m[1] <= 17; });
  const weekTotal = week.reduce((a, s) => a + s.amount, 0);

  const tickColor = { renew: "var(--text-secondary)", trial: "var(--warning)", hike: "var(--stamp-alert)" };

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <Masthead kicker="RENEWAL REGISTER" title="July 2026"
        right={<IconButton label="Filter"><Icon name="sliders-horizontal" size={19} /></IconButton>} />

      {/* Month grid */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <div key={i} style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "var(--text-tertiary)", paddingBottom: 6 }}>{d}</div>
          ))}
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 1; // Jul 1 = Wednesday → index 2
            const valid = day >= 1 && day <= 31;
            const today = day === 10;
            const dayMarks = marks[day] || [];
            return (
              <button key={i} onClick={() => valid && dayMarks.length && setSel(day)} style={{ height: 44, background: today ? "var(--text-primary)" : "none", border: sel === day ? "1.5px solid var(--accent)" : "1px solid transparent", borderRadius: 6, cursor: valid && dayMarks.length ? "pointer" : "default", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3 }}>
                {valid && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, fontWeight: today ? 700 : 500, color: today ? "var(--bg-app)" : "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>{day}</span>}
                <span style={{ display: "flex", gap: 2, height: 3 }}>
                  {dayMarks.slice(0, 3).map((t, j) => (
                    <span key={j} style={{ width: 8, height: 3, background: t === "trial" ? "transparent" : tickColor[t], border: t === "trial" ? `1px solid ${tickColor[t]}` : "none" }}></span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, paddingBottom: 12, borderBottom: "1px solid var(--rule-strong)" }}>
          {[["renew", "RENEWAL"], ["trial", "TRIAL ENDS"], ["hike", "PRICE ROSE"]].map(([t, l]) => (
            <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: "var(--text-tertiary)" }}>
              <span style={{ width: 9, height: 3, background: t === "trial" ? "transparent" : tickColor[t], border: t === "trial" ? `1px solid ${tickColor[t]}` : "none" }}></span>{l}
            </span>
          ))}
        </div>
        <LedgerLine label="This month" value={`$${monthTotal.toFixed(2)}`} />
        <LedgerLine label="Next 7 days" sub={`${week.length} RENEWALS`} value={`$${weekTotal.toFixed(2)}`} />
        <LedgerLine label="Projected year" value={`$${(monthTotal * 12).toFixed(0)}`} />
      </div>

      <SectionHead>{sel ? `July ${sel}` : "Coming up"}</SectionHead>
      <div style={{ padding: "0 6px" }}>
        {(sel ? subs.filter(s => new RegExp(`Jul ${sel}$`).test(s.next)) : subs).map((s, i, arr) => (
          <div key={s.id} className="zn-print" style={{ animationDelay: `${i * 45}ms` }}>
            <ListRow divider={i < arr.length - 1}
              leading={
                <span style={{ width: 40, textAlign: "center", flex: "none" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", lineHeight: 1 }}>{(/\d+/.exec(s.next) || ["—"])[0]}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginTop: 2 }}>JUL</span>
                </span>
              }
              title={s.name}
              subtitle={s.status === "trial" ? "TRIAL → PAID" : s.category.toUpperCase()}
              amount={`$${s.amount.toFixed(2)}`}
              onClick={() => onOpen(s.id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
window.CalendarScreen = CalendarScreen;
