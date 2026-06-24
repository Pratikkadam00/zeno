import { services } from "@zeno/service-catalog";
import type { BillingCycle, SubscriptionCategory } from "@zeno/shared";
import { ResponseType } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { parseCSV } from "../../src/discovery/csvParser";
import {
  connectGmail,
  disconnectGmailAccount,
  listConnectedGmailAccounts,
  scanAllGmailAccounts,
  type GmailAccount,
  type ParsedSubscription
} from "../../src/discovery/emailScanner";
import { scheduleRenewalNotifications } from "../../src/notifications/notificationService";
import { useZenoTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { withAlpha } from "../../src/utils/subscription-ui";
import { Check, ChevronDown, ChevronUp, FileSpreadsheet, MailSearch, Plus, Search, Upload } from "lucide-react-native";
import { ServiceAvatar } from "../../src/components/zeno";
import { fonts } from "../../src/theme/zeno";

// ─── Types ────────────────────────────────────────────────────────────────────

type DetectionSource = "Gmail" | "Bank import";
type ScanStatus = "idle" | "connecting" | "scanning" | "parsing";
type DetectedSubscription = ParsedSubscription & {
  localId: string;
  source: DetectionSource;
  selected: boolean;
  alreadyTracked?: boolean;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const gmailScopes = ["https://www.googleapis.com/auth/gmail.readonly"];
// Google brand mark color — intentionally theme-invariant.
const GOOGLE_BRAND_BLUE = "#4285F4";

function getConfidenceColor(confidence: ParsedSubscription["confidence"], theme: ThemeTokens): string {
  if (confidence === "high") return theme.success;
  if (confidence === "medium") return theme.warning;
  return theme.quietText;
}

const exportGuides = [
  ["Chase", "Settings → Download Account Activity → CSV"],
  ["Bank of America", "Accounts → Download → CSV format"],
  ["Wells Fargo", "Accounts → Download Activity → Spreadsheet"],
  ["Other banks", "Look for Download or Export in statements section"]
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { addSubscription, subscriptions: tracked } = useSubscriptionStore();

  // Accuracy guard: flag results that match a subscription you already track
  // (by catalog slug or name) and deselect them by default — no duplicates.
  function annotateTracked(items: DetectedSubscription[]): DetectedSubscription[] {
    const keys = new Set<string>();
    for (const existing of tracked) {
      if (existing.status === "cancelled") continue;
      if (existing.serviceSlug) keys.add(`slug:${existing.serviceSlug.toLowerCase()}`);
      keys.add(`name:${existing.name.trim().toLowerCase()}`);
    }
    return items.map((item) => {
      const isTracked =
        (item.serviceId ? keys.has(`slug:${item.serviceId.toLowerCase()}`) : false) ||
        keys.has(`name:${item.name.trim().toLowerCase()}`);
      return isTracked ? { ...item, alreadyTracked: true, selected: false } : item;
    });
  }
  const [accounts, setAccounts]           = useState<GmailAccount[]>([]);
  const [scanStatus, setScanStatus]       = useState<ScanStatus>("idle");
  const [scanProgress, setScanProgress]   = useState({ current: 0, total: 0 });
  const [results, setResults]             = useState<DetectedSubscription[]>([]);
  const [guidesOpen, setGuidesOpen]       = useState(false);
  const [editing, setEditing]             = useState<DetectedSubscription | null>(null);
  const [error, setError]                 = useState<string | null>(null);
  const lastHandledAuthUrl                = useRef<string | null>(null);
  const scanCancelled                     = useRef(false);
  const googleClientId                    = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const googleIosClientId                 = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const googleAndroidClientId             = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: googleClientId,
    // Native (public) OAuth clients per platform — NO client secret (PKCE below).
    // A secret must never ship in a mobile bundle (extractable from the APK/IPA).
    // On a native build these platform client IDs are used; see SECURITY.md.
    iosClientId: googleIosClientId,
    androidClientId: googleAndroidClientId,
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
    void listConnectedGmailAccounts()
      .then((connected) => { if (mounted) setAccounts(connected); })
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
      const account = await connectGmail(request, response);
      setAccounts((prev) => prev.some((a) => a.address === account.address) ? prev : [...prev, account]);
      await runGmailScan();
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

  async function runGmailScan() {
    scanCancelled.current = false;
    setScanStatus("scanning");
    setScanProgress({ current: 0, total: 0 });
    setError(null);
    try {
      const found = await scanAllGmailAccounts((current, total) => {
        if (!scanCancelled.current) setScanProgress({ current, total });
      });
      if (!scanCancelled.current) setResults(annotateTracked(toDetected(found, "Gmail")));
    } catch (scanError) {
      if (!scanCancelled.current) setError(getErrorMessage(scanError));
    } finally {
      setScanStatus("idle");
      scanCancelled.current = false;
    }
  }

  async function handleDisconnect(address: string) {
    setError(null);
    await disconnectGmailAccount(address).catch(() => undefined);
    setAccounts((prev) => prev.filter((a) => a.address !== address));
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
      setResults(annotateTracked(toDetected(parsed.subscriptions, "Bank import")));
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
        amountMinor: Math.round(Number(result.amount.toFixed(2)) * 100),
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={allSelected ? "Deselect all subscriptions" : "Select all subscriptions"}
              hitSlop={8}
              onPress={() => setResults((curr) => curr.map((r) => ({ ...r, selected: !allSelected })))}
            >
              <Text style={styles.selectAllLink}>{allSelected ? "Deselect all" : "Select all"}</Text>
            </Pressable>
          </View>

          {/* Results list */}
          <View style={styles.groupCard}>
            {results.map((result, index) => {
              const isLast = index === results.length - 1;
              return (
                <Pressable
                  key={result.localId}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${result.name}`}
                  onPress={() => setEditing(result)}
                >
                  <View style={styles.resultRow}>
                    {/* Checkbox */}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: result.selected }}
                      accessibilityLabel={`${result.selected ? "Deselect" : "Select"} ${result.name}`}
                      hitSlop={10}
                      onPress={() => toggleSelected(result.localId)}
                      style={[styles.checkbox, result.selected && styles.checkboxSelected]}
                    >
                      {result.selected ? <Check size={14} color={theme.onPrimary} strokeWidth={3} /> : null}
                    </Pressable>

                    {/* Avatar */}
                    <ServiceAvatar name={result.name} size={34} />

                    {/* Middle */}
                    <View style={styles.resultMiddle}>
                      <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
                      <View style={styles.resultMetaRow}>
                        <View style={[styles.sourcePill, result.source === "Gmail" ? styles.sourcePillGmail : styles.sourcePillBank]}>
                          <Text style={[styles.sourcePillText, { color: result.source === "Gmail" ? theme.primary : theme.success }]}>
                            {result.source}
                          </Text>
                        </View>
                        {result.billedThrough ? (
                          <View style={[styles.sourcePill, { backgroundColor: theme.warningSurface }]}>
                            <Text style={[styles.sourcePillText, { color: theme.warning }]}>
                              {result.billedThrough === "app_store" ? "App Store" : "Play Store"}
                            </Text>
                          </View>
                        ) : null}
                        {result.alreadyTracked ? (
                          <View style={[styles.sourcePill, { backgroundColor: theme.surfaceAlt }]}>
                            <Text style={[styles.sourcePillText, { color: theme.mutedText }]}>Already tracked</Text>
                          </View>
                        ) : null}
                        <Text style={styles.resultCycle}>{result.billingCycle}</Text>
                      </View>
                    </View>

                    {/* Right */}
                    <View style={styles.resultRight}>
                      <Text style={styles.resultAmount}>{formatAmount(result.amount)}</Text>
                      <View style={styles.confidenceRow}>
                        <View style={[styles.confidenceDot, { backgroundColor: getConfidenceColor(result.confidence, theme) }]} />
                        <Text style={styles.confidenceText}>{result.confidence}</Text>
                      </View>
                    </View>
                  </View>
                  {!isLast ? <View style={styles.rowSep} /> : null}
                </Pressable>
              );
            })}
          </View>

          <Pressable accessibilityRole="button" onPress={() => setResults([])} style={styles.textLink}>
            <Text style={styles.textLinkLabel}>Start over</Text>
          </Pressable>
        </ScrollView>

        {/* Fixed bottom add button */}
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedCount === 0 }}
            onPress={() => void addSelected()}
            disabled={selectedCount === 0}
            style={[styles.primaryButton, { backgroundColor: selectedCount === 0 ? withAlpha(theme.primary, 0.3) : theme.primary }]}
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

        {/* ── Bank import card (primary: catches everything that hits the card) ── */}
        <View style={styles.discoverCard}>
          {/* Icon + title */}
          <View style={styles.cardTop}>
            <View style={[styles.cardIconWrap, styles.cardIconWrapBank]} accessible={false} importantForAccessibility="no-hide-descendants">
              <FileSpreadsheet size={24} color={theme.success} strokeWidth={2} />
            </View>
            <View style={styles.cardTitleWrap}>
              <View style={styles.titleWithBadge}>
                <Text style={styles.cardTitle}>Import bank statement</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedBadgeText}>MOST COMPLETE</Text>
                </View>
              </View>
              <Text style={styles.cardSub}>Catches every recurring charge — even App Store & annual plans</Text>
            </View>
          </View>

          {/* Guide toggle */}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: guidesOpen }}
            style={styles.guideToggleRow}
            onPress={() => setGuidesOpen((o) => !o)}
          >
            <Text style={styles.guideToggleText}>How to export from your bank</Text>
            {guidesOpen ? <ChevronUp size={16} color={theme.quietText} strokeWidth={2} /> : <ChevronDown size={16} color={theme.quietText} strokeWidth={2} />}
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
              <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Import CSV file"
              accessibilityState={{ disabled: isBusy }}
              disabled={isBusy}
              onPress={() => void handleImportCSV()}
              style={[styles.importCsvBtn, isBusy && styles.dimmed]}
            >
              <Upload size={18} color={theme.text} strokeWidth={2} />
              <Text style={styles.importCsvText}>Import CSV File</Text>
            </Pressable>
          )}

          {/* Bottom accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentHalf, { backgroundColor: theme.success }]} />
            <View style={[styles.accentHalf, { backgroundColor: withAlpha(theme.success, 0.3) }]} />
          </View>
        </View>

        {/* ── Gmail scan card (secondary: good for mainstream subs) ── */}
        <View style={[styles.discoverCard, { marginTop: 8 }]}>
          {/* Icon + title */}
          <View style={styles.cardTop}>
            <View style={[styles.cardIconWrap, styles.cardIconWrapMail]} accessible={false} importantForAccessibility="no-hide-descendants">
              <MailSearch size={24} color={theme.primary} strokeWidth={2} />
            </View>
            <View style={styles.cardTitleWrap}>
              <Text style={styles.cardTitle}>Scan Gmail receipts</Text>
              <Text style={styles.cardSub}>Add one or more inboxes — we scan the last 12 months</Text>
            </View>
          </View>

          {accounts.length === 0 ? (
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

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Connect Gmail"
                accessibilityState={{ disabled: !request || isBusy }}
                disabled={!request || isBusy}
                onPress={() => void handleConnectGmail()}
                style={[styles.connectGmailBtn, (!request || isBusy) && styles.dimmed]}
              >
                {scanStatus === "connecting" ? <ActivityIndicator color={theme.onPrimary} size="small" /> : (
                  <>
                    <View style={styles.googleG} accessible={false} importantForAccessibility="no-hide-descendants">
                      <Text style={styles.googleGText}>G</Text>
                    </View>
                    <Text style={styles.connectBtnText}>Connect Gmail</Text>
                  </>
                )}
              </Pressable>
            </>
          ) : (
            <>
              {/* Connected inboxes */}
              {accounts.map((account) => (
                <View key={account.address} style={styles.connectedRow}>
                  <View style={styles.connectedDot} />
                  <Text style={styles.connectedAddr} numberOfLines={1}>{account.address}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Disconnect ${account.address}`}
                    hitSlop={8}
                    onPress={() => void handleDisconnect(account.address)}
                  >
                    <Text style={styles.disconnectLink}>Disconnect</Text>
                  </Pressable>
                </View>
              ))}

              {/* Add another inbox */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add another Gmail inbox"
                accessibilityState={{ disabled: !request || isBusy }}
                disabled={!request || isBusy}
                onPress={() => void handleConnectGmail()}
                style={[styles.addInboxBtn, { flexDirection: "row", alignItems: "center", gap: 6 }]}
              >
                <Plus size={16} color={theme.primary} strokeWidth={2} style={(!request || isBusy) ? styles.dimmed : undefined} />
                <Text style={[styles.addInboxText, (!request || isBusy) && styles.dimmed]}>Add another inbox</Text>
              </Pressable>

              {isScanning ? (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressText}>
                    Scanning {scanProgress.current} of {scanProgress.total} emails...
                  </Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Cancel scan" hitSlop={8} onPress={cancelScan} style={styles.cancelScanBtn}>
                    <Text style={styles.cancelScanText}>Cancel scan</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={accounts.length > 1 ? "Scan all inboxes" : "Scan inbox"}
                  accessibilityState={{ disabled: isBusy }}
                  disabled={isBusy}
                  onPress={() => void runGmailScan()}
                  style={[styles.scanNowBtn, isBusy && styles.dimmed]}
                >
                  <Text style={styles.scanNowText}>{accounts.length > 1 ? "Scan all inboxes" : "Scan Now"}</Text>
                </Pressable>
              )}
            </>
          )}

          {/* Bottom accent bar */}
          <View style={styles.accentBar}>
            <View style={[styles.accentHalf, { backgroundColor: theme.primary }]} />
            <View style={[styles.accentHalf, { backgroundColor: withAlpha(theme.primary, 0.3) }]} />
          </View>
        </View>

        {/* Skip link */}
        <Pressable accessibilityRole="button" onPress={() => router.replace("/dashboard")} style={styles.textLink}>
          <Text style={styles.textLinkLabel}>Skip for now</Text>
        </Pressable>

        {/* Empty state (below cards when nothing scanned) */}
        {!isBusy && accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
              <Search size={32} color={theme.mutedText} strokeWidth={2} />
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
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [draft, setDraft] = useState<DetectedSubscription | null>(candidate);
  useEffect(() => { setDraft(candidate); }, [candidate]);
  if (!draft) return null;

  return (
    <Modal visible={Boolean(candidate)} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Edit details</Text>
          <TextInput value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Service name" placeholderTextColor={theme.quietText} style={styles.input} accessibilityLabel="Service name" />
          <TextInput value={String(draft.amount)} onChangeText={(amount) => setDraft({ ...draft, amount: Number.parseFloat(amount) || 0 })} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={theme.quietText} style={styles.input} accessibilityLabel="Amount" />
          <TextInput value={draft.nextRenewal.slice(0, 10)} onChangeText={(nextRenewal) => setDraft({ ...draft, nextRenewal: new Date(nextRenewal).toISOString() })} placeholder="YYYY-MM-DD" placeholderTextColor={theme.quietText} style={styles.input} accessibilityLabel="Next renewal date" />
          <View style={styles.cycleRow}>
            {(["weekly", "monthly", "quarterly", "annual", "unknown"] as const).map((cycle) => (
              <Pressable
                key={cycle}
                accessibilityRole="button"
                accessibilityState={{ selected: draft.billingCycle === cycle }}
                onPress={() => setDraft({ ...draft, billingCycle: cycle })}
                style={[styles.cycleChip, draft.billingCycle === cycle && styles.cycleChipActive]}
              >
                <Text style={[styles.cycleText, draft.billingCycle === cycle && styles.cycleTextActive]}>{cycle}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.modalGhostBtn}><Text style={styles.modalGhostText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onSave(draft)} style={styles.modalSaveBtn}><Text style={styles.modalSaveText}>Save</Text></Pressable>
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

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea:      { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 100, backgroundColor: theme.background },

    // Page header
    pageHeaderWrap: { paddingHorizontal: spacing.screenH, paddingTop: 16, paddingBottom: 4 },
    pageTitle:      { fontSize: 28, fontFamily: fonts.display.bold, color: theme.text, letterSpacing: -1.0 },
    pageSubtitle:   { ...typography.callout, color: theme.mutedText, marginTop: 4 },
    pageSubtitleSmall: { fontSize: 15, color: theme.mutedText, letterSpacing: -0.2, marginTop: 4 },

    // Error
    errorCard:  { marginHorizontal: 16, marginTop: 12, borderRadius: 10, borderWidth: 0.5, borderColor: withAlpha(theme.danger, 0.2), backgroundColor: theme.dangerSurface, paddingHorizontal: 14, paddingVertical: 10 },
    errorText:  { ...typography.footnote, color: theme.danger },

    // Discover cards
    discoverCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: theme.card, borderRadius: 20, overflow: "hidden" },
    cardTop:      { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
    cardIconWrap: { width: 48, height: 48, borderRadius: 14, borderWidth: 0.5, alignItems: "center", justifyContent: "center" },
    cardIconWrapMail: { backgroundColor: theme.primarySurface, borderColor: withAlpha(theme.primary, 0.2) },
    cardIconWrapBank: { backgroundColor: theme.successSurface, borderColor: withAlpha(theme.success, 0.2) },
    cardIconText: { fontSize: 24 },
    cardTitleWrap:{ flex: 1 },
    cardTitle:    { fontSize: 17, fontWeight: "600", color: theme.text, letterSpacing: -0.3 },
    cardSub:      { fontSize: 13, color: theme.mutedText, marginTop: 3 },
    titleWithBadge: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
    recommendedBadge: { backgroundColor: theme.successSurface, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    recommendedBadgeText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.4, color: theme.success },
    addInboxBtn:  { paddingHorizontal: 20, paddingVertical: 10 },
    addInboxText: { fontSize: 14, fontWeight: "600", color: theme.primary },

    // Privacy points
    privacyPoints:   { paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
    privacyPoint:    { flexDirection: "row", alignItems: "flex-start", gap: 10 },
    privacyDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.primary, marginTop: 5, flexShrink: 0 },
    privacyPointText:{ fontSize: 13, color: theme.mutedText, lineHeight: 18, letterSpacing: -0.1, flex: 1 },

    // Connect Gmail button
    connectGmailBtn: { margin: 20, marginTop: 4, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 15, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
    googleG:         { width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    googleGText:     { fontSize: 11, fontWeight: "700", color: GOOGLE_BRAND_BLUE },
    connectBtnText:  { fontSize: 16, fontWeight: "600", color: theme.onPrimary },

    // Connected state
    connectedRow:  { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 20, paddingBottom: 12 },
    connectedDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.success },
    connectedAddr: { flex: 1, fontSize: 14, color: theme.mutedText },
    disconnectLink:{ fontSize: 13, color: theme.danger },
    scanNowBtn:    { margin: 20, marginTop: 4, backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    scanNowText:   { fontSize: 16, fontWeight: "600", color: theme.onPrimary },

    // Progress (inside card)
    progressWrap:  { paddingHorizontal: 20, paddingBottom: 16 },
    progressTrack: { height: 4, borderRadius: 2, backgroundColor: theme.surfaceAlt, overflow: "hidden", marginBottom: 10 },
    progressFill:  { height: "100%", borderRadius: 2, backgroundColor: theme.primary },
    progressText:  { fontSize: 13, color: theme.mutedText, textAlign: "center", marginBottom: 12 },
    cancelScanBtn: { alignItems: "center", paddingVertical: 8 },
    cancelScanText:{ fontSize: 14, color: theme.danger },

    // Bottom accent bar
    accentBar:   { height: 3, flexDirection: "row" },
    accentHalf:  { flex: 1 },

    // Guide toggle + box
    guideToggleRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
    guideToggleText: { fontSize: 14, color: theme.primary },
    guideToggleChevron:{ fontSize: 13, color: theme.quietText },
    guidesBox:    { marginHorizontal: 20, marginBottom: 16, backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 14 },
    guideItem:    { marginBottom: 10 },
    guideBank:    { fontSize: 12, fontWeight: "600", color: theme.text, marginBottom: 2 },
    guideInstr:   { fontSize: 12, color: theme.mutedText, lineHeight: 18 },

    // Import CSV button + parsing
    importCsvBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 20, marginTop: 4, borderRadius: 14, paddingVertical: 15, backgroundColor: theme.surfaceAlt, borderWidth: 0.5, borderColor: theme.border },
    importCsvIcon: { fontSize: 16 },
    importCsvText: { fontSize: 16, fontWeight: "600", color: theme.text },
    parsingWrap:   { alignItems: "center", paddingVertical: 16, paddingHorizontal: 20 },
    parsingText:   { fontSize: 14, color: theme.mutedText, textAlign: "center" },

    // Empty state
    emptyState:    { paddingTop: 60, alignItems: "center", paddingHorizontal: 32 },
    emptyIconWrap: { width: 80, height: 80, borderRadius: 24, backgroundColor: theme.card, alignItems: "center", justifyContent: "center", marginBottom: 24 },
    emptyIconText: { fontSize: 36 },
    emptyTitle:    { fontSize: 20, fontWeight: "600", color: theme.text, letterSpacing: -0.5, marginBottom: 8, textAlign: "center" },
    emptyBody:     { fontSize: 15, color: theme.mutedText, textAlign: "center", lineHeight: 22 },

    // Text link
    textLink:      { alignItems: "center", paddingVertical: 14 },
    textLinkLabel: { ...typography.subheadline, color: theme.mutedText },
    dimmed:        { opacity: 0.4 },

    // Results
    selectRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: spacing.screenH, marginBottom: 8 },
    selectCount:   { fontSize: 13, color: theme.mutedText },
    selectAllLink: { fontSize: 13, fontWeight: "600", color: theme.primary },
    groupCard:     { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: spacing.groupRadius, overflow: "hidden" },
    resultRow:     { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12, minHeight: spacing.rowH + 8 },
    checkbox:      { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: theme.border, alignItems: "center", justifyContent: "center" },
    checkboxSelected:{ borderColor: theme.primary, backgroundColor: theme.primary },
    checkmark:     { fontSize: 12, fontWeight: "700", color: theme.onPrimary, textAlign: "center", lineHeight: 22 },
    avatar:        { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.surfaceAlt },
    avatarText:    { fontSize: 14, fontWeight: "700", color: theme.text },
    resultMiddle:  { flex: 1, minWidth: 0 },
    resultName:    { ...typography.subheadline, color: theme.text },
    resultMetaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
    sourcePill:    { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
    sourcePillGmail: { backgroundColor: theme.primarySurface },
    sourcePillBank:  { backgroundColor: theme.successSurface },
    sourcePillText:  { fontSize: 10, fontWeight: "600" },
    resultCycle:   { fontSize: 12, color: theme.mutedText },
    resultRight:   { alignItems: "flex-end" },
    resultAmount:  { ...typography.subheadline, fontWeight: "500", color: theme.text, fontVariant: ["tabular-nums"] },
    confidenceRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3, justifyContent: "flex-end" },
    confidenceDot: { width: 6, height: 6, borderRadius: 3 },
    confidenceText:{ fontSize: 10, color: theme.quietText },
    rowSep:        { height: 0.5, backgroundColor: theme.border },

    // Fixed bottom add bar
    bottomBar:     { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: theme.background, paddingHorizontal: 16, paddingBottom: 40, paddingTop: 12, borderTopWidth: 0.5, borderTopColor: theme.border },
    primaryButton: { borderRadius: 14, paddingVertical: 17, alignItems: "center", justifyContent: "center" },
    primaryButtonText: { fontSize: 17, fontWeight: "600", color: theme.onPrimary },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: theme.overlay, justifyContent: "flex-end" },
    modalCard:     { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
    modalTitle:    { ...typography.title3, color: theme.text },
    input:         { minHeight: spacing.rowH + 4, borderRadius: 12, borderWidth: 0.5, borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text, paddingHorizontal: 14, ...typography.body },
    cycleRow:      { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cycleChip:     { borderRadius: 20, borderWidth: 0.5, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 },
    cycleChipActive: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    cycleText:     { ...typography.caption1, color: theme.mutedText, textTransform: "uppercase", fontWeight: "600" },
    cycleTextActive: { color: theme.primary },
    modalActions:  { flexDirection: "row", gap: 10, marginTop: 4 },
    modalGhostBtn: { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, borderWidth: 0.5, borderColor: theme.border },
    modalGhostText:{ ...typography.callout, color: theme.mutedText, fontWeight: "600" },
    modalSaveBtn:  { flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: theme.primary },
    modalSaveText: { ...typography.callout, color: theme.onPrimary, fontWeight: "600" }
  });
}
