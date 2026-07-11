/* Zeno — Insights: the audit page. Ink bar chart, category rules, savings
   ledger, tools row (ALL FREE per legal — coach/insights are not Pro).
   SLOP AUDIT — ① Zeno: chart bars sit ON the baseline rule; categories are
   LedgerLines with inline tick bars; tools are rule-framed, not cards.
   ② Tempted by: donut chart + Pro-locked tool grid → rules + honest free
   labels. ③ Lazy: card grid of stats with a pie chart. */
function InsightsScreen({ onBudget, onCoach, onTwin, onWrapped, onWidgets }) {
  const Z = window.ZENO;
  const max = Math.max(...Z.trend.map(t => t[1]));
  const total = Z.monthlyTotal;
  const catTotal = Z.categories.reduce((a, c) => a + c.spent, 0);
  const B = Z.budget;
  const over = B.projected > B.cap, approaching = !over && B.projected > 0.85 * B.cap;

  const tools = [
    { icon: "pen-line", label: "Spend Coach", sub: "FREE", go: onCoach },
    { icon: "scale", label: "Spend Twin", sub: "FREE", go: onTwin },
    { icon: "book-marked", label: "Year in Review", sub: "FREE", go: onWrapped },
    { icon: "layout-grid", label: "Widgets & Watch", sub: "PREVIEW", go: onWidgets },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <Masthead kicker="THE AUDIT" title="Insights" />

      {/* Budget line first — forward-looking */}
      <div style={{ padding: "12px 20px 0" }}>
        <LedgerLine onClick={onBudget} strong label="Budget" sub={`FORECAST $${B.projected.toFixed(2)} / CAP $${B.cap}`}
          value={over ? "OVER" : approaching ? "CLOSE" : "ON PACE"}
          valueColor={over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)"} />
      </div>

      {/* Trend — ink bars on a baseline rule */}
      <SectionHead>Six months</SectionHead>
      <div style={{ padding: "4px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
          {Z.trend.map(([m, v], i) => {
            const last = i === Z.trend.length - 1;
            return (
              <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                {last && <span className="zn-print" style={{ animationDelay: `${i * 55 + 340}ms`, fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, color: "var(--accent-text)" }}>${v.toFixed(0)}</span>}
                <div style={{ width: "100%", maxWidth: 26, height: `${(v / max) * 80}px`, background: last ? "var(--text-primary)" : "var(--rule-strong)", borderRadius: "3px 3px 0 0", transformOrigin: "bottom", animation: `zn-rise 0.5s var(--ease-out) ${i * 55}ms both` }}></div>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: last ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: last ? 700 : 500 }}>{m.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        <div style={{ borderTop: "1.5px solid var(--rule-strong)", marginTop: 0 }}></div>
        <LedgerLine label="This month" strong value={`$${total.toFixed(2)}`} />
      </div>

      {/* Categories — ledger lines with tick bars */}
      <SectionHead>Where it goes</SectionHead>
      <div style={{ padding: "0 20px" }}>
        {Z.categories.map((c, i) => (
          <div key={c.category} style={{ padding: "2px 0 8px", borderBottom: "1px solid var(--rule)" }}>
            <LedgerLine
              label={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ width: 10, height: 3, background: `var(--cat-${c.cat})` }}></span>{c.category}</span>}
              sub={`${Math.round((c.spent / catTotal) * 100)}%`}
              value={`$${c.spent.toFixed(2)}`} style={{ padding: "5px 0 3px" }} />
            <div style={{ height: 3, background: "var(--surface-sunken)" }}>
              <div style={{ width: `${(c.spent / catTotal) * 100}%`, height: "100%", background: `var(--cat-${c.cat})`, transformOrigin: "left", animation: `zn-grow-x 0.5s var(--ease-out) ${i * 70 + 150}ms both` }}></div>
            </div>
          </div>
        ))}
      </div>

      {/* Savings flags */}
      <SectionHead>Ways to save</SectionHead>
      <div style={{ padding: "0 20px" }}>
        {Z.insights.map((ins, i) => (
          <div key={ins.id} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", gap: 12, alignItems: "flex-start", padding: "11px 0", borderBottom: "1px solid var(--rule)" }}>
            <Icon name={ins.icon} size={17} color="var(--text-secondary)" style={{ marginTop: 2, flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{ins.title}</span>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2 }}>{ins.body}</span>
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent-text)" }}>+${ins.save}/yr</span>
          </div>
        ))}
      </div>

      {/* Tools — all free, honestly labeled */}
      <SectionHead>Tools</SectionHead>
      <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {tools.map(t => (
          <button key={t.label} onClick={t.go} style={{ textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-sm)", padding: "13px 14px", cursor: "pointer", minHeight: 44 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Icon name={t.icon} size={19} color="var(--text-secondary)" />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: t.sub === "PREVIEW" ? "var(--text-tertiary)" : "var(--accent-text)" }}>{t.sub}</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 13.5, color: "var(--text-primary)", marginTop: 10 }}>{t.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
window.InsightsScreen = InsightsScreen;
