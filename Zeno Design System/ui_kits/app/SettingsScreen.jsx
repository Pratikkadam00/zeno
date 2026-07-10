/* Zeno — Settings. Ledger groups, designed bottom sheets replacing system
   alerts (currency, quiet hours, destructive confirms). Privacy & exit are
   dignified, top-level, and easy — the anti-dark-pattern flex.
   SLOP AUDIT — ① Zeno: bottom sheets with tear edges; required privacy
   sentence set like a pull-quote, not fine print. ② Tempted by: colored
   icon-tile grid rows → plain rows with small ink glyphs. ③ Lazy: iOS
   settings clone with chevrons everywhere. */
function SettingsScreen({ dark, onToggleDark, onUpgrade, onBack, onSecurity, onFamily, onWidgets }) {
  const [reminders, setReminders] = React.useState(true);
  const [sheet, setSheet] = React.useState(null); // 'currency' | 'quiet' | 'delete'
  const [currency, setCurrency] = React.useState("USD $");
  const [quiet, setQuiet] = React.useState("10 PM – 8 AM");

  const Row = ({ icon, title, sub, trailing, onClick, danger }) => (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", minHeight: 48, borderBottom: "1px solid var(--rule)", cursor: onClick ? "pointer" : "default" }}>
      <Icon name={icon} size={18} color={danger ? "var(--stamp-alert)" : "var(--text-secondary)"} style={{ flex: "none" }} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14.5, color: danger ? "var(--stamp-alert)" : "var(--text-primary)" }}>{title}</span>
        {sub && <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.08em", color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</span>}
      </span>
      {trailing || (onClick && <Icon name="chevron-right" size={16} color="var(--text-tertiary)" />)}
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", paddingBottom: 24 }}>
        <Masthead kicker="THE BACK OFFICE" title="Settings"
          left={onBack ? <IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton> : null} rule={false} />

        {/* Account line */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: "1px solid var(--rule-strong)" }}>
            <ServiceAvatar name="Alex Rivera" color="var(--cat-teal)" size={44} shape="circle" />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 16 }}>Alex Rivera</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--text-tertiary)", marginTop: 2 }}>LOCAL LEDGER · NO ACCOUNT</div>
            </div>
            <Button variant="secondary" size="sm" onClick={onUpgrade}>Free · 8/10</Button>
          </div>
        </div>

        <SectionHead>Notifications</SectionHead>
        <div style={{ padding: "0 20px" }}>
          <Row icon="bell" title="Renewal reminders" sub="7D · 3D · DAY OF" trailing={<Switch checked={reminders} onChange={setReminders} size="sm" />} />
          <Row icon="moon-star" title="Quiet hours" sub={quiet.toUpperCase()} onClick={() => setSheet("quiet")} />
        </div>

        <SectionHead>The app</SectionHead>
        <div style={{ padding: "0 20px" }}>
          <Row icon="moon" title="Dark mode" sub="THE 11PM LEDGER" trailing={<Switch checked={dark} onChange={onToggleDark} size="sm" />} />
          <Row icon="circle-dollar-sign" title="Home currency" sub={`TOTALS SHOWN IN ${currency.toUpperCase()}`} onClick={() => setSheet("currency")} />
          <Row icon="mail-search" title="Connected inboxes" sub="1 CONNECTED · REVOCABLE" onClick={() => {}} />
          <Row icon="lock" title="App lock" sub="PIN + FACE ID" onClick={onSecurity} />
          <Row icon="users" title="Family Vault" sub="SHARE TOTALS ONLY" onClick={onFamily} />
          <Row icon="layout-grid" title="Widgets & Watch" sub="PREVIEW — COMING SOON" onClick={onWidgets} />
        </div>

        <SectionHead>Data &amp; privacy</SectionHead>
        <div style={{ padding: "0 20px" }}>
          {/* the promise, set with dignity — a pull-quote, not fine print */}
          <blockquote style={{ margin: "4px 0 10px", padding: "2px 0 2px 14px", borderLeft: "3px solid var(--accent)", fontFamily: "var(--font-sans)", fontSize: 14, lineHeight: 1.6, color: "var(--text-primary)" }}>
            Your subscriptions live on your phone, encrypted. Nothing leaves it unless you turn on a cloud feature — and we ask first.
          </blockquote>
          <Row icon="download" title="Export my data" sub="EVERYTHING, AS CSV — YOURS" onClick={() => {}} />
          <Row icon="trash-2" title="Delete all my data" sub="ERASES THIS LEDGER" onClick={() => setSheet("delete")} danger />
        </div>

        <SectionHead>Account</SectionHead>
        <div style={{ padding: "0 20px" }}>
          <Row icon="credit-card" title="Plan & billing" sub="FREE" onClick={onUpgrade} />
          <Row icon="circle-help" title="Help & feedback" onClick={() => {}} />
          <Row icon="log-out" title="Sign out" onClick={() => {}} />
          <Row icon="file-x" title="Cancel my Zeno account" sub="ONE TAP. NO RETENTION MAZE." onClick={() => {}} danger />
        </div>
        <div style={{ padding: "18px 20px 0", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.14em", color: "var(--text-disabled)" }}>ZENO 1.4.0 · MADE WITH CARE FOR PEOPLE WHO HATE SURPRISE CHARGES</div>
      </div>

      {sheet === "currency" && (
        <BottomSheetLite title="HOME CURRENCY" onClose={() => setSheet(null)}
          options={[["USD $"], ["EUR €"], ["GBP £"], ["CAD $"]].map(([c]) => ({ label: c, value: c, selected: currency === c }))}
          onPick={c => { setCurrency(c); setSheet(null); }} />
      )}
      {sheet === "quiet" && (
        <BottomSheetLite title="QUIET HOURS" onClose={() => setSheet(null)}
          options={[{ label: "10 PM – 8 AM", value: "10 PM – 8 AM", selected: quiet === "10 PM – 8 AM" }, { label: "9 PM – 9 AM", value: "9 PM – 9 AM", selected: quiet === "9 PM – 9 AM" }, { label: "Off — alert any time", value: "Off" }]}
          onPick={v => { setQuiet(v); setSheet(null); }} />
      )}
      {sheet === "delete" && (
        <BottomSheetLite title="DELETE ALL DATA?" onClose={() => setSheet(null)}
          destructive="This erases every entry on this phone. There is no cloud copy unless you enabled sync. This cannot be undone."
          options={[{ label: "Delete everything", value: "del", tone: "danger" }]}
          onPick={() => setSheet(null)} />
      )}
    </div>
  );
}
window.SettingsScreen = SettingsScreen;
