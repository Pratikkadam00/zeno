/* Zeno — End-of-month budget recap. Connects budget adherence to history / Wrapped. */
function BudgetRecapScreen({ onClose }) {
  const B = window.ZENO.budget;
  const r = B.recap;
  const under = r.actual <= r.cap;
  const diff = Math.abs(r.cap - r.actual);
  const max = Math.max(...B.trend.map(t => t[1]), r.cap);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface-sunken)" }}>
      <ScreenHeader title={`${r.month} recap`} right={<IconButton label="Close" onClick={onClose}><Icon name="x" size={22} /></IconButton>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 20px" }}>
        {/* Verdict hero */}
        <div style={{ background: under ? "var(--accent)" : "var(--ink-900)", borderRadius: "var(--radius-2xl)", padding: "26px 22px", textAlign: "center", color: under ? "var(--ink-900)" : "#fff", boxShadow: under ? "var(--shadow-accent)" : "var(--shadow-lg)" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: under ? "rgba(10,42,28,0.18)" : "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Icon name={under ? "party-popper" : "triangle-alert"} size={28} color={under ? "var(--ink-900)" : "var(--danger)"} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em" }}>
            {under ? "You stayed under!" : "You went over"}
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, marginTop: 6, opacity: 0.85 }}>
            {under ? `$${diff.toFixed(2)} under your $${r.cap} cap in ${r.month}.` : `$${diff.toFixed(2)} over your $${r.cap} cap in ${r.month}.`}
          </div>
          {under && r.streak > 1 && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 14, padding: "5px 12px", borderRadius: "var(--radius-pill)", background: "rgba(10,42,28,0.16)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 700 }}>
              <Icon name="flame" size={14} color="var(--ink-900)" /> {r.streak}-month streak
            </div>
          )}
        </div>

        {/* Cap vs actual */}
        <Card padding="md" style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <Stat label="Budget" value={`$${r.cap.toFixed(0)}`} />
            <Stat label="Actual" value={`$${r.actual.toFixed(2)}`} accent={under} />
            <Stat label="vs Apr" value={`${r.actual < r.prevActual ? "−" : "+"}$${Math.abs(r.actual - r.prevActual).toFixed(2)}`} />
          </div>
          {/* trend bars w/ cap line */}
          <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 8, height: 90, marginTop: 8, paddingTop: 6 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: `${6 + (1 - r.cap / max) * 84}px`, borderTop: "1.5px dashed var(--border-strong)" }}>
              <span style={{ position: "absolute", right: 0, top: -8, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-tertiary)", background: "var(--surface-card)", padding: "0 3px" }}>cap</span>
            </div>
            {B.trend.map(([m, v], i) => {
              const last = i === B.trend.length - 1;
              return (
                <div key={m} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, zIndex: 1 }}>
                  <div style={{ width: "100%", maxWidth: 26, height: `${(v / max) * 84}px`, background: v > r.cap ? "var(--danger)" : last ? "var(--accent)" : "var(--accent-soft-2)", borderRadius: "var(--radius-sm)" }} />
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 10.5, color: "var(--text-tertiary)" }}>{m}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "12px 14px", background: "var(--accent-soft)", borderRadius: "var(--radius-md)" }}>
          <Icon name="gift" size={17} color="var(--accent-text)" />
          <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)" }}>Budget adherence rolls into your Year in Review.</span>
          <Badge tone="pro" style={{ background: "#e9e9f2", color: "#43417a" }}>Pro</Badge>
        </div>
      </div>
      <div style={{ flex: "none", padding: "12px 16px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
        <Button variant="primary" size="lg" fullWidth onClick={onClose}>Done</Button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17, color: accent ? "var(--accent-text)" : "var(--text-primary)" }}>{value}</div>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
    </div>
  );
}
window.BudgetRecapScreen = BudgetRecapScreen;
window.Stat = Stat;
