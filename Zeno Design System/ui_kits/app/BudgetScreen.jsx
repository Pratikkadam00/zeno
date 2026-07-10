/* Zeno — Budget: forecast-first. Free = one monthly cap. Category budgets +
   envelopes are Pro-locked rows that route to the paywall (the only true gates).
   SLOP AUDIT — ① Zeno: forecast as a running ledger with a cap rule drawn
   across the bar; status is a stamp-chip. ② Tempted by: dark hero card +
   progress ring → typographic block + two-tone rule bar. ③ Lazy: donut +
   three stat cards + locked-feature modal. */
function BudgetScreen({ onBack, onCancelSub, onUpgrade, onImport, onRecap, onCoach }) {
  const B = window.ZENO.budget;
  const [cap, setCap] = React.useState(B.cap);
  const [setupCap, setSetupCap] = React.useState(80);
  const committed = B.committed, projected = B.projected;

  if (cap == null) {
    const suggested = Math.ceil(projected / 5) * 5;
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ScreenHeader title="SET A CAP" left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>} />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "8px 20px 20px" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, letterSpacing: "-0.02em", margin: "6px 0 8px" }}>Draw the line</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.55, margin: "0 0 18px" }}>
            Zeno already knows your renewals, so the forecast works with zero setup — no import, no bank login required.
          </p>
          <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
            <LedgerLine label="Charged so far" value={`$${committed.toFixed(2)}`} />
            <LedgerLine label="Still to renew" value={`$${(projected - committed).toFixed(2)}`} />
            <LedgerLine label="Forecast month-end" strong value={`$${projected.toFixed(2)}`} />
          </div>
          <SectionHead pad="22px 0 10px">Your monthly cap</SectionHead>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18, margin: "6px 0 10px" }}>
            <IconButton variant="secondary" size={44} label="Lower" onClick={() => setSetupCap(c => Math.max(5, c - 5))}><Icon name="minus" size={19} /></IconButton>
            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 44, letterSpacing: "-0.03em", fontFeatureSettings: "'tnum' 1", minWidth: 128, textAlign: "center" }}>${setupCap}</span>
            <IconButton variant="secondary" size={44} label="Raise" onClick={() => setSetupCap(c => c + 5)}><Icon name="plus" size={19} /></IconButton>
          </div>
          <button onClick={() => setSetupCap(suggested)} style={{ display: "block", margin: "0 auto", background: "none", border: "none", color: "var(--accent-text)", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.12em", cursor: "pointer", padding: 8 }}>
            SUGGESTED · ${suggested}
          </button>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", textAlign: "center", margin: "4px 0 0" }}>
            {setupCap < projected ? `Below your forecast — we'll warn you before the charge that crosses it.` : `$${(setupCap - projected).toFixed(0)} of headroom over the forecast.`}
          </p>
        </div>
        <div style={{ flex: "none", padding: "12px 20px 28px", borderTop: "1px solid var(--rule-strong)", background: "var(--surface-card)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setCap(setupCap)}>Track this budget</Button>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, (projected / cap) * 100);
  const committedPct = Math.min(100, (committed / cap) * 100);
  const over = projected > cap;
  const approaching = !over && projected > 0.85 * cap;
  const headroom = cap - projected;
  const stColor = over ? "var(--stamp-alert)" : approaching ? "#A36A0B" : "var(--stamp-verified)";
  const candidates = window.ZENO.subscriptions.filter(s => s.status === "active")
    .sort((a, b) => (b.unused ? 1 : 0) - (a.unused ? 1 : 0) || a.amount - b.amount).slice(0, 3);

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader title="BUDGET"
        left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>}
        right={<IconButton label="Edit cap" onClick={() => setCap(null)}><Icon name="pencil-line" size={19} /></IconButton>} />

      {/* Forecast block — typographic */}
      <div style={{ padding: "8px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--text-tertiary)" }}>FORECAST · {B.daysLeftInMonth} DAYS LEFT</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 7, marginTop: 6 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 44, lineHeight: 1, letterSpacing: "-0.035em", fontFeatureSettings: "'tnum' 1" }}>${projected.toFixed(2)}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-tertiary)" }}>/ ${cap}</span>
            </div>
          </div>
          <Stamp size="sm" angle={4} tone={over ? "alert" : approaching ? "neutral" : "verified"}>{over ? "Over" : approaching ? "Close" : "On pace"}</Stamp>
        </div>
        {/* two-tone bar with cap rule */}
        <div style={{ position: "relative", marginTop: 16 }}>
          <div style={{ display: "flex", height: 6, background: "var(--surface-sunken)" }}>
            <div style={{ width: `${committedPct}%`, background: stColor }}></div>
            <div style={{ width: `${pct - committedPct}%`, background: stColor, opacity: 0.38 }}></div>
          </div>
          <div style={{ position: "absolute", top: -4, bottom: -4, left: "100%", width: 2, background: "var(--ink-panel)", transform: "translateX(-2px)" }}></div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 7, fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.08em", color: "var(--text-tertiary)" }}>
          <span>${committed.toFixed(2)} CHARGED</span>
          <span>{over ? `$${Math.abs(headroom).toFixed(2)} OVER CAP` : `$${headroom.toFixed(2)} HEADROOM`}</span>
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 8 }}>Forecast from your renewal dates — no bank feed, none needed.</div>
      </div>

      {/* Get back under → cancel flow */}
      {(over || approaching) && (
        <React.Fragment>
          <SectionHead>{over ? `Cut $${Math.abs(headroom).toFixed(2)} to get back under` : "Trim now to stay under"}</SectionHead>
          <div style={{ padding: "0 20px" }}>
            {candidates.map((s, i) => (
              <div key={s.id} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", alignItems: "center", gap: 11, padding: "10px 0", borderBottom: "1px solid var(--rule)" }}>
                <ServiceAvatar name={s.name} color={s.color} size={34} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14 }}>{s.name}{s.unused && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, letterSpacing: "0.12em", color: "#A36A0B", marginLeft: 8 }}>UNUSED 60D</span>}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)", marginTop: 2 }}>${s.amount.toFixed(2)}/MO · ${(s.amount * 12).toFixed(0)}/YR</span>
                </span>
                <Button variant="danger" size="sm" onClick={() => onCancelSub(s.id)}>Cancel</Button>
              </div>
            ))}
            <div onClick={onCoach} style={{ cursor: "pointer" }}>
              <LedgerLine label="Ask the Spend Coach" sub="FREE" value="↗" valueColor="var(--accent-text)" />
            </div>
          </div>
        </React.Fragment>
      )}

      {/* Forecast entries */}
      <SectionHead>Still to renew</SectionHead>
      <div style={{ padding: "0 20px" }}>
        {B.remaining.map((r, i) => {
          const run = committed + B.remaining.slice(0, i + 1).reduce((a, x) => a + x.amount, 0);
          return <LedgerLine key={r.id} label={r.name} sub={`${r.day.toUpperCase()}${r.note ? " · " + r.note.toUpperCase() : ""}`} value={`+$${r.amount.toFixed(2)} → $${run.toFixed(2)}`} />;
        })}
      </div>

      {/* Pro gates — honest locks */}
      <SectionHead>Pro budgeting</SectionHead>
      <div style={{ padding: "0 20px" }}>
        {[["chart-pie", "Category budgets", "A CAP PER CATEGORY"], ["wallet", "Envelope budgeting", "FUND & LOG BY HAND — NO IMPORT NEEDED"]].map(([ic, t, sub]) => (
          <div key={t} onClick={onUpgrade} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid var(--rule)", cursor: "pointer", minHeight: 48 }}>
            <Icon name={ic} size={18} color="var(--text-tertiary)" />
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)" }}>{t}</span>
              <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 2 }}>{sub}</span>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", color: "var(--text-secondary)" }}>
              <Icon name="lock" size={12} color="var(--text-tertiary)" /> PRO
            </span>
          </div>
        ))}
        <div onClick={onImport} style={{ cursor: "pointer" }}>
          <LedgerLine label="Imported spend" sub={`AS OF ${B.lastImport.toUpperCase()} · 26 DAYS AGO`} value="REFRESH ↗" valueColor="var(--accent-text)" />
        </div>
      </div>

      <SectionHead>History</SectionHead>
      <div style={{ padding: "0 20px" }}>
        <div onClick={onRecap} style={{ cursor: "pointer" }}>
          <LedgerLine label="May recap" sub={`STREAK ×${B.recap.streak}`} value={`UNDER BY $${(B.recap.cap - B.recap.actual).toFixed(2)}`} valueColor="var(--stamp-verified)" />
        </div>
      </div>

      <div style={{ margin: "22px 20px 0", padding: "12px 14px", border: "1px dashed var(--rule-strong)", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginBottom: 8 }}>DEMO · PREVIEW STATES</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => setCap(110)} style={{ flex: 1 }}>On pace</Button>
          <Button variant="secondary" size="sm" onClick={() => setCap(80)} style={{ flex: 1 }}>Close</Button>
          <Button variant="secondary" size="sm" onClick={() => setCap(65)} style={{ flex: 1 }}>Over</Button>
          <Button variant="secondary" size="sm" onClick={() => setCap(null)} style={{ flex: 1 }}>Unset</Button>
        </div>
      </div>
    </div>
  );
}
window.BudgetScreen = BudgetScreen;
