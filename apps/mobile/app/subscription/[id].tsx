import { findServiceBySlug } from "@zeno/service-catalog";
import type { BillingCycle, Subscription } from "@zeno/shared";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ActionSheetIOS, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMemo, useState } from "react";
import { useSubscriptionStore, type SubscriptionNotificationSettings } from "../../src/data/subscription-store";
import { cancelNotificationsForSubscription, scheduleRenewalNotificationsWithPreferences } from "../../src/notifications/notificationService";
import { currencySymbol, formatMoney } from "../../src/utils/format";
import { formatDaysLabel, formatShortDate, getDaysRemaining } from "../../src/utils/subscription-ui";
import { AlertTriangle, Bell, BellOff, ChevronLeft, CircleCheck, Clock, MoreHorizontal } from "lucide-react-native";
import { Button, Card, Input, ServiceAvatar } from "../../src/components/zeno";
import { useZenoTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { fonts } from "../../src/theme/zeno";
import { spacing } from "../../src/theme/spacing";

// ─── Pure helpers (logic unchanged) ──────────────────────────────────────────

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

// CHANGE 6: charge history derived from the subscription's billing cadence,
// stepping back from its most recent charge — lastChargedDate when known from a
// receipt, else the renewal date — to when Zeno started tracking it (createdAt).
// Honestly empty when there's no basis (brand-new sub, trial, unknown cycle).
// The screen labels it "estimated" when we only have the cadence, not a receipt.
const DAY_MS = 24 * 60 * 60 * 1000;

function stepBack(date: Date, cycle: BillingCycle): Date {
  if (cycle === "weekly") return new Date(date.getTime() - 7 * DAY_MS);
  const months = cycle === "annual" ? 12 : cycle === "quarterly" ? 3 : 1;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - months, date.getUTCDate()));
}

function buildChargeHistory(sub: Subscription): { date: string; amountMinor: number }[] {
  if (sub.price.amountMinor <= 0 || sub.billingCycle === "trial" || sub.billingCycle === "unknown") return [];
  const ref = sub.lastChargedDate ?? sub.nextRenewalDate;
  if (!ref) return [];
  const refDate = new Date(ref);
  if (Number.isNaN(refDate.getTime())) return [];
  const createdMs = Date.parse(sub.createdAt);
  const nowMs = Date.now();

  // Walk back to the most recent charge on or before today.
  let cursor = new Date(refDate);
  let guard = 0;
  while (cursor.getTime() > nowMs && guard++ < 120) cursor = stepBack(cursor, sub.billingCycle);

  const entries: { date: string; amountMinor: number }[] = [];
  guard = 0;
  while (cursor.getTime() >= createdMs && entries.length < 12 && guard++ < 120) {
    entries.push({ date: formatShortDate(cursor.toISOString()), amountMinor: sub.price.amountMinor });
    cursor = stepBack(cursor, sub.billingCycle);
  }
  return entries;
}

function toNotificationSubscription(subscription: { id: string; name: string; price: { amountMinor: number; currency: string }; nextRenewalDate?: string }) {
  return { id: subscription.id, name: subscription.name, amount: subscription.price.amountMinor / 100, currency: subscription.price.currency, nextRenewalDate: subscription.nextRenewalDate ?? "" };
}

