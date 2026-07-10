/* Zeno — Discover: scan → the receipt. Results arrive as a tear-edge sheet
   that prints row by row under a scan line.
   SLOP AUDIT — ① Zeno: the printing receipt with tear edge + column heads +
   dashed total rule — nobody else's results screen looks like this. ② Tempted
   by: radar/pulse animation → the scan line prints a document instead (honest,
   in-concept). ③ Lazy: spinner → card list with checkboxes.
   MOTION: scan line zn-scanline loops during scan; skeleton rows shimmer;
   results print in (45ms stagger). RN: Reanimated loop + FadeInDown. */
function DiscoverScreen({ initialMethod, onClose, onManual, onAdded }) {
  const [stage, setStage] = React.useState("hub");
  const [method, setMethod] = React.useState(null);

  React.useEffect(() => {
    if (initialMethod === "email") { setMethod("email"); setStage("email"); }
    else if (initialMethod === "csv") { setMethod("csv"); setStage("csv"); }
    else if (initialMethod === "manual") { onManual && onManual(); }
  }, [initialMethod]);

  const found = [
    { name: "Netflix", color: "#E50914", amount: 15.99, cat: "Entertainment", conf: "HIGH" },
    { name: "Spotify", color: "#1DB954", amount: 10.99, cat: "Music", conf: "HIGH" },
    { name: "ChatGPT Plus", color: "#10A37F", amount: 20.00, cat: "Productivity", conf: "HIGH" },
    { name: "iCloud+", color: "#3B82F6", amount: 2.99, cat: "Utilities", conf: "MED" },
    { name: "Figma", color: "#A259FF", amount: 12.00, cat: "Productivity", conf: "MED" },
    { name: "Audible", color: "#F8991C", amount: 14.95, cat: "Entertainment", conf: "LOW" },
  ];
  const startScan = () => { setStage("scanning"); setTimeout(() => setStage("results"), 2400); };

  if (stage === "hub") {
    const methods = [
      { id: "csv", icon: "file-spreadsheet", title: "Import a statement", body: "Export a CSV yourself — the most complete picture.", tag: "RECOMMENDED", go: () => { setMethod("csv"); setStage("csv"); } },
      { id: "email", icon: "mail-search", title: "Scan email receipts", body: "A scan you start. Read on this phone, last 12 months.", go: () => { setMethod("email"); setStage("email"); } },
      { id: "manual", icon: "pencil-line", title: "Add by hand", body: "600+ services with autocomplete, or custom.", go: () => onManual && onManual() },
    ];
    return (
      <Sheet title="DISCOVER" onClose={onClose}>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13.5, color: "var(--text-secondary)", margin: "4px 0 14px", lineHeight: 1.5 }}>
          Three ways to find what you're paying — none of them wants your bank login. Zeno scans only when you tap scan.
        </p>
        <div style={{ borderTop: "1px solid var(--rule-strong)" }}>
          {methods.map((m, i) => (
            <button key={m.id} onClick={m.go} className="zn-print" style={{ animationDelay: `${i * 70}ms`, display: "flex", gap: 13, alignItems: "center", textAlign: "left", width: "100%", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "15px 2px", cursor: "pointer" }}>
              <span style={{ width: 42, height: 42, flex: "none", border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--surface-card)" }}>
                <Icon name={m.icon} size={20} color="var(--text-secondary)" />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{m.title}</span>
                  {m.tag && <span style={{ fontFamily: "var(--font-mono)", fontSize: 8.5, fontWeight: 700, letterSpacing: "0.14em", color: "var(--accent-text)" }}>{m.tag}</span>}
                </span>
                <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2 }}>{m.body}</span>
              </span>
              <Icon name="chevron-right" size={17} color="var(--text-tertiary)" />
            </button>
          ))}
        </div>
      </Sheet>
    );
  }

  if (stage === "email") {
    return (
      <Sheet title="SCAN RECEIPTS" onBack={() => setStage("hub")} onClose={onClose}>
        <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12, margin: "6px 0 18px" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Read-only, on this phone, on your command.</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
            Zeno looks at the last 12 months of receipts when you start a scan. Access is revocable any time in Settings.
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Button variant="primary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="mail" size={18} />}>Connect Gmail — read-only</Button>
          <Button variant="secondary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="mail" size={18} />}>Connect Outlook</Button>
        </div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--text-tertiary)", marginTop: 16, textAlign: "center" }}>FIRST SCAN FREE</p>
      </Sheet>
    );
  }

  if (stage === "csv") {
    return (
      <Sheet title="IMPORT STATEMENT" onBack={() => setStage("hub")} onClose={onClose}>
        <div style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 12, margin: "6px 0 18px" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>You export it. Zeno reads it here.</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>
            The CSV is parsed on this phone to spot recurring charges. No bank login required — that's the point.
          </div>
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--text-tertiary)", margin: "0 0 6px" }}>HOW TO EXPORT</div>
        {["Open your bank's site or app", "Statements → export as CSV", "Pick the last 3–12 months"].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "baseline", padding: "9px 0", borderBottom: "1px solid var(--rule)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)" }}>{String(i + 1).padStart(2, "0")}</span>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "var(--text-primary)" }}>{t}</span>
          </div>
        ))}
        <Button variant="primary" size="lg" fullWidth onClick={startScan} leftIcon={<Icon name="upload" size={17} />} style={{ marginTop: 18 }}>Choose CSV file</Button>
      </Sheet>
    );
  }

  if (stage === "scanning") {
    return (
      <Sheet title={method === "csv" ? "READING STATEMENT" : "READING RECEIPTS"} onClose={onClose}>
        <div style={{ position: "relative", overflow: "hidden", marginTop: 10, border: "1px solid var(--rule-strong)", borderRadius: "var(--radius-sm)", background: "var(--surface-card)", padding: "18px 16px 22px" }}>
          {/* scan head sweeping the page */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 2, background: "var(--accent)", boxShadow: "0 0 12px var(--accent)", animation: "zn-scanline 1.6s var(--ease-in-out) infinite" }}></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "var(--text-tertiary)", marginBottom: 14 }}>PRINTING YOUR RECEIPT…</div>
          {[92, 78, 85, 64, 88].map((w, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderBottom: "1px solid var(--rule)" }}>
              <SkeletonRow width={`${w * 0.6}%`} height={12} />
              <SkeletonRow width={48} height={12} />
            </div>
          ))}
        </div>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)", textAlign: "center", marginTop: 16 }}>Read on this phone. Cancel any time.</p>
        <button onClick={() => setStage(method)} style={{ display: "block", margin: "6px auto 0", background: "none", border: "none", color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer", padding: 10 }}>CANCEL</button>
      </Sheet>
    );
  }

  return <ResultsReview found={found} method={method} onClose={onClose} onAdded={onAdded} />;
}

