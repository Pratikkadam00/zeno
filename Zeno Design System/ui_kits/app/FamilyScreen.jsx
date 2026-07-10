/* Zeno — NEW SCREENS batch 2: Family Vault, Security/App lock, Widgets preview,
   Wrapped (year in review).
   FAMILY SLOP AUDIT — ① Zeno: share code as mono boxes; members are ledger
   lines of totals ONLY; FX exclusion styled with dignity. ② Tempted by:
   avatars-in-a-circle happy-family card → a plain register of totals.
   ③ Lazy: invite card with emoji household. */
function FamilyScreen({ onClose }) {
  const [joined, setJoined] = React.useState(true);
  if (!joined) {
    return (
      <Sheet title="FAMILY VAULT" onClose={onClose}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, letterSpacing: "-0.02em", margin: "14px 0 8px" }}>One household, totals only.</h2>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 20px" }}>
          Members see each other's monthly total — never the list behind it. What you subscribe to stays yours.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setJoined(true)}>Create a household</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={() => setJoined(true)}>Join with a code</Button>
        </div>
      </Sheet>
    );
  }
  return (
    <Sheet title="FAMILY VAULT" onClose={onClose}>
      <SectionHead pad="10px 0 8px">Share code</SectionHead>
      <CodeBoxes code="ZN4K7Q2M" />
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", textAlign: "center", margin: "10px 0 0" }}>UP TO 5 MEMBERS · CODE ROTATES WHEN SOMEONE LEAVES</p>

      <SectionHead pad="22px 0 8px">Combined this month</SectionHead>
      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 44, letterSpacing: "-0.035em", fontFeatureSettings: "'tnum' 1" }}>$214.90</div>
      <div style={{ borderTop: "1px solid var(--rule-strong)", marginTop: 12 }}>
        <LedgerLine label="You" value="$75.96" />
        <LedgerLine label="Sam" value="$82.40" />
        <LedgerLine label="Rio" value="$56.54" />
      </div>
      {/* honest FX exclusion */}
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginTop: 14, borderLeft: "3px solid var(--ink-300)", paddingLeft: 12 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>
          <b style={{ color: "var(--text-primary)" }}>1 member counts in GBP.</b> No exchange rate is available right now, so their £41.00 isn't in the combined total. We'd rather exclude it than guess.
        </div>
      </div>
      <div style={{ marginTop: 22 }}>
        <LedgerLine label="Members see" value="TOTALS ONLY" />
        <LedgerLine label="Members never see" value="YOUR LIST" />
      </div>
      <Button variant="danger" size="md" fullWidth onClick={() => setJoined(false)} style={{ marginTop: 20 }}>Leave household</Button>
    </Sheet>
  );
}
window.FamilyScreen = FamilyScreen;

/* Security — the seal. A privacy app's lock is a brand moment.
   MOTION: lock overlay drops in (settle); PIN dots fill with selection haptic. */
function SecurityScreen({ onClose }) {
  const [faceId, setFaceId] = React.useState(true);
  const [locked, setLocked] = React.useState(false);
  const [pin, setPin] = React.useState(0);

  if (locked) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ink-panel)", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <img src="../../assets/zeno-mark.svg" width="44" height="44" style={{ filter: "brightness(0) invert(1)", opacity: 0.9 }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(255,255,255,0.55)", margin: "18px 0 6px" }}>THIS LEDGER IS SEALED</div>
        <div style={{ display: "flex", gap: 12, margin: "22px 0 26px" }}>
          {[0, 1, 2, 3].map(i => (
            <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.5)", background: i < pin ? "var(--accent)" : "transparent", borderColor: i < pin ? "var(--accent)" : "rgba(255,255,255,0.5)", transition: "background var(--dur-fast)" }}></span>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 12 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, "", 0, "⌫"].map((k, i) => (
            <button key={i} disabled={k === ""} onClick={() => { if (k === "⌫") setPin(p => Math.max(0, p - 1)); else { const n = pin + 1; setPin(n); if (n >= 4) setTimeout(() => { setLocked(false); setPin(0); }, 250); } }}
              style={{ height: 56, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.18)", background: "none", color: "#fff", fontFamily: "var(--font-mono)", fontSize: 20, fontWeight: 600, cursor: k === "" ? "default" : "pointer", visibility: k === "" ? "hidden" : "visible" }}>{k}</button>
          ))}
        </div>
        <button onClick={() => { setLocked(false); setPin(0); }} style={{ marginTop: 26, background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", cursor: "pointer" }}>UNLOCK WITH FACE ID</button>
      </div>
    );
  }
  return (
    <Sheet title="APP LOCK" onClose={onClose}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, letterSpacing: "-0.02em", margin: "14px 0 8px" }}>Seal the ledger.</h2>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 14px" }}>
        A 4-digit PIN (and Face ID, if you like) locks Zeno whenever it leaves the foreground.
      </p>
      <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
        <LedgerLine label="PIN" value="SET · ••••" />
        <LedgerLine label="Face ID" value={<Switch checked={faceId} onChange={setFaceId} size="sm" />} />
        <LedgerLine label="Lock after" value="IMMEDIATELY" />
      </div>
      <Button variant="secondary" size="lg" fullWidth onClick={() => setLocked(true)} style={{ marginTop: 20 }} leftIcon={<Icon name="lock" size={16} />}>Preview the lock screen</Button>
    </Sheet>
  );
}
window.SecurityScreen = SecurityScreen;

