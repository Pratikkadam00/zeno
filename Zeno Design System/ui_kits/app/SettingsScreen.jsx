/* Zeno — Settings (CHANGE 8: privacy & exit are easy to find, not buried). */
function SettingsScreen({ dark, onToggleDark, onUpgrade, onBack }) {
  const [reminders, setReminders] = React.useState(true);
  const [quiet, setQuiet] = React.useState(true);

  const Group = ({ children }) => (
    <div style={{ padding: "0 16px", marginBottom: 18 }}><Card padding="none">{children}</Card></div>
  );
  const GroupTitle = ({ children }) => (
    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", padding: "8px 24px 8px" }}>{children}</div>
  );
  const tile = (name, bg) => (
    <div style={{ width: 30, height: 30, borderRadius: "var(--radius-sm)", background: bg, display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
      <Icon name={name} size={17} color="#fff" />
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader large title="Settings"
        left={onBack ? <IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton> : null} />

      {/* Profile + plan */}
      <div style={{ padding: "4px 16px 18px" }}>
        <Card padding="md" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ServiceAvatar name="Alex Rivera" color="var(--cat-teal)" size={52} shape="circle" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18, color: "var(--text-primary)" }}>Alex Rivera</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}>alex@hey.com</div>
          </div>
          <Button variant="primary" size="sm" onClick={onUpgrade}>Go Pro</Button>
        </Card>
      </div>

      <GroupTitle>Notifications</GroupTitle>
      <Group>
        <ListRow leading={tile("bell", "var(--cat-coral)")} title="Renewal reminders" subtitle="7 · 3 · day-of" trailing={<Switch checked={reminders} onChange={setReminders} />} divider />
        <ListRow leading={tile("moon-star", "var(--cat-violet)")} title="Quiet hours" subtitle="10pm – 8am" trailing={<Switch checked={quiet} onChange={setQuiet} />} />
      </Group>

      <GroupTitle>App</GroupTitle>
      <Group>
        <ListRow leading={tile("moon", "var(--ink-700)")} title="Dark mode" trailing={<Switch checked={dark} onChange={onToggleDark} />} divider />
        <ListRow leading={tile("palette", "var(--cat-amber)")} title="Appearance &amp; icon" subtitle="Optional themes" chevron onClick={()=>{}} divider />
        <ListRow leading={tile("mail-search", "var(--cat-blue)")} title="Connected inboxes" trailing={<span style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)" }}>1 connected</span>} chevron onClick={()=>{}} divider />
        <ListRow leading={tile("users", "var(--cat-green)")} title="Family / Household" chevron onClick={()=>{}} />
      </Group>

      {/* Data & privacy — deliberately top-level */}
      <GroupTitle>Data &amp; privacy</GroupTitle>
      <div style={{ padding: "0 16px 8px" }}>
        <div style={{ display: "flex", gap: 9, alignItems: "flex-start", background: "var(--success-soft)", border: "1px solid color-mix(in srgb, var(--success) 20%, transparent)", borderRadius: "var(--radius-md)", padding: "11px 13px", marginBottom: 12 }}>
          <Icon name="shield-check" size={17} color="var(--success)" style={{ marginTop: 1 }} />
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>Your financial data is encrypted on this device. We never see your bank login or your data.</span>
        </div>
      </div>
      <Group>
        <ListRow leading={tile("download", "var(--cat-slate)")} title="Export my data" subtitle="Download everything as CSV" chevron onClick={()=>{}} divider />
        <ListRow leading={tile("trash-2", "var(--danger)")} title="Delete all my data" subtitle="Erase everything from this device" chevron onClick={()=>{}} />
      </Group>

      <GroupTitle>Account</GroupTitle>
      <Group>
        <ListRow leading={tile("credit-card", "var(--cat-blue)")} title="Plan &amp; billing" trailing={<span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--text-tertiary)" }}>Free</span>} chevron onClick={onUpgrade} divider />
        <ListRow leading={tile("circle-help", "var(--cat-teal)")} title="Help &amp; feedback" chevron onClick={()=>{}} />
      </Group>

      {/* Easy exit */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <Button variant="secondary" size="lg" fullWidth leftIcon={<Icon name="log-out" size={18} />}>Sign out</Button>
        <button style={{ background: "none", border: "none", color: "var(--danger)", fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, cursor: "pointer", padding: "8px" }}>Cancel my Zeno account</button>
      </div>
    </div>
  );
}
window.SettingsScreen = SettingsScreen;
