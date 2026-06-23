/* Zeno — Home / Triage (redesigned, CHANGE 3)
   Answers "what's about to charge me, and what can I cut?"
   No 9-item feature grid. Full list lives one tap away in the Subscriptions tab. */
function HomeScreen({ hasData, onOpen, onTab, onDiscover, onAdd, onSettings, onBudget }) {
  const Z = window.ZENO;
  const total = Z.monthlyTotal;
  const upcoming = Z.subscriptions.filter(s => ["active","trial"].includes(s.status)).slice(0, 4);

  // Needs-attention items
  const attention = [];
  Z.subscriptions.forEach(s => {
    if (s.status === "trial") attention.push({ id: s.id, sub: s, tone: "warning", icon: "alarm-clock", label: `${s.name} trial ends ${s.trialEnds}`, sub2: "Converts to paid — cancel before then?" });
    if (s.status === "attention") attention.push({ id: s.id, sub: s, tone: "danger", icon: "triangle-alert", label: `${s.name} is still charging you`, sub2: `Cancelled ${s.cancelledOn} · charge not stopped` });
    if (s.priceHike) attention.push({ id: s.id, sub: s, tone: "info", icon: "trending-up", label: `${s.name} went up`, sub2: `$${s.priceHike.from.toFixed(2)} → $${s.priceHike.to.toFixed(2)}/mo` });
  });

  const header = (
    <ScreenHeader large title="Home"
      left={<button onClick={onSettings} aria-label="Settings" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><ServiceAvatar name="Alex Rivera" color="var(--cat-teal)" size={34} shape="circle" /></button>}
      right={<IconButton label="Notifications"><Icon name="bell" /></IconButton>} />
  );

  if (!hasData) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {header}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 36px 40px" }}>
          <div style={{ width: 64, height: 64, borderRadius: "var(--radius-xl)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
            <Icon name="radar" size={30} color="var(--accent-text)" />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)", marginBottom: 6 }}>Let's find what you're paying for</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 24px", maxWidth: "30ch" }}>
            Nothing tracked yet. Run your first free scan — no bank login, processed on your device.
          </p>
          <Button variant="primary" size="lg" fullWidth onClick={onDiscover} leftIcon={<Icon name="search" size={18} />}>Discover subscriptions</Button>
          <Button variant="ghost" size="md" fullWidth onClick={onAdd} style={{ marginTop: 8 }}>Add one manually</Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      {header}

      {/* Spend summary (dark) + free-tier counter */}
      <div style={{ padding: "4px 16px 0" }}>
        <div style={{ background: "var(--ink-900)", borderRadius: "var(--radius-2xl)", padding: "22px 22px 18px", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--ink-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Active this month</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, color: "var(--ink-300)" }}>{Z.trackedCount}/{Z.freeLimit} tracked</span>
          </div>
          <div style={{ marginTop: 10 }}><AmountDisplay amount={total} size="xl" color="#fff" /></div>
          <div style={{ height: 6, background: "rgba(255,255,255,0.12)", borderRadius: 3, marginTop: 16, overflow: "hidden" }}>
            <div style={{ width: `${(Z.trackedCount / Z.freeLimit) * 100}%`, height: "100%", background: "var(--green-400)", borderRadius: 3 }} />
          </div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-400)", marginTop: 8 }}>Free plan · {Z.freeLimit - Z.trackedCount} slots left</div>
        </div>
      </div>

      {/* Budget status — glanceable, forward-looking */}
      <div style={{ padding: "12px 16px 0" }}>
        {(() => {
          const B = window.ZENO.budget;
          const over = B.projected > B.cap, approaching = !over && B.projected > 0.85 * B.cap;
          const sc = over ? ["var(--danger-soft)", "var(--danger)", "triangle-alert", "Over budget"]
            : approaching ? ["var(--warning-soft)", "#B45309", "trending-up", "Approaching"]
            : ["var(--success-soft)", "var(--success)", "circle-check", "On pace"];
          const pct = Math.min(100, (B.projected / B.cap) * 100);
          return (
            <button onClick={onBudget} style={{ width: "100%", textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="target" size={18} color="var(--text-secondary)" />
                <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)" }}>Monthly budget</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: sc[0], color: sc[1] }}>
                  <Icon name={sc[2]} size={13} color={sc[1]} /> {sc[3]}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 12 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>${B.projected.toFixed(2)}</span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>projected / ${B.cap}</span>
              </div>
              <div style={{ height: 7, background: "var(--surface-sunken)", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                <div style={{ width: `${pct}%`, height: "100%", background: sc[1], borderRadius: 4 }} />
              </div>
            </button>
          );
        })()}
      </div>

      {/* Needs attention */}
      {attention.length > 0 && (
        <React.Fragment>
          <SectionTitle right="">Needs attention</SectionTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px" }}>
            {attention.map((a, i) => {
              const c = { warning: ["var(--warning-soft)", "var(--warning)", "#B45309"], danger: ["var(--danger-soft)", "var(--danger)", "var(--danger)"], info: ["var(--info-soft)", "var(--info)", "var(--info)"] }[a.tone];
              return (
                <button key={i} onClick={() => onOpen(a.sub.id)} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "12px 14px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
                  <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-md)", background: c[0], display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={a.icon} size={19} color={c[1]} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{a.label}</div>
                    <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 1 }}>{a.sub2}</div>
                  </div>
                  <Icon name="chevron-right" size={17} color="var(--text-tertiary)" />
                </button>
              );
            })}
          </div>
        </React.Fragment>
      )}

      {/* Upcoming renewals */}
      <SectionTitle onSeeAll={() => onTab("subs")}>Upcoming renewals</SectionTitle>
      <div style={{ padding: "0 16px" }}>
        <Card padding="none">
          {upcoming.map((s, i) => (
            <ListRow key={s.id} divider={i < upcoming.length - 1}
              leading={<ServiceAvatar name={s.name} color={s.color} />}
              title={s.name} subtitle={`${s.category} · ${s.next}`}
              amount={`$${s.amount.toFixed(2)}`} cadence={s.cadence}
              chevron onClick={() => onOpen(s.id)} />
          ))}
        </Card>
      </div>

      {/* Savings opportunities preview */}
      <SectionTitle onSeeAll={() => onTab("insights")}>Ways to save</SectionTitle>
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {Z.insights.slice(0, 2).map(ins => (
          <button key={ins.id} onClick={() => onTab("insights")} style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "12px 14px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
            <div style={{ width: 38, height: 38, flex: "none", borderRadius: "var(--radius-md)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={ins.icon} size={19} color="var(--accent-text)" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{ins.title}</div>
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 1 }}>{ins.body}</div>
            </div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: "var(--accent-text)" }}>${ins.save}/yr</span>
          </button>
        ))}
      </div>

      {/* Primary actions */}
      <div style={{ display: "flex", gap: 10, padding: "20px 16px 0" }}>
        <Button variant="primary" size="lg" onClick={onDiscover} style={{ flex: 1 }} leftIcon={<Icon name="search" size={18} />}>Discover</Button>
        <Button variant="secondary" size="lg" onClick={onAdd} style={{ flex: 1 }} leftIcon={<Icon name="plus" size={18} />}>Add manually</Button>
      </div>
    </div>
  );
}

function SectionTitle({ children, onSeeAll, right }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 20px 10px" }}>
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 17, color: "var(--text-primary)" }}>{children}</span>
      {onSeeAll && <span onClick={onSeeAll} style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--accent-text)", cursor: "pointer" }}>See all</span>}
    </div>
  );
}
window.HomeScreen = HomeScreen;
window.SectionTitle = SectionTitle;
