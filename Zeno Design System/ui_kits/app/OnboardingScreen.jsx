/* Zeno — Onboarding: 3 beats, skippable, → Login with local-only first-class.
   SLOP AUDIT — ① Zeno: ledger rows print in beat 1; defiant type beat 2; stamp beat 3.
   ② Tempted by: center-hero + gradient CTA per beat → instead: asymmetric editorial
   type, ink panel only on beat 1. ③ Lazy version: 6-screen tutorial with mascots.
   MOTION: beats crossfade+settle (spring d22); rows print (45ms stagger);
   splash handoff: navy splash logo → beat 1 renders same mark top-left, settles
   from scale 1.15 (expo-splash-screen fade). Reduced motion: fades. */
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = React.useState(0); // 0..2 beats, 3 login, 4 launchpad
  const [age, setAge] = React.useState(false);
  const skip = () => setStep(3);

  const Ticks = () => (
    <div style={{ display: "flex", gap: 5 }}>
      {[0, 1, 2].map(i => <span key={i} style={{ width: 16, height: 2.5, background: i <= step ? "var(--accent)" : "var(--rule-strong)" }}></span>)}
    </div>
  );
  const beatShell = (children, cta = "Continue") => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <img src="../../assets/zeno-mark.svg" width="26" height="26" style={{ color: "var(--ink-900)" }} />
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em" }}>zeno</span>
        </div>
        <button onClick={skip} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.16em", color: "var(--text-tertiary)", cursor: "pointer", padding: 10 }}>SKIP</button>
      </div>
      {children}
      <div style={{ flex: "none", padding: "0 24px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Ticks />
        <Button variant="primary" size="lg" fullWidth onClick={() => setStep(s => s + 1)}>{cta}</Button>
      </div>
    </div>
  );

  if (step === 0) {
    const rows = [
      ["Netflix", "$15.99"], ["Spotify", "$10.99"], ["ChatGPT Plus", "$20.00"], ["iCloud+", "$2.99"], ["Figma", "$12.00"],
    ];
    return beatShell(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34, lineHeight: 1.06, letterSpacing: "-0.028em", margin: "0 0 22px", textWrap: "balance" }}>Every subscription.<br />One honest ledger.</h1>
        {/* the ledger prints itself — signature print-in */}
        <div style={{ borderTop: "1px solid var(--rule-strong)", paddingTop: 4 }}>
          {rows.map(([n, a], i) => (
            <div key={n} className="zn-print" style={{ animationDelay: `${i * 120 + 200}ms` }}>
              <LedgerLine label={n} value={a} />
            </div>
          ))}
          <div className="zn-print" style={{ animationDelay: "820ms", borderTop: "1px solid var(--rule-strong)", marginTop: 4 }}>
            <LedgerLine label="Committed" strong value="$61.97 /mo" valueColor="var(--accent-text)" />
          </div>
        </div>
      </div>
    );
  }

  if (step === 1) {
    return beatShell(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", color: "var(--accent-text)", marginBottom: 14 }}>UNLIKE THE OTHERS</div>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 40, lineHeight: 1.04, letterSpacing: "-0.03em", margin: "0 0 16px" }}>No bank login required.</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 15.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: 0, maxWidth: "30ch" }}>
          Zeno reads receipts you show it — an email scan you start, or a statement you export yourself. Never your credentials.
        </p>
      </div>
    );
  }

  if (step === 2) {
    return beatShell(
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 24px" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 34, lineHeight: 1.06, letterSpacing: "-0.028em", margin: "0 0 18px" }}>Warned before every charge.</h1>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 26px", maxWidth: "30ch" }}>
          7 days out, 3 days out, day of. Trials get flagged before they convert. Cancellations get verified — not assumed.
        </p>
      </div>,
      "Sign in"
    );
  }

  if (step === 3) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 24px 0" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", marginBottom: 6 }}>ZENO / SIGN IN</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", margin: "0 0 20px" }}>Open your ledger</h1>

          {/* age gate — a plain, honest checkbox, no pre-check */}
          <button onClick={() => setAge(a => !a)} style={{ display: "flex", gap: 11, alignItems: "flex-start", textAlign: "left", width: "100%", background: "none", border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", marginBottom: 16 }}>
          <span style={{ width: 22, height: 22, flex: "none", borderRadius: 5, border: `1.5px solid ${age ? "var(--accent)" : "var(--border-strong)"}`, background: age ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
              {age && <Icon name="check" size={15} color="var(--text-on-accent)" strokeWidth={3} />}
            </span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>I'm <b style={{ color: "var(--text-primary)" }}>16 or older</b> and accept the Terms &amp; Privacy Policy.</span>
          </button>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: age ? 1 : 0.4, pointerEvents: age ? "auto" : "none", transition: "opacity var(--dur) var(--ease-out)" }}>
            <Button variant="primary" size="lg" fullWidth onClick={() => setStep(4)} leftIcon={<Icon name="mail" size={18} />}>Email me a sign-in code</Button>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" size="lg" onClick={() => setStep(4)} style={{ flex: 1 }} leftIcon={<Icon name="apple" size={18} />}>Apple</Button>
              <Button variant="secondary" size="lg" onClick={() => setStep(4)} style={{ flex: 1 }} leftIcon={<Icon name="globe" size={18} />}>Google</Button>
            </div>

            <SectionHead pad="14px 0 8px">Or keep it on this phone</SectionHead>
            {/* local-only is a first-class citizen — celebrated, not buried */}
            <Button variant="secondary" size="lg" fullWidth onClick={() => setStep(4)} leftIcon={<Icon name="smartphone" size={18} />} style={{ borderColor: "var(--ink-400)", borderWidth: 1.5 }}>
              Continue without an account
            </Button>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>No email, no sync — your ledger exists only here.</div>
          </div>
        </div>
        <div style={{ flex: "none", padding: "12px 24px 26px", borderTop: "1px solid var(--rule)" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-tertiary)", margin: 0, lineHeight: 1.5, textAlign: "center" }}>
            Your subscriptions live on your phone, encrypted. Nothing leaves it unless you turn on a cloud feature — and we ask first.
          </p>
        </div>
      </div>
    );
  }

  // step 4 — first-discovery launchpad (first scan free, no paywall before value)
  const methods = [
    { id: "csv", icon: "file-spreadsheet", title: "Import a statement", body: "Export a CSV from your bank yourself — most complete picture.", tag: "RECOMMENDED" },
    { id: "email", icon: "mail-search", title: "Scan email receipts", body: "A scan you start, read on this phone. Last 12 months." },
    { id: "manual", icon: "pencil-line", title: "Add by hand", body: "600+ services with autocomplete, or fully custom." },
  ];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 24px 0", overflow: "hidden" }}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", marginBottom: 6 }}>FIRST ENTRY</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: "-0.022em", margin: "0 0 8px", textWrap: "balance" }}>Let's write the first line</h1>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", margin: "0 0 18px", lineHeight: 1.5 }}>
        Your first scan is free. Zeno scans only when you tap scan — nothing runs in the background.
      </p>
      <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
        {methods.map((m, i) => (
          <button key={m.id} onClick={() => onComplete(m.id)} className="zn-print" style={{ animationDelay: `${i * 90}ms`, display: "flex", gap: 13, alignItems: "center", textAlign: "left", width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "15px 2px", cursor: "pointer" }}>
            <span style={{ width: 42, height: 42, flex: "none", border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-card)" }}>
              <Icon name={m.icon} size={20} color="var(--text-secondary)" />
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{m.title}</span>
                {m.tag && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-text)" }}>{m.tag}</span>}
              </span>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.4 }}>{m.body}</span>
            </span>
            <Icon name="chevron-right" size={17} color="var(--text-tertiary)" />
          </button>
        ))}
      </div>
      <button onClick={() => onComplete(null)} style={{ marginTop: "auto", marginBottom: 26, background: "none", border: "none", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer", padding: "16px 0 10px" }}>
      LATER
      </button>
    </div>
  );
}
window.OnboardingScreen = OnboardingScreen;
