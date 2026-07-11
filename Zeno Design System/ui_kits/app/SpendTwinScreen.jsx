/* Zeno — Spend Twin: the monthly total translated into real-world tradeoffs.
   STATIC illustrative benchmarks — the copy states this plainly and never
   implies live cohorts or other users' data. Overrides the earlier inline
   version (comparison-to-average is retired for benchmark tradeoffs).
   SLOP AUDIT — ① Zeno: tradeoffs as ledger entries — big mono quantity,
   label, one dry line; the honesty rail printed as a footer rule, not fine
   print buried. ② Tempted by: emoji-coin illustrations + "people like you"
   framing → type-only quantities and static-benchmark honesty. ③ Lazy
   version: a card list with coffee emoji and a share button.
   MOTION: rows print in (45ms stagger; RN FadeInDown); quantities count up
   on entry (AnimatedNumber 500ms). Reduced motion: fades. Light + dark via
   tokens. */
function SpendTwinScreen({ onClose }) {
  const total = window.ZENO.monthlyTotal;
  const rows = window.ZENO.twin;
  const [demoEmpty, setDemoEmpty] = React.useState(false);

  return (
    <Sheet title="SPEND TWIN" onClose={onClose}>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "var(--text-tertiary)", margin: "8px 0 6px" }}>YOUR MONTH, TRANSLATED</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 40, letterSpacing: "-0.03em", color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1" }}>${total.toFixed(2)}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-tertiary)" }}>/mo is also…</span>
      </div>
      <div style={{ borderBottom: "1px solid var(--rule-strong)", margin: "14px 0 4px" }}></div>

      {demoEmpty ? (
        <div style={{ padding: "26px 0" }}>
          <div style={{ fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 15, color: "var(--text-secondary)" }}>No comparison data yet.</div>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--text-tertiary)", marginTop: 4, lineHeight: 1.5 }}>Benchmarks load with the app — check back after the next update.</div>
        </div>
      ) : (
        rows.map((r, i) => (
          <div key={r.label} className="zn-print" style={{ animationDelay: `${i * 60}ms`, display: "flex", gap: 14, alignItems: "baseline", padding: "14px 0", borderBottom: "1px solid var(--rule)" }}>
            <span style={{ flex: "none", width: 74, fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 30, letterSpacing: "-0.03em", color: "var(--text-primary)", fontFeatureSettings: "'tnum' 1", textAlign: "right" }}>{r.qty}</span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>{r.label}</span>
              <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.45 }}>{r.desc}</span>
            </span>
          </div>
        ))
      )}

      {/* Honesty rail — a printed footer, not buried fine print */}
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: "var(--text-tertiary)", marginTop: 18, paddingTop: 12, borderTop: "1px solid var(--rule)", lineHeight: 1.7 }}>
        ILLUSTRATIVE BENCHMARKS AT STATIC PRICES — NOT OTHER USERS' DATA.
      </div>

      <div style={{ marginTop: 20, padding: "12px 14px", border: "1px dashed var(--rule-strong)", borderRadius: "var(--radius-md)" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--text-tertiary)", marginBottom: 8 }}>DEMO · PREVIEW EMPTY STATE</div>
        <Button variant="secondary" size="sm" fullWidth onClick={() => setDemoEmpty(e => !e)}>{demoEmpty ? "Show benchmarks" : "Show empty"}</Button>
      </div>
    </Sheet>
  );
}
window.SpendTwinScreen = SpendTwinScreen;
