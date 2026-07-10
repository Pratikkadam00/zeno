/* Zeno — Budget recap: the month, stamped. Streak = tally marks.
   SLOP AUDIT — ① Zeno: stamp verdict + tally-mark streak + cap rule on the
   trend. ② Tempted by: confetti "you did it!" → the stamp is the celebration.
   ③ Lazy: green banner + bar chart card. */
function BudgetRecapScreen({ onClose }) {
  const B = window.ZENO.budget;
  const r = B.recap;
  const under = r.actual <= r.cap;
  const diff = Math.abs(r.cap - r.actual);
  const max = Math.max(...B.trend.map(t => t[1]), r.cap);

  return (
    <Sheet title="MAY — CLOSED" onClose={onClose}
      footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>Done</Button>}>
      <div style={{ textAlign: "center", padding: "34px 0 6px" }}>
        <Stamp animate size="lg" angle={-5} tone={under ? "verified" : "alert"} sub={`CAP $${r.cap} · SPENT $${r.actual.toFixed(2)}`}>
          {under ? "Under budget" : "Over budget"}
        </Stamp>
      </div>
      {/* streak as tally marks */}
      {under && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, margin: "20px 0 4px" }}>
          <span style={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
            {Array.from({ length: r.streak }, (_, i) => (
              <span key={i} style={{ width: 3, height: 18, background: "var(--stamp-verified)", transform: i === 3 ? "rotate(-24deg) translateX(-7px)" : "none" }}></span>
            ))}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--text-secondary)" }}>{r.streak} MONTHS RUNNING</span>
        </div>
      )}
      <div style={{ borderTop: "1px solid var(--rule-strong)", marginTop: 18 }}>
        <LedgerLine label="The cap" value={`$${r.cap.toFixed(2)}`} />
        <LedgerLine label="Actually spent" strong value={`$${r.actual.toFixed(2)}`} valueColor={under ? "var(--stamp-verified)" : "var(--stamp-alert)"} />
        <LedgerLine label="Margin" value={`${under ? "−" : "+"}$${diff.toFixed(2)}`} />
        <LedgerLine label="vs April" value={`${r.actual < r.prevActual ? "▼" : "▲"} $${Math.abs(r.actual - r.prevActual).toFixed(2)}`} />
      </div>
      {/* trend with the cap rule */}
      <SectionHead pad="20px 0 10px">Six months vs the cap</SectionHead>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8, height: 92, paddingTop: 6 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: `${6 + (1 - r.cap / max) * 80}px`, borderTop: "2px dashed var(--ink-400)", zIndex: 1 }}>
          <span style={{ position: "absolute", right: 0, top: -14, fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>CAP ${r.cap}</span>
        </div>
        {B.trend.map(([m, v]) => (
          <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5 }}>
            <div style={{ width: "100%", maxWidth: 24, height: `${(v / max) * 80}px`, background: v > r.cap ? "var(--stamp-alert)" : "var(--rule-strong)" }}></div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.1em", color: "var(--text-tertiary)" }}>{m.toUpperCase()}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1.5px solid var(--rule-strong)" }}></div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 14 }}>
        Every closed month is stamped into your Year in Review.
      </p>
    </Sheet>
  );
}
window.BudgetRecapScreen = BudgetRecapScreen;
