/* Zeno — Security (setup) + LockOverlay (every foreground). One file, two views.
   The lock is the ledger's COVER, not a police checkpoint: navy paper, the
   seal, calm mono copy — and an honest countdown when locked out.
   SLOP AUDIT — ① Zeno: "THIS LEDGER IS SEALED" cover language, CodeBoxes as
   the PIN register, lockout as a printed fact with a countdown — no red
   flashing. ② Tempted by: shaking input + police-red error screen → a quiet
   margin-tick correction and a patient timer. ③ Lazy version: system-style
   passcode screen clone with a generic shield icon.
   MOTION: PIN digits fill = selectionAsync() haptic per digit; wrong PIN =
   boxes settle-nudge 2px (spring d22, no shake theatrics) + Haptics Warning;
   unlock = cover fades 200ms (the tear is reserved for launch). Lockout
   countdown ticks once per second, mono. Reduced motion: opacity only. */

function ZKeypad({ onKey, disabled }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 68px)", gap: 12, justifyContent: "center", opacity: disabled ? 0.35 : 1, pointerEvents: disabled ? "none" : "auto", transition: "opacity var(--dur) var(--ease-out)" }}>
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
        <button key={i} disabled={k === ""} onClick={() => onKey(k)}
          style={{ height: 58, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", background: "none", color: "#F2F1EA", fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, cursor: k === "" ? "default" : "pointer", visibility: k === "" ? "hidden" : "visible" }}>{k}</button>
      ))}
    </div>
  );
}

/* The cover. Correct demo PIN: 1234. 3 misses → 30s lockout with countdown. */
function LockOverlay({ onUnlock }) {
  const [pin, setPin] = React.useState("");
  const [fails, setFails] = React.useState(0);
  const [wrong, setWrong] = React.useState(false);
  const [lockedFor, setLockedFor] = React.useState(0);

  React.useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  const key = (k) => {
    if (k === "⌫") { setPin(p => p.slice(0, -1)); setWrong(false); return; }
    const next = (pin + k).slice(0, 4);
    setPin(next);
    setWrong(false);
    if (next.length === 4) {
      if (next === "1234") { setTimeout(onUnlock, 220); }
      else {
        setTimeout(() => {
          setPin(""); setWrong(true);
          setFails(f => {
            const n = f + 1;
            if (n >= 3) { setLockedFor(30); setWrong(false); }
            return n;
          });
        }, 240);
      }
    }
  };
  const mmss = `0:${String(lockedFor).padStart(2, "0")}`;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--ink-panel)", padding: 32 }}>
      <svg width="46" height="46" viewBox="0 0 120 120" fill="none" style={{ color: "#1ED47F" }}>
        <circle cx="60" cy="60" r="51" stroke="currentColor" strokeWidth="5.5"></circle>
        <circle cx="60" cy="60" r="43" stroke="currentColor" strokeWidth="2"></circle>
        <path d="M43 45 H77 L43 75 H77" stroke="currentColor" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round"></path>
      </svg>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.55)", margin: "18px 0 4px" }}>THIS LEDGER IS SEALED</div>

      {lockedFor > 0 ? (
        /* Lockout — an honest, patient fact. No shame copy. */
        <div style={{ textAlign: "center", margin: "18px 0 22px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", color: "#F2F1EA" }}>{mmss}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 6, maxWidth: "26ch", lineHeight: 1.5 }}>
            Too many tries. The ledger stays sealed for a moment — it opens again when the clock runs out.
          </div>
        </div>
      ) : (
        <React.Fragment>
          <div style={{ margin: "18px 0 6px" }}>
            <CodeBoxes code={"•".repeat(pin.length)} length={4} size={40} />
          </div>
          <div style={{ minHeight: 18, fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: wrong ? "var(--stamp-alert)" : "rgba(255,255,255,0.4)", marginBottom: 14 }}>
            {wrong ? `INCORRECT PIN · ${3 - fails} ${3 - fails === 1 ? "TRY" : "TRIES"} LEFT` : "ENTER YOUR PIN"}
          </div>
        </React.Fragment>
      )}

      <ZKeypad onKey={key} disabled={lockedFor > 0} />
      <button onClick={onUnlock} disabled={lockedFor > 0} style={{ marginTop: 24, background: "none", border: "none", color: lockedFor > 0 ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", cursor: lockedFor > 0 ? "default" : "pointer", padding: 12 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}><Icon name="scan-face" size={15} color="currentColor" /> UNLOCK WITH FACE ID</span>
      </button>
    </div>
  );
}

