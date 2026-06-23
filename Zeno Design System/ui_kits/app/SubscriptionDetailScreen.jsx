/* Zeno — Subscription detail (CHANGE 6 real history, CHANGE 4 verification states) */
function SubscriptionDetailScreen({ id, onBack, onCancel }) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const [reminder, setReminder] = React.useState(true);
  const yearly = (s.amount * 12).toFixed(2);
  const billing = ["active", "trial"].includes(s.status);

  // Verification banner per status
  const banner = {
    pending:   ["info", "clock", "Cancellation pending verification", `You cancelled on ${s.cancelledOn}. We'll confirm there's no charge around ${s.next}.`],
    attention: ["danger", "triangle-alert", "Still being charged", `Cancelled ${s.cancelledOn}, but a charge appeared on ${s.history[0] && s.history[0][0]}. Needs attention.`],
    cancelled: ["success", "check-check", "Verified cancelled", `No charge found after ${s.cancelledOn}. You're saving $${yearly}/yr.`],
    trial:     ["warning", "alarm-clock", "Free trial", `Converts to $${s.amount.toFixed(2)}/mo on ${s.trialEnds}. Cancel before then to avoid it.`],
  }[s.status];

  const rows = [
    { icon: "tag", label: "Category", value: s.category },
    { icon: "calendar", label: "Next payment", value: billing ? s.next : "—" },
    { icon: "repeat", label: "Billing cycle", value: s.cadence === "mo" ? "Monthly" : "Yearly" },
    { icon: "circle-dollar-sign", label: "Per year", value: `$${yearly}` },
  ];

  const bc = banner && { info: ["var(--info-soft)","var(--info)"], danger: ["var(--danger-soft)","var(--danger)"], success: ["var(--success-soft)","var(--success)"], warning: ["var(--warning-soft)","#B45309"] }[banner[0]];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader title=""
        left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>}
        right={<IconButton label="More"><Icon name="more-horizontal" size={22} /></IconButton>} />

      {/* Hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4px 20px 16px" }}>
        <ServiceAvatar name={s.name} color={s.color} size={72} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 24, marginTop: 12, color: "var(--text-primary)" }}>{s.name}</div>
        <div style={{ marginTop: 6 }}><StatusPill status={s.status} /></div>
        <div style={{ marginTop: 14 }}><AmountDisplay amount={s.amount} cadence={s.cadence} size="lg" /></div>
      </div>

      {/* Verification / status banner */}
      {banner && (
        <div style={{ padding: "0 16px 4px" }}>
          <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: bc[0], borderRadius: "var(--radius-lg)", padding: "14px 16px" }}>
            <Icon name={banner[1]} size={20} color={bc[1]} style={{ marginTop: 1 }} />
            <div>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{banner[2]}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.45 }}>{banner[3]}</div>
              {s.status === "attention" && <div style={{ marginTop: 10 }}><Button variant="danger" size="sm" onClick={() => onCancel(s.id)} leftIcon={<Icon name="life-buoy" size={15} />}>Re-open cancellation help</Button></div>}
            </div>
          </div>
        </div>
      )}

      {/* Details */}
      <div style={{ padding: "12px 16px 0" }}>
        <Card padding="none">
          {rows.map((r, i) => (
            <ListRow key={r.label} divider={i < rows.length - 1}
              leading={<div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name={r.icon} size={17} color="var(--text-secondary)" /></div>}
              title={r.label}
              trailing={<span style={{ fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>{r.value}</span>} />
          ))}
        </Card>
      </div>

      {/* Real charge history (CHANGE 6) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 20px 10px" }}>
        <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>Charge history</span>
        {s.history.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>{s.history.length} charges</span>}
      </div>
      <div style={{ padding: "0 16px" }}>
        {s.history.length === 0 ? (
          <Card padding="lg">
            <div style={{ textAlign: "center", color: "var(--text-tertiary)" }}>
              <Icon name="receipt" size={26} color="var(--text-tertiary)" style={{ margin: "0 auto 10px" }} />
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 14, color: "var(--text-secondary)" }}>No charges tracked yet</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, marginTop: 3 }}>We'll log each charge here as it happens.</div>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            {(s.history.length > 5 ? s.history.slice(0, 5) : s.history).map(([date, amt], i, arr) => (
              <ListRow key={date} divider={i < arr.length - 1}
                leading={<div style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="receipt" size={16} color="var(--text-tertiary)" /></div>}
                title={date}
                trailing={<span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>${amt.toFixed(2)}</span>} />
            ))}
            {s.history.length > 5 && (
              <div style={{ padding: "12px 14px", textAlign: "center", borderTop: "1px solid var(--border-subtle)" }}>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--accent-text)", cursor: "pointer" }}>Show all {s.history.length} charges</span>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Reminder */}
      {billing && (
        <div style={{ padding: "12px 16px 0" }}>
          <Card padding="md">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>Payment reminders</div>
                <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 1 }}>7 and 3 days before renewal</div>
              </div>
              <Switch checked={reminder} onChange={setReminder} />
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "20px 16px 0" }}>
        {billing && <Button variant="secondary" size="lg" fullWidth leftIcon={<Icon name="pause" size={18} />}>Pause subscription</Button>}
        {billing && <Button variant="danger" size="lg" fullWidth onClick={() => onCancel(s.id)} leftIcon={<Icon name="circle-x" size={18} />}>Cancel subscription</Button>}
      </div>
    </div>
  );
}
window.SubscriptionDetailScreen = SubscriptionDetailScreen;
