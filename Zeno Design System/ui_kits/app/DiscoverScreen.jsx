/* Zeno — Discover (CHANGE 1): hub → scan/import → results review.
   First scan is free; trust reassurance is inline at every friction point. */
function DiscoverScreen({ initialMethod, onClose, onManual, onAdded }) {
  // stage: hub | email | csv | scanning | results
  const [stage, setStage] = React.useState("hub");
  const [method, setMethod] = React.useState(null);

  React.useEffect(() => {
    if (initialMethod === "email") { setMethod("email"); setStage("email"); }
    else if (initialMethod === "csv") { setMethod("csv"); setStage("csv"); }
    else if (initialMethod === "manual") { onManual && onManual(); }
  }, [initialMethod]);

  const found = [
    { name: "Netflix", color: "#E50914", amount: 15.99, cat: "Entertainment", conf: "High" },
    { name: "Spotify", color: "#1DB954", amount: 10.99, cat: "Music", conf: "High" },
    { name: "ChatGPT Plus", color: "#10A37F", amount: 20.00, cat: "Productivity", conf: "High" },
    { name: "iCloud+", color: "#3B82F6", amount: 2.99, cat: "Utilities", conf: "Medium" },
    { name: "Figma", color: "#A259FF", amount: 12.00, cat: "Productivity", conf: "Medium" },
    { name: "Audible", color: "#F8991C", amount: 14.95, cat: "Entertainment", conf: "Low" },
  ];

  const TrustPanel = ({ children }) => (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--success-soft)", border: "1px solid color-mix(in srgb, var(--success) 22%, transparent)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 16 }}>
      <Icon name="shield-check" size={18} color="var(--success)" style={{ marginTop: 1 }} />
      <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.45 }}>{children}</div>
    </div>
  );

  const startScan = () => { setStage("scanning"); setTimeout(() => setStage("results"), 2200); };

  // ---- HUB ----
  if (stage === "hub") {
    const methods = [
      { id: "csv", icon: "file-spreadsheet", title: "Import statement", body: "Most complete — read on-device.", badge: "CSV", go: () => { setMethod("csv"); setStage("csv"); } },
      { id: "email", icon: "mail-search", title: "Scan email receipts", body: "Read-only, on-device, last 12 months.", go: () => { setMethod("email"); setStage("email"); } },
      { id: "manual", icon: "pencil", title: "Add manually", body: "Pick from 600+ services or add your own.", go: () => onManual && onManual() },
    ];
    return (
      <Sheet title="Discover" onClose={onClose}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", margin: "0 0 16px" }}>
          <Icon name="shield-check" size={14} color="var(--success)" /> No bank login — three privacy-safe ways to find subscriptions.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {methods.map(m => (
            <button key={m.id} onClick={m.go} style={{ display: "flex", gap: 13, alignItems: "center", textAlign: "left", background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "14px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
              <div style={{ width: 42, height: 42, flex: "none", borderRadius: "var(--radius-md)", background: "var(--surface-sunken)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Icon name={m.icon} size={21} color="var(--text-secondary)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)", whiteSpace: "nowrap" }}>{m.title}</span>
                  {m.badge && <Badge tone="accent">{m.badge}</Badge>}
                </div>
                <div style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2 }}>{m.body}</div>
              </div>
              <Icon name="chevron-right" size={18} color="var(--text-tertiary)" />
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  // ---- EMAIL CONNECT ----
  if (stage === "email") {
    return (
      <Sheet title="Scan email receipts" onBack={() => setStage("hub")} onClose={onClose}>
        <TrustPanel><b style={{ color: "var(--text-primary)" }}>Read-only and on-device.</b> Zeno scans the last 12 months of receipts right on your phone. We never store your email, and you can revoke access anytime.</TrustPanel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button variant="primary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="mail" size={18} />}>Connect Gmail (read-only)</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="mail" size={18} />}>Connect Outlook</Button>
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 16, textAlign: "center" }}>Your first scan is free.</p>
      </Sheet>
    );
  }

  // ---- CSV ----
  if (stage === "csv") {
    return (
      <Sheet title="Import a statement" onBack={() => setStage("hub")} onClose={onClose}>
        <TrustPanel><b style={{ color: "var(--text-primary)" }}>You stay in control.</b> Export a CSV from your bank yourself — Zeno parses it on your device to spot recurring charges. The raw file is never uploaded.</TrustPanel>
        <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 16 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-tertiary)", marginBottom: 8 }}>How to export</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <li>Open your bank's website or app</li>
            <li>Find statements → export as CSV</li>
            <li>Pick the last 3–12 months</li>
          </ol>
        </div>
        <Button variant="primary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="upload" size={18} />}>Choose CSV file</Button>
      </Sheet>
    );
  }

  // ---- SCANNING ----
  if (stage === "scanning") {
    return (
      <Sheet title={method === "csv" ? "Reading statement" : "Scanning receipts"} onClose={onClose}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", textAlign: "center" }}>
          <div className="zeno-spin" style={{ width: 52, height: 52, borderRadius: "50%", border: "4px solid var(--surface-sunken)", borderTopColor: "var(--accent)", marginBottom: 22 }} />
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 16, color: "var(--text-primary)", lineHeight: 1.3, maxWidth: "26ch" }}>{method === "csv" ? "Detecting recurring charges…" : "Looking for subscriptions…"}</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)", marginTop: 8, maxWidth: "28ch" }}>Running on your device · nothing leaves your phone</div>
          <button onClick={() => setStage(method)} style={{ marginTop: 24, background: "none", border: "none", color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Cancel</button>
        </div>
      </Sheet>
    );
  }

  // ---- RESULTS REVIEW ----
  return <ResultsReview found={found} method={method} onClose={onClose} onAdded={onAdded} />;
}

function ResultsReview({ found, method, onClose, onAdded }) {
  const [sel, setSel] = React.useState(() => found.map((_, i) => i < 5)); // low-confidence off by default
  const count = sel.filter(Boolean).length;
  const confTone = { High: ["var(--success-soft)", "var(--success)"], Medium: ["var(--warning-soft)", "#B45309"], Low: ["var(--surface-sunken)", "var(--text-tertiary)"] };

  return (
    <Sheet title="Review found subscriptions" onClose={onClose}
      footer={<Button variant="primary" size="lg" fullWidth disabled={count === 0} onClick={() => onAdded(count)}>{`Add ${count} subscription${count === 1 ? "" : "s"}`}</Button>}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", margin: "0 0 14px" }}>
        <Icon name="check-check" size={15} color="var(--success)" />
        <span>Found <b>{found.length}</b> via {method === "csv" ? "your statement" : "email receipts"}. Pick what to track — you can edit any of them.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {found.map((f, i) => {
          const on = sel[i];
          const ct = confTone[f.conf];
          return (
            <div key={f.name} onClick={() => setSel(s => s.map((v, j) => j === i ? !v : v))} style={{ display: "flex", alignItems: "center", gap: 12, background: "var(--surface-card)", border: `1.5px solid ${on ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "var(--radius-lg)", padding: "11px 13px", cursor: "pointer", boxShadow: "var(--shadow-xs)" }}>
              <span style={{ width: 22, height: 22, flex: "none", borderRadius: 6, border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {on && <Icon name="check" size={14} color="var(--text-on-accent)" strokeWidth={3} />}
              </span>
              <ServiceAvatar name={f.name} color={f.color} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{f.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--text-tertiary)" }}>${f.amount.toFixed(2)}/mo · {f.cat}</span>
                </div>
              </div>
              <span style={{ flex: "none", fontFamily: "var(--font-sans)", fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: "var(--radius-pill)", background: ct[0], color: ct[1] }}>{f.conf}</span>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}

/* Generic full-screen sheet shell with header + optional footer. */
function Sheet({ title, onBack, onClose, footer, children }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--surface-sunken)" }}>
      <ScreenHeader title={title}
        left={onBack ? <IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton> : null}
        right={<IconButton label="Close" onClick={onClose}><Icon name="x" size={22} /></IconButton>} />
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 16px 16px" }}>{children}</div>
      {footer && <div style={{ flex: "none", padding: "12px 16px 28px", borderTop: "1px solid var(--border-subtle)", background: "var(--surface-card)" }}>{footer}</div>}
    </div>
  );
}
window.DiscoverScreen = DiscoverScreen;
window.Sheet = Sheet;
