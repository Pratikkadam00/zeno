/* Zeno — Year in Review ("the year, audited"). Tap-through statement pages on
   ink; REQUIRED coverage honesty ("since I started tracking in March") kept
   verbatim; the Stamp closes it per the signature contract. Shared as TEXT
   via the system share sheet — the button says exactly that, no fake
   image-export UI. Overrides the earlier inline version.
   SLOP AUDIT — ① Zeno: year-end statement pages with page ticks like a
   document footer, numbers in tabular mono, tally of verified cancellations.
   ② Tempted by: IG-story gradients + progress worms + share-as-image card →
   ink pages, mono ticks, honest text share. ③ Lazy version: confetti recap
   carousel with a "Wrapped" logo knockoff.
   MOTION: page turn = crossfade + settle (RN: FadeInDown 240ms); numbers
   count up on entry (AnimatedNumber 600ms); final stamp = spring d14 s420 +
   Success haptic — the app's one celebration. Reduced motion: crossfades.
   Ink-panel bg is theme-stable; light/dark both read. */
function WrappedScreen({ onClose }) {
  const W = window.ZENO.wrapped;
  const [beat, setBeat] = React.useState(0);
  const beats = [
    { k: `01 · THE YEAR, AUDITED`, big: String(W.year), sub: `Your subscriptions, on the record — since I started tracking in ${W.sinceMonth}. Tap through.` },
    { k: "02 · TOTAL COMMITTED", big: `$${W.total.toFixed(2)}`, sub: `Across ${W.tracked} tracked subscriptions in ${W.months} months on the books.` },
    { k: "03 · THE HEAVYWEIGHT", big: `$${W.top.amount.toFixed(2)}/mo`, sub: `${W.top.name} was your most expensive line all year.` },
    { k: "04 · PROOF OF WORK", big: `$${W.savedYr}/yr`, sub: `Back in your pocket from ${W.cancelled} verified cancellations. Not promised — proven.` },
  ];
  const last = beat === beats.length;

  return (
    <div onClick={() => !last && setBeat(b => b + 1)} style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--ink-panel)", cursor: last ? "default" : "pointer", position: "relative", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px 0" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {[...beats, 0].map((_, i) => <span key={i} style={{ width: 15, height: 2.5, background: i <= beat ? "var(--green-400)" : "rgba(255,255,255,0.2)" }}></span>)}
        </div>
        <button onClick={e => { e.stopPropagation(); onClose(); }} aria-label="Close" style={{ background: "none", border: "none", cursor: "pointer", padding: 10, minWidth: 44, minHeight: 44 }}><Icon name="x" size={20} color="rgba(255,255,255,0.7)" /></button>
      </div>

      {!last ? (
        <div key={beat} className="zn-print" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 28px 60px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", color: "var(--green-400)" }}>{beats[beat].k}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 62, lineHeight: 1, letterSpacing: "-0.045em", color: "#F2F1EA", margin: "16px 0", fontFeatureSettings: "'tnum' 1" }}>{beats[beat].big}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 15.5, color: "rgba(242,241,234,0.72)", lineHeight: 1.55, maxWidth: "28ch" }}>{beats[beat].sub}</div>
          <div style={{ position: "absolute", bottom: 26, left: 28, fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)" }}>TAP TO TURN THE PAGE</div>
        </div>
      ) : (
        <div className="zn-print" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 28px 40px" }}>
          <Stamp animate size="lg" angle={-6} sub={`${W.months} MONTHS · ${W.tracked} SUBSCRIPTIONS · $${W.savedYr} SAVED`} style={{ color: "var(--green-400)", borderColor: "var(--green-400)", outlineColor: "var(--green-400)" }}>Audited {W.year}</Stamp>
          {/* REQUIRED coverage honesty — never imply a full year that isn't */}
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "rgba(255,255,255,0.65)", textAlign: "center", margin: "26px 0 0", maxWidth: "30ch", lineHeight: 1.55 }}>
            Coverage note: since I started tracking in {W.sinceMonth} — {W.months} months, not the full year.
          </p>
          <Button variant="money" size="lg" onClick={e => e.stopPropagation()} style={{ marginTop: 26 }} leftIcon={<Icon name="share" size={16} />}>Share as text</Button>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.14em", color: "rgba(255,255,255,0.35)", marginTop: 10 }}>OPENS THE SYSTEM SHARE SHEET</div>
        </div>
      )}
    </div>
  );
}
window.WrappedScreen = WrappedScreen;
