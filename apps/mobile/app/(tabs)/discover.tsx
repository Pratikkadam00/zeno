import { services } from "@subradar/service-catalog";
import type { BillingCycle, SubscriptionCategory } from "@subradar/shared";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { parseCSV } from "../../src/discovery/csvParser";
import {
  connectGmail,
  disconnectGmail,
  fetchGmailAddress,
  getStoredGmailToken,
  scanGmailSubscriptions,
  type ParsedSubscription
} from "../../src/discovery/emailScanner";
import { scheduleRenewalNotifications } from "../../src/notifications/notificationService";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Types ────────────────────────────────────────────────────────────────────

type DetectionSource = "Gmail" | "Bank import";
type ScanStatus = "idle" | "connecting" | "scanning" | "parsing";
type DetectedSubscription = ParsedSubscription & {
  localId: string;
  source: DetectionSource;
  selected: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const gmailScopes = ["https://www.googleapis.com/auth/gmail.readonly"];
const confidenceColors: Record<ParsedSubscription["confidence"], string> = {
  high: colors.green,
  medium: colors.orange,
  low: colors.label4
};
const exportGuides = [
  ["Chase", "Settings → Download Account Activity → CSV"],
  ["Bank of America", "Accounts → Download → CSV format"],
  ["Wells Fargo", "Accounts → Download Activity → Spreadsheet"],
  ["Other banks", "Look for Download or Export in statements section"]
];

function getAvatarStyle(category: string): { bg: string; text: string } {
  switch (category) {
    case "entertainment":
    case "streaming":     return { bg: "rgba(255,69,58,0.15)",   text: "#FF453A" };
    case "ai_tools":      return { bg: "rgba(191,90,242,0.15)",  text: "#BF5AF2" };
    case "productivity":  return { bg: "rgba(10,132,255,0.15)",  text: "#0A84FF" };
    case "health":        return { bg: "rgba(255,159,10,0.15)",  text: "#FF9F0A" };
    case "finance":       return { bg: "rgba(90,200,245,0.15)",  text: "#5AC8F5" };
    case "education":     return { bg: "rgba(255,214,10,0.15)",  text: "#FFD60A" };
    default:              return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
  }
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { addSubscription } = useSubscriptionStore();
  const [gmailToken, setGmailToken]       = useState<string | null>(null);
  const [gmailAddress, setGmailAddress]   = useState<string | null>(null);
  const [scanStatus, setScanStatus]       = useState<ScanStatus>("idle");
  const [scanProgress, setScanProgress]   = useState({ current: 0, total: 0 });
  const [results, setResults]             = useState<DetectedSubscription[]>([]);
  const [guidesOpen, setGuidesOpen]       = useState(false);
  const [editing, setEditing]             = useState<DetectedSubscription | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const lastHandledAuthUrl                = useRef<string | null>(null);
  const scanCancelled                     = useRef(false);
  const googleClientId                    = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    clientSecret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
    responseType: ResponseType.Code,
    scopes: gmailScopes,
    usePKCE: true,
    shouldAutoExchangeCode: false,
    extraParams: { access_type: "offline", prompt: "consent" }
  });

  const selectedCount = results.filter((r) => r.selected).length;
  const isBusy = scanStatus !== "idle";

  useEffect(() => {
    let mounted = true;
    void getStoredGmailToken()
      .then(async (storedToken) => {
        if (!mounted || !storedToken) return;
        setGmailToken(storedToken);
        const address = await fetchGmailAddress(storedToken).catch(() => null);
        if (mounted) setGmailAddress(address);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!response || response.type !== "success" || !request || response.url === lastHandledAuthUrl.current) return;
    lastHandledAuthUrl.current = response.url;
    void handleGmailResponse();
  }, [request, response]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGmailResponse() {
    if (!request || !response) return;
    setError(null);
    setScanStatus("connecting");
    try {
      const token = await connectGmail(request, response);
      setGmailToken(token);
      setGmailAddress(await fetchGmailAddress(token).catch(() => "Connected Gmail"));
      await runGmailScan(token);
    } catch (connectError) {
      setError(getErrorMessage(connectError));
      setScanStatus("idle");
    }
  }

  async function handleConnectGmail() {
    if (!googleClientId) { setError("Add EXPO_PUBLIC_GOOGLE_CLIENT_ID before connecting Gmail."); return; }
    setError(null);
    await promptAsync();
  }

  async function runGmailScan(token = gmailToken) {
    if (!token) { setError("Connect Gmail before scanning."); return; }
    scanCancelled.current = false;
    setScanStatus("scanning");
    setScanProgress({ current: 0, total: 0 });
    setError(null);
    try {
      const found = await scanGmailSubscriptions(token, (current, total) => {
        if (!scanCancelled.current) setScanProgress({ current, total });
      });
      if (!scanCancelled.current) setResults(toDetected(found, "Gmail"));
    } catch (scanError) {
      if (!scanCancelled.current) setError(getErrorMessage(scanError));
    } finally {
      setScanStatus("idle");
      scanCancelled.current = false;
    }
  }

  async function handleDisconnect() {
    setError(null);
    await disconnectGmail().catch(() => undefined);
    setGmailToken(null);
    setGmailAddress(null);
  }

  async function handleImportCSV() {
    setError(null);
    setScanStatus("parsing");
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv"],
        copyToCacheDirectory: true,
        multiple: false
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const csvContent = await readPickedText(asset);
      const parsed = parseCSV(csvContent);
      setResults(toDetected(parsed.subscriptions, "Bank import"));
      showToast(`Found ${parsed.subscriptions.length} subscriptions from ${parsed.detectedFormat}.`);
    } catch (importError) {
      setError(getErrorMessage(importError));
    } finally {
      setScanStatus("idle");
    }
  }

  function cancelScan() { scanCancelled.current = true; setScanStatus("idle"); }
  function toggleSelected(localId: string) {
    setResults((curr) => curr.map((r) => r.localId === localId ? { ...r, selected: !r.selected } : r));
  }
  function saveEditedSubscription(updated: DetectedSubscription) {
    setResults((curr) => curr.map((r) => r.localId === updated.localId ? updated : r));
    setEditing(null);
  }

  async function addSelected() {
    const selected = results.filter((r) => r.selected);
    for (const result of selected) {
      const service = result.serviceId ? services.find((s) => s.id === result.serviceId) : undefined;
      const id = addSubscription({
        name: result.name,
        serviceSlug: service?.slug ?? result.serviceId,
        category: mapServiceCategory(service?.category),
        amountMinor: Math.round(result.amount * 100),
        billingCycle: mapBillingCycle(result.billingCycle),
        nextRenewalDate: result.nextRenewal,
        source: result.source === "Gmail" ? "email" : "csv"
      });
      await scheduleRenewalNotifications({ id, name: result.name, amount: result.amount, nextRenewalDate: result.nextRenewal });
    }
    showToast(`Added ${selected.length} subscriptions.`);
    router.replace("/dashboard");
  }

  const allSelected = results.length > 0 && results.every((r) => r.selected);

  // ── Results view ──────────────────────────────────────────────────────────
  if (results.length > 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Results header */}
          <View style={styles.pageHeaderWrap}>
            <Text style={styles.pageTitle}>Found {results.length} subscriptions</Text>
            <Text style={styles.pageSubtitle}>Review and add the ones you want to track</Text>
          </View>

          {/* Select all row */}
          <View style={styles.selectRow}>
            <Text style={styles.selectCount}>{selectedCount} selected</Text>
            <Pressable onPress={() => setResults((curr) => curr.map((r) => ({ ...r, selected: !allSelected })))}>
              <Text style={styles.selectAllLink}>{allSelected ? "Deselect all" : "Select all"}</Text>
            </Pressable>
          </View>

          {/* Results list */}
          <View style={styles.groupCard}>
            {results.map((result, index) => {
              const avatar = getAvatarStyle(result.serviceId ? "other" : "other");
              const isLast = index === results.length - 1;
              return (
                <Pressable key={result.localId} onPress={() => setEditing(result)}>
                  <View style={styles.resultRow}>
                    {/* Checkbox */}
                    <Pressable
                      onPress={() => toggleSelected(result.localId)}
                      style={[styles.checkbox, result.selected && styles.checkboxSelected]}
                    >
                      {result.selected ? <Text style={styles.checkmark}>✓</Text> : null}
                    </Pressable>

                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: colors.surfaceHigher }]}>
                      <Text style={styles.avatarText}>{result.name.charAt(0).toUpperCase()}</Text>
                    </View>

                    {/* Middle */}
                    <View style={styles.resultMiddle}>
                      <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
                      <View style={styles.resultMetaRow}>
                        <View style={[styles.sourcePill, result.source === "Gmail" ? styles.sourcePillGmail : styles.sourcePillBank]}>
                          <Text style={[styles.sourcePillText, { color: result.source === "Gmail" ? colors.blue : colors.green }]}>
                            {result.source}
                          </Text>
                        </View>
                        <Text style={styles.resultCycle}>{result.billingCycle}</Text>
                      </View>
                    </View>

                    {/* Right */}
                    <View style={styles.resultRight}>
                      <Text style={styles.resultAmount}>{formatAmount(result.amount)}</Text>
                      <View style={styles.confidenceRow}>
                        <View style={[styles.confidenceDot, { backgroundColor: confidenceColors[result.confidence] }]} />
                        <Text style={styles.confidenceText}>{result.confidence}</Text>
                      </View>
                    </View>
                  </View>
                  {!isLast ? <View style={styles.rowSep} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable onPress={() => setResults([])} style={styles.textLink}>
            <Text style={styles.textLinkLabel}>Start over</Text>
          </Pressable>
        </ScrollView>

        {/* Fixed bottom add button */}
        <View style={styles.bottomBar}>
          <Pressable
            onPress={() => void addSelected()}
            disabled={selectedCount === 0}
            style={[styles.primaryButton, { backgroundColor: selectedCount === 0 ? "rgba(10,132,255,0.3)" : colors.blue }]}
          >
            <Text style={styles.primaryButtonText}>
              {selectedCount === 0 ? "Select subscriptions to add" : `Add ${selectedCount} subscriptions`}
            </Text>
          </Pressable>
        </View>

        <EditSubscriptionModal candidate={editing} onClose={() => setEditing(null)} onSave={saveEditedSubscription} />
      </SafeAreaView>
    );
  }

  // ── Connect view ──────────────────────────────────────────────────────────
  const isScanning = scanStatus === "scanning";
  const isParsing  = scanStatus === "parsing";
  const progress   = scanProgress.total > 0 ? Math.min(1, scanProgress.current / scanProgress.total) : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Page header */}
        <View style={styles.pageHeaderWrap}>
          <Text style={styles.pageTitle}>Discover</Text>
          <Text style={styles.pageSubtitleSmall}>Find every subscription you pay for.</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* ── Gmail scan card ── */}
        <View style={styles.discoverCard}>
          {/* Icon + title */}
          <View style={styles.cardTop}>
            <View style={[styles.cardIconWrap, { backgroundColor: "rgba(10,132,255,0.12)", borderColor: "rgba(10,132,255,0.2)" }]}>
              <Text style={[styles.cardIconText, { color: colors.blue }]}>✉</Text>
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>Scan Gmail receipts</Text>
              <Text style={styles.cardSub}>Finds subscriptions from billing emails</Text>
            </View>
          </View>

          {/* Not connected */}
          {!gmailToken ? (
            <>
              <View style={styles.privacyPoints}>
                {[
                  "Read-only access — we cannot send or delete emails",
                  "Scanned on your device — nothing leaves your phone",
                  "Revoke anytime from your Google account settings"
                ].map((point) => (
                  <View key={point} style={styles.privacyPoint}>
                    <View style={styles.privacyDot} />
                    <Text style={styles.privacyPointText}>{point}</Text>
                  </View>
                ))}
              </View>

              {isScanning ? (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    Scanning {scanProgress.current} of {scanProgress.total} emails...
                  </Text>
                  <Pressable onPress={cancelScan} style={styles.cancelScanBtn}>
                    <Text style={styles.cancelScanText}>Cancel scan</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  disabled={!request || isBusy}
                  onPress={() => void handleConnectGmail()}
                  style={[styles.connectGmailBtn, (!request || isBusy) && styles.dimmed]}
                >
                  {scanStatus === "connecting" ? <ActivityIndicator color="#fff" size="small" /> : (
                    <>
                      <View style={styles.googleG}>
                        <Text style={styles.googleGText}>G</Text>
                      </View>
                      <Text style={styles.connectBtnText}>Connect Gmail</Text>
                    </>
                  )}
                </Pressable>
              )}
            </>
          ) : (
            /* Connected */
            <>
              <View style={styles.connectedRow}>
                <View style={styles.connectedDot} />
                <Text style={styles.connectedAddr} numberOfLines={1}>
                  Connected · {gmailAddress ?? "Gmail account"}
                </Text>
                <Pressable onPress={() => void handleDisconnect()}>
                  <Text style={styles.disconnectLink}>Disconnect</Text>
                </Pressable>
              </View>

              {isScanning ? (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    Scanning {scanProgress.current} of {scanProgress.total} emails...
                  </Text>
                  <Pressable onPress={cancelScan} style={styles.cancelScanBtn}>
                    <Text style={styles.cancelScanText}>Cancel scan</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable disabled={isBusy} onPress={() => void runGmailScan()} style={[styles.scanNowBtn, isBusy && styles.dimmed]}>
                  <Text style={styles.scanNowText}>Scan Now</Text>
                </Pressable>
              )}
            </>
          )}

          {/* Bottom accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentHalf, { backgroundColor: colors.blue }]} />
            <View style={[styles.accentHalf, { backgroundColor: "rgba(10,132,255,0.3)" }]} />
          </View>
        </View>

        {/* ── CSV import card ── */}
        <View style={[styles.discoverCard, { marginTop: 8 }]}>
          {/* Icon + title */}
          <View style={styles.cardTop}>
            <View style={[styles.cardIconWrap, { backgroundColor: "rgba(48,209,88,0.12)", borderColor: "rgba(48,209,88,0.2)" }]}>
              <Text style={[styles.cardIconText, { color: colors.green }]}>🏦</Text>
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>Import bank statement</Text>
              <Text style={styles.cardSub}>Find recurring charges in your transactions</Text>
            </View>
          </View>

          {/* Guide toggle */}
          <Pressable style={styles.guideToggleRow} onPress={() => setGuidesOpen((o) => !o)}>
            <Text style={styles.guideToggleText}>How to export from your bank</Text>
            <Text style={styles.guideToggleChevron}>{guidesOpen ? "∧" : "∨"}</Text>
          </Pressable>

          {guidesOpen ? (
            <View style={styles.guidesBox}>
              {exportGuides.map(([bank, guide]) => (
                <View key={bank} style={styles.guideItem}>
                  <Text style={styles.guideBank}>{bank}</Text>
                  <Text style={styles.guideInstr}>{guide}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Import button or parsing */}
          {isParsing ? (
            <View style={styles.parsingWrap}>
              <Text style={styles.parsingText}>Analysing transactions...</Text>
              <ActivityIndicator color={colors.blue} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <Pressable disabled={isBusy} onPress={() => void handleImportCSV()} style={[styles.importCsvBtn, isBusy && styles.dimmed]}>
              <Text style={styles.importCsvIcon}>📎</Text>
              <Text style={styles.importCsvText}>Import CSV File</Text>
            </Pressable>
          )}

          {/* Bottom accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentHalf, { backgroundColor: colors.green }]} />
            <View style={[styles.accentHalf, { backgroundColor: "rgba(48,209,88,0.3)" }]} />
          </View>
        </View>

        {/* Skip link */}
        <Pressable onPress={() => router.replace("/dashboard")} style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Skip for now</Text>
        </Pressable>

        {/* Empty state (below cards when nothing scanned) */}
        {!isBusy && !gmailToken ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIconText}>🔍</Text>
            </View>
            <Text style={styles.emptyTitle}>Find your subscriptions</Text>
            <Text style={styles.emptyBody}>
              Connect Gmail or import a bank statement to automatically discover what you pay for.
            </Text>
          </View>
        ) : null}

      </ScrollView>
      <EditSubscriptionModal candidate={editing} onClose={() => setEditing(null)} onSave={saveEditedSubscription} />
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EditSubscriptionModal({ candidate, onClose, onSave }: {
  candidate: DetectedSubscription | null;
  onClose: () => void;
  onSave: (candidate: DetectedSubscription) => void;
}) {
  const [draft, setDraft] = useState<DetectedSubscription | null>(candidate);
  useEffect(() => { setDraft(candidate); }, [candidate]);
  if (!draft) return null;

  return (
    <Modal visible={Boolean(candidate)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit details</Text>
          <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Service name" placeholderTextColor={colors.label4} style={styles.input} />
          <TextInput value={String(draft.amount)} onChangeText={(amount) => setDraft({ ...draft, amount: Number.parseFloat(amount) || 0 })} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={colors.label4} style={styles.input} />
          <TextInput value={draft.nextRenewal.slice(0, 10)} onChangeText={(nextRenewal) => setDraft({ ...draft, nextRenewal: new Date(nextRenewal).toISOString() })} placeholder="YYYY-MM-DD" placeholderTextColor={colors.label4} style={styles.input} />
          <View style={styles.cycleRow}>
            {(["weekly", "monthly", "annual", "unknown"] as const).map((cycle) => (
              <Pressable key={cycle} onPress={() => setDraft({ ...draft, billingCycle: cycle })} style={[styles.cycleChip, draft.billingCycle === cycle && styles.cycleChipActive]}>
                <Text style={[styles.cycleText, draft.billingCycle === cycle && styles.cycleTextActive]}>{cycle}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onClose} style={styles.modalGhostBtn}><Text style={styles.modalGhostText}>Cancel</Text></Pressable>
            <Pressable onPress={() => onSave(draft)} style={styles.modalSaveBtn}><Text style={styles.modalSaveText}>Save</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

async function readPickedText(asset: DocumentPicker.DocumentPickerAsset): Promise<string> {
  if (asset.file) return asset.file.text();
  const res = await fetch(asset.uri);
  return res.text();
}

function toDetected(subscriptions: ParsedSubscription[], source: DetectionSource): DetectedSubscription[] {
  return subscriptions.map((s, i) => ({ ...s, localId: `${source}-${s.name}-${i}`, source, selected: true }));
}

function mapBillingCycle(cycle: ParsedSubscription["billingCycle"]): BillingCycle { return cycle; }

function mapServiceCategory(category: string | undefined): SubscriptionCategory {
  if (category === "ai_tools") return "ai_tools";
  if (category === "streaming" || category === "gaming" || category === "music") return "entertainment";
  if (category === "productivity") return "productivity";
  if (category === "health") return "health";
  if (category === "finance") return "finance";
  if (category === "education") return "education";
  if (category === "cloud" || category === "security") return "developer_tools";
  return "other";
}

function formatAmount(amount: number): string { return `$${amount.toFixed(2)}`; }
function getErrorMessage(error: unknown): string { return error instanceof Error ? error.message : "Discovery scan failed."; }

function showToast(message: string): void {
  if (Platform.OS === "android") { ToastAndroid.show(message, ToastAndroid.SHORT); return; }
  Alert.alert("Zeno", message);
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 100, backgroundColor: colors.bg },

  // Page header
  pageHeaderWrap: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4 },
  pageTitle:      { fontSize: 28, fontWeight: "800", color: colors.label, letterSpacing: -1.5 },
  pageSubtitle:   { ...typography.callout, color: colors.label3, marginTop: 4 },
  pageSubtitleSmall: { fontSize: 15, color: colors.label3, letterSpacing: -0.2, marginTop: 4 },

  // Error
  errorCard:  { marginHorizontal: 16, marginTop: 12, borderRadius: 10, borderWidth: 0.5, borderColor: "rgba(255,69,58,0.2)", backgroundColor: "rgba(255,69,58,0.08)", paddingHorizontal: 14, paddingVertical: 10 },
  errorText:  { ...typography.footnote, color: colors.red },

  // Discover cards
  discoverCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: colors.surface, borderRadius: 20, overflow: "hidden" },
  cardTop:      { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  cardIconWrap: { width: 48, height: 48, borderRadius: 14, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
  cardIconText: { fontSize: 24 },
  cardTitleWrap:{ flex: 1 },
  cardTitle:    { fontSize: 17, fontWeight: "600", color: colors.label, letterSpacing: -0.3 },
  cardSub:      { fontSize: 13, color: colors.label3, marginTop: 3 },

  // Privacy points
  privacyPoints:   { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  privacyPoint:    { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  privacyDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue, marginTop: 5, flexShrink: 0 },
  privacyPointText:{ fontSize: 13, color: colors.label3, lineHeight: 18, letterSpacing: -0.1, flex: 1 },

  // Connect Gmail button
  connectGmailBtn: { margin: 20, marginTop: 4, backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  googleG:         { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  googleGText:     { fontSize: 11, fontWeight: "700", color: "#4285F4" },
  connectBtnText:  { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Connected state
  connectedRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
  connectedDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  connectedAddr: { flex: 1, fontSize: 14, color: colors.label3 },
  disconnectLink:{ fontSize: 13, color: colors.red },
  scanNowBtn:    { margin: 20, marginTop: 4, backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
  scanNowText:   { fontSize: 16, fontWeight: "600", color: "#fff" },

  // Progress (inside card)
  progressWrap:  { paddingHorizontal: 20, paddingBottom: 16 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.surfaceHigher, overflow: "hidden", marginBottom: 10 },
  progressFill:  { height: "100%", borderRadius: 2, backgroundColor: colors.blue },
  progressText:  { fontSize: 13, color: colors.label3, textAlign: "center", marginBottom: 12 },
  cancelScanBtn: { alignItems: "center", paddingVertical: 8 },
  cancelScanText:{ fontSize: 14, color: colors.red },

  // Bottom accent bar
  accentBar:   { height: 3, flexDirection: "row" },
  accentHalf:  { flex: 1 },

  // Guide toggle + box
  guideToggleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  guideToggleText: { fontSize: 14, color: colors.blue },
  guideToggleChevron:{ fontSize: 13, color: colors.label4 },
  guidesBox:    { marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.surfaceHigh, borderRadius: 12, padding: 14 },
  guideItem:    { marginBottom: 10 },
  guideBank:    { fontSize: 12, fontWeight: "600", color: colors.label, marginBottom: 2 },
  guideInstr:   { fontSize: 12, color: colors.label3, lineHeight: 18 },

  // Import CSV button + parsing
  importCsvBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 20, marginTop: 4, borderRadius: 14, paddingVertical: 15, backgroundColor: colors.surfaceHigh, borderWidth: 0.5, borderColor: colors.separatorOpaque },
  importCsvIcon: { fontSize: 16 },
  importCsvText: { fontSize: 16, fontWeight: "600", color: colors.label },
  parsingWrap:   { alignItems: "center", paddingVertical: 16, paddingHorizontal: 20 },
  parsingText:   { fontSize: 14, color: colors.label3, textAlign: "center" },

  // Empty state
  emptyState:    { paddingTop: 60, alignItems: "center", paddingHorizontal: 32 },
  emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  emptyIconText: { fontSize: 36 },
  emptyTitle:    { fontSize: 20, fontWeight: "600", color: colors.label, letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
  emptyBody:     { fontSize: 15, color: colors.label3, textAlign: "center", lineHeight: 22 },

  // Text link
  textLink:      { alignItems: "center", paddingVertical: 14 },
  textLinkLabel: { ...typography.subheadline, color: colors.label3 },
  dimmed:        { opacity: 0.4 },

  // Results
  selectRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.screenH, marginBottom: 8 },
  selectCount:   { fontSize: 13, color: colors.label3 },
  selectAllLink: { fontSize: 13, fontWeight: "600", color: colors.blue },
  groupCard:     { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: spacing.groupRadius, overflow: "hidden" },
  resultRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, minHeight: spacing.rowH + 8 },
  checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.surfaceHigher, alignItems: "center", justifyContent: "center" },
  checkboxSelected:{ borderColor: colors.blue, backgroundColor: colors.blue },
  checkmark:     { fontSize: 12, fontWeight: "700", color: "#fff", textAlign: "center", lineHeight: 22 },
  avatar:        { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  avatarText:    { fontSize: 14, fontWeight: "700", color: "#fff" },
  resultMiddle:  { flex: 1, minWidth: 0 },
  resultName:    { ...typography.subheadline, color: colors.label },
  resultMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  sourcePill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  sourcePillGmail: { backgroundColor: "rgba(10,132,255,0.1)" },
  sourcePillBank:  { backgroundColor: "rgba(48,209,88,0.1)" },
  sourcePillText:  { fontSize: 10, fontWeight: "600" },
  resultCycle:   { fontSize: 12, color: colors.label3 },
  resultRight:   { alignItems: "flex-end" },
  resultAmount:  { ...typography.subheadline, fontWeight: "500", color: colors.label, fontVariant: ["tabular-nums"] },
  confidenceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, justifyContent: "flex-end" },
  confidenceDot: { width: 6, height: 6, borderRadius: 3 },
  confidenceText:{ fontSize: 10, color: colors.label4 },
  rowSep:        { height: 0.5, backgroundColor: colors.separator },

  // Fixed bottom add bar
  bottomBar:     { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.bg, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: colors.separator },
  primaryButton: { borderRadius: 14, paddingVertical: 17, alignItems: "center", justifyContent: "center" },
  primaryButtonText: { fontSize: 17, fontWeight: "600", color: "#fff" },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard:     { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  modalTitle:    { ...typography.title3, color: colors.label },
  input:         { minHeight: spacing.rowH + 4, borderRadius: 12, borderWidth: 0.5, borderColor: colors.separatorOpaque, backgroundColor: colors.surfaceHigh, color: colors.label, paddingHorizontal: 14, ...typography.body },
  cycleRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cycleChip:     { borderRadius: 20, borderWidth: 0.5, borderColor: colors.separatorOpaque, paddingHorizontal: 12, paddingVertical: 8 },
  cycleChipActive: { borderColor: colors.blue, backgroundColor: "rgba(10,132,255,0.12)" },
  cycleText:     { ...typography.caption1, color: colors.label3, textTransform: "uppercase", fontWeight: "600" },
  cycleTextActive: { color: colors.blue },
  modalActions:  { flexDirection: "row", gap: 10, marginTop: 4 },
  modalGhostBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 0.5, borderColor: colors.separatorOpaque },
  modalGhostText:{ ...typography.callout, color: colors.label3, fontWeight: "600" },
  modalSaveBtn:  { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: colors.blue },
  modalSaveText: { ...typography.callout, color: "#fff", fontWeight: "600" }
});
