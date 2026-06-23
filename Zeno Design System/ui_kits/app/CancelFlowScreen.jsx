/* Zeno — Cancel + verification flow (CHANGE 4)
   Guided → Pending verification → Verified cancelled OR Still being charged.
   A demo control on the pending step lets you see both resolutions. */
function CancelFlowScreen({ id, onClose, onDone }) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const yearly = (s.amount * 12).toFixed(2);
  const [stage, setStage] = React.useState("guided"); // guided | pending | verified | charged

  // Difficulty varies by service (demo): Adobe hard, others medium/easy
  const difficulty = s.id === "adobe" ? ["Hard", 3, "var(--danger)"] : s.id === "hbo" ? ["Medium", 2, "var(--warning)"] : ["Easy", 1, "var(--success)"];

  const steps = [
    `Sign in to ${s.name} in a browser`,
    "Open Account → Subscription or Plan",
    "Choose Cancel and confirm",
    "Keep the confirmation email",
  ];

  if (stage === "guided") {
    return (
      <Sheet title={`Cancel ${s.name}`} onClose={onClose}
        footer={<Button variant="primary" size="lg" fullWidth onClick={() => setStage("pending")}>I cancelled it</Button>}>
        {/* Difficulty */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", marginBottom: 14, boxShadow: "var(--shadow-xs)" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)" }}>Cancellation difficulty</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: difficulty[2], marginTop: 2 }}>{difficulty[0]}</div>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            {[1,2,3].map(n => <span key={n} style={{ width: 10, height: 24, borderRadius: 3, background: n <= difficulty[1] ? difficulty[2] : "var(--surface-sunken)" }} />)}
          </div>
        </div>

        {/* Steps */}
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", margin: "4px 2px 10px" }}>Step by step</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {steps.map((st, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0" }}>
              <span style={{ width: 24, height: 24, flex: "none", borderRadius: "50%", background: "var(--ink-900)", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", paddingTop: 2 }}>{st}</span>
            </div>
          ))}
        </div>

        <Button variant="secondary" size="lg" fullWidth onClick={() => {}} leftIcon={<Icon name="external-link" size={18} />} style={{ marginTop: 16 }}>
          Open {s.name} cancellation page
        </Button>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 16, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", lineHeight: 1.45 }}>
          <Icon name="info" size={15} color="var(--text-tertiary)" style={{ marginTop: 1 }} />
          <span>We'll never mark this cancelled until we've confirmed the charge actually stopped.</span>
        </div>
      </Sheet>
    );
  }

  if (stage === "pending") {
    return (
      <Sheet title="Pending verification" onClose={onDone}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "30px 14px 10px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--info-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="clock" size={30} color="var(--info)" />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 21, color: "var(--text-primary)" }}>We're verifying it stopped</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5, margin: "8px 0 0", maxWidth: "32ch" }}>
            {s.name} is marked <b>pending verification</b>. Zeno will re-check your next receipt and statement around {s.next}. We won't call it cancelled until we're sure.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", margin: "20px 0", boxShadow: "var(--shadow-xs)" }}>
          {[["Cancellation reported", true],["Re-check next receipt", false],["Confirm no charge", false]].map(([t, done]) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={done ? "check-circle" : "circle"} size={18} color={done ? "var(--success)" : "var(--border-strong)"} />
              <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: done ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: done ? 600 : 400 }}>{t}</span>
            </div>
          ))}
        </div>

        <Button variant="primary" size="lg" fullWidth onClick={onDone}>Got it</Button>

        {/* Demo affordance to preview both resolutions */}
        <div style={{ marginTop: 22, padding: "12px 14px", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Demo · preview the outcome</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setStage("verified")} style={{ flex: 1 }}>✓ No charge</Button>
            <Button variant="secondary" size="sm" onClick={() => setStage("charged")} style={{ flex: 1 }}>✕ Charged again</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  if (stage === "verified") {
    return (
      <Sheet title="" onClose={onDone}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 18px" }}>
          <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, boxShadow: "var(--shadow-accent)" }}>
            <Icon name="check" size={38} color="var(--text-on-accent)" strokeWidth={3} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, color: "var(--text-primary)" }}>Verified cancelled</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "8px 0 22px", maxWidth: "30ch" }}>
            No charge from {s.name} on your latest statement. It's confirmed — and you're saving:
          </p>
          <AmountDisplay amount={Number(yearly)} cadence="yr" size="lg" color="var(--accent-text)" />
        </div>
        <Button variant="primary" size="lg" fullWidth onClick={onDone}>Done</Button>
      </Sheet>
    );
  }

  // charged
  return (
    <Sheet title="" onClose={onDone}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "40px 18px 18px" }}>
        <div style={{ width: 76, height: 76, borderRadius: "50%", background: "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <Icon name="triangle-alert" size={36} color="var(--danger)" />
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, color: "var(--text-primary)" }}>Still being charged</div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "8px 0 22px", maxWidth: "32ch" }}>
          We spotted another {s.name} charge of <b>${s.amount.toFixed(2)}</b> after you cancelled. The cancellation didn't go through — let's try again.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button variant="primary" size="lg" fullWidth onClick={() => setStage("guided")} leftIcon={<Icon name="rotate-ccw" size={18} />}>Try cancelling again</Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onDone} leftIcon={<Icon name="life-buoy" size={18} />}>Get escalation help</Button>
      </div>
    </Sheet>
  );
}
window.CancelFlowScreen = CancelFlowScreen;
