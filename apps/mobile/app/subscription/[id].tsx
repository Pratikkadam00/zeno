import { findServiceBySlug, getServiceBySlug, toSubscriptionCategory, type ServiceCategory } from "@subradar/service-catalog";
import type { BillingCycle, SubscriptionCategory, SubscriptionStatus } from "@subradar/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useSubscriptionStore, type SubscriptionNotificationSettings } from "../../src/data/subscription-store";
import { cancelNotificationsForSubscription, scheduleRenewalNotificationsWithPreferences } from "../../src/notifications/notificationService";
import { formatMoney } from "../../src/notifications/renewal-reminders";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Avatar colors by category ───────────────────────────────────────────────

function getAvatarStyle(category: SubscriptionCategory): { bg: string; text: string } {
  switch (category) {
    case "entertainment": return { bg: "rgba(255,69,58,0.15)",   text: "#FF453A" };
    case "ai_tools":      return { bg: "rgba(191,90,242,0.15)",  text: "#BF5AF2" };
    case "productivity":  return { bg: "rgba(10,132,255,0.15)",  text: "#0A84FF" };
    case "health":        return { bg: "rgba(255,159,10,0.15)",  text: "#FF9F0A" };
    case "finance":       return { bg: "rgba(90,200,245,0.15)",  text: "#5AC8F5" };
    case "education":     return { bg: "rgba(255,214,10,0.15)",  text: "#FFD60A" };
    case "developer_tools": return { bg: "rgba(191,90,242,0.15)", text: "#BF5AF2" };
    case "family":        return { bg: "rgba(48,209,88,0.15)",   text: "#30D158" };
    default:              return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
  }
}

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function getDaysRemaining(dateValue?: string | null): number | null {
  if (!dateValue) return null;
  const target = new Date(dateValue);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((target.getTime() - today.getTime()) / DAY_MS));
}

