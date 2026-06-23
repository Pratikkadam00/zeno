/* Zeno — Paywall / Plans (shown only after value: hitting a limit or a Pro tool). */
function PaywallScreen({ onClose, reason }) {
  const [plan, setPlan] = React.useState("annual");
  const features = [
    "Unlimited subscriptions",
    "Ongoing auto-discovery (repeat scans)",
    "Full analytics & insights engine",
    "AI Spend Coach + Spend Twin",
    "Year in Review & widgets",
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface-card)" }}>
      <ScreenHeader title="" right={<IconButton label="Close" onClick={onClose}><Icon name="x" size={22} /></IconButton>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
        <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="sparkles" size={26} color="var(--accent-text)" />
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "16px 0 6px" }}>Zeno Pro</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", margin: "0 0 22px" }}>
          {reason || "You've felt the value — here's everything Pro unlocks."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 22 }}>
          {features.map(f => (
            <div key={f} style={{ display: "flex", alignItems: "center", gap: 11 }}>
              <span style={{ width: 22, height: 22, flex: "none", borderRadius: "50%", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="check" size={14} color="var(--accent-text)" strokeWidth={3} /></span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-primary)" }}>{f}</span>
            </div>
          ))}
        </div>

        {[["annual","Annual","$39.99/yr","Save 33% · 7-day free trial"],["monthly","Monthly","$4.99/mo","Billed monthly"]].map(([id, t, price, note]) => {
          const on = plan === id;
          return (
            <button key={id} onClick={() => setPlan(id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: on ? "var(--accent-soft)" : "var(--surface-card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border-default)"}`, borderRadius: "var(--radius-lg)", padding: "14px 16px", cursor: "pointer", marginBottom: 10 }}>
              <span style={{ width: 20, height: 20, flex: "none", borderRadius: "50%", border: `2px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{t}</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)" }}>{note}</div>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{price}</span>
            </button>
          );
        })}
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", margin: "8px 0 0" }}>Restore purchases · Terms · Privacy</p>
      </div>
      <div style={{ flex: "none", padding: "12px 24px 28px", borderTop: "1px solid var(--border-subtle)" }}>
        <Button variant="primary" size="lg" fullWidth onClick={onClose}>{plan === "annual" ? "Start 7-day free trial" : "Subscribe"}</Button>
      </div>
    </div>
  );
}
window.PaywallScreen = PaywallScreen;
