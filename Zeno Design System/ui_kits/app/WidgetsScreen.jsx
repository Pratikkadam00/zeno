/* Zeno — Widgets & Watch preview. Real widget-shaped frames (small + medium
   home-screen, circular watch complication) so the preview feels real, with
   the REQUIRED honest notice keeping it truthful. Overrides the earlier
   inline version; data from data.js + live monthly total.
   SLOP AUDIT — ① Zeno: the widgets themselves speak ledger — mono money,
   caps kickers, ledger dots in the medium glance; honesty notice as a
   margin-tick statement. ② Tempted by: glossy device mockup photos + "coming
   soon ✨" → flat honest frames and a dated promise. ③ Lazy version: two gray
   rectangles labeled "widget preview".
   MOTION: frames print in (60ms stagger; RN FadeInDown); nothing loops.
   Reduced motion: fades. Light + dark: widget frames are ink-stable, page
   follows tokens. */
function WidgetsScreen({ onClose }) {
  const W = window.ZENO.widgets;
  const total = window.ZENO.monthlyTotal;
  const active = window.ZENO.subscriptions.filter(s => ["active", "trial"].includes(s.status)).length;
  const days = W.next.days;
  const daysLabel = days === 0 ? "TODAY" : days === 1 ? "TOMORROW" : `IN ${days} DAYS`;

  return (
    <Sheet title="WIDGETS & WATCH" onClose={onClose}>
      {/* REQUIRED honest notice — meaning kept: preview only, not shipped */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", borderLeft: "3px solid var(--ink-300)", paddingLeft: 12, margin: "10px 0 4px" }}>
        <div>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Preview only, for now.</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5 }}>
            Adding a Zeno widget to your home screen or watch face isn't available yet — we'll let you know when it ships.
          </div>
        </div>
      </div>

      <SectionHead pad="20px 0 10px">Home screen</SectionHead>
      <div style={{ display: "flex", gap: 12 }}>
        {/* Small widget — next renewal */}
        <div className="zn-print" style={{ width: 148, height: 148, flex: "none", background: "var(--ink-panel)", borderRadius: 26, padding: 15, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-sm)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)" }}>NEXT RENEWAL</span>
          <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 16, color: "#F2F1EA", marginTop: 9 }}>{W.next.name}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 21, color: "var(--green-400)", marginTop: 2, fontFeatureSettings: "'tnum' 1" }}>${W.next.amount.toFixed(2)}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.55)", marginTop: "auto" }}>{daysLabel}</span>
        </div>
        {/* Medium widget — monthly glance */}
        <div className="zn-print" style={{ animationDelay: "60ms", flex: 1, height: 148, background: "var(--ink-panel)", borderRadius: 26, padding: 15, display: "flex", flexDirection: "column", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.16em", color: "rgba(255,255,255,0.5)" }}>THIS MONTH</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.45)" }}>{active} ACTIVE</span>
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 24, color: "#F2F1EA", marginTop: 7, fontFeatureSettings: "'tnum' 1" }}>${total.toFixed(2)}</span>
          <div style={{ marginTop: "auto" }}>
            {[["FIGMA", "JUL 9"], ["DISNEY+", "JUL 12"]].map(([n, d]) => (
              <div key={n} style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2.5px 0" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>{n}</span>
                <span style={{ flex: 1, borderBottom: "1.5px dotted rgba(255,255,255,0.25)", transform: "translateY(-2px)" }}></span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.55)" }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionHead pad="22px 0 10px">Watch</SectionHead>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div className="zn-print" style={{ animationDelay: "120ms", width: 104, height: 104, flex: "none", borderRadius: "50%", background: "var(--ink-panel)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "4px solid var(--ink-300)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.5)" }}>NEXT</span>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17, color: "#F2F1EA" }}>${W.next.amount.toFixed(0)}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: "var(--green-400)" }}>{days === 1 ? "TMRW" : daysLabel}</span>
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.55 }}>
          The complication shows your next renewal and how close it is — a glance, not a dashboard.
        </div>
      </div>
    </Sheet>
  );
}
window.WidgetsScreen = WidgetsScreen;