function formatShortDate(dateValue?: string | null): string {
  if (!dateValue) return "No date";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatMonthYear(dateValue?: string | null): string {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function getBillingLabel(cycle: BillingCycle): string {
  if (cycle === "annual") return "/year";
  if (cycle === "weekly") return "/week";
  if (cycle === "quarterly") return "/quarter";
  if (cycle === "trial") return "/trial";
  return "/month";
}

function formatAnnualEquivalent(amountMinor: number, cycle: BillingCycle): number {
  if (cycle === "annual") return amountMinor;
  if (cycle === "weekly") return amountMinor * 52;
  if (cycle === "quarterly") return amountMinor * 4;
  return amountMinor * 12;
}

function createMockChargeHistory(amountMinor: number, dateValue?: string) {
  if (!dateValue || amountMinor <= 0) return [];
  const anchor = new Date(dateValue);
  if (Number.isNaN(anchor.getTime())) return [];
  return [1, 2, 3].map((monthsBack) => {
    const date = new Date(anchor);
    date.setMonth(date.getMonth() - monthsBack);
    return { date: formatMonthYear(date.toISOString()), amountMinor };
  });
}

function formatServiceCategory(category: ServiceCategory): string {
  return category.replace("_", " ");
}

function toNotificationSubscription(subscription: { id: string; name: string; price: { amountMinor: number }; nextRenewalDate?: string }) {
  return { id: subscription.id, name: subscription.name, amount: subscription.price.amountMinor / 100, nextRenewalDate: subscription.nextRenewalDate ?? "" };
}

const billingCycleOptions: BillingCycle[] = ["weekly", "monthly", "quarterly", "annual", "trial", "unknown"];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    subscriptions,
    notificationSettings,
    updateNotificationSettings,
    updateSubscription,
    deleteSubscription,
    pauseSubscription,
    suggestions
  } = useSubscriptionStore();

  const subscription = subscriptions.find((item) => item.id === id);
  const [menuVisible, setMenuVisible]         = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [notesModalVisible, setNotesModal]    = useState(false);
  const [draftNote, setDraftNote]             = useState("");
  const [query, setQuery]                     = useState(subscription?.name ?? "");
  const [amount, setAmount]                   = useState(subscription ? (subscription.price.amountMinor / 100).toFixed(2) : "0.00");
  const [billingCycle, setBillingCycle]       = useState<BillingCycle>(subscription?.billingCycle ?? "monthly");
  const [renewalDate, setRenewalDate]         = useState(subscription?.nextRenewalDate?.slice(0, 10) ?? "");
  const [selectedSlug, setSelectedSlug]       = useState<string | undefined>(subscription?.serviceSlug);

  const matches = useMemo(() => suggestions(query), [query, suggestions]);
  const selectedService = matches.find((s) => s.slug === selectedSlug) ?? (subscription?.serviceSlug ? getServiceBySlug(subscription.serviceSlug) : undefined);

  // ── Not found ──
  if (!subscription) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.navBar}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backChevron}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>
          <View style={styles.notFoundWrap}>
            <Text style={styles.notFoundText}>Subscription not found</Text>
            <Pressable style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const sub = subscription;
  const service = sub.serviceSlug ? findServiceBySlug(sub.serviceSlug) : undefined;
  const avatar = getAvatarStyle(sub.category);
  const daysRemaining = getDaysRemaining(sub.nextRenewalDate);
  const settings = notificationSettings[sub.id] ?? { sevenDay: true, threeDay: true, dayOf: true };
  const chargeHistory = createMockChargeHistory(sub.price.amountMinor, sub.nextRenewalDate);
  const annualMinor = formatAnnualEquivalent(sub.price.amountMinor, sub.billingCycle);
  const annualSaving = service?.defaultAnnualPrice && sub.billingCycle === "monthly"
    ? annualMinor - service.defaultAnnualPrice.amountMinor
    : null;

  const urgencyColor = daysRemaining !== null && daysRemaining <= 3 ? colors.red : colors.orange;
  const [amountWhole, amountDecimal] = (sub.price.amountMinor / 100).toFixed(2).split(".");

  // ── Handlers (logic unchanged) ──
  function handleDelete() {
    setMenuVisible(false);
    Alert.alert("Delete subscription?", `${sub.name} will be removed from Zeno.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void cancelNotificationsForSubscription(sub.id);
          deleteSubscription(sub.id);
          router.replace("/dashboard");
        }
      }
    ]);
  }

  function openMenu() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Edit", "Pause subscription", "Delete", "Cancel"],
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2
        },
        (index) => {
          if (index === 0) setIsEditing(true);
          else if (index === 1) { pauseSubscription(sub.id); }
          else if (index === 2) handleDelete();
        }
      );
    } else {
      setMenuVisible(true);
    }
  }

  function saveEdit() {
    const amountMinorValue = Math.round(Number.parseFloat(amount || "0") * 100);
    updateSubscription(sub.id, {
      name: selectedService?.name ?? (query.trim() || sub.name),
      serviceSlug: selectedService?.slug ?? selectedSlug,
      category: selectedService ? toSubscriptionCategory(selectedService.category) : sub.category,
      amountMinor: amountMinorValue,
      billingCycle,
      nextRenewalDate: renewalDate ? new Date(`${renewalDate}T09:00:00`).toISOString() : sub.nextRenewalDate
    });
    setIsEditing(false);
  }

  async function toggleNotification(key: keyof SubscriptionNotificationSettings, value: boolean) {
    const nextSettings = { ...settings, [key]: value };
    updateNotificationSettings(sub.id, { [key]: value });
    updateSubscription(sub.id, {});
    await scheduleRenewalNotificationsWithPreferences(toNotificationSubscription(sub), nextSettings);
  }

  function saveNote() {
    updateSubscription(sub.id, { notes: draftNote.trim() });
    setNotesModal(false);
  }

  // ── JSX ──
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          style={{ backgroundColor: colors.bg }}
        >
          {/* Nav bar */}
          <View style={styles.navBar}>
            <Pressable style={styles.backBtn} onPress={() => isEditing ? setIsEditing(false) : router.back()}>
              <Text style={styles.backChevron}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.navTitle} numberOfLines={1}>{isEditing ? "Edit subscription" : sub.name}</Text>
            {isEditing ? (
              <Pressable onPress={saveEdit}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            ) : (
              <Pressable onPress={openMenu}>
                <Text style={styles.dotsText}>···</Text>
              </Pressable>
            )}
          </View>

          {isEditing ? (
            /* ── Edit mode ── */
            <View style={{ paddingBottom: 40 }}>
              <View style={styles.formCard}>
                <Text style={styles.formSectionLabel}>Smart search</Text>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Try Midjourney, Adobe, Netflix"
                  placeholderTextColor={colors.label4}
                  style={styles.editInput}
                  selectionColor={colors.blue}
                />
                {matches.slice(0, 4).map((opt) => (
                  <Pressable
                    key={opt.slug}
                    onPress={() => {
                      setSelectedSlug(opt.slug);
                      setQuery(opt.name);
                      setAmount((opt.defaultMonthlyPrice ?? sub.price.amountMinor / 100).toFixed(2));
                    }}
                    style={[styles.suggRow, selectedSlug === opt.slug && styles.suggRowActive]}
                  >
                    <Text style={styles.suggName}>{opt.name}</Text>
                    <Text style={styles.suggMeta}>{formatServiceCategory(opt.category)}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formSectionLabel}>Price</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  style={styles.editInput}
                  selectionColor={colors.blue}
                />
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formSectionLabel}>Billing cycle</Text>
                <View style={styles.cycleRow}>
                  {billingCycleOptions.map((option) => (
                    <Pressable
                      key={option}
                      onPress={() => setBillingCycle(option)}
                      style={[styles.cyclePill, billingCycle === option && styles.cyclePillActive]}
                    >
                      <Text style={[styles.cycleText, billingCycle === option && styles.cycleTextActive]}>{option}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formSectionLabel}>Next renewal (YYYY-MM-DD)</Text>
                <TextInput
                  value={renewalDate}
                  onChangeText={setRenewalDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.label4}
                  style={styles.editInput}
                  selectionColor={colors.blue}
                />
              </View>

              <Pressable style={styles.primaryBtn} onPress={saveEdit}>
                <Text style={styles.primaryBtnText}>Save changes</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Detail view ── */
            <>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={[styles.heroAvatar, { backgroundColor: avatar.bg }]}>
                  <Text style={[styles.heroAvatarText, { color: avatar.text }]}>{getInitial(sub.name)}</Text>
                </View>

                <Text style={styles.heroName}>{sub.name}</Text>

                <View style={styles.chipRow}>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{sub.category.replace("_", " ")}</Text>
                  </View>
                  {service?.cancellationDifficulty === "dark_pattern" ? (
                    <View style={styles.dangerChip}>
                      <Text style={styles.dangerChipText}>⚠ Dark pattern</Text>
                    </View>
                  ) : null}
                  {sub.status === "trial" || sub.billingCycle === "trial" ? (
                    <View style={styles.trialChip}>
                      <Text style={styles.trialChipText}>Free Trial</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountCurrency}>$</Text>
                  <Text style={styles.amountWhole}>{amountWhole}</Text>
                  <Text style={styles.amountDecimal}>.{amountDecimal}</Text>
                </View>
                <Text style={styles.amountPeriod}>{getBillingLabel(sub.billingCycle)}</Text>
              </View>

              {/* Urgency banner */}
              {daysRemaining !== null && daysRemaining <= 7 ? (
                <View style={styles.urgencyCard}>
                  <View style={[styles.urgencyTopBar, { backgroundColor: urgencyColor }]} />
                  <View style={styles.urgencyBody}>
                    <View style={[styles.urgencyIconWrap, {
                      backgroundColor: daysRemaining <= 3 ? "rgba(255,69,58,0.15)" : "rgba(255,159,10,0.15)"
                    }]}>
                      <Text style={styles.urgencyIconText}>
                        {daysRemaining <= 3 ? "⚠" : "🔔"}
                      </Text>
                    </View>
                    <View style={styles.urgencyTextWrap}>
                      <Text style={styles.urgencyTitle}>
                        Renews in {daysRemaining === 0 ? "TODAY" : `${daysRemaining} days`}
                      </Text>
                      <Text style={styles.urgencySub}>
                        {formatMoney(sub.price.amountMinor, sub.price.currency)} will be charged on {formatShortDate(sub.nextRenewalDate)}
                      </Text>
                    </View>
                    <Pressable
                      style={styles.urgencyCancelBtn}
                      onPress={() => router.push(`/subscription/cancel/${sub.id}` as never)}
                    >
                      <Text style={styles.urgencyCancelText}>Cancel</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>NEXT CHARGE</Text>
                  <Text style={[styles.statValue, {
                    color: daysRemaining === null ? colors.label
                      : daysRemaining <= 3 ? colors.red
                      : daysRemaining <= 7 ? colors.orange
                      : colors.label
                  }]}>
                    {daysRemaining === null ? "—" : daysRemaining === 0 ? "TODAY" : `${daysRemaining} days`}
                  </Text>
                  <Text style={styles.statSub}>{formatShortDate(sub.nextRenewalDate)}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>PER YEAR</Text>
                  <Text style={[styles.statValue, { color: colors.label }]}>
                    {formatMoney(annualMinor, sub.price.currency)}
                  </Text>
                  <Text style={styles.statSub}>at current rate</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>SAVE IF ANNUAL</Text>
                  {annualSaving !== null && annualSaving > 0 ? (
                    <>
                      <Text style={[styles.statValue, { color: colors.green }]}>
                        {formatMoney(annualSaving, sub.price.currency)}
                      </Text>
                      <Text style={styles.statSub}>switch to annual</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.statValue, { color: colors.label4 }]}>—</Text>
                      <Text style={styles.statSub}>already annual</Text>
                    </>
                  )}
                </View>
              </View>

              {/* Charge history */}
              <Text style={styles.sectionLabel}>CHARGE HISTORY</Text>
              <View style={styles.groupCard}>
                {chargeHistory.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No charge history yet</Text>
                  </View>
                ) : (
                  chargeHistory.map((entry, index) => {
                    const isLast = index === chargeHistory.length - 1;
                    return (
                      <View key={entry.date}>
                        <View style={styles.historyRow}>
                          <Text style={styles.historyDate}>{entry.date}</Text>
                          <View style={styles.historyRight}>
                            <Text style={styles.historyAmount}>
                              {formatMoney(entry.amountMinor, sub.price.currency)}
                            </Text>
                            <Text style={styles.historyLabel}>Charged</Text>
                          </View>
                        </View>
                        {!isLast ? <View style={styles.fullSep} /> : null}
                      </View>
                    );
                  })
                )}
              </View>

              {/* Notifications */}
              <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
              <View style={styles.groupCard}>
                {[
                  { label: "7-day reminder", sub2: "Reminder before renewal week", key: "sevenDay" as const, value: settings.sevenDay },
                  { label: "3-day reminder", sub2: "Final warning before charge",  key: "threeDay" as const, value: settings.threeDay },
                  { label: "Charge day alert", sub2: "Confirmation when charged",  key: "dayOf"    as const, value: settings.dayOf }
                ].map((row, i, arr) => (
                  <View key={row.key}>
                    <View style={styles.notifRow}>
                      <View style={styles.notifIconWrap}>
                        <Text style={styles.notifIcon}>{row.value ? "🔔" : "🔕"}</Text>
                      </View>
                      <View style={styles.notifTextWrap}>
                        <Text style={styles.notifLabel}>{row.label}</Text>
                        <Text style={styles.notifSub}>{row.sub2}</Text>
                      </View>
                      <Switch
                        value={row.value}
                        onValueChange={(val) => void toggleNotification(row.key, val)}
                        trackColor={{ false: colors.surfaceHigher, true: colors.green }}
                        thumbColor="#fff"
                      />
                    </View>
                    {i < arr.length - 1 ? <View style={styles.fullSep} /> : null}
                  </View>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.sectionLabel}>NOTES</Text>
              <Pressable
                style={styles.noteCard}
                onPress={() => { setDraftNote(sub.notes ?? ""); setNotesModal(true); }}
              >
                {sub.notes ? (
                  <Text style={styles.noteText}>{sub.notes}</Text>
                ) : (
                  <Text style={styles.noteAdd}>+ Add a note</Text>
                )}
              </Pressable>
            </>
          )}
        </ScrollView>

        {/* Fixed bottom button */}
        {!isEditing ? (
          <View style={styles.bottomBar}>
            {sub.status === "active" ? (
              <Pressable
                style={styles.dangerBtn}
                onPress={() => router.push(`/subscription/cancel/${sub.id}` as never)}
              >
                <Text style={styles.dangerBtnText}>Cancel Subscription</Text>
              </Pressable>
            ) : sub.status === "cancelled" ? (
              <View style={styles.cancelledBtn}>
                <Text style={styles.cancelledBtnText}>Subscription Cancelled</Text>
              </View>
            ) : (
              <View style={styles.pausedBtn}>
                <Text style={styles.pausedBtnText}>Subscription Paused</Text>
              </View>
            )}
          </View>
        ) : null}
      </SafeAreaView>

      {/* Android action menu */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <Pressable style={styles.menuItem} onPress={() => { setMenuVisible(false); setIsEditing(true); }}>
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable style={styles.menuItem} onPress={() => { pauseSubscription(sub.id); setMenuVisible(false); }}>
              <Text style={styles.menuItemText}>Pause subscription</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable style={styles.menuItem} onPress={handleDelete}>
              <Text style={[styles.menuItemText, { color: colors.red }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Notes modal */}
      <Modal transparent visible={notesModalVisible} animationType="slide" onRequestClose={() => setNotesModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.notesModalCard}>
            <Text style={styles.notesModalTitle}>Edit note</Text>
            <TextInput
              value={draftNote}
              onChangeText={setDraftNote}
              multiline
              placeholder="Add renewal details, cancellation context, or why you keep it."
              placeholderTextColor={colors.label4}
              style={styles.notesInput}
              selectionColor={colors.blue}
            />
            <View style={styles.notesActions}>
              <Pressable style={styles.secondaryBtn} onPress={() => setNotesModal(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.primaryBtn} onPress={saveNote}>
                <Text style={styles.primaryBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { paddingBottom: 120, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
  backChevron: { color: colors.blue, fontSize: 22, lineHeight: 22 },
  backText: { color: colors.blue, fontSize: 17 },
  navTitle: {
    ...typography.headline,
    color: colors.label,
    position: "absolute",
    left: 60, right: 60,
    textAlign: "center"
  },
  saveText: { fontSize: 17, fontWeight: "600", color: colors.blue, textAlign: "right", minWidth: 60 },
  dotsText: { fontSize: 22, color: colors.blue, letterSpacing: 2, textAlign: "right", minWidth: 60 },

  // Not found
  notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  notFoundText: { ...typography.title3, color: colors.label, marginBottom: 16 },

  // Hero
  hero: { alignItems: "center", paddingTop: 28, paddingBottom: 28, paddingHorizontal: spacing.screenH },
  heroAvatar: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  heroAvatarText: { fontSize: 28, fontWeight: "800" },
  heroName: { ...typography.title2, color: colors.label, letterSpacing: -0.5, textAlign: "center", marginBottom: 8 },

  chipRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: colors.fillSecondary },
  categoryChipText: { ...typography.caption1, fontWeight: "500", color: colors.label3 },
  dangerChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(255,69,58,0.12)" },
  dangerChipText: { ...typography.caption1, fontWeight: "600", color: colors.red },
  trialChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(255,214,10,0.12)" },
  trialChipText: { ...typography.caption1, fontWeight: "600", color: colors.yellow },

  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 2, justifyContent: "center" },
  amountCurrency: { fontSize: 22, fontWeight: "300", color: colors.label3, marginTop: 8 },
  amountWhole: { fontSize: 44, fontWeight: "700", color: colors.label, letterSpacing: -2 },
  amountDecimal: { fontSize: 22, fontWeight: "300", color: colors.label3 },
  amountPeriod: { ...typography.footnote, color: colors.label3, marginTop: 4, textAlign: "center" },

  // Urgency banner
  urgencyCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },
  urgencyTopBar: { height: 3 },
  urgencyBody: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  urgencyIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  urgencyIconText: { fontSize: 18 },
  urgencyTextWrap: { flex: 1 },
  urgencyTitle: { ...typography.subheadline, color: colors.label },
  urgencySub: { ...typography.caption1, color: colors.label3, marginTop: 2 },
  urgencyCancelBtn: { backgroundColor: colors.red, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  urgencyCancelText: { fontSize: 12, fontWeight: "600", color: "#fff" },

  // Stats
  statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 8 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 14 },
  statLabel: { ...typography.sectionHeader, color: colors.label3, marginBottom: 6 },
  statValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  statSub: { ...typography.caption1, color: colors.label3, marginTop: 3 },

  // Section label + grouped card
  sectionLabel: { ...typography.sectionHeader, color: colors.label3, paddingHorizontal: spacing.screenH, paddingBottom: 8, marginTop: 20 },
  groupCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: spacing.groupRadius, overflow: "hidden" },

  // History
  historyRow: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  historyDate: { ...typography.subheadline, color: colors.label },
  historyRight: { alignItems: "flex-end" },
  historyAmount: { ...typography.subheadline, fontWeight: "500", color: colors.label, fontVariant: ["tabular-nums"] },
  historyLabel: { ...typography.caption1, color: colors.label3, marginTop: 1, textAlign: "right" },
  fullSep: { height: 0.5, backgroundColor: colors.separator },
  emptyRow: { padding: 20, alignItems: "center" },
  emptyText: { ...typography.subheadline, color: colors.label4 },

  // Notifications
  notifRow: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 14 },
  notifIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,159,10,0.15)", alignItems: "center", justifyContent: "center" },
  notifIcon: { fontSize: 18 },
  notifTextWrap: { flex: 1 },
  notifLabel: { ...typography.subheadline, color: colors.label },
  notifSub: { ...typography.caption1, color: colors.label3, marginTop: 1 },

  // Notes
  noteCard: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  noteText: { ...typography.subheadline, color: colors.label, lineHeight: 22 },
  noteAdd: { ...typography.subheadline, color: colors.blue },

  // Bottom bar
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg, paddingHorizontal: 16,
    paddingBottom: 40, paddingTop: 12,
    borderTopWidth: 0.5, borderTopColor: colors.separator
  },
  dangerBtn: { backgroundColor: colors.red, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  dangerBtnText: { fontSize: 17, fontWeight: "600", color: "#fff" },
  cancelledBtn: { backgroundColor: colors.fillSecondary, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  cancelledBtnText: { fontSize: 17, fontWeight: "500", color: colors.label3 },
  pausedBtn: { backgroundColor: "rgba(255,159,10,0.15)", borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  pausedBtnText: { fontSize: 17, fontWeight: "500", color: colors.orange },

  // Android menu
  menuBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)", padding: 16 },
  menuCard: { backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },
  menuItem: { paddingHorizontal: 20, paddingVertical: 16 },
  menuItemText: { ...typography.body, color: colors.label },
  menuSep: { height: 0.5, backgroundColor: colors.separator },

  // Notes modal
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  notesModalCard: { width: "100%", backgroundColor: colors.surface, borderRadius: 20, padding: 20 },
  notesModalTitle: { ...typography.headline, color: colors.label, marginBottom: 16 },
  notesInput: { ...typography.subheadline, color: colors.label, backgroundColor: colors.surfaceHigh, borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: "top" },
  notesActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  secondaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: colors.surfaceHigher },
  secondaryBtnText: { ...typography.callout, fontWeight: "600", color: colors.label },
  primaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: colors.blue },
  primaryBtnText: { ...typography.callout, fontWeight: "600", color: "#fff" },

  // Edit mode
  formCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 16 },
  formSectionLabel: { ...typography.sectionHeader, color: colors.label3, marginBottom: 10 },
  editInput: {
    ...typography.subheadline, color: colors.label,
    backgroundColor: colors.surfaceHigh, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8
  },
  suggRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
  suggRowActive: { backgroundColor: colors.fillSecondary },
  suggName: { ...typography.subheadline, color: colors.label },
  suggMeta: { ...typography.caption1, color: colors.label3, marginTop: 2 },
  cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cyclePill: { borderRadius: 20, borderWidth: 0.5, borderColor: colors.separatorOpaque, paddingHorizontal: 12, paddingVertical: 8 },
  cyclePillActive: { borderColor: colors.blue, backgroundColor: "rgba(10,132,255,0.12)" },
  cycleText: { ...typography.caption1, color: colors.label3, textTransform: "uppercase", fontWeight: "600" },
  cycleTextActive: { color: colors.blue }
});
