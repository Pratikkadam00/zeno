/* Zeno — Budget (subscription-first, forecast-led). Reached from Home status card
   and the Insights tab. Forward-looking status compares PROJECTED to the cap. */
function BudgetScreen({ onBack, onCancelSub, onUpgrade, onImport, onRecap }) {
  const B = window.ZENO.budget;
  // demo: lets you walk every state. 'none' = not set yet.
  const [cap, setCap] = React.useState(B.cap);         // null when none
  const [setupCap, setSetupCap] = React.useState(80);
  const [income, setIncome] = React.useState(B.income);
  const [incomeInput, setIncomeInput] = React.useState("");
  const [envs, setEnvs] = React.useState(B.envelopes);

  const committed = B.committed;
  const projected = B.projected;

  // ----- NO BUDGET SET (invite + zero-data setup) -----
  if (cap == null) {
    const suggested = Math.ceil(projected / 5) * 5; // round committed forecast up to nearest $5
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <ScreenHeader title="Budget" left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>} />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px 20px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "var(--radius-lg)", background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <Icon name="target" size={26} color="var(--accent-text)" />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 25, letterSpacing: "-0.02em", margin: "0 0 8px", textWrap: "balance" }}>Set a recurring budget</h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14.5, color: "var(--text-secondary)", lineHeight: 1.5, margin: "0 0 6px" }}>
            No bank link needed. Zeno already knows your subscriptions and when they renew, so we can forecast your month from day one.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginBottom: 20 }}>
            <Icon name="zap" size={14} color="var(--accent-text)" /> Based on your renewals — no import required.
          </div>

          {/* live forecast preview */}
          <div style={{ background: "var(--ink-900)", borderRadius: "var(--radius-xl)", padding: "18px 20px", marginBottom: 18 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--ink-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Forecast this month</div>
            <div style={{ marginTop: 8 }}><AmountDisplay amount={projected} size="lg" color="#fff" /></div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--ink-400)", marginTop: 4 }}>${committed.toFixed(2)} charged · ${(projected - committed).toFixed(2)} still to renew</div>
          </div>

          <Label>Your monthly cap</Label>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, margin: "4px 0 14px" }}>
            <IconButton variant="secondary" size={44} label="Lower" onClick={() => setSetupCap(c => Math.max(5, c - 5))}><Icon name="minus" size={20} /></IconButton>
            <div style={{ minWidth: 120, textAlign: "center" }}><AmountDisplay amount={setupCap} size="lg" /></div>
            <IconButton variant="secondary" size={44} label="Raise" onClick={() => setSetupCap(c => c + 5)}><Icon name="plus" size={20} /></IconButton>
          </div>
          <button onClick={() => setSetupCap(suggested)} style={{ display: "block", margin: "0 auto 4px", background: "none", border: "none", color: "var(--accent-text)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Use suggested · ${suggested}
          </button>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", textAlign: "center", margin: "0 0 4px" }}>
            {setupCap < projected ? `That's below your $${projected.toFixed(0)} forecast — we'll warn you early.` : `$${(setupCap - projected).toFixed(0)} of headroom above your forecast.`}
          </p>
        </div>
        <div style={{ flex: "none", padding: "12px 16px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>
          <Button variant="primary" size="lg" fullWidth onClick={() => setCap(setupCap)}>Start tracking this budget</Button>
        </div>
      </div>
    );
  }

  // ----- BUDGET SET -----
  const pct = Math.min(100, (projected / cap) * 100);
  const committedPct = Math.min(100, (committed / cap) * 100);
  const over = projected > cap;
  const approaching = !over && projected > 0.85 * cap;
  const status = over ? "over" : approaching ? "approaching" : "under";
  const headroom = cap - projected;

  const statusMeta = {
    under:       ["success", "circle-check", "On pace", `Forecast $${projected.toFixed(2)} — $${headroom.toFixed(2)} under your $${cap} cap.`],
    approaching: ["warning", "trending-up", "Approaching", `On pace for $${projected.toFixed(2)} — within $${headroom.toFixed(2)} of your $${cap} cap.`],
    over:        ["danger", "triangle-alert", "Over budget", `Forecast $${projected.toFixed(2)} — $${Math.abs(headroom).toFixed(2)} over your $${cap} cap.`],
  }[status];
  const sc = { success: ["var(--success-soft)","var(--success)"], warning: ["var(--warning-soft)","#B45309"], danger: ["var(--danger-soft)","var(--danger)"] }[statusMeta[0]];

  // get-back-under candidates: unused first, then cheapest active subs
  const candidates = window.ZENO.subscriptions
    .filter(s => s.status === "active")
    .sort((a, b) => (b.unused ? 1 : 0) - (a.unused ? 1 : 0) || a.amount - b.amount)
    .slice(0, 3);

  return (
    <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", paddingBottom: 24 }}>
      <ScreenHeader title="Budget"
        left={<IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton>}
        right={<IconButton label="Edit budget" onClick={() => setCap(null)}><Icon name="pencil" size={20} /></IconButton>} />

      <div style={{ padding: "0 16px" }}>
        {/* HERO — forward-looking status */}
        <div style={{ background: "var(--ink-900)", borderRadius: "var(--radius-2xl)", padding: "22px", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, color: "var(--ink-300)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Projected this month</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flex: "none", whiteSpace: "nowrap", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: sc[0], color: sc[1] }}>
              <Icon name={statusMeta[1]} size={13} color={sc[1]} /> {statusMeta[2]}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 10 }}>
            <AmountDisplay amount={projected} size="xl" color="#fff" />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 15, color: "var(--ink-400)" }}>/ ${cap}</span>
          </div>
          {/* committed vs projected bar */}
          <div style={{ position: "relative", height: 8, background: "rgba(255,255,255,0.12)", borderRadius: 4, marginTop: 16, overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: `${pct}%`, background: over ? "var(--danger)" : approaching ? "var(--warning)" : "var(--green-400)", borderRadius: 4 }} />
            <div style={{ position: "absolute", top: 0, bottom: 0, width: `${committedPct}%`, background: "rgba(255,255,255,0.5)", borderRadius: 4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--ink-400)" }}>
            <span>${committed.toFixed(2)} charged</span>
            <span>{B.daysLeftInMonth} days left</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--ink-300)" }}>
            <Icon name="info" size={13} color="var(--ink-400)" /> Forecast from your renewal dates
          </div>
        </div>

        {/* GET BACK UNDER — links to cancellation */}
        {(over || approaching) && (
          <div style={{ marginTop: 14, border: `1px solid ${sc[1]}`, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ background: sc[0], padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="scissors" size={18} color={sc[1]} />
              <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                {over ? `Cut $${Math.abs(headroom).toFixed(2)} to get back under` : "Trim now to stay under"}
              </span>
            </div>
            <div style={{ background: "var(--surface-card)" }}>
              {candidates.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                  <ServiceAvatar name={s.name} color={s.color} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{s.name}</span>
                      {s.unused && <Badge tone="warning">Unused 60d</Badge>}
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>${s.amount.toFixed(2)}/mo · ${(s.amount*12).toFixed(0)}/yr</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onCancelSub(s.id)}>Cancel</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Coach tie-in */}
        <button onClick={onUpgrade} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", marginTop: 14, background: "var(--accent-soft)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)", borderRadius: "var(--radius-lg)", padding: "13px 15px", cursor: "pointer" }}>
          <Icon name="sparkles" size={20} color="var(--accent-text)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 13.5, color: "var(--text-primary)" }}>Ask the Spend Coach</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-secondary)" }}>“To hit ${cap}, cancel Figma + Disney+ → save $26/mo”</div>
          </div>
          <Badge tone="pro" style={{ background: "#e9e9f2", color: "#43417a" }}>Pro</Badge>
        </button>

        {/* FORECAST — upcoming renewals running total */}
        <SectionLabel icon="calendar-clock">Forecast · still to renew</SectionLabel>
        <Card padding="none">
          {B.remaining.map((r, i) => {
            const run = committed + B.remaining.slice(0, i + 1).reduce((a, x) => a + x.amount, 0);
            return (
              <ListRow key={r.id} divider={i < B.remaining.length - 1}
                leading={<ServiceAvatar name={r.name} color={r.color} size={36} />}
                title={r.name} subtitle={`${r.day}${r.note ? " · " + r.note : ""}`}
                trailing={<div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>+${r.amount.toFixed(2)}</div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>→ ${run.toFixed(2)}</div>
                </div>} />
            );
          })}
        </Card>

        {/* CATEGORY BUDGETS (Pro) */}
        <SectionLabel icon="chart-pie" pro>Category budgets</SectionLabel>
        <Card padding="md">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {B.categoryCaps.map(c => {
              const total = c.committed + c.imported;
              const cpct = Math.min(100, (total / c.cap) * 100);
              const cover = total > c.cap;
              return (
                <div key={c.category}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-sans)", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: `var(--cat-${c.cat})` }} />{c.category}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: cover ? "var(--danger)" : "var(--text-tertiary)" }}>
                      <b style={{ color: "var(--text-primary)" }}>${total.toFixed(2)}</b> / ${c.cap}
                    </span>
                  </div>
                  <div style={{ height: 7, background: "var(--surface-sunken)", borderRadius: 4, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${Math.min(100,(c.committed/c.cap)*100)}%`, background: cover ? "var(--danger)" : `var(--cat-${c.cat})` }} />
                    {c.imported > 0 && <div style={{ width: `${(c.imported/c.cap)*100}%`, background: cover ? "var(--danger)" : `var(--cat-${c.cat})`, opacity: 0.45 }} />}
                  </div>
                  {c.imported > 0 && <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>${c.committed.toFixed(2)} subs + ${c.imported.toFixed(2)} imported</div>}
                </div>
              );
            })}
          </div>
          {/* freshness / import CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, padding: "10px 12px", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
            <Icon name="clock" size={15} color="var(--text-tertiary)" />
            <span style={{ flex: 1, fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)" }}>Imported spend as of {B.lastImport} · 39 days ago</span>
            <button onClick={onImport} style={{ background: "none", border: "none", color: "var(--accent-text)", fontFamily: "var(--font-sans)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Refresh</button>
          </div>
        </Card>

        {/* ENVELOPES (Pro) */}
        <SectionLabel icon="wallet" pro>Manual envelopes</SectionLabel>
        <Card padding="none">
          {envs.map((e, i) => {
            const epct = Math.min(100, (e.spent / e.funded) * 100);
            const eover = e.spent > e.funded;
            return (
              <div key={e.id} style={{ padding: "12px 14px", borderTop: i ? "1px solid var(--border-subtle)" : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 34, height: 34, flex: "none", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={e.icon} size={17} color="var(--text-secondary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{e.name}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: eover ? "var(--danger)" : "var(--text-tertiary)" }}>${e.spent.toFixed(2)} of ${e.funded.toFixed(2)}{eover ? " · over" : ""}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setEnvs(es => es.map(x => x.id === e.id ? { ...x, spent: +(x.spent + 5).toFixed(2) } : x))} leftIcon={<Icon name="plus" size={15} />}>Log $5</Button>
                </div>
                <div style={{ height: 6, background: "var(--surface-sunken)", borderRadius: 3, overflow: "hidden", marginTop: 8 }}>
                  <div style={{ width: `${epct}%`, height: "100%", background: eover ? "var(--danger)" : "var(--accent)", borderRadius: 3, transition: "width var(--dur) var(--ease-out)" }} />
                </div>
              </div>
            );
          })}
          <button onClick={() => setEnvs(es => [...es, { id: "env" + es.length, name: "New envelope", icon: "wallet", funded: 100, spent: 0 }])} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px", background: "none", border: "none", borderTop: "1px solid var(--border-subtle)", color: "var(--accent-text)", fontFamily: "var(--font-sans)", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>
            <Icon name="plus" size={16} color="var(--accent-text)" /> Add envelope
          </button>
        </Card>

        {/* INCOME CONTEXT (optional) */}
        <SectionLabel icon="banknote">Income context</SectionLabel>
        {income == null ? (
          <Card padding="md">
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", marginBottom: 10, lineHeight: 1.45 }}>Optional — add monthly income to see what % goes to subscriptions. Budgeting works fine without it.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <Input prefix="$" mono placeholder="4,200" value={incomeInput} onChange={e => setIncomeInput(e.target.value.replace(/[^0-9]/g, ""))} style={{ flex: 1 }} />
              <Button variant="secondary" size="lg" onClick={() => setIncome(Number(incomeInput) || 4200)}>Add</Button>
            </div>
          </Card>
        ) : (
          <Card padding="md">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 22, color: "var(--text-primary)" }}>{Math.round((projected / income) * 100)}%</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)" }}>of ${income.toLocaleString()} income goes to subscriptions</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>${(income - projected).toLocaleString()}</div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)" }}>left after recurring</div>
              </div>
            </div>
          </Card>
        )}

        {/* Recap entry */}
        <button onClick={onRecap} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, textAlign: "left", marginTop: 16, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px 16px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
          <Icon name="history" size={20} color="var(--text-secondary)" />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>Last month's recap</div>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)" }}>{B.recap.month}: stayed under by ${(B.recap.cap - B.recap.actual).toFixed(2)}</div>
          </div>
          <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />
        </button>

        {/* Demo state switcher */}
        <div style={{ marginTop: 22, padding: "12px 14px", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-md)" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-tertiary)", marginBottom: 8 }}>Demo · preview budget states</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setCap(110)} style={{ flex: 1 }}>On pace</Button>
            <Button variant="secondary" size="sm" onClick={() => setCap(80)} style={{ flex: 1 }}>Approaching</Button>
            <Button variant="secondary" size="sm" onClick={() => setCap(65)} style={{ flex: 1 }}>Over</Button>
            <Button variant="secondary" size="sm" onClick={() => setCap(null)} style={{ flex: 1 }}>Unset</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, pro, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "22px 4px 10px" }}>
      <Icon name={icon} size={17} color="var(--text-secondary)" />
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{children}</span>
      {pro && <Badge tone="pro" style={{ background: "#e9e9f2", color: "#43417a" }}>Pro</Badge>}
    </div>
  );
}
window.BudgetScreen = BudgetScreen;
window.SectionLabel = SectionLabel;
