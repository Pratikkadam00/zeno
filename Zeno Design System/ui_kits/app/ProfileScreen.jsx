/* Zeno — Profile: identity, plan, plan & billing, and the exits. Sibling of
   Settings — same ledger list language, deliberately small. Local-only mode
   is stated with pride, and leaving it says plainly that data is NOT deleted.
   SLOP AUDIT — ① Zeno: identity as a ledger entry (LOCAL-ONLY MODE · NO
   ACCOUNT), exits printed in full sentences, no retention maze. ② Tempted
   by: big avatar hero + achievement chips → a quiet register. ③ Lazy
   version: settings-clone list with a giant edit-profile form.
   MOTION: rows print in on entry; exit confirm uses BottomSheetLite (spring
   d24). RN: rows = Pressable + impactAsync(Light). Light + dark via tokens. */
function ProfileScreen({ onClose, onBilling, onLogin, onExit }) {
  const P = window.ZENO.profile;
  const localOnly = !P.email;
  const [sheet, setSheet] = React.useState(false);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <Sheet title="PROFILE" onClose={onClose}>
        {/* Identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 13, padding: "12px 0 16px", borderBottom: "1px solid var(--rule-strong)" }}>
          <ServiceAvatar name={P.name} color="var(--cat-teal)" size={48} shape="circle" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 19, letterSpacing: "-0.015em", color: "var(--text-primary)" }}>{P.name}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em", color: "var(--text-tertiary)", marginTop: 3 }}>
              {localOnly ? "LOCAL-ONLY MODE · NO ACCOUNT" : P.email.toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ paddingTop: 6 }}>
          <LedgerLine label="Plan" strong value={P.plan.toUpperCase()} />
          <div onClick={onBilling} style={{ cursor: "pointer" }}>
            <LedgerLine label="Plan & billing" value="MANAGE ↗" valueColor="var(--accent-text)" />
          </div>
          {localOnly && (
            <div onClick={onLogin} style={{ cursor: "pointer" }}>
              <LedgerLine label="Sign in / create account" sub="ADDS ENCRYPTED SYNC" value="↗" valueColor="var(--accent-text)" />
            </div>
          )}
        </div>

        {localOnly && (
          <blockquote style={{ margin: "16px 0 0", padding: "2px 0 2px 14px", borderLeft: "3px solid var(--accent)", fontFamily: "var(--font-sans)", fontSize: 13.5, lineHeight: 1.6, color: "var(--text-primary)" }}>
            This ledger exists only on this phone. No account, no server copy — that's a feature, not a gap.
          </blockquote>
        )}

        <SectionHead pad="22px 0 8px">Leaving</SectionHead>
        <button onClick={() => setSheet(true)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--rule)", padding: "13px 0", minHeight: 48, cursor: "pointer" }}>
          <Icon name="log-out" size={17} color="var(--text-secondary)" />
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 650, fontSize: 14.5, color: "var(--text-primary)" }}>{localOnly ? "Exit local-only mode" : "Sign out"}</span>
            <span style={{ display: "block", fontFamily: "var(--font-sans)", fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 2, lineHeight: 1.45 }}>
              {localOnly ? "Your data is not deleted — it stays encrypted on this phone." : "Your synced data stays encrypted in your account."}
            </span>
          </span>
        </button>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--text-tertiary)", marginTop: 12, lineHeight: 1.5 }}>
          Want everything gone instead? Settings → Data &amp; privacy → Delete all my data.
        </div>
      </Sheet>

      {sheet && (
        <BottomSheetLite title={localOnly ? "EXIT LOCAL-ONLY MODE?" : "SIGN OUT?"} onClose={() => setSheet(false)}
          destructive={localOnly ? "You'll return to the start screen. Your ledger is not deleted — it stays encrypted on this phone and reopens when you come back." : "You can sign back in with the same email any time."}
          options={[{ label: localOnly ? "Exit — keep my data" : "Sign out", value: "go" }]}
          onPick={() => { setSheet(false); onExit(); }} />
      )}
    </div>
  );
}
window.ProfileScreen = ProfileScreen;
