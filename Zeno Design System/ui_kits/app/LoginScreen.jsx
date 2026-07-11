/* Zeno — Login (standalone screen; onboarding keeps its own inline flow).
   The age + consent gate is designed as "you sign the ledger before opening
   it" — a dignified consent line, not legal debris. Local-only mode keeps
   equal billing with the account paths (privacy-first differentiator).
   SLOP AUDIT — ① Zeno: consent as a signed line that unlocks the page; errors
   as margin-tick corrections in plain language; local-only under its own
   section head, same visual weight. ② Tempted by: social-buttons-first with a
   buried "continue as guest" → gate first, guest celebrated. ③ Lazy version:
   email+password form, red toast errors, guest link in the footer.
   MOTION: methods unlock = opacity settle 220ms (RN: withSpring d22); sent
   state prints in (FadeInDown); error tick settles + Haptics Warning.
   Reduced motion: opacity only. ≥44pt targets throughout. */
function LoginScreen({ onClose, onDone }) {
  const [age, setAge] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [err, setErr] = React.useState(null); // 'offline' | 'server'

  const errors = {
    offline: ["wifi-off", "You're offline", "Reconnect and try again — nothing was sent."],
    server: ["cloud-alert", "Couldn't send the email right now", "That one's on our end, not yours. Try again in a minute."],
  };
  const e = err && errors[err];

  const GoogleG = () => (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    </svg>
  );

  return (
    <Sheet title="SIGN IN" onClose={onClose}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", margin: "8px 0 6px" }}>ZENO / ACCOUNT</div>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 27, letterSpacing: "-0.022em", margin: "0 0 18px" }}>Open your ledger</h1>

      {/* The signature line — consent gate that unlocks everything below */}
      <button onClick={() => { setAge(a => !a); }} style={{ display: "flex", gap: 11, alignItems: "flex-start", textAlign: "left", width: "100%", minHeight: 48, background: "none", border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-md)", padding: "12px 14px", cursor: "pointer", marginBottom: 6 }}>
        <span style={{ width: 22, height: 22, flex: "none", borderRadius: 5, border: `1.5px solid ${age ? "var(--accent)" : "var(--border-strong)"}`, background: age ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, transition: "background var(--dur-fast) var(--ease-out)" }}>
          {age && <Icon name="check" size={15} color="var(--text-on-accent)" strokeWidth={3} />}
        </span>
        <span style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>I'm <b style={{ color: "var(--text-primary)" }}>16 or older</b> and accept the Terms &amp; Privacy Policy.</span>
      </button>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", margin: "0 0 14px 2px" }}>SIGN THE LINE TO CONTINUE</div>

      {/* Error — margin-tick correction, never a toast */}
      {e && (
        <div className="zn-print" style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: "3px solid var(--stamp-alert)", paddingLeft: 12, margin: "0 0 16px" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name={e[0]} size={15} color="var(--stamp-alert)" />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{e[1]}</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5 }}>{e[2]}</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: age ? 1 : 0.5, pointerEvents: age ? "auto" : "none", transition: "opacity var(--dur) var(--ease-out)" }}>
        {!sent ? (
          <React.Fragment>
            <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={ev => setEmail(ev.target.value)} />
            <Button variant="primary" size="lg" fullWidth onClick={() => { setErr(null); setSent(true); }} leftIcon={<Icon name="mail" size={18} />}>Send sign-in link</Button>
          </React.Fragment>
        ) : (
          /* Sent — a calm printed receipt of the action, not a success modal */
          <div className="zn-print" style={{ borderTop: "1px solid var(--rule-strong)", paddingTop: 4 }}>
            <LedgerLine label="Sign-in link" sub={(email || "you@example.com").toUpperCase()} value="SENT" valueColor="var(--stamp-verified)" />
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: "6px 0 12px" }}>
              Check your email on this phone and tap the link. It expires in 15 minutes.
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" size="md" onClick={() => setSent(false)} style={{ flex: 1 }}>Change email</Button>
              <Button variant="ghost" size="md" onClick={() => {}} style={{ flex: 1 }}>Resend</Button>
            </div>
          </div>
        )}

        {/* Platform buttons — brand-invariant per Apple/Google guidelines:
            do not recolor, do not restyle the marks. */}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onDone} style={{ flex: 1, height: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#000", color: "#fff", border: "none", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="apple" size={18} color="#fff" /> Apple
          </button>
          <button onClick={onDone} style={{ flex: 1, height: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#fff", color: "#1F1F1F", border: "1px solid #DADCE0", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontSize: 14.5, fontWeight: 600, cursor: "pointer" }}>
            <GoogleG /> Google
          </button>
        </div>

        <SectionHead pad="12px 0 8px">Or keep it on this phone</SectionHead>
        <Button variant="secondary" size="lg" fullWidth onClick={onDone} leftIcon={<Icon name="smartphone" size={18} />} style={{ borderColor: "var(--ink-400)", borderWidth: 1.5 }}>
          Continue without an account
        </Button>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", textAlign: "center", lineHeight: 1.5 }}>No email, no sync — your ledger exists only here.</div>
      </div>

      {/* Demo affordance — preview the two distinct failure states */}
      <div style={{ marginTop: 22, padding: "12px 14px", border: "1px dashed var(--rule-strong)", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginBottom: 8 }}>DEMO · PREVIEW ERROR STATES</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => { setAge(true); setErr("offline"); setSent(false); }} style={{ flex: 1 }}>Offline</Button>
          <Button variant="secondary" size="sm" onClick={() => { setAge(true); setErr("server"); setSent(false); }} style={{ flex: 1 }}>Server error</Button>
          <Button variant="secondary" size="sm" onClick={() => setErr(null)} style={{ flex: 1 }}>Clear</Button>
        </div>
      </div>
    </Sheet>
  );
}
window.LoginScreen = LoginScreen;
