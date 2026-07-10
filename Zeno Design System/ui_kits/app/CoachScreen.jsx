/* Zeno — NEW SCREENS batch 1: Coach (consent as a trust moment), Notifications
   inbox, Spend Twin. All FREE features (per legal).
   COACH SLOP AUDIT — ① Zeno: consent set like a short agreement you actually
   read; coach output = margin annotations in accountant's green, icon is a
   pen, not a sparkle. ② Tempted by: ✨AI gradient card → plain paper + pen.
   ③ Lazy: chat bubble UI with a robot avatar. */
function CoachScreen({ onClose, onCancelSub }) {
  const [enabled, setEnabled] = React.useState(null); // null = not chosen, false = on-device, true = AI
  const recs = [
    { title: "Cancel Figma", body: "No activity in 60 days. You'd feel this one the least.", save: "$144/yr", id: "figma" },
    { title: "Let the Disney+ trial lapse", body: "It converts in 2 days. Doing nothing costs $13.99/mo.", save: "$167/yr", id: "disney" },
    { title: "Netflix + Max overlap", body: "Two video services renewed this month. Keeping one covers most of what you watch.", save: "$192/yr", id: "hbo" },
  ];

  return (
    <Sheet title="SPEND COACH" onClose={onClose}>
      {enabled == null ? (
        <React.Fragment>
          <div style={{ padding: "10px 0 0" }}>
            <Icon name="pen-line" size={26} color="var(--text-secondary)" />
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 23, letterSpacing: "-0.02em", margin: "12px 0 8px" }}>Coaching is optional.<br />Here's the deal.</h2>
          </div>
          <div style={{ borderTop: "1px solid var(--rule-strong)", marginTop: 8 }}>
            {[
              ["On-device by default", "Zeno's built-in insights run right here. Nothing is sent anywhere."],
              ["AI coaching, only if you ask", "Enabling it sends your subscription names and amounts — never credentials, never email contents — to generate advice."],
              ["Revocable", "Turn it off any time in Settings. Off means off."],
            ].map(([t, b], i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--rule)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)" }}>{String(i + 1).padStart(2, "0")}</span>
                <span>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14.5 }}>{t}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5 }}>{b}</span>
                </span>
              </div>
            ))}
          </div>
          {/* equal-weight choice — no dark pattern */}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <Button variant="secondary" size="lg" onClick={() => setEnabled(false)} style={{ flex: 1 }}>Not now</Button>
            <Button variant="primary" size="lg" onClick={() => setEnabled(true)} style={{ flex: 1 }}>Enable AI coaching</Button>
          </div>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-tertiary)", textAlign: "center", marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>GENERAL INFORMATION, NOT FINANCIAL ADVICE.</p>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", margin: "8px 0 4px", lineHeight: 1.5 }}>
            {enabled ? "AI coaching is on." : "On-device insights only."} To hit your $80 cap, the margin notes below save the most for the least pain.
          </div>
          {recs.map((r, i) => (
            <div key={r.id} className="zn-print" style={{ animationDelay: `${i * 60}ms`, display: "flex", gap: 12, borderLeft: "3px solid var(--accent)", paddingLeft: 12, margin: "16px 0" }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15 }}>{r.title}</span>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--accent-text)" }}>+{r.save}</span>
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{r.body}</div>
                <button onClick={() => onCancelSub(r.id)} style={{ background: "none", border: "none", padding: "8px 0 0", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-primary)", cursor: "pointer" }}>OPEN CANCEL GUIDE ↗</button>
              </div>
            </div>
          ))}
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: "var(--text-tertiary)", textAlign: "center", marginTop: 20, paddingTop: 12, borderTop: "1px solid var(--rule)" }}>GENERAL INFORMATION, NOT FINANCIAL ADVICE.</p>
        </React.Fragment>
      )}
    </Sheet>
  );
}
window.CoachScreen = CoachScreen;