function SecurityScreen({ onClose }) {
  const [lockOn, setLockOn] = React.useState(false);
  const [view, setView] = React.useState("setup"); // setup | confirm | manage | preview
  const [pin1, setPin1] = React.useState("");
  const [pin2, setPin2] = React.useState("");
  const [error, setError] = React.useState(null);

  if (view === "preview") {
    return <LockOverlay onUnlock={() => setView(lockOn ? "manage" : "setup")} />;
  }

  const Boxes = ({ val }) => <CodeBoxes code={"•".repeat(val.length)} length={8} size={32} />;
  const keyInto = (setter, val) => (k) => {
    setError(null);
    if (k === "⌫") setter(val.slice(0, -1));
    else setter((val + k).slice(0, 8));
  };

  /* Light-paper setup uses the same keypad on ink? Keypad is white-on-navy —
     wrap it in an ink well so the register stays legible on paper. */
  const KeypadWell = ({ onKey }) => (
    <div style={{ background: "var(--ink-panel)", borderRadius: "var(--radius-lg)", padding: "18px 12px", margin: "16px 0 0" }}>
      <ZKeypad onKey={onKey} />
    </div>
  );

  return (
    <Sheet title="APP LOCK" onClose={onClose}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, letterSpacing: "-0.02em", margin: "12px 0 8px" }}>Seal the ledger.</h2>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 14px" }}>
        A 4–8 digit PIN locks Zeno whenever it leaves the foreground. Face ID or fingerprint is used when available — the PIN is the fallback.
      </p>
      <LedgerLine label="App lock" strong value={lockOn ? "ON" : "OFF"} valueColor={lockOn ? "var(--stamp-verified)" : "var(--text-tertiary)"} />

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, borderLeft: "3px solid var(--stamp-alert)", paddingLeft: 12, margin: "10px 0 2px" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 650, color: "var(--stamp-alert)" }}>{error}</span>
        </div>
      )}

      {!lockOn && view === "setup" && (
        <React.Fragment>
          <SectionHead pad="18px 0 10px">Choose a PIN · 4–8 digits</SectionHead>
          <Boxes val={pin1} />
          <KeypadWell onKey={keyInto(setPin1, pin1)} />
          <Button variant="primary" size="lg" fullWidth style={{ marginTop: 14 }}
            onClick={() => { if (pin1.length < 4) { setError("PIN must be at least 4 digits."); return; } setError(null); setView("confirm"); }}>
            Continue
          </Button>
        </React.Fragment>
      )}

      {!lockOn && view === "confirm" && (
        <React.Fragment>
          <SectionHead pad="18px 0 10px">Enter it once more</SectionHead>
          <Boxes val={pin2} />
          <KeypadWell onKey={keyInto(setPin2, pin2)} />
          <Button variant="primary" size="lg" fullWidth style={{ marginTop: 14 }}
            onClick={() => { if (pin2 !== pin1) { setError("PINs don't match."); setPin2(""); return; } setLockOn(true); setView("manage"); setError(null); }}>
            Turn on app lock
          </Button>
          <Button variant="ghost" size="md" fullWidth onClick={() => { setView("setup"); setPin2(""); setError(null); }} style={{ marginTop: 6 }}>Back</Button>
        </React.Fragment>
      )}

      {lockOn && view === "manage" && (
        <React.Fragment>
          <LedgerLine label="Face ID" value="USED WHEN AVAILABLE" />
          <LedgerLine label="Locks" value="ON LEAVING THE APP" />
          <Button variant="secondary" size="lg" fullWidth onClick={() => setView("preview")} style={{ marginTop: 16 }} leftIcon={<Icon name="lock" size={16} />}>Preview the lock screen</Button>

          <SectionHead pad="20px 0 10px">Turn it off</SectionHead>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px" }}>Enter your current PIN to remove the lock.</p>
          <Boxes val={pin2} />
          <KeypadWell onKey={keyInto(setPin2, pin2)} />
          <Button variant="danger" size="lg" fullWidth style={{ marginTop: 14 }}
            onClick={() => { if (pin2 !== pin1) { setError("Incorrect PIN."); setPin2(""); return; } setLockOn(false); setView("setup"); setPin1(""); setPin2(""); setError(null); }}>
            Turn off app lock
          </Button>
        </React.Fragment>
      )}

      {!lockOn && (
        <Button variant="ghost" size="md" fullWidth onClick={() => setView("preview")} style={{ marginTop: 10 }}>Preview the lock screen</Button>
      )}
    </Sheet>
  );
}
window.SecurityScreen = SecurityScreen;
window.LockOverlay = LockOverlay;
