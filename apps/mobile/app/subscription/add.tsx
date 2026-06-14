import { getPopularServices, type Service } from "@subradar/service-catalog";
import type { BillingCycle, SubscriptionCategory } from "@subradar/shared";
import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ServiceAutocomplete, servicePriceLabel } from "../../components/subscriptions/ServiceAutocomplete";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { useZenoTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";
import { getAvatarStyle, withAlpha } from "../../src/utils/subscription-ui";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Short price label for grid/list rows; "—" when the catalog has no price. */
function priceLabelOrDash(service: Service): string {
  return servicePriceLabel(service) ?? "—";
}

/**
 * Map a catalog ServiceCategory onto the app's SubscriptionCategory. Mirrors the
 * mapping discover.tsx uses (replicated locally — the catalog's own mapper is not
 * imported so the two screens can diverge independently if needed).
 */
function mapCategory(cat?: string): SubscriptionCategory {
  if (cat === "streaming" || cat === "gaming" || cat === "music") return "entertainment";
  if (cat === "ai_tools")     return "ai_tools";
  if (cat === "productivity") return "productivity";
  if (cat === "health")       return "health";
  if (cat === "finance")      return "finance";
  if (cat === "education")    return "education";
  if (cat === "cloud" || cat === "security") return "developer_tools";
  return "other";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const BILLING_CYCLES = ["monthly", "annual", "weekly"] as const;

/** All app categories, in tap-cycle order, with human labels. */
const CATEGORIES: { value: SubscriptionCategory; label: string }[] = [
  { value: "entertainment",   label: "Entertainment" },
  { value: "ai_tools",        label: "AI tools" },
  { value: "productivity",    label: "Productivity" },
  { value: "developer_tools", label: "Developer tools" },
  { value: "health",          label: "Health" },
  { value: "finance",         label: "Finance" },
  { value: "education",       label: "Education" },
  { value: "family",          label: "Family" },
  { value: "other",           label: "Other" }
];

function categoryLabel(value: SubscriptionCategory): string {
  return CATEGORIES.find((entry) => entry.value === value)?.label ?? "Other";
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AddSubscriptionScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { addSubscription, suggestions } = useSubscriptionStore();

  // Step 1 (search) state.
  const [query, setQuery]           = useState("");
  const [selected, setSelected]     = useState<Service | null>(null);
  // `inForm` flips to the details step; set when a service is picked or a
  // custom name is confirmed. Lets the user reach the form without a catalog hit.
  const [inForm, setInForm]         = useState(false);

  // Step 2 (details) state.
  const [name, setName]             = useState("");
  const [serviceSlug, setSlug]      = useState<string | undefined>(undefined);
  const [category, setCategory]     = useState<SubscriptionCategory>("other");
  const [amount, setAmount]         = useState("9.99");
  const [billingCycle, setBilling]  = useState<BillingCycle>("monthly");
  const [notes, setNotes]           = useState("");
  const [isTrial, setIsTrial]       = useState(false);
  const [notify7days, setNotify7]   = useState(true);
  const [notify3days, setNotify3]   = useState(true);
  const [notifyOnDay, setNotifyDay] = useState(true);

  const renewalDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  }, []);

  const matches = useMemo(() => suggestions(query), [query, suggestions]);
  const popularServices = useMemo(() => getPopularServices().slice(0, 8), []);

  const formValid = useMemo(() => {
    const parsed = Number.parseFloat(amount || "0");
    return name.trim().length > 0 && Number.isFinite(parsed) && parsed > 0;
  }, [amount, name]);

  /** Autofill the details form from a picked catalog service. */
  function applyService(service: Service) {
    setSelected(service);
    setSlug(service.slug);
    setName(service.name);
    setCategory(mapCategory(service.category));
    // Prefer the monthly price; fall back to the annual price + annual cycle.
    if (service.defaultMonthlyPrice != null) {
      setAmount(service.defaultMonthlyPrice.toFixed(2));
      setBilling("monthly");
    } else if (service.defaultAnnualPrice != null) {
      setAmount(service.defaultAnnualPrice.toFixed(2));
      setBilling("annual");
    }
  }

  /** Step 1: tap a catalog result/popular card → autofill and enter the form. */
  function handleSelectService(service: Service) {
    Keyboard.dismiss();
    applyService(service);
    setInForm(true);
  }

  /** Step 1: tap "Add custom service" → enter the form with the typed name. */
  function handleAddCustom() {
    Keyboard.dismiss();
    setSelected(null);
    setSlug(undefined);
    setName(query.trim());
    setCategory("other");
    setInForm(true);
  }

  /** Form: user edits the name field, which detaches any locked catalog match. */
  function handleNameChange(text: string) {
    setName(text);
    if (selected) {
      setSelected(null);
      setSlug(undefined);
    }
  }

  /** Form: pick a catalog match from the inline type-ahead. */
  function handleInlineSelect(service: Service) {
    Keyboard.dismiss();
    applyService(service);
  }

  /** Form: keep the free-text name (dismiss the type-ahead, stay custom). */
  function handleKeepCustom() {
    Keyboard.dismiss();
    setSelected(null);
    setSlug(undefined);
  }

  function handleSave() {
    if (!formValid) return;
    const amountMinor = Math.round(Number.parseFloat(amount || "0") * 100);
    addSubscription({
      name: name.trim() || "New subscription",
      serviceSlug,
      category,
      amountMinor,
      // A free trial is stored as a "trial" cycle whose renewal date is the
      // conversion date — so the Trial Guardian and notifications can track it.
      billingCycle: isTrial ? "trial" : billingCycle,
      nextRenewalDate: renewalDate.toISOString(),
      source: "manual"
    });
    router.back();
  }

  // ── Step 1: Search ──────────────────────────────────────────────────────────
  const renderSearch = () => (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.searchScrollContent}
    >
      {/* Search input */}
      <View style={styles.searchInputWrap}>
        <Text style={styles.searchIcon} accessible={false}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search 600+ services..."
          placeholderTextColor={theme.quietText}
          style={styles.searchInput}
          autoFocus
          selectionColor={theme.primary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => { if (query.trim().length > 0) handleAddCustom(); }}
          accessibilityLabel="Search services"
        />
      </View>

      {query.length > 0 ? (
        // Search results
        <View style={styles.resultsList}>
          {matches.map((service, index) => {
            const avatar = getAvatarStyle(service.category, theme);
            const isLast = index === matches.length - 1;
            return (
              <Pressable
                key={service.id}
                accessibilityRole="button"
                accessibilityLabel={`${service.name}, ${priceLabelOrDash(service)}`}
                onPress={() => handleSelectService(service)}
              >
                <View style={styles.resultRow}>
                  <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                    <Text style={[styles.avatarText, { color: avatar.text }]}>
                      {service.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.resultMiddle}>
                    <Text style={styles.resultName} numberOfLines={1}>{service.name}</Text>
                    <Text style={styles.resultCategory}>{service.category.replace("_", " ")}</Text>
                  </View>
                  <Text style={styles.resultPrice}>{priceLabelOrDash(service)}</Text>
                </View>
                {!isLast ? <View style={styles.rowSeparatorFromLeft} /> : null}
              </Pressable>
            );
          })}
          {/* Add custom row */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Add ${query.trim()} as a custom service`}
            onPress={handleAddCustom}
          >
            <View style={styles.resultRow}>
              <View style={[styles.avatar, { backgroundColor: theme.surfaceAlt }]}>
                <Text style={styles.addCustomPlus}>+</Text>
              </View>
              <View style={styles.resultMiddle}>
                <Text style={styles.resultName}>Add custom service</Text>
                <Text style={styles.resultCategory}>Not in our list</Text>
              </View>
            </View>
          </Pressable>
        </View>
      ) : (
        // Popular grid
        <>
          <Text style={styles.popularLabel}>POPULAR RIGHT NOW</Text>
          <FlatList
            data={popularServices}
            keyExtractor={(s) => s.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.popularGrid}
            columnWrapperStyle={styles.popularRow}
            renderItem={({ item }) => {
              const avatar = getAvatarStyle(item.category, theme);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name}, ${priceLabelOrDash(item)}`}
                  style={styles.popularCard}
                  onPress={() => handleSelectService(item)}
                >
                  <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                    <Text style={[styles.avatarText, { color: avatar.text }]}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popularCardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.popularCardPrice}>{priceLabelOrDash(item)}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      )}
    </ScrollView>
  );

  // ── Step 2: Details form ────────────────────────────────────────────────────
  const renderForm = () => (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.formScrollContent}
    >
      {/* Selected service header */}
      <View style={styles.selectedHeader}>
        <View style={[styles.avatarLg, { backgroundColor: getAvatarStyle(selected?.category ?? category, theme).bg }]}>
          <Text style={[styles.avatarLgText, { color: getAvatarStyle(selected?.category ?? category, theme).text }]}>
            {(name.trim() || "?").slice(0, 2).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedName} numberOfLines={1}>{name.trim() || "New subscription"}</Text>
          <Text style={styles.selectedCategory}>
            {selected ? selected.category.replace("_", " ") : "Custom service"}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change selected service"
          hitSlop={8}
          onPress={() => { setSelected(null); setSlug(undefined); setInForm(false); }}
        >
          <Text style={styles.changeLink}>Change</Text>
        </Pressable>
      </View>

      {/* Name + inline type-ahead */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Name</Text>
          <TextInput
            value={name}
            onChangeText={handleNameChange}
            placeholder="Service name"
            placeholderTextColor={theme.quietText}
            style={styles.nameInput}
            selectionColor={theme.primary}
            autoCapitalize="words"
            autoCorrect={false}
            textAlign="right"
            accessibilityLabel="Service name"
          />
        </View>
      </View>
      <View style={styles.autocompleteWrap}>
        <ServiceAutocomplete
          query={name}
          selectedSlug={serviceSlug}
          onSelect={handleInlineSelect}
          onUseCustom={handleKeepCustom}
          theme={theme}
        />
      </View>

      {/* Amount & Billing */}
      <View style={styles.formCard}>
        {/* Amount row */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Amount</Text>
          <View style={styles.amountRight}>
            <Text style={styles.amountCurrency}>$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor={theme.quietText}
              selectionColor={theme.primary}
              textAlign="right"
              accessibilityLabel="Amount in dollars"
            />
          </View>
        </View>
        <View style={styles.fullSeparator} />

        {/* Billing cycle */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Billing</Text>
          <View style={styles.segmented}>
            {BILLING_CYCLES.map((cycle) => (
              <Pressable
                key={cycle}
                accessibilityRole="button"
                accessibilityState={{ selected: billingCycle === cycle }}
                accessibilityLabel={`Bill ${cycle}`}
                onPress={() => setBilling(cycle)}
                style={[styles.segment, billingCycle === cycle && styles.segmentActive]}
              >
                <Text style={[styles.segmentText, billingCycle === cycle ? styles.segmentTextActive : styles.segmentTextInactive]}>
                  {cycle.charAt(0).toUpperCase() + cycle.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.fullSeparator} />

        {/* Renewal date */}
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Renews</Text>
          <Text style={styles.renewalDate}>{formatDate(renewalDate)}</Text>
        </View>
      </View>

      {/* Category & Notes */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <Text style={styles.formLabel}>Category</Text>
          <View style={styles.categoryChips}>
            {CATEGORIES.map((entry) => (
              <Pressable
                key={entry.value}
                accessibilityRole="button"
                accessibilityState={{ selected: category === entry.value }}
                accessibilityLabel={`Category ${entry.label}`}
                hitSlop={4}
                onPress={() => setCategory(entry.value)}
                style={[styles.categoryChip, category === entry.value && styles.categoryChipActive]}
              >
                <Text style={[styles.categoryChipText, category === entry.value && styles.categoryChipTextActive]}>
                  {entry.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.fullSeparator} />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add a note (optional)"
          placeholderTextColor={theme.quietText}
          style={styles.notesInput}
          selectionColor={theme.primary}
          accessibilityLabel="Notes"
        />
      </View>

      {/* Free trial */}
      <View style={styles.formCard}>
        <View style={styles.formRow}>
          <View>
            <Text style={styles.formLabel}>Free trial</Text>
            <Text style={styles.formSub}>Track trial end date</Text>
          </View>
          <Switch
            accessibilityRole="switch"
            accessibilityLabel="Free trial"
            value={isTrial}
            onValueChange={setIsTrial}
            trackColor={{ false: theme.surfaceAlt, true: theme.success }}
            thumbColor={theme.onPrimary}
          />
        </View>
        {isTrial ? (
          <>
            <View style={styles.fullSeparator} />
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Trial ends</Text>
              <Text style={styles.renewalDate}>{formatDate(renewalDate)}</Text>
            </View>
          </>
        ) : null}
      </View>

      {/* Notifications */}
      <View style={[styles.formCard, styles.formCardLast]}>
        <View style={styles.notifHeader}>
          <Text style={styles.notifSectionLabel}>NOTIFICATIONS</Text>
        </View>
        {[
          { label: "7-day reminder", sub: "Reminder before renewal week", value: notify7days, setter: setNotify7 },
          { label: "3-day reminder", sub: "Final warning before charge",  value: notify3days, setter: setNotify3 },
          { label: "Charge day alert", sub: "Confirmation when charged",  value: notifyOnDay, setter: setNotifyDay }
        ].map((row, i, arr) => (
          <View key={row.label}>
            <View style={styles.notifRow}>
              <View style={styles.notifIconWrap} accessible={false} importantForAccessibility="no-hide-descendants">
                <Text style={styles.notifIcon}>{row.value ? "🔔" : "🔕"}</Text>
              </View>
              <View style={styles.notifTextWrap}>
                <Text style={styles.formLabel}>{row.label}</Text>
                <Text style={styles.formSub}>{row.sub}</Text>
              </View>
              <Switch
                accessibilityRole="switch"
                accessibilityLabel={row.label}
                value={row.value}
                onValueChange={row.setter}
                trackColor={{ false: theme.surfaceAlt, true: theme.success }}
                thumbColor={theme.onPrimary}
              />
            </View>
            {i < arr.length - 1 ? <View style={styles.fullSeparator} /> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  // ── Root ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"] as const}>
      {/* Screen renders its own nav row, so hide the native stack header. */}
      <Stack.Screen options={{ headerShown: false }} />
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron} accessible={false}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Add subscription</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save subscription"
          accessibilityState={{ disabled: !formValid }}
          hitSlop={8}
          onPress={handleSave}
        >
          <Text style={[styles.saveBtn, { color: formValid ? theme.primary : theme.quietText }]}>Save</Text>
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {inForm ? renderForm() : renderSearch()}
      </View>

      {/* Fixed bottom save button (only on the details step) */}
      {inForm ? (
        <View style={styles.bottomBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add subscription"
            accessibilityState={{ disabled: !formValid }}
            onPress={handleSave}
            style={[styles.saveButton, { backgroundColor: formValid ? theme.primary : withAlpha(theme.primary, 0.4) }]}
          >
            <Text style={styles.saveButtonText}>Add Subscription</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },

    // Nav bar
    navBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.screenH,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 0.5,
      borderBottomColor: theme.border,
      backgroundColor: theme.background
    },
    backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
    backChevron: { color: theme.primary, fontSize: 22, lineHeight: 22 },
    backText: { color: theme.primary, fontSize: 17 },
    navTitle: {
      ...typography.headline,
      color: theme.text,
      position: "absolute",
      left: 0, right: 0,
      textAlign: "center"
    },
    saveBtn: { fontSize: 17, fontWeight: "600", textAlign: "right", minWidth: 60 },

    body: { flex: 1 },

    // ── Search step ──
    searchScrollContent: { paddingBottom: 120 },
    searchInputWrap: {
      margin: 16,
      marginBottom: 8,
      backgroundColor: theme.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    searchIcon: { fontSize: 15, color: theme.quietText },
    searchInput: { flex: 1, ...typography.body, color: theme.text, paddingVertical: 0 },

    popularLabel: {
      ...typography.sectionHeader,
      color: theme.mutedText,
      paddingHorizontal: spacing.screenH,
      paddingBottom: 8,
      paddingTop: 4
    },
    popularGrid: { paddingHorizontal: 16, paddingBottom: 12, rowGap: 8 },
    popularRow: { gap: 8 },
    popularCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderRadius: 14,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    popularCardName: { ...typography.subheadline, color: theme.text },
    popularCardPrice: { ...typography.caption1, color: theme.mutedText, marginTop: 2 },

    resultsList: {
      marginHorizontal: 16,
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: "hidden"
    },
    resultRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 13,
      gap: 14,
      minHeight: spacing.rowH + 8
    },
    resultMiddle: { flex: 1 },
    resultName: { ...typography.subheadline, color: theme.text },
    resultCategory: { ...typography.caption1, color: theme.mutedText, marginTop: 1 },
    resultPrice: { ...typography.subheadline, color: theme.mutedText },
    rowSeparatorFromLeft: {
      position: "absolute",
      left: 62, right: 0, bottom: 0,
      height: 0.5,
      backgroundColor: theme.border
    },
    addCustomPlus: { fontSize: 20, color: theme.primary, fontWeight: "700" },

    avatar: {
      width: spacing.avatarMd,
      height: spacing.avatarMd,
      borderRadius: spacing.avatarRadius.md,
      alignItems: "center",
      justifyContent: "center"
    },
    avatarText: { fontSize: 13, fontWeight: "700" },

    // ── Form step ──
    formScrollContent: { paddingBottom: 120 },

    selectedHeader: {
      margin: spacing.screenH,
      backgroundColor: theme.card,
      borderRadius: 16,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 14
    },
    avatarLg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    avatarLgText: { fontSize: 14, fontWeight: "700" },
    selectedName: { ...typography.headline, color: theme.text },
    selectedCategory: { ...typography.caption1, color: theme.mutedText, marginTop: 2, textTransform: "capitalize" },
    changeLink: { ...typography.footnote, color: theme.primary },

    formCard: {
      marginHorizontal: spacing.screenH,
      marginBottom: 8,
      backgroundColor: theme.card,
      borderRadius: 16,
      overflow: "hidden"
    },
    formCardLast: { marginBottom: 32 },

    formRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: spacing.rowH + 4,
      gap: 12
    },
    formLabel: { ...typography.subheadline, color: theme.text },
    formSub: { ...typography.caption1, color: theme.mutedText, marginTop: 2 },

    nameInput: { ...typography.subheadline, color: theme.text, flex: 1, paddingVertical: 0 },

    autocompleteWrap: {
      marginHorizontal: spacing.screenH,
      marginTop: -2,
      marginBottom: 8
    },

    amountRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    amountCurrency: { ...typography.subheadline, color: theme.mutedText },
    amountInput: { ...typography.subheadline, color: theme.text, width: 80, textAlign: "right" },

    renewalDate: { ...typography.subheadline, color: theme.primary },

    segmented: {
      flexDirection: "row",
      backgroundColor: theme.surfaceAlt,
      borderRadius: 8,
      padding: 2,
      gap: 2
    },
    segment: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
    segmentActive: { backgroundColor: theme.background },
    segmentText: { ...typography.subheadline, fontWeight: "600" },
    segmentTextActive: { color: theme.text },
    segmentTextInactive: { color: theme.mutedText },

    categoryChips: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: 6
    },
    categoryChip: {
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.border,
      paddingHorizontal: 10,
      paddingVertical: 6,
      minHeight: 30
    },
    categoryChipActive: { borderColor: theme.primary, backgroundColor: theme.primarySurface },
    categoryChipText: { ...typography.caption1, color: theme.mutedText, fontWeight: "600" },
    categoryChipTextActive: { color: theme.primary },

    notesInput: {
      ...typography.subheadline,
      color: theme.text,
      paddingHorizontal: 16,
      paddingTop: 2,
      paddingBottom: 14,
      minHeight: 44
    },

    fullSeparator: { height: 0.5, backgroundColor: theme.border },

    notifHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
    notifSectionLabel: { ...typography.sectionHeader, color: theme.mutedText },
    notifRow: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      flexDirection: "row",
      alignItems: "center",
      gap: 14
    },
    notifIconWrap: {
      width: 34, height: 34, borderRadius: 10,
      backgroundColor: theme.warningSurface,
      alignItems: "center", justifyContent: "center"
    },
    notifIcon: { fontSize: 18 },
    notifTextWrap: { flex: 1 },

    // Bottom save bar
    bottomBar: {
      position: "absolute",
      bottom: 0, left: 0, right: 0,
      backgroundColor: theme.background,
      paddingHorizontal: 16,
      paddingBottom: Platform.OS === "ios" ? 40 : 24,
      paddingTop: 12,
      borderTopWidth: 0.5,
      borderTopColor: theme.border
    },
    saveButton: {
      borderRadius: 14,
      paddingVertical: 17,
      alignItems: "center",
      justifyContent: "center"
    },
    saveButtonText: { fontSize: 17, fontWeight: "600", color: theme.onPrimary }
  });
}