/* Notifications inbox — the alert register. Margin ticks by type. */
function NotificationsScreen({ onClose, onOpen }) {
  const groups = [
    ["TODAY", [
      { tick: "var(--stamp-alert)", icon: "triangle-alert", t: "Adobe CC is still charging you", s: "$54.99 FOUND ON JUL 08 — CANCELLATION DIDN'T STICK", id: "adobe" },
      { tick: "var(--warning)", icon: "alarm-clock", t: "Disney+ trial ends in 2 days", s: "CONVERTS TO $13.99/MO ON JUL 12", id: "disney" },
    ]],
    ["THIS WEEK", [
      { tick: "var(--info)", icon: "trending-up", t: "Netflix raised its price", s: "$13.99 → $15.99 /MO · +14%", id: "netflix" },
      { tick: "var(--ink-400)", icon: "bell", t: "Figma renews Jul 9", s: "$12.00 · 3-DAY REMINDER", id: "figma" },
      { tick: "var(--stamp-verified)", icon: "check-check", t: "Hulu verified cancelled", s: "NO CHARGE FOUND · SAVING $95.88/YR", id: "hulu" },
    ]],
  ];
  return (
    <Sheet title="ALERTS" onClose={onClose}>
      <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", margin: "6px 0 0" }}>Everything Zeno has warned you about. Quiet hours respected: 10 PM – 8 AM.</p>
      {groups.map(([label, items]) => (
        <React.Fragment key={label}>
          <SectionHead pad="20px 0 8px">{label}</SectionHead>
          {items.map((n, i) => (
            <button key={i} onClick={() => onOpen(n.id)} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "12px 0", minHeight: 52, cursor: "pointer" }}>
              <span style={{ width: 3, alignSelf: "stretch", background: n.tick, flex: "none", borderRadius: 2 }}></span>
              <Icon name={n.icon} size={17} color={n.tick} style={{ flex: "none" }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14 }}>{n.t}</span>
                <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--text-tertiary)", marginTop: 3 }}>{n.s}</span>
              </span>
              <Icon name="chevron-right" size={15} color="var(--text-tertiary)" />
            </button>
          ))}
        </React.Fragment>
      ))}
    </Sheet>
  );
}
window.NotificationsScreen = NotificationsScreen;

/* Spend Twin — you vs the typical subscriber. Two ruled bars, one calm verdict. */
function SpendTwinScreen({ onClose }) {
  const you = window.ZENO.monthlyTotal, typical = 133;
  const pct = Math.round((1 - you / typical) * 100);
  return (
    <Sheet title="SPEND TWIN" onClose={onClose}>
      <div style={{ padding: "18px 0 0" }}>
        <LedgerLine label="You" strong value={`$${you.toFixed(2)}/mo`} size={15} />
        <div style={{ height: 10, background: "var(--text-primary)", width: `${(you / typical) * 100}%`, marginBottom: 18 }}></div>
        <LedgerLine label="Typical subscriber" sub="PUBLISHED AVERAGES" value={`$${typical.toFixed(2)}/mo`} size={15} />
        <div style={{ height: 10, background: "var(--rule-strong)", width: "100%" }}></div>
      </div>
      <div style={{ margin: "26px 0 0", borderTop: "1.5px solid var(--rule-strong)", paddingTop: 16 }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 42, letterSpacing: "-0.03em", color: "var(--stamp-verified)" }}>{pct}% less</div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "8px 0 0", maxWidth: "32ch" }}>
          Your recurring spend runs leaner than the typical subscriber's. That gap is worth <b style={{ color: "var(--text-primary)" }}>${((typical - you) * 12).toFixed(0)} a year</b>.
        </p>
      </div>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", marginTop: 24 }}>COMPARISON FROM PUBLISHED AVERAGES — NOT YOUR NEIGHBORS' DATA.</p>
    </Sheet>
  );
}
window.SpendTwinScreen = SpendTwinScreen;
