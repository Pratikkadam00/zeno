/* Zeno — Subscriptions tab (NEW, CHANGE 2)
   The single authoritative home for every subscription: search + status filters. */
function SubscriptionsScreen({ onOpen, onAdd }) {
  const Z = window.ZENO;
  const [filter, setFilter] = React.useState("All");
  const [q, setQ] = React.useState("");

  const filters = ["All", "Active", "Paused", "Pending", "Cancelled"];
  const statusFor = { Active: ["active","trial"], Paused: ["paused"], Pending: ["pending","attention"], Cancelled: ["cancelled"] };

  let list = Z.subscriptions;
  if (filter !== "All") list = list.filter(s => statusFor[filter].includes(s.status));
  if (q.trim()) list = list.filter(s => s.name.toLowerCase().includes(q.toLowerCase()));

  const billing = Z.subscriptions.filter(s => ["active","trial"].includes(s.status));
  const total = billing.reduce((a, s) => a + s.amount, 0);

  const emptyCopy = {
    All: ["Nothing tracked yet", "Run a scan or add a subscription to get started."],
    Active: ["No active subscriptions", "Anything currently billing will show here."],
    Paused: ["Nothing paused", "Pause a subscription to keep it without tracking renewals."],
    Pending: ["Nothing pending", "Cancellations waiting to be verified appear here."],
    Cancelled: ["Nothing cancelled yet", "Subscriptions you've verified-cancelled live here."],
  }[filter];

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <ScreenHeader large title="Subscriptions"
        right={<IconButton label="Add" onClick={onAdd}><Icon name="plus" /></IconButton>} />

      {/* total header */}
      <div style={{ padding: "0 20px 12px", display: "flex", alignItems: "baseline", justifyContent: "space-between", flex: "none" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>{billing.length} billing · <b style={{ color: "var(--text-secondary)" }}>${total.toFixed(2)}/mo</b></span>
      </div>

      {/* search */}
      <div style={{ padding: "0 16px 10px", flex: "none" }}>
        <Input leftIcon={<Icon name="search" size={18} />} placeholder="Search subscriptions" value={q} onChange={e => setQ(e.target.value)} />
      </div>

      {/* filter chips */}
      <div style={{ display: "flex", gap: 7, padding: "0 16px 12px", overflowX: "auto", flex: "none" }}>
        {filters.map(f => {
          const on = filter === f;
          const count = f === "All" ? Z.subscriptions.length : Z.subscriptions.filter(s => statusFor[f].includes(s.status)).length;
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 13px", borderRadius: "var(--radius-pill)", border: `1px solid ${on ? "transparent" : "var(--border-default)"}`, background: on ? "var(--ink-900)" : "transparent", color: on ? "#fff" : "var(--text-secondary)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              {f}<span style={{ fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.6 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* list */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px 24px" }}>
        {list.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 30px", color: "var(--text-tertiary)" }}>
            <Icon name="inbox" size={30} color="var(--text-tertiary)" style={{ margin: "0 auto 12px" }} />
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 15, color: "var(--text-secondary)" }}>{emptyCopy[0]}</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, marginTop: 4 }}>{emptyCopy[1]}</div>
            {filter === "All" && <Button variant="secondary" size="md" onClick={onAdd} style={{ marginTop: 16 }}>Add a subscription</Button>}
          </div>
        ) : (
          <Card padding="none">
            {list.map((s, i) => (
              <ListRow key={s.id} divider={i < list.length - 1}
                leading={<ServiceAvatar name={s.name} color={s.color} />}
                title={s.name}
                subtitle={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StatusPill status={s.status} /></span>}
                trailing={
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>${s.amount.toFixed(2)}</div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--text-tertiary)" }}>{s.status === "active" || s.status === "trial" ? s.next : (s.status === "paused" ? "paused" : "")}</div>
                  </div>
                }
                onClick={() => onOpen(s.id)}
                style={["paused","cancelled"].includes(s.status) ? { opacity: 0.6 } : null} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
window.SubscriptionsScreen = SubscriptionsScreen;
