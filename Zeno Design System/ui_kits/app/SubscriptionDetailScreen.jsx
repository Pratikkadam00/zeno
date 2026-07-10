/* Zeno — Subscription detail: the account page. Ledger lines for facts,
   a real charge-history table, stamps for verified/attention states.
   SLOP AUDIT — ① Zeno: charge history with column heads + leader dots;
   cancelled state = rotated stamp over the header. ② Tempted by: stat-card
   trio under a glowing avatar → LedgerLines on rules instead. ③ Lazy version:
   hero card + 3 stat tiles + generic list. */
function SubscriptionDetailScreen({ id, onBack, onCancel }) {
  const s = window.ZENO.subscriptions.find(x => x.id === id) || window.ZENO.subscriptions[0];
  const [reminder, setReminder] = React.useState(true);
  const yearly = (s.amount * 12).toFixed(2);
  const billing = ["active", "trial"].includes(s.status);

  const banner = {
    pending: ["var(--info)", "clock", "Awaiting proof", `You reported this cancelled ${s.cancelledOn}. Zeno checks your next receipt or statement around ${s.next} before believing it.`],
    attention: ["var(--stamp-alert)", "triangle-alert", "Still being charged", `A $${s.amount.toFixed(2)} charge appeared after you cancelled. The cancellation didn't stick.`],
    trial: ["var(--warning)", "alarm-clock", "Trial converts in 2 days", `Becomes $${s.amount.toFixed(2)}/mo on ${s.trialEnds}. Cancel before then and pay nothing.`],
  }[s.status];

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader title={s.category.toUpperCase()}
        left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>}
        right={<IconButton label="Edit"><Icon name="pencil-line" size={19} /></IconButton>} />

      {/* Account header — left-aligned, editorial */}
      <div style={{ padding: "10px 20px 0", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ServiceAvatar name={s.name} color={s.color} size={54} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", color: "var(--text-primary)", lineHeight: 1.05 }}>{s.name}</div>
            <div style={{ marginTop: 5 }}><StatusPill status={s.status} /></div>
          </div>
          {s.status === "cancelled" && (
            <Stamp angle={7} size="md" sub={`SAVED $${yearly}/YR`}>Verified</Stamp>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16, borderBottom: "1px solid var(--rule-strong)", paddingBottom: 14 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.03em", color: s.status === "cancelled" ? "var(--text-disabled)" : "var(--text-primary)", fontFeatureSettings: "'tnum' 1", textDecoration: s.status === "cancelled" ? "line-through" : "none" }}>
            ${s.amount.toFixed(2)}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>/{s.cadence}</span>
        </div>
      </div>

      {/* Status banner — margin-tick alert, not a tinted pill card */}
      {banner && (
        <div style={{ margin: "14px 20px 0", display: "flex", gap: 12, alignItems: "flex-start", borderLeft: `3px solid ${banner[0]}`, paddingLeft: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <Icon name={banner[1]} size={15} color={banner[0]} />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{banner[2]}</span>
            </div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{banner[3]}</div>
            {s.status === "attention" && <div style={{ marginTop: 10 }}><Button variant="danger" size="sm" onClick={() => onCancel(s.id)}>Re-open cancellation</Button></div>}
          </div>
        </div>
      )}

      {/* Facts as ledger lines */}
      <div style={{ padding: "10px 20px 0" }}>
        <LedgerLine label="Next payment" value={billing ? s.next : "—"} />
        <LedgerLine label="Billing cycle" value={s.cadence === "mo" ? "Monthly" : "Yearly"} />
        <LedgerLine label="Per year" value={`$${yearly}`} />
        <LedgerLine label="Reminders" sub="7D · 3D · DAY OF" value={<Switch checked={reminder} onChange={setReminder} size="sm" />} />
      </div>

      {/* CHARGE HISTORY — the ledger table */}
      <SectionHead right={s.history.length > 0 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--text-tertiary)", letterSpacing: "0.1em" }}>{s.history.length} ENTRIES</span>}>Charge history</SectionHead>
      {s.history.length === 0 ? (
        <div style={{ padding: "6px 20px 0" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-tertiary)", lineHeight: 1.5 }}>
            No charges logged yet. Each one prints here as it happens — honest history, not sample data.
          </div>
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          <ColumnHeads left="DATE" right="AMOUNT" style={{ padding: "0 0 6px" }} />
          {(s.history.length > 6 ? s.history.slice(0, 6) : s.history).map(([date, amt], i) => {
            const hike = s.priceHike && amt === s.priceHike.to && i === s.history.findIndex(h => h[1] === s.priceHike.to);
            return (
              <div key={date} className="zn-print" style={{ animationDelay: `${i * 40}ms` }}>
                <LedgerLine
                  label={<span style={{ fontFamily: "var(--font-mono)", fontSize: 12.5, letterSpacing: "0.03em", color: "var(--text-secondary)" }}>{date.toUpperCase()}</span>}
                  sub={hike ? "PRICE ROSE" : undefined}
                  value={`$${amt.toFixed(2)}`}
                  valueColor={hike ? "var(--info)" : "var(--text-primary)"} />
              </div>
            );
          })}
          {s.history.length > 6 && (
            <button style={{ background: "none", border: "none", padding: "10px 0", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-text)", cursor: "pointer" }}>ALL {s.history.length} ENTRIES ↓</button>
          )}
        </div>
      )}

      {/* Actions */}
      {billing && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "24px 20px 0" }}>
          <Button variant="secondary" size="lg" fullWidth leftIcon={<Icon name="pause" size={17} />}>Pause — keep the history</Button>
          <Button variant="danger" size="lg" fullWidth onClick={() => onCancel(s.id)} leftIcon={<Icon name="scissors" size={17} />}>Cancel this subscription</Button>
        </div>
      )}
    </div>
  );
}
window.SubscriptionDetailScreen = SubscriptionDetailScreen;
