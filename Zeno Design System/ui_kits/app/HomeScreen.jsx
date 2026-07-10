/* Zeno — Home: "the statement". Typographic hero ON paper (no floating card),
   ledger lines everywhere, rules not boxes.
   SLOP AUDIT — ① Zeno: hero total is pure editorial type + LedgerLines; budget
   is one ledger line with a tick-tag; attention rows use margin ticks. ② Tempted
   by: big-number-in-dark-card + stat grid → deleted the card (delete-a-card test),
   type does the work. ③ Lazy version: dashboard of 6 rounded stat cards.
   MOTION: total settles (zn-count-settle; RN AnimatedNumber count-up 600ms);
   sections print in staggered. Pull-to-refresh: rule line tears + re-prints. */
function HomeScreen({ hasData, onOpen, onTab, onDiscover, onAdd, onSettings, onBudget, onUpgrade, onBell }) {
  const Z = window.ZENO;
  const total = Z.monthlyTotal;
  const billing = Z.subscriptions.filter(s => ["active", "trial"].includes(s.status));
  const upcoming = billing.slice(0, 4);
  const atLimit = Z.trackedCount >= Z.freeLimit;

  const byCat = {};
  billing.forEach(s => { byCat[s.cat] = (byCat[s.cat] || 0) + s.amount; });
  const segs = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  const attention = [];
  Z.subscriptions.forEach(s => { if (s.status === "attention") attention.push({ sub: s, color: "var(--stamp-alert)", icon: "triangle-alert", label: `${s.name} is still charging you`, sub2: `CANCELLED ${s.cancelledOn.toUpperCase()} · CHARGE FOUND JUL 08` }); });
  Z.subscriptions.forEach(s => { if (s.status === "trial") attention.push({ sub: s, color: "var(--warning)", icon: "alarm-clock", label: `${s.name} trial ends in 2 days`, sub2: `CONVERTS TO $${s.amount.toFixed(2)}/MO ON ${s.trialEnds.toUpperCase()}` }); });
  Z.subscriptions.forEach(s => { if (s.priceHike) attention.push({ sub: s, color: "var(--info)", icon: "trending-up", label: `${s.name} raised its price`, sub2: `$${s.priceHike.from.toFixed(2)} → $${s.priceHike.to.toFixed(2)} /MO · +14%` }); });

  const header = (
    <Masthead
      kicker="THE LEDGER · THU JUL 10"
      title="Morning, Alex"
      left={<button onClick={onSettings} aria-label="Settings" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}><ServiceAvatar name="Alex Rivera" color="var(--cat-teal)" size={38} shape="circle" /></button>}
      right={<IconButton label="Notifications" onClick={onBell}><Icon name="bell" size={20} /></IconButton>}
    />
  );

  if (!hasData) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {header}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 32px 40px" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", marginBottom: 10 }}>PAGE 1 — BLANK</div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.15 }}>Nothing on the books yet.</div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 24px" }}>
            Run your first free scan — no bank login required — or write the first line yourself.
          </p>
          <Button variant="primary" size="lg" fullWidth onClick={onDiscover} leftIcon={<Icon name="search" size={18} />}>Discover subscriptions</Button>
          <Button variant="ghost" size="md" fullWidth onClick={onAdd} style={{ marginTop: 8 }}>Add one by hand</Button>
        </div>
      </div>
    );
  }

  const B = Z.budget;
  const over = B.projected > B.cap, approaching = !over && B.projected > 0.85 * B.cap;

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      {header}

      {/* THE STATEMENT — typographic hero, no card */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>COMMITTED THIS MONTH</span>
          <span aria-hidden="true" style={{ flex: 1, borderBottom: "2px dotted var(--rule-strong)", transform: "translateY(-3px)", minWidth: 12 }}></span>
          <button onClick={atLimit ? onUpgrade : undefined} style={{ background: "none", border: "none", padding: 0, cursor: atLimit ? "pointer" : "default", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.08em", color: atLimit ? "var(--accent-text)" : "var(--text-tertiary)", whiteSpace: "nowrap" }}>
            {Z.trackedCount}/{Z.freeLimit} FREE{atLimit ? " ↗" : ""}
          </button>
        </div>
        <div className="zn-print" style={{ marginTop: 8 }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 58, lineHeight: 1, letterSpacing: "-0.045em", color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>
            ${Math.floor(total)}<span style={{ fontSize: 28, fontWeight: 600, opacity: 0.55 }}>.{(total % 1).toFixed(2).slice(2)}</span>
          </span>
        </div>
        {/* category rule-bar */}
        <div style={{ display: "flex", gap: 2, height: 4, marginTop: 14 }}>
          {segs.map(([cat, val]) => <div key={cat} title={cat} style={{ flex: val, background: `var(--cat-${cat})` }}></div>)}
        </div>
        <div style={{ borderBottom: "1px solid var(--rule-strong)", marginTop: 14 }}>
          <LedgerLine label="Charged so far" value={`$${B.committed.toFixed(2)}`} />
          <LedgerLine label="Still to renew" sub="2 RENEWALS" value={`$${(B.projected - B.committed).toFixed(2)}`} />
        </div>
        {/* budget — one honest ledger line */}
        <LedgerLine
          onClick={onBudget}
          label="Budget" sub={`CAP $${B.cap}`}
          value={over ? `$${(B.projected - B.cap).toFixed(2)} OVER` : approaching ? `$${(B.cap - B.projected).toFixed(2)} LEFT` : "ON PACE"}
          valueColor={over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)"}
          strong
        />
      </div>

      {/* NEEDS ATTENTION — rule list with colored margin ticks */}
      {attention.length > 0 && (
        <React.Fragment>
          <SectionHead>Needs attention</SectionHead>
          <div style={{ padding: "0 20px" }}>
            {attention.map((a, i) => (
              <button key={i} onClick={() => onOpen(a.sub.id)} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "13px 0", minHeight: 48, cursor: "pointer" }}>
                <span style={{ width: 3, alignSelf: "stretch", background: a.color, flex: "none", borderRadius: 2 }}></span>
                <Icon name={a.icon} size={18} color={a.color} style={{ flex: "none" }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{a.label}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.08em", color: "var(--text-tertiary)", marginTop: 3 }}>{a.sub2}</span>
                </span>
                <Icon name="chevron-right" size={16} color="var(--text-tertiary)" />
              </button>
            ))}
          </div>
        </React.Fragment>
      )}

      {/* UPCOMING — ledger rows */}
      <SectionHead right={<button onClick={() => onTab("subs")} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-text)", cursor: "pointer" }}>ALL ↗</button>}>Upcoming</SectionHead>
      <div style={{ padding: "0 6px" }}>
        {upcoming.map((s, i) => (
          <div key={s.id} className="zn-print" style={{ animationDelay: `${i * 45}ms` }}>
            <ListRow divider={i < upcoming.length - 1}
              leading={<ServiceAvatar name={s.name} color={s.color} size={38} />}
              title={s.name} subtitle={`${s.next.toUpperCase()} · ${s.category.toUpperCase()}`}
              amount={`$${s.amount.toFixed(2)}`}
              onClick={() => onOpen(s.id)} />
          </div>
        ))}
      </div>

      {/* WAYS TO SAVE */}
      <SectionHead right={<button onClick={() => onTab("insights")} style={{ background: "none", border: "none", fontFamily: "var(--font-mono)", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-text)", cursor: "pointer" }}>MORE ↗</button>}>Ways to save</SectionHead>
      <div style={{ padding: "0 20px" }}>
        {Z.insights.slice(0, 2).map(ins => (
          <div key={ins.id} onClick={() => onTab("insights")} style={{ cursor: "pointer" }}>
            <LedgerLine label={ins.title} sub={ins.body.split("·")[0].trim().toUpperCase().slice(0, 24)} value={`+$${ins.save}/yr`} valueColor="var(--accent-text)" />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, padding: "24px 20px 0" }}>
        <Button variant="primary" size="lg" onClick={onDiscover} style={{ flex: 1 }} leftIcon={<Icon name="search" size={18} />}>Discover</Button>
        <Button variant="secondary" size="lg" onClick={onAdd} style={{ flex: 1 }} leftIcon={<Icon name="plus" size={18} />}>Add</Button>
      </div>
    </div>
  );
}
window.HomeScreen = HomeScreen;