/* Widgets & Watch — honestly labeled preview. */
function WidgetsScreen({ onClose }) {
  return (
    <Sheet title="WIDGETS & WATCH" onClose={onClose}>
      <div style={{ display: "inline-flex", alignSelf: "flex-start", margin: "12px 0 6px" }}>
        <Stamp size="sm" tone="neutral" angle={-3}>Preview — coming soon</Stamp>
      </div>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "10px 0 18px" }}>
        This is the design, not a shipped feature. It ships when it's good.
      </p>
      <SectionHead pad="0 0 10px">Home screen</SectionHead>
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ width: 132, height: 132, background: "var(--ink-panel)", borderRadius: 22, padding: 14, display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)" }}>NEXT RENEWAL</span>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "#fff", marginTop: 8 }}>Figma</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 19, color: "var(--accent)", marginTop: 2 }}>$12.00</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "rgba(255,255,255,0.55)", marginTop: "auto" }}>TOMORROW</span>
        </div>
        <div style={{ flex: 1, height: 132, background: "var(--surface-card)", border: "1px solid var(--rule-strong)", borderRadius: 22, padding: 14, display: "flex", flexDirection: "column" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", color: "var(--text-tertiary)" }}>THIS MONTH</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 22, marginTop: 6, fontFeatureSettings: "'tnum' 1" }}>$75.96</span>
          <div style={{ marginTop: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-secondary)", padding: "2px 0" }}><span>FIGMA</span><span>JUL 9</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-secondary)", padding: "2px 0" }}><span>DISNEY+</span><span>JUL 12</span></div>
          </div>
        </div>
      </div>
      <SectionHead pad="20px 0 10px">Watch</SectionHead>
      <div style={{ width: 96, height: 96, borderRadius: "50%", background: "var(--ink-panel)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "4px solid var(--ink-300)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)" }}>NEXT</span>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "#fff" }}>$12</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, letterSpacing: "0.1em", color: "var(--accent)" }}>TMRW</span>
      </div>
    </Sheet>
  );
}
window.WidgetsScreen = WidgetsScreen;

/* Wrapped — "The year, audited." Story beats in ledger language: ink pages,
   numbers that print up, final stamp. Tap to advance. NOT an IG-story clone:
   no gradients, no progress worms — page ticks like a document footer.
   MOTION: beat transition = page settle; numbers count up (AnimatedNumber);
   final stamp thunk + Success haptic. Reduced motion: crossfades. */
function WrappedScreen({ onClose }) {
  const [beat, setBeat] = React.useState(0);
  const beats = [
    { k: "01 · THE YEAR, AUDITED", big: "2026", sub: "Your subscriptions, on the record. Tap through." },
    { k: "02 · TOTAL COMMITTED", big: "$818.44", sub: "Across 10 tracked subscriptions since March — 10 months on the books." },
    { k: "03 · THE HEAVYWEIGHT", big: "$54.99/mo", sub: "Adobe CC was your most expensive line. It's also the one still fighting you." },
    { k: "04 · PROOF OF WORK", big: "$427/yr", sub: "Back in your pocket from 3 verified cancellations. Not promised — proven." },
  ];
  const last = beat === beats.length;

  return (
    <div onClick={() => !last && setBeat(b => b + 1)} style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ink-panel)", cursor: last ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 0" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[...beats, 0].map((_, i) => <span key={i} style={{ width: 15, height: 2.5, background: i <= beat ? "var(--accent)" : "rgba(255,255,255,0.2)" }}></span>)}
        </div>
        <button onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close" style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", padding: 10 }}><Icon name="x" size={20} color="rgba(255,255,255,0.7)" /></button>
      </div>
      {!last ? (
        <div key={beat} className="zn-print" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 60px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "var(--accent)" }}>{beats[beat].k}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 64, lineHeight: 1, letterSpacing: "-0.045em", color: "#fff", margin: "16px 0", fontFeatureSettings: "'tnum' 1" }}>{beats[beat].big}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 15.5, color: "rgba(255,255,255,0.72)", lineHeight: 1.55, maxWidth: "28ch" }}>{beats[beat].sub}</div>
          <div style={{ position: "absolute", bottom: 26, left: 28, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>TAP TO TURN THE PAGE</div>
        </div>
      ) : (
        <div className="zn-print" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 40px" }}>
          <Stamp animate size="lg" angle={-6} sub="10 MONTHS · 10 SUBSCRIPTIONS · $427 SAVED" style={{ color: "var(--accent)", borderColor: "var(--accent)", outlineColor: "var(--accent)" }}>Audited 2026</Stamp>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "rgba(255,255,255,0.65)", textAlign: "center", margin: "26px 0 0", maxWidth: "30ch", lineHeight: 1.55 }}>
            Coverage note: tracking since March. Next year gets the full twelve.
          </p>
          <Button variant="money" size="lg" onClick={e => { e.stopPropagation(); }} style={{ marginTop: 28 }} leftIcon={<Icon name="share" size={16} />}>Share the audit</Button>
        </div>
      )}
    </div>
  );
}
window.WrappedScreen = WrappedScreen;