/* The receipt — tear-edge sheet, column heads, dashed total rule */
function ResultsReview({ found, method, onClose, onAdded }) {
  const [sel, setSel] = React.useState(() => found.map((_, i) => i < 5));
  const count = sel.filter(Boolean).length;
  const sum = found.reduce((a, f, i) => a + (sel[i] ? f.amount : 0), 0);
  const confColor = { HIGH: "var(--stamp-verified)", MED: "#A36A0B", LOW: "var(--text-tertiary)" };

  return (
    <Sheet title="SCAN RESULTS" onClose={onClose}
      footer={<Button variant="money" size="lg" fullWidth disabled={count === 0} onClick={() => onAdded(count)}>{count === 0 ? "Select entries" : `Add ${count} · $${sum.toFixed(2)}/mo`}</Button>}>
      <div style={{ margin: "8px -4px 0" }}>
        <TearEdge flip color="var(--surface-card)" />
        <div style={{ background: "var(--surface-card)", borderLeft: "1px solid var(--rule)", borderRight: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", padding: "14px 14px 16px" }}>
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", color: "var(--text-tertiary)" }}>
            ZENO · {method === "csv" ? "STATEMENT SCAN" : "RECEIPT SCAN"} · JUL 10
          </div>
          <div style={{ textAlign: "center", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-secondary)", margin: "6px 0 12px" }}>
            {found.length} recurring charges found. Untick anything that isn't real.
          </div>
          <ColumnHeads left="✓ SERVICE" right="CONF / AMOUNT" style={{ padding: "0 2px 6px" }} />
          {found.map((f, i) => {
            const on = sel[i];
            return (
              <div key={f.name} onClick={() => setSel(s => s.map((v, j) => j === i ? !v : v))} className="zn-print" style={{ animationDelay: `${i * 45}ms`, display: "flex", alignItems: "center", gap: 11, padding: "10px 2px", borderBottom: "1px solid var(--rule)", cursor: "pointer", opacity: on ? 1 : 0.45 }}>
                <span style={{ width: 20, height: 20, flex: "none", borderRadius: 4, border: `1.5px solid ${on ? "var(--accent)" : "var(--border-strong)"}`, background: on ? "var(--accent)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && <Icon name="check" size={13} color="var(--text-on-accent)" strokeWidth={3.2} />}
                </span>
                <ServiceAvatar name={f.name} color={f.color} size={32} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14, color: "var(--text-primary)" }}>{f.name}</span>
                  <span style={{ display: "block", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.1em", color: confColor[f.conf] }}>{f.conf} CONFIDENCE</span>
                </span>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>${f.amount.toFixed(2)}</span>
              </div>
            );
          })}
          <div style={{ borderBottom: "2px dashed var(--rule-strong)", margin: "4px 0" }}></div>
          <LedgerLine label="Selected total" strong value={`$${sum.toFixed(2)} /mo`} valueColor="var(--accent-text)" />
        </div>
        <TearEdge color="var(--surface-card)" />
      </div>
    </Sheet>
  );
}

/* Full-screen sheet shell */
function Sheet({ title, onBack, onClose, footer, children }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-app)" }}>
      <ScreenHeader title={title}
        left={onBack ? <IconButton label="Back" onClick={onBack}><Icon name="chevron-left" size={24} /></IconButton> : null}
        right={<IconButton label="Close" onClick={onClose}><Icon name="x" size={21} /></IconButton>} />
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 20px 16px" }}>{children}</div>
      {footer && <div style={{ flex: "none", padding: "12px 20px 28px", borderTop: "1px solid var(--rule-strong)", background: "var(--surface-card)" }}>{footer}</div>}
    </div>
  );
}
window.DiscoverScreen = DiscoverScreen;
window.Sheet = Sheet;
