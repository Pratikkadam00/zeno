/* Zeno — Notifications inbox: FLAGS (needs attention now) + the upcoming
   reminder feed (what Zeno will say, when). Overrides the earlier inline
   version (this file loads later); data now lives in data.js.
   SLOP AUDIT — ① Zeno: two-zone register with margin ticks for flags and a
   WHEN … AMOUNT reminder table; quiet-hours as a printed schedule note.
   ② Tempted by: one infinite feed with unread-dot chrome → zoned ledger with
   column heads. ③ Lazy version: iOS notification list clone, relative
   timestamps, red badges.
   MOTION: rows print in (45ms stagger; RN FadeInDown); tapping a row =
   impactAsync(Light); no unread pulsing. Reduced motion: fades.
   Light + dark via tokens. All rows ≥48pt. */
function NotificationsScreen({ onClose, onOpen }) {
  const A = window.ZENO.alerts;
  const [demoEmpty, setDemoEmpty] = React.useState(false);
  const toneColor = { alert: "var(--stamp-alert)", warn: "var(--warning)", info: "var(--info)" };
  const flags = demoEmpty ? [] : A.flags;
  const reminders = demoEmpty ? [] : A.reminders.slice(0, 12);

  return (
    <Sheet title="ALERTS" onClose={onClose}>
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", margin: "6px 0 0", lineHeight: 1.5 }}>
        Quiet hours {A.quietHours} — anything due overnight shifts to morning.
      </div>

      {/* ZONE 1 — flags */}
      <SectionHead pad="20px 0 8px">Flags</SectionHead>
      {flags.length === 0 ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-tertiary)", lineHeight: 1.5, padding: "2px 0 6px" }}>
          Nothing needs your attention. That's the goal.
        </div>
      ) : (
        flags.map((n, i) => (
          <button key={n.id + i} onClick={() => onOpen(n.id)} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "12px 0", minHeight: 52, cursor: "pointer" }}>
            <span style={{ width: 3, alignSelf: "stretch", background: toneColor[n.tone], flex: "none", borderRadius: 2 }}></span>
            <Icon name={n.icon} size={17} color={toneColor[n.tone]} style={{ flex: "none" }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{n.title}</span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.08em", color: "var(--text-tertiary)", marginTop: 3 }}>{n.meta}</span>
            </span>
            <Icon name="chevron-right" size={15} color="var(--text-tertiary)" />
          </button>
        ))
      )}

      {/* ZONE 2 — the reminder feed */}
      <SectionHead pad="22px 0 8px" right={reminders.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)" }}>NEXT {reminders.length}</span>}>Coming up</SectionHead>
      {reminders.length === 0 ? (
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-tertiary)", lineHeight: 1.5, padding: "2px 0" }}>
          No reminders scheduled — add a subscription and Zeno fills these in.
        </div>
      ) : (
        <React.Fragment>
          <ColumnHeads left="WHEN · SERVICE" right="AMOUNT" style={{ padding: "0 0 6px" }} />
          {reminders.map((r, i) => (
            <div key={r.name + r.date} className="zn-print" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
              <div onClick={() => onOpen(r.id)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", minHeight: 48, cursor: "pointer" }}>
                <span style={{ width: 44, flex: "none", textAlign: "center" }}>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", lineHeight: 1 }}>{r.date.split(" ")[1]}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginTop: 2 }}>{r.date.split(" ")[0].toUpperCase()}</span>
                </span>
                <span style={{ flex: "none", minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{r.name}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 2 }}>{r.kind.toUpperCase()}</span>
                </span>
                <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted var(--rule-strong)", transform: "translateY(3px)", minWidth: 12 }}></span>
                <span style={{ flex: "none", fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>${r.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </React.Fragment>
      )}

      <div style={{ marginTop: 22, padding: "12px 14px", border: "1px dashed var(--rule-strong)", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginBottom: 8 }}>DEMO · PREVIEW EMPTY STATE</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setDemoEmpty(e => !e)} style={{ flex: 1 }}>{demoEmpty ? "Show populated" : "Show empty"}</Button>
        </div>
      </div>
    </Sheet>
  );
}
window.NotificationsScreen = NotificationsScreen;
