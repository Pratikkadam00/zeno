/* Zeno — Subscriptions: the full ledger. Column heads, text-tab filters,
   status tick-tags, verified rows carry a mini stamp.
   SLOP AUDIT — ① Zeno: real table column heads (SERVICE/AMOUNT), leader dots,
   caps-mono filters with underline ticks. ② Tempted by: pill filter chips +
   card-wrapped list → text tabs + rules on paper instead. ③ Lazy version:
   search bar + pills + rounded card list, same as every tracker. */
function SubscriptionsScreen({ onOpen, onAdd }) {
  const Z = window.ZENO;
  const [filter, setFilter] = React.useState("All");
  const [q, setQ] = React.useState("");

  const filters = ["All", "Active", "Paused", "Pending", "Cancelled"];
  const statusFor = { Active: ["active", "trial"], Paused: ["paused"], Pending: ["pending", "attention"], Cancelled: ["cancelled"] };

  let list = Z.subscriptions;
  if (filter !== "All") list = list.filter(s => statusFor[filter].includes(s.status));
  if (q.trim()) list = list.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  const billing = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const total = billing.reduce((a, s) => a + s.amount, 0);

  const emptyCopy = {
    All: ["Nothing on the books", "Run a scan or add a line yourself."],
    Active: ["No active entries", "Anything currently billing lands here."],
    Paused: ["Nothing paused", "Paused entries keep their history."],
    Pending: ["Nothing awaiting proof", "Cancellations being verified land here."],
    Cancelled: ["No verified cancellations yet", "Your proof-of-work page. It fills up."],
  }[filter];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Masthead kicker={`${billing.length} BILLING · $${total.toFixed(2)}/MO`} title="Subscriptions"
        right={<IconButton label="Add" onClick={onAdd}><Icon name="plus" size={20} /></IconButton>} rule={false} />

      <div style={{ padding: "12px 20px 0", flex: "none" }}>
        <Input leftIcon={<Icon name="search" size={17} />} placeholder="Search the ledger" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {/* text-tab filters — underline tick, caps mono, counts */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 14, padding: "14px 20px 0", overflowX: "auto", scrollbarWidth: "none", flex: "none", borderBottom: "1px solid var(--rule-strong)" }}>
        {filters.map(f => {
          const on = filter === f;
          const count = f === "All" ? Z.subscriptions.length : Z.subscriptions.filter(s => statusFor[f].includes(s.status)).length;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: "none", background: "none", border: "none", padding: "4px 0 9px", cursor: "pointer", position: "relative", display: "flex", alignItems: "baseline", gap: 5 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: on ? "var(--text-primary)" : "var(--text-tertiary)" }}>{f}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: on ? "var(--accent-text)" : "var(--text-disabled)" }}>{count}</span>
              <span style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, background: on ? "var(--accent)" : "transparent" }}></span>
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 24 }}>
        {list.length === 0 ? (
          <div style={{ padding: "56px 32px", textAlign: "left" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", marginBottom: 8 }}>EMPTY PAGE</div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 20, color: "var(--text-primary)", marginBottom: 5 }}>{emptyCopy[0]}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)" }}>{emptyCopy[1]}</div>
            {filter === "All" && <Button variant="secondary" size="md" onClick={onAdd} style={{ marginTop: 18 }}>Add a subscription</Button>}
          </div>
        ) : (
          <React.Fragment>
            <ColumnHeads left="SERVICE" right="AMOUNT / NEXT" style={{ margin: "14px 6px 0" }} />
            <div style={{ padding: "0 6px" }}>
              {list.map((s, i) => (
                <div key={s.id} className="zn-print" style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}>
                  <ListRow divider={i < list.length - 1}
                    leading={<ServiceAvatar name={s.name} color={s.color} size={38} style={["paused", "cancelled"].includes(s.status) ? { opacity: 0.45 } : null} />}
                    title={<span style={["paused", "cancelled"].includes(s.status) ? { color: "var(--text-tertiary)" } : null}>{s.name}</span>}
                    subtitle={s.status === "active" ? s.category.toUpperCase() : <StatusPill status={s.status} />}
                    trailing={
                      s.status === "cancelled" ? <Stamp size="sm" angle={-4}>Verified</Stamp>
                      : s.status === "attention" ? <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: "var(--stamp-alert)" }}>${s.amount.toFixed(2)} !</span>
                      : (
                        <span style={{ textAlign: "right" }}>
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>${s.amount.toFixed(2)}</span>
                          <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.06em", color: "var(--text-tertiary)", marginTop: 1 }}>{s.status === "paused" ? "PAUSED" : s.next.toUpperCase()}</span>
                        </span>
                      )
                    }
                    onClick={() => onOpen(s.id)} />
                </div>
              ))}
            </div>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}
window.SubscriptionsScreen = SubscriptionsScreen;
