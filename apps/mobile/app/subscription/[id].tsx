import { findServiceBySlug, getServiceBySlug, toSubscriptionCategory, type ServiceCategory } from "@subradar/service-catalog";
import type { BillingCycle } from "@subradar/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useSubscriptionStore, type SubscriptionNotificationSettings } from "../../src/data/subscription-store";
import { cancelNotificationsForSubscription, scheduleRenewalNotificationsWithPreferences } from "../../src/notifications/notificationService";
import { formatMoney } from "../../src/utils/format";
import { formatMonthYear, formatShortDate, getAvatarStyle, getDaysRemaining } from "../../src/utils/subscription-ui";
import { useSubRadarTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

function getInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
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
  const { theme } = useSubRadarTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backChevron} accessible={false}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          </View>
          <View style={styles.notFoundWrap}>
            <Text style={styles.notFoundText}>Subscription not found</Text>
            <Pressable accessibilityRole="button" style={styles.secondaryBtn} onPress={() => router.back()}>
              <Text style={styles.secondaryBtnText}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </>
    );
  }

  const sub = subscription;
  const service = sub.serviceSlug ? findServiceBySlug(sub.serviceSlug) : undefined;
  const avatar = getAvatarStyle(sub.category, theme);
  const daysRemaining = getDaysRemaining(sub.nextRenewalDate);
  const settings = notificationSettings[sub.id] ?? { sevenDay: true, threeDay: true, dayOf: true };
  const chargeHistory = createMockChargeHistory(sub.price.amountMinor, sub.nextRenewalDate);
  const annualMinor = formatAnnualEquivalent(sub.price.amountMinor, sub.billingCycle);
  const annualSaving = service?.defaultAnnualPrice && sub.billingCycle === "monthly"
    ? annualMinor - service.defaultAnnualPrice.amountMinor
    : null;

  const urgencyColor = daysRemaining !== null && daysRemaining <= 3 ? theme.danger : theme.warning;
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
          style={{ backgroundColor: theme.background }}
        >
          {/* Nav bar */}
          <View style={styles.navBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? "Stop editing" : "Go back"}
              style={styles.backBtn}
              onPress={() => isEditing ? setIsEditing(false) : router.back()}
            >
              <Text style={styles.backChevron} accessible={false}>‹</Text>
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.navTitle} numberOfLines={1}>{isEditing ? "Edit subscription" : sub.name}</Text>
            {isEditing ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Save changes" hitSlop={8} onPress={saveEdit}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="More options" hitSlop={8} onPress={openMenu}>
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
                  placeholderTextColor={theme.quietText}
                  style={styles.editInput}
                  selectionColor={theme.primary}
                  accessibilityLabel="Search services"
                />
                {matches.slice(0, 4).map((opt) => (
                  <Pressable
                    key={opt.slug}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedSlug === opt.slug }}
                    accessibilityLabel={opt.name}
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
                  selectionColor={theme.primary}
                  accessibilityLabel="Price"
                />
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formSectionLabel}>Billing cycle</Text>
                <View style={styles.cycleRow}>
                  {billingCycleOptions.map((option) => (
                    <Pressable
                      key={option}
                      accessibilityRole="button"
                      accessibilityState={{ selected: billingCycle === option }}
                      accessibilityLabel={`Billing cycle ${option}`}
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
                  placeholderTextColor={theme.quietText}
                  style={styles.editInput}
                  selectionColor={theme.primary}
                  accessibilityLabel="Next renewal date"
                />
              </View>

              <Pressable accessibilityRole="button" style={styles.primaryBtn} onPress={saveEdit}>
                <Text style={styles.primaryBtnText}>Save changes</Text>
              </Pressable>
            </View>
          ) : (
            /* ── Detail view ── */
            <>
              {/* Hero */}
              <View style={styles.hero}>
                <View style={[styles.heroAvatar, { backgroundColor: avatar.bg }]} accessible={false} importantForAccessibility="no-hide-descendants">
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
                    <View
                      style={[styles.urgencyIconWrap, {
                        backgroundColor: daysRemaining <= 3 ? theme.dangerSurface : theme.warningSurface
                      }]}
                      accessible={false}
                      importantForAccessibility="no-hide-descendants"
                    >
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
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel ${sub.name}`}
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
                    color: daysRemaining === null ? theme.text
                      : daysRemaining <= 3 ? theme.danger
                      : daysRemaining <= 7 ? theme.warning
                      : theme.text
                  }]}>
                    {daysRemaining === null ? "—" : daysRemaining === 0 ? "TODAY" : `${daysRemaining} days`}
                  </Text>
                  <Text style={styles.statSub}>{formatShortDate(sub.nextRenewalDate)}</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>PER YEAR</Text>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {formatMoney(annualMinor, sub.price.currency)}
                  </Text>
                  <Text style={styles.statSub}>at current rate</Text>
                </View>

                <View style={styles.statCard}>
                  <Text style={styles.statLabel}>SAVE IF ANNUAL</Text>
                  {annualSaving !== null && annualSaving > 0 ? (
                    <>
                      <Text style={[styles.statValue, { color: theme.success }]}>
                        {formatMoney(annualSaving, sub.price.currency)}
                      </Text>
                      <Text style={styles.statSub}>switch to annual</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.statValue, { color: theme.quietText }]}>—</Text>
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
                      <View style={styles.notifIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
                        <Text style={styles.notifIcon}>{row.value ? "🔔" : "🔕"}</Text>
                      </View>
                      <View style={styles.notifTextWrap}>
                        <Text style={styles.notifLabel}>{row.label}</Text>
                        <Text style={styles.notifSub}>{row.sub2}</Text>
                      </View>
                      <Switch
                        accessibilityRole="switch"
                        accessibilityLabel={row.label}
                        value={row.value}
                        onValueChange={(val) => void toggleNotification(row.key, val)}
                        trackColor={{ false: theme.surfaceAlt, true: theme.success }}
                        thumbColor={theme.onPrimary}
                      />
                    </View>
                    {i < arr.length - 1 ? <View style={styles.fullSep} /> : null}
                  </View>
                ))}
              </View>

              {/* Notes */}
              <Text style={styles.sectionLabel}>NOTES</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={sub.notes ? "Edit note" : "Add a note"}
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
                accessibilityRole="button"
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
        <Pressable accessibilityRole="button" accessibilityLabel="Close menu" style={styles.menuBackdrop} onPress={() => setMenuVisible(false)}>
          <View style={styles.menuCard}>
            <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { setMenuVisible(false); setIsEditing(true); }}>
              <Text style={styles.menuItemText}>Edit</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable accessibilityRole="button" style={styles.menuItem} onPress={() => { pauseSubscription(sub.id); setMenuVisible(false); }}>
              <Text style={styles.menuItemText}>Pause subscription</Text>
            </Pressable>
            <View style={styles.menuSep} />
            <Pressable accessibilityRole="button" style={styles.menuItem} onPress={handleDelete}>
              <Text style={[styles.menuItemText, { color: theme.danger }]}>Delete</Text>
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
              placeholderTextColor={theme.quietText}
              style={styles.notesInput}
              selectionColor={theme.primary}
              accessibilityLabel="Note"
            />
            <View style={styles.notesActions}>
              <Pressable accessibilityRole="button" style={styles.secondaryBtn} onPress={() => setNotesModal(false)}>
                <Text style={styles.secondaryBtnText}>Cancel</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={styles.primaryBtn} onPress={saveNote}>
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

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 120, backgroundColor: theme.background },

    // Nav bar
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
    backChevron: { color: theme.primary, fontSize: 22, lineHeight: 22 },
    backText: { color: theme.primary, fontSize: 17 },
    navTitle: {
      ...typography.headline,
      color: theme.text,
      position: "absolute",
      left: 60, right: 60,
      textAlign: "center"
    },
    saveText: { fontSize: 17, fontWeight: "600", color: theme.primary, textAlign: "right", minWidth: 60 },
    dotsText: { fontSize: 22, color: theme.primary, letterSpacing: 2, textAlign: "right", minWidth: 60 },

    // Not found
    notFoundWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    notFoundText: { ...typography.title3, color: theme.text, marginBottom: 16 },

    // Hero
    hero: { alignItems: "center", paddingTop: 28, paddingBottom: 28, paddingHorizontal: spacing.screenH },
    heroAvatar: { width: 72, height: 72, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 16 },
    heroAvatarText: { fontSize: 28, fontWeight: "800" },
    heroName: { ...typography.title2, color: theme.text, letterSpacing: -0.5, textAlign: "center", marginBottom: 8 },

    chipRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginBottom: 24 },
    categoryChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.surfaceAlt },
    categoryChipText: { ...typography.caption1, fontWeight: "500", color: theme.mutedText },
    dangerChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.dangerSurface },
    dangerChipText: { ...typography.caption1, fontWeight: "600", color: theme.danger },
    trialChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.warningSurface },
    trialChipText: { ...typography.caption1, fontWeight: "600", color: theme.warning },

    amountRow: { flexDirection: "row", alignItems: "baseline", gap: 2, justifyContent: "center" },
    amountCurrency: { fontSize: 22, fontWeight: "300", color: theme.mutedText, marginTop: 8 },
    amountWhole: { fontSize: 44, fontWeight: "700", color: theme.text, letterSpacing: -2 },
    amountDecimal: { fontSize: 22, fontWeight: "300", color: theme.mutedText },
    amountPeriod: { ...typography.footnote, color: theme.mutedText, marginTop: 4, textAlign: "center" },

    // Urgency banner
    urgencyCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    urgencyTopBar: { height: 3 },
    urgencyBody: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    urgencyIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
    urgencyIconText: { fontSize: 18 },
    urgencyTextWrap: { flex: 1 },
    urgencyTitle: { ...typography.subheadline, color: theme.text },
    urgencySub: { ...typography.caption1, color: theme.mutedText, marginTop: 2 },
    urgencyCancelBtn: { backgroundColor: theme.danger, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
    urgencyCancelText: { fontSize: 12, fontWeight: "600", color: theme.onPrimary },

    // Stats
    statsRow: { flexDirection: "row", gap: 8, marginHorizontal: 16, marginBottom: 8 },
    statCard: { flex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 14 },
    statLabel: { ...typography.sectionHeader, color: theme.mutedText, marginBottom: 6 },
    statValue: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
    statSub: { ...typography.caption1, color: theme.mutedText, marginTop: 3 },

    // Section label + grouped card
    sectionLabel: { ...typography.sectionHeader, color: theme.mutedText, paddingHorizontal: spacing.screenH, paddingBottom: 8, marginTop: 20 },
    groupCard: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: spacing.groupRadius, overflow: "hidden" },

    // History
    historyRow: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    historyDate: { ...typography.subheadline, color: theme.text },
    historyRight: { alignItems: "flex-end" },
    historyAmount: { ...typography.subheadline, fontWeight: "500", color: theme.text, fontVariant: ["tabular-nums"] },
    historyLabel: { ...typography.caption1, color: theme.mutedText, marginTop: 1, textAlign: "right" },
    fullSep: { height: 0.5, backgroundColor: theme.border },
    emptyRow: { padding: 20, alignItems: "center" },
    emptyText: { ...typography.subheadline, color: theme.quietText },

    // Notifications
    notifRow: { paddingHorizontal: 16, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 14 },
    notifIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: theme.warningSurface, alignItems: "center", justifyContent: "center" },
    notifIcon: { fontSize: 18 },
    notifTextWrap: { flex: 1 },
    notifLabel: { ...typography.subheadline, color: theme.text },
    notifSub: { ...typography.caption1, color: theme.mutedText, marginTop: 1 },

    // Notes
    noteCard: { marginHorizontal: 16, backgroundColor: theme.card, borderRadius: 16, padding: 16 },
    noteText: { ...typography.subheadline, color: theme.text, lineHeight: 22 },
    noteAdd: { ...typography.subheadline, color: theme.primary },

    // Bottom bar
    bottomBar: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: theme.background, paddingHorizontal: 16,
      paddingBottom: 40, paddingTop: 12,
      borderTopWidth: 0.5, borderTopColor: theme.border
    },
    dangerBtn: { backgroundColor: theme.danger, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
    dangerBtnText: { fontSize: 17, fontWeight: "600", color: theme.onPrimary },
    cancelledBtn: { backgroundColor: theme.surfaceAlt, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
    cancelledBtnText: { fontSize: 17, fontWeight: "500", color: theme.mutedText },
    pausedBtn: { backgroundColor: theme.warningSurface, borderRadius: 14, paddingVertical: 17, alignItems: "center" },
    pausedBtnText: { fontSize: 17, fontWeight: "500", color: theme.warning },

    // Android menu
    menuBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: theme.overlay, padding: 16 },
    menuCard: { backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    menuItem: { paddingHorizontal: 20, paddingVertical: 16 },
    menuItemText: { ...typography.body, color: theme.text },
    menuSep: { height: 0.5, backgroundColor: theme.border },

    // Notes modal
    modalBackdrop: { flex: 1, backgroundColor: theme.overlay, justifyContent: "center", alignItems: "center", padding: 24 },
    notesModalCard: { width: "100%", backgroundColor: theme.card, borderRadius: 20, padding: 20 },
    notesModalTitle: { ...typography.headline, color: theme.text, marginBottom: 16 },
    notesInput: { ...typography.subheadline, color: theme.text, backgroundColor: theme.surfaceAlt, borderRadius: 12, padding: 14, minHeight: 100, textAlignVertical: "top" },
    notesActions: { flexDirection: "row", gap: 12, marginTop: 16 },
    secondaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: theme.surfaceAlt },
    secondaryBtnText: { ...typography.callout, fontWeight: "600", color: theme.text },
    primaryBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center", backgroundColor: theme.primary },
    primaryBtnText: { ...typography.callout, fontWeight: "600", color: theme.onPrimary },

    // Edit mode
    formCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16, padding: 16 },
    formSectionLabel: { ...typography.sectionHeader, color: theme.mutedText, marginBottom: 10 },
    editInput: {
      ...typography.subheadline, color: theme.text,
      backgroundColor: theme.surfaceAlt, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8
    },
    suggRow: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
    suggRowActive: { backgroundColor: theme.surfaceAlt },
    suggName: { ...typography.subheadline, color: theme.text },
    suggMeta: { ...typography.caption1, color: theme.mutedText, marginTop: 2 },
    cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cyclePill: { borderRadius: 20, borderWidth: 0.5, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 },
    cyclePillActive: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    cycleText: { ...typography.caption1, color: theme.mutedText, textTransform: "uppercase", fontWeight: "600" },
    cycleTextActive: { color: theme.primary }
  });
}
