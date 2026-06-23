/* Zeno — Onboarding (redesigned, CHANGE 7)
   Sequence: trust beats → sign up + 16+ age gate → first-discovery launchpad.
   The experience-"mode" choice is gone from the critical path. */
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(0); // 0 welcome, 1 auth, 2 launchpad
  const [age, setAge] = React.useState(false);

  const beats = [
    { icon: "shield-check", title: "No bank login. Ever.", body: "Zeno never asks for your banking credentials — and never sees them." },
    { icon: "smartphone", title: "Your data stays on your device", body: "We find subscriptions from email receipts and statements you control. It's processed on-device and encrypted." },
    { icon: "bell-ring", title: "Warned before you're charged", body: "A heads-up 7 and 3 days before any renewal or trial conversion — never a surprise." },
  ];

  if (step === 0) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 28px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
          <img src="../../assets/zeno-mark.svg" width="30" height="30" style={{ color: "var(--ink-900)" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em" }}>zeno</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.02em", margin: "28px 0 6px", textWrap: "balance" }}>
          The honest way to take back your subscriptions.
        </h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-secondary)", margin: "0 0 26px", lineHeight: 1.5 }}>
          Built for people who refuse to hand a bank login to an app.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {beats.map(b => (
            <div key={b.title} style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
              <div style={{ width: 40, height: 40, flex: "none", borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={b.icon} size={20} color="var(--accent-text)" />
              </div>
              <div>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{b.title}</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)", marginTop: 1, lineHeight: 1.45 }}>{b.body}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: "auto", padding: "20px 0 28px" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setStep(1)}>Get started</Button>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 28px 0", overflow: "hidden" }}>
        <IconButton label="Back" onClick={() => setStep(0)} style={{ marginLeft: -8 }}><Icon name="chevron-left" size={24} /></IconButton>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "18px 0 8px" }}>Create your account</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: "0 0 22px" }}>No card required to start. Cancel anytime — and we mean it.</p>

        {/* Age gate */}
        <button onClick={() => setAge(a => !a)} style={{ display: "flex", gap: 11, alignItems: "flex-start", textAlign: "left", background: "var(--surface-card)", border: `1.5px solid ${age ? "var(--accent)" : "var(--border-default)"}`, borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", marginBottom: 18 }}>
          <span style={{ width: 22, height: 22, flex: "none", borderRadius: 6, border: `1.5px solid ${age ? "var(--accent)" : "var(--border-strong)"}`, background: age ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            {age && <Icon name="check" size={15} color="var(--text-on-accent)" strokeWidth={3} />}
          </span>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>I confirm I'm <b style={{ color: "var(--text-primary)" }}>16 or older</b> and agree to the Terms &amp; Privacy Policy.</span>
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: age ? 1 : 0.45, pointerEvents: age ? "auto" : "none", transition: "opacity var(--dur) var(--ease-out)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setStep(2)} leftIcon={<Icon name="mail" size={18} />}>Continue with email</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setStep(2)} leftIcon={<Icon name="apple" size={18} />}>Continue with Apple</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setStep(2)} leftIcon={<Icon name="globe" size={18} />}>Continue with Google</Button>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", marginTop: "auto", padding: "16px 0 26px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Icon name="lock" size={13} color="var(--text-tertiary)" /> We email a magic link — no password to leak.
        </p>
      </div>
    );
  }

  // step 2 — first-discovery launchpad (free, no paywall)
  const methods = [
    { id: "csv", icon: "file-spreadsheet", title: "Import statement", body: "Most complete — you export it, read on-device.", badge: "CSV" },
    { id: "email", icon: "mail-search", title: "Scan email receipts", body: "Read-only, on-device, last 12 months." },
    { id: "manual", icon: "pencil", title: "Add manually", body: "Pick from 600+ services or add your own." },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "8px 24px 0", overflow: "hidden" }}>
      <div style={{ width: 46, height: 46, borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10 }}>
        <Icon name="sparkles" size={22} color="var(--accent-text)" />
      </div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: "-0.02em", margin: "16px 0 6px", textWrap: "balance" }}>Let's find what you're paying for</h1>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: "0 0 8px", lineHeight: 1.5 }}>
        Your first scan is <b style={{ color: "var(--accent-text)" }}>free</b>. Pick how you'd like to start.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", margin: "0 0 18px" }}>
        <Icon name="shield-check" size={14} color="var(--success)" /> No bank login. Nothing leaves your device unencrypted.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {methods.map(m => (
          <button key={m.id} onClick={() => onComplete(m.id)} style={{ display: "flex", gap: 13, alignItems: "center", textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 14px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ width: 42, height: 42, flex: "none", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={m.icon} size={21} color="var(--text-secondary)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{m.title}</span>
                {m.badge && <Badge tone="accent">{m.badge}</Badge>}
              </div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>{m.body}</div>
            </div>
            <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />
          </button>
        ))}
      </div>

      <button onClick={() => onComplete(null)} style={{ marginTop: "auto", marginBottom: 26, background: "none", border: "none", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "16px 0 10px" }}>
        Skip for now
      </button>
    </div>
  );
}
window.OnboardingScreen = OnboardingScreen;