const billingCycleOptions: BillingCycle[] = ["weekly", "monthly", "quarterly", "annual", "trial", "unknown"];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {
    subscriptions,
    notificationSettings,
    updateNotificationSettings,
    updateSubscription,
    deleteSubscription,
    pauseSubscription,
    markVerifiedCancelled,
    markStillCharging
  } = useSubscriptionStore();

  const subscription = subscriptions.find((item) => item.id === id);
  const [menuVisible, setMenuVisible]         = useState(false);
  const [isEditing, setIsEditing]             = useState(false);
  const [notesModalVisible, setNotesModal]    = useState(false);
  const [draftNote, setDraftNote]             = useState("");
  const [editedName, setEditedName]           = useState(subscription?.name ?? "");
  const [amount, setAmount]                   = useState(subscription ? (subscription.price.amountMinor / 100).toFixed(2) : "0.00");
  const [billingCycle, setBillingCycle]       = useState<BillingCycle>(subscription?.billingCycle ?? "monthly");
  const [renewalDate, setRenewalDate]         = useState(subscription?.nextRenewalDate?.slice(0, 10) ?? "");

  // ── Not found ──
  if (!subscription) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <View style={styles.navBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft size={22} color={theme.primary} strokeWidth={2} />
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
  const daysRemaining = getDaysRemaining(sub.nextRenewalDate);
  const settings = notificationSettings[sub.id] ?? { sevenDay: true, threeDay: true, dayOf: true };
  const chargeHistory = buildChargeHistory(sub);
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
    if (!(amountMinorValue > 0)) {
      Alert.alert("Enter a price", "The monthly/renewal amount must be greater than $0.");
      return;
    }
    let nextRenewalDate = sub.nextRenewalDate;
    if (renewalDate) {
      // A renewal date carries day-of-intent only, so store it as a UTC day:
      // every consumer (roll-forward, reminders, trial guardian) does UTC-day
      // math, and the previous local `T09:00:00` serialization shifted the
      // stored day back by one for users in UTC+10..+14.
      const parsed = Date.parse(`${renewalDate}T00:00:00.000Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(renewalDate) || Number.isNaN(parsed)) {
        Alert.alert("Check the renewal date", "Use the YYYY-MM-DD format, e.g. 2026-08-01.");
        return;
      }
      nextRenewalDate = new Date(parsed).toISOString();
    }
    updateSubscription(sub.id, {
      name: editedName.trim() || sub.name,
      amountMinor: amountMinorValue,
      billingCycle,
      nextRenewalDate
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
              <ChevronLeft size={22} color={theme.primary} strokeWidth={2} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
            <Text style={styles.navTitle} numberOfLines={1}>{isEditing ? "Edit subscription" : sub.name}</Text>
            {isEditing ? (
              // Spacer balancing the back button so the title stays centered —
              // the single save affordance is the button at the form's end.
              <View style={{ minWidth: 60 }} />
            ) : (
              <Pressable accessibilityRole="button" accessibilityLabel="More options" hitSlop={8} onPress={openMenu} style={{ minWidth: 60, alignItems: "flex-end" }}>
                <MoreHorizontal size={22} color={theme.primary} strokeWidth={2} />
              </Pressable>
            )}
          </View>

          {isEditing ? (
            /* ── Edit mode — assembled from the Zeno design-system primitives.
                 Catalog smart-search deliberately absent: the service link is
                 fixed at creation; editing changes this subscription's own
                 fields only. ── */
            <View style={{ paddingHorizontal: 16, paddingBottom: 40, rowGap: 12 }}>
              <Card>
                <Input
                  label="Name"
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Subscription name"
                />
              </Card>

              <Card>
                <Input
                  label="Price"
                  prefix={currencySymbol(sub.price.currency)}
                  mono
                  keyboardType="decimal-pad"
                  value={amount}
                  onChangeText={setAmount}
                />
              </Card>

              <Card>
                <Text style={styles.editLabel}>Billing cycle</Text>
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
              </Card>

              <Card>
                <Input
                  label="Next renewal"
                  hint="YYYY-MM-DD"
                  value={renewalDate}
                  onChangeText={setRenewalDate}
                  placeholder="2026-08-01"
                />
              </Card>

              <Button variant="primary" size="lg" fullWidth onPress={saveEdit}>
                Save changes
              </Button>
            </View>
          ) : (
            /* ── Detail view ── */
            <>
              {/* Hero */}
              <View style={styles.hero}>
                <ServiceAvatar name={sub.name} size={72} />

                <Text style={[styles.heroName, { marginTop: 16 }]}>{sub.name}</Text>

                <View style={styles.chipRow}>
                  <View style={styles.categoryChip}>
                    <Text style={styles.categoryChipText}>{sub.category.replace("_", " ")}</Text>
                  </View>
                  {service?.cancellationDifficulty === "dark_pattern" ? (
                    <View style={styles.dangerChip}>
                      <AlertTriangle size={12} color={theme.danger} strokeWidth={2} />
                      <Text style={styles.dangerChipText}>Dark pattern</Text>
                    </View>
                  ) : null}
                  {sub.status === "trial" || sub.billingCycle === "trial" ? (
                    <View style={styles.trialChip}>
                      <Text style={styles.trialChipText}>Free Trial</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountCurrency}>{currencySymbol(sub.price.currency)}</Text>
                  <Text style={styles.amountWhole}>{amountWhole}</Text>
                  <Text style={styles.amountDecimal}>.{amountDecimal}</Text>
                </View>
                <Text style={styles.amountPeriod}>{getBillingLabel(sub.billingCycle)}</Text>
              </View>

              {/* Cancellation verification lifecycle (CHANGE 4) */}
              {sub.status === "pending" ? (
                <View style={[styles.verifyBanner, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={styles.verifyTop}>
                    <Clock size={20} color={theme.secondary} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyTitle}>Cancellation pending verification</Text>
                      <Text style={styles.verifyBody}>We&apos;ll confirm there&apos;s no charge around {formatShortDate(sub.cancellationVerifyBy ?? sub.nextRenewalDate)}.</Text>
                    </View>
                  </View>
                  <View style={styles.verifyActions}>
                    <Pressable accessibilityRole="button" style={[styles.verifyBtn, { backgroundColor: theme.success }]} onPress={() => markVerifiedCancelled(sub.id)}>
                      <Text style={[styles.verifyBtnText, { color: theme.onPrimary }]}>Confirm it stopped</Text>
                    </Pressable>
                    <Pressable accessibilityRole="button" style={[styles.verifyBtn, { backgroundColor: theme.dangerSurface }]} onPress={() => markStillCharging(sub.id)}>
                      <Text style={[styles.verifyBtnText, { color: theme.danger }]}>I was charged again</Text>
                    </Pressable>
                  </View>
                </View>
              ) : sub.status === "attention" ? (
                <View style={[styles.verifyBanner, { backgroundColor: theme.dangerSurface }]}>
                  <View style={styles.verifyTop}>
                    <AlertTriangle size={20} color={theme.danger} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyTitle}>Still being charged</Text>
                      <Text style={styles.verifyBody}>A charge appeared after you cancelled. Let&apos;s stop it.</Text>
                    </View>
                  </View>
                  <View style={styles.verifyActions}>
                    <Pressable accessibilityRole="button" style={[styles.verifyBtn, { backgroundColor: theme.danger }]} onPress={() => router.push(`/subscription/cancel/${sub.id}` as never)}>
                      <Text style={[styles.verifyBtnText, { color: theme.onPrimary }]}>Re-open cancellation help</Text>
                    </Pressable>
                  </View>
                </View>
              ) : sub.status === "cancelled" ? (
                <View style={[styles.verifyBanner, { backgroundColor: theme.successSurface }]}>
                  <View style={styles.verifyTop}>
                    <CircleCheck size={20} color={theme.success} strokeWidth={2} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.verifyTitle}>Verified cancelled</Text>
                      <Text style={styles.verifyBody}>No charge found. You&apos;re saving {formatMoney(annualMinor, sub.price.currency)}/yr.</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {/* Urgency banner */}
              {(sub.status === "active" || sub.status === "trial") && daysRemaining !== null && daysRemaining <= 7 ? (
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
                      {daysRemaining <= 3
                        ? <AlertTriangle size={18} color={theme.danger} strokeWidth={2} />
                        : <Bell size={18} color={theme.warning} strokeWidth={2} />}
                    </View>
                    <View style={styles.urgencyTextWrap}>
                      <Text style={styles.urgencyTitle}>
                        Renews {daysRemaining === 0 ? "" : "in "}{formatDaysLabel(daysRemaining)}
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
                    {formatDaysLabel(daysRemaining)}
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
              {chargeHistory.length > 0 && !sub.lastChargedDate ? (
                <Text style={styles.historyCaption}>Estimated from your billing cycle</Text>
              ) : null}
              <View style={styles.groupCard}>
                {chargeHistory.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>No charge history yet</Text>
                  </View>
                ) : (
                  chargeHistory.map((entry, index) => {
                    const isLast = index === chargeHistory.length - 1;
                    return (
                      <View key={`${index}-${entry.date}`}>
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
                        {row.value ? <Bell size={18} color={theme.warning} strokeWidth={2} /> : <BellOff size={18} color={theme.mutedText} strokeWidth={2} />}
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
        {!isEditing && (sub.status === "active" || sub.status === "trial" || sub.status === "paused") ? (
          <View style={styles.bottomBar}>
            {sub.status === "paused" ? (
              <View style={styles.pausedBtn}>
                <Text style={styles.pausedBtnText}>Subscription Paused</Text>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                style={styles.dangerBtn}
                onPress={() => router.push(`/subscription/cancel/${sub.id}` as never)}
              >
                <Text style={styles.dangerBtnText}>Cancel Subscription</Text>
              </Pressable>
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
    dangerChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: theme.dangerSurface },
    dangerChipText: { ...typography.caption1, fontFamily: fonts.sans.semibold, color: theme.danger },
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

    // Verification lifecycle banner (CHANGE 4)
    verifyBanner: { marginHorizontal: 16, marginBottom: 8, borderRadius: 16, padding: 16, gap: 12 },
    verifyTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
    verifyTitle: { ...typography.subheadline, fontFamily: fonts.sans.bold, color: theme.text },
    verifyBody: { ...typography.caption1, color: theme.mutedText, marginTop: 2, lineHeight: 18 },
    verifyActions: { flexDirection: "row", gap: 8 },
    verifyBtn: { flex: 1, borderRadius: 12, paddingVertical: 11, alignItems: "center", justifyContent: "center" },
    verifyBtnText: { fontSize: 14, fontFamily: fonts.sans.semibold },

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
    historyCaption: { ...typography.caption1, color: theme.quietText, paddingHorizontal: spacing.screenH, marginTop: -4, marginBottom: 8 },
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

    // Edit mode — matches the design-system Input's own label typography so
    // the billing-cycle section reads like the Input-labelled sections.
    editLabel: { fontFamily: fonts.sans.semibold, fontSize: 14, color: theme.mutedText, marginBottom: 10 },
    cycleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cyclePill: { borderRadius: 20, borderWidth: 0.5, borderColor: theme.border, paddingHorizontal: 12, paddingVertical: 8 },
    cyclePillActive: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    cycleText: { ...typography.caption1, color: theme.mutedText, textTransform: "uppercase", fontWeight: "600" },
    cycleTextActive: { color: theme.primary }
  });
}
