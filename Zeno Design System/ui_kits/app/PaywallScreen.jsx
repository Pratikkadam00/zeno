/* Zeno — Paywall: proud, not pushy. True Pro gates only (unlimited past 10,
   category budgets, envelopes). Free tier listed FIRST as a flex. Real prices.
   No fake urgency, no guilt decline, nothing pre-selected but the honest default.
   SLOP AUDIT — ① Zeno: pricing as ledger lines; "free forever" printed above
   the paid tiers; lifetime framed as the defiant option. ② Tempted by:
   feature-checkmark wall + SAVE 40% ribbon → honest computed save note.
   ③ Lazy: gradient hero + social proof carousel + guilt decline. */
function PaywallScreen({ onClose, reason }) {
  const [plan, setPlan] = React.useState("annual");
  const [done, setDone] = React.useState(false);

  const plans = [
    { id: "monthly", label: "Monthly", price: "$3.99", meta: "/mo" },
    { id: "annual", label: "Annual", price: "$29.99", meta: "/yr", note: "SAVE 37% VS MONTHLY" },
    { id: "lifetime", label: "Lifetime", price: "$79.99", meta: "once", note: "ONCE. EVER. — YNAB IS $109 EVERY YEAR" },
    { id: "family", label: "Family", price: "$6.99", meta: "/mo", note: "UP TO 5 PEOPLE" },
  ];

  if (done) {
    return (
      <Sheet title="" onClose={onClose} footer={<Button variant="primary" size="lg" fullWidth onClick={onClose}>Back to the ledger</Button>}>
        <div style={{ textAlign: "center", padding: "40px 0 8px" }}>
          <Stamp animate size="lg" angle={-5} sub="7-DAY TRIAL · CANCEL ANYTIME">Pro — Paid</Stamp>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.55, margin: "18px auto 0", maxWidth: "30ch" }}>
          Thank you. Unlimited entries, category budgets and envelopes are open. Cancelling is one tap in Settings — we mean it.
        </p>
      </Sheet>
    );
  }

  return (
    <Sheet title="ZENO PRO" onClose={onClose}
      footer={
        <div>
          <Button variant="money" size="lg" fullWidth onClick={() => setDone(true)}>Start 7-day free trial</Button>
          <button onClick={onClose} style={{ display: "block", width: "100%", background: "none", border: "none", padding: "12px 0 0", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, color: "var(--text-tertiary)", cursor: "pointer" }}>Not now</button>
        </div>
      }>
      {reason && <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", margin: "6px 0 0", lineHeight: 1.5 }}>{reason}</p>}

      <SectionHead pad="18px 0 8px">Free forever — already yours</SectionHead>
      <div style={{ paddingBottom: 2 }}>
        {["10 tracked subscriptions", "Renewal & trial alerts", "Cancel guides + verification", "Insights & the Spend Coach"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
            <Icon name="check" size={14} color="var(--text-tertiary)" />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)" }}>{f}</span>
          </div>
        ))}
      </div>

      <SectionHead pad="18px 0 8px">Pro adds</SectionHead>
      <div>
        {["Unlimited subscriptions", "Category budgets", "Envelope budgeting"].map(f => (
          <div key={f} style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
            <Icon name="check" size={15} color="var(--accent-text)" strokeWidth={2.6} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 650, color: "var(--text-primary)" }}>{f}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "5px 0" }}>
          <Icon name="shield-check" size={15} color="var(--accent-text)" />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)" }}>No bank login, ever.</span>
        </div>
      </div>

      <SectionHead pad="18px 0 8px">Pick a plan</SectionHead>
      <div>
        {plans.map(p => {
          const on = plan === p.id;
          return (
            <button key={p.id} onClick={() => setPlan(p.id)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: on ? "var(--surface-card)" : "none", border: "none", borderBottom: "1px solid var(--rule)", borderLeft: `3px solid ${on ? "var(--accent)" : "transparent"}`, padding: "13px 10px", cursor: "pointer", minHeight: 52 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: on ? 750 : 600, fontSize: 15, color: "var(--text-primary)" }}>{p.label}</span>
                {p.note && <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: p.id === "lifetime" ? "var(--accent-text)" : "var(--text-tertiary)", marginTop: 3 }}>{p.note}</span>}
              </span>
              <span aria-hidden="true" style={{ flex: "none", width: 30, borderBottom: "2px dotted var(--rule-strong)" }}></span>
              <span style={{ flex: "none", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15.5, color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>
                {p.price}<span style={{ fontSize: 10.5, fontWeight: 500, color: "var(--text-tertiary)" }}> {p.meta}</span>
              </span>
            </button>
          );
        })}
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-tertiary)", margin: "14px 0 0", textAlign: "center" }}>
        Prices from the App Store at purchase time. Restore purchases · Terms · Privacy
      </p>
    </Sheet>
  );
}
window.PaywallScreen = PaywallScreen;
