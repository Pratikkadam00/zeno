/* Zeno — Cancel + verification. The Stamp is THE celebration of the app
   (the one big moment — no confetti anywhere).
   SLOP AUDIT — ① Zeno: difficulty as ink ticks; "AWAITING PROOF" watermark;
   verified = stamp thunk + savings printed as receipt lines. ② Tempted by:
   confetti + green check circle → the stamp IS the celebration. ③ Lazy version:
   modal with "Are you sure?" and a party popper.
   MOTION: stamp zn-stamp (RN: spring d14 s420 + Haptics Success);
   savings lines print in after the stamp (300ms delay, 45ms stagger). */
function CancelFlowScreen({ id, onClose, onDone }) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const yearly = (s.amount * 12).toFixed(2);
  const [stage, setStage] = React.useState("guided");

  const diff = s.id === "adobe" ? ["HARD", 3] : s.id === "hbo" ? ["MEDIUM", 2] : ["EASY", 1];
  const diffColor = diff[1] === 3 ? "var(--stamp-alert)" : diff[1] === 2 ? "var(--warning)" : "var(--stamp-verified)";
  const steps = [
    `Sign in to ${s.name} in a browser`,
    "Open Account → Subscription or Plan",
    "Choose Cancel and confirm",
    "Keep the confirmation email",
  ];

  if (stage === "guided") {
    return (
      <Sheet title={`CANCEL ${s.name.toUpperCase()}`} onClose={onClose}
        footer={<Button variant="primary" size="lg" fullWidth onClick={() => setStage("pending")}>I cancelled it</Button>}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "6px 0 10px", borderBottom: "1px solid var(--rule-strong)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--text-tertiary)" }}>DIFFICULTY</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ display: "flex", gap: 3 }}>
              {[1, 2, 3].map(n => <span key={n} style={{ width: 14, height: 4, background: n <= diff[1] ? diffColor : "var(--rule-strong)" }}></span>)}
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: diffColor, letterSpacing: "0.1em" }}>{diff[0]}</span>
          </span>
        </div>

        {steps.map((st, i) => (
          <div key={i} className="zn-print" style={{ animationDelay: `${i * 60}ms`, display: "flex", gap: 14, alignItems: "baseline", padding: "13px 0", borderBottom: "1px solid var(--rule)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--text-tertiary)" }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-primary)", lineHeight: 1.45 }}>{st}</span>
          </div>
        ))}

        <Button variant="secondary" size="lg" fullWidth leftIcon={<Icon name="external-link" size={17} />} style={{ marginTop: 18 }}>
          {`Open ${s.name}'s cancellation page`}
        </Button>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", lineHeight: 1.5, marginTop: 14 }}>
          Zeno won't mark this cancelled until the next receipt or statement shows the charge actually stopped.
        </p>
      </Sheet>
    );
  }

  if (stage === "pending") {
    return (
      <Sheet title="AWAITING PROOF" onClose={onDone}>
        {/* watermark */}
        <div style={{ position: "relative", padding: "26px 0 6px", textAlign: "center" }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 34, letterSpacing: "0.18em", color: "var(--text-primary)", opacity: 0.05, transform: "rotate(-12deg)", whiteSpace: "nowrap" }}>AWAITING PROOF</span>
          </div>
          <Stamp tone="neutral" angle={-4} sub={`REPORTED ${"JUL 10"}`}>Pending</Stamp>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, textAlign: "center", margin: "18px auto 22px", maxWidth: "32ch" }}>
          {s.name} is marked pending. Around {s.next}, Zeno re-checks your receipts and statement for a charge — then stamps it, one way or the other.
        </p>
        <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
          {[["Cancellation reported", "JUL 10", true], ["Re-check next receipt", `~${s.next.toUpperCase()}`, false], ["Stamp the outcome", "", false]].map(([t, d, done], i) => (
            <LedgerLine key={i}
              label={<span style={{ color: done ? "var(--text-primary)" : "var(--text-tertiary)", fontWeight: done ? 650 : 500 }}>{t}</span>}
              value={done ? <Icon name="check" size={15} color="var(--stamp-verified)" /> : <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--text-tertiary)" }}>{d}</span>} />
          ))}
        </div>
        <Button variant="primary" size="lg" fullWidth onClick={onDone} style={{ marginTop: 20 }}>Got it</Button>
        <div style={{ marginTop: 22, padding: "12px 14px", border: "1px dashed var(--rule-strong)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginBottom: 8 }}>DEMO · PREVIEW THE OUTCOME</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setStage("verified")} style={{ flex: 1 }}>No charge found</Button>
            <Button variant="secondary" size="sm" onClick={() => setStage("charged")} style={{ flex: 1 }}>Charged again</Button>
          </div>
        </div>
      </Sheet>
    );
  }

  if (stage === "verified") {
    return (
      <Sheet title="" onClose={onDone}
        footer={<Button variant="money" size="lg" fullWidth onClick={onDone}>Done</Button>}>
        {/* THE moment — stamp thunks down, savings print beneath */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 0 10px" }}>
          <Stamp animate size="lg" angle={-6} sub={`${s.name.toUpperCase()} · JUL 10 2026`}>Verified cancelled</Stamp>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.5, margin: "16px auto 26px", maxWidth: "30ch" }}>
          No charge on your latest statement. It's real. Back in your pocket:
        </p>
        <div style={{ borderTop: "1px solid var(--rule-strong)", margin: "0 8px" }}>
          <div className="zn-print" style={{ animationDelay: "300ms" }}>
            <LedgerLine label="Every month" value={`+$${s.amount.toFixed(2)}`} valueColor="var(--stamp-verified)" />
          </div>
          <div className="zn-print" style={{ animationDelay: "345ms" }}>
            <LedgerLine label="Every year" strong value={`+$${yearly}`} valueColor="var(--stamp-verified)" size={16} />
          </div>
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title="" onClose={onDone}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "44px 0 10px" }}>
        <Stamp animate tone="alert" size="lg" angle={4} sub={`$${s.amount.toFixed(2)} ON JUL 08`}>Still charging</Stamp>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", textAlign: "center", lineHeight: 1.55, margin: "16px auto 26px", maxWidth: "32ch" }}>
        A {s.name} charge appeared after you cancelled. That's on them, not you — let's make it stick this time.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <Button variant="primary" size="lg" fullWidth onClick={() => setStage("guided")} leftIcon={<Icon name="rotate-ccw" size={17} />}>Run the steps again</Button>
        <Button variant="secondary" size="lg" fullWidth onClick={onDone} leftIcon={<Icon name="life-buoy" size={17} />}>Escalation help — chargeback guide</Button>
      </div>
    </Sheet>
  );
}
window.CancelFlowScreen = CancelFlowScreen;
