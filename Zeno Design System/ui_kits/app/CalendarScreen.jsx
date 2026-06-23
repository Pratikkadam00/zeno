/* Zeno — Calendar of upcoming renewals (calendar tab) */
function CalendarScreen({ onOpen }) {
  const subs = window.ZENO.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader large title="Calendar"
        right={<IconButton label="Filter"><Icon name="sliders-horizontal" /></IconButton>} />

      <div style={{ padding: "4px 16px 0" }}>
        <Card padding="md" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 46, height: 46, borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
            <Icon name="calendar-clock" size={22} color="var(--accent-text)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Next 30 days</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}>{subs.length} renewals · ${subs.reduce((a,s)=>a+s.amount,0).toFixed(2)}</div>
          </div>
        </Card>
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)", padding: "22px 20px 8px" }}>July 2026</div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        {subs.map(s => (
          <div key={s.id} onClick={() => onOpen(s.id)} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "10px 12px", boxShadow: "var(--shadow-xs)", cursor: "pointer" }}>
            <div style={{ width: 48, flex: "none", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)", lineHeight: 1 }}>{s.next.split(" ")[1]}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>{s.next.split(" ")[0]}</div>
            </div>
            <div style={{ width: 1, height: 32, background: "var(--border-subtle)", flex: "none" }} />
            <ServiceAvatar name={s.name} color={s.color} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14.5, color: "var(--text-primary)" }}>{s.name}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)" }}>{s.category}</div>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14.5, color: "var(--text-primary)" }}>${s.amount.toFixed(2)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
window.CalendarScreen = CalendarScreen;
