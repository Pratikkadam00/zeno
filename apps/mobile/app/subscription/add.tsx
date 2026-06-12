import { getPopularServices, type Service } from "@subradar/service-catalog";
import type { BillingCycle, SubscriptionCategory } from "@subradar/shared";
import { router } from "expo-router";
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
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { colors } from "../../src/theme/colors";
import { type as typography } from "../../src/theme/typography";
import { spacing } from "../../src/theme/spacing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getAvatarStyle(category: string): { bg: string; text: string } {
  if (category === "streaming" || category === "entertainment") return { bg: "rgba(255,69,58,0.15)", text: "#FF453A" };
  if (category === "ai_tools") return { bg: "rgba(191,90,242,0.15)", text: "#BF5AF2" };
  if (category === "productivity") return { bg: "rgba(10,132,255,0.15)", text: "#0A84FF" };
  if (category === "gaming") return { bg: "rgba(48,209,88,0.15)", text: "#30D158" };
  if (category === "health") return { bg: "rgba(255,159,10,0.15)", text: "#FF9F0A" };
  if (category === "finance") return { bg: "rgba(90,200,245,0.15)", text: "#5AC8F5" };
  if (category === "education") return { bg: "rgba(255,214,10,0.15)", text: "#FFD60A" };
  if (category === "music") return { bg: "rgba(255,55,95,0.15)", text: "#FF375F" };
  return { bg: "rgba(255,255,255,0.08)", text: "rgba(255,255,255,0.4)" };
}

function servicePriceLabel(service: Service): string {
  if (service.defaultMonthlyPrice) return `$${service.defaultMonthlyPrice.toFixed(2)}/mo`;
  if (service.defaultAnnualPrice)  return `$${service.defaultAnnualPrice.toFixed(2)}/yr`;
  return "—";
}

function mapCategory(cat?: string): SubscriptionCategory {
  if (cat === "streaming" || cat === "entertainment" || cat === "gaming" || cat === "music") return "entertainment";
  if (cat === "ai_tools")   return "ai_tools";
  if (cat === "productivity") return "productivity";
  if (cat === "health")     return "health";
  if (cat === "finance")    return "finance";
  if (cat === "education")  return "education";
  if (cat === "cloud" || cat === "security") return "developer_tools";
  return "other";
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const BILLING_CYCLES = ["monthly", "annual", "weekly"] as const;

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function AddSubscriptionScreen() {
  const { addSubscription, suggestions } = useSubscriptionStore();

  const [query, setQuery]           = useState("");
  const [selected, setSelected]     = useState<Service | null>(null);
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
    const hasName = Boolean(selected) || query.trim().length > 0;
    return hasName && Number.isFinite(parsed) && parsed > 0;
  }, [amount, query, selected]);

  function handleSelectService(service: Service) {
    Keyboard.dismiss();
    setSelected(service);
    setQuery(service.name);
    if (service.defaultMonthlyPrice) {
      setAmount(service.defaultMonthlyPrice.toFixed(2));
    }
  }

  function handleSave() {
    if (!formValid) return;
    const amountMinor = Math.round(Number.parseFloat(amount || "0") * 100);
    addSubscription({
      name: (selected?.name ?? query.trim()) || "New subscription",
      serviceSlug: selected?.slug,
      category: mapCategory(selected?.category),
      amountMinor,
      billingCycle,
      nextRenewalDate: renewalDate.toISOString()
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search 500+ services..."
          placeholderTextColor={colors.label4}
          style={styles.searchInput}
          autoFocus
          selectionColor={colors.blue}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {query.length > 0 ? (
        // Search results
        <View style={styles.resultsList}>
          {matches.map((service, index) => {
            const avatar = getAvatarStyle(service.category);
            const isLast = index === matches.length - 1;
            return (
              <Pressable key={service.id} onPress={() => handleSelectService(service)}>
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
                  <Text style={styles.resultPrice}>{servicePriceLabel(service)}</Text>
                </View>
                {!isLast ? <View style={styles.rowSeparatorFromLeft} /> : null}
              </Pressable>
            );
          })}
          {/* Add custom row */}
          <Pressable onPress={() => { Keyboard.dismiss(); setSelected(null); }}>
            <View style={styles.resultRow}>
              <View style={[styles.avatar, { backgroundColor: colors.fillPrimary }]}>
                <Text style={{ fontSize: 20, color: colors.blue, fontWeight: "700" }}>+</Text>
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
              const avatar = getAvatarStyle(item.category);
              return (
                <Pressable style={styles.popularCard} onPress={() => handleSelectService(item)}>
                  <View style={[styles.avatar, { backgroundColor: avatar.bg }]}>
                    <Text style={[styles.avatarText, { color: avatar.text }]}>
                      {item.name.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.popularCardName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.popularCardPrice}>{servicePriceLabel(item)}</Text>
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
        {selected ? (
          <View style={[styles.avatarLg, { backgroundColor: getAvatarStyle(selected.category).bg }]}>
            <Text style={[styles.avatarLgText, { color: getAvatarStyle(selected.category).text }]}>
              {selected.name.slice(0, 2).toUpperCase()}
            </Text>
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Text style={styles.selectedName}>{selected?.name ?? query.trim()}</Text>
          {selected?.category ? (
            <Text style={styles.selectedCategory}>{selected.category.replace("_", " ")}</Text>
          ) : null}
        </View>
        <Pressable onPress={() => { setSelected(null); setQuery(""); }}>
          <Text style={styles.changeLink}>Change</Text>
        </Pressable>
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
              placeholderTextColor={colors.label4}
              selectionColor={colors.blue}
              textAlign="right"
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
          <View style={styles.formRowRight}>
            <Text style={styles.formValueText}>
              {selected?.category.replace("_", " ") ?? "other"}
            </Text>
            <Text style={styles.chevron}>›</Text>
          </View>
        </View>
        <View style={styles.fullSeparator} />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Add a note (optional)"
          placeholderTextColor={colors.label4}
          style={styles.notesInput}
          selectionColor={colors.blue}
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
            value={isTrial}
            onValueChange={setIsTrial}
            trackColor={{ false: colors.surfaceHigher, true: colors.green }}
            thumbColor="#fff"
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
              <View style={styles.notifIconWrap}>
                <Text style={styles.notifIcon}>{row.value ? "🔔" : "🔕"}</Text>
              </View>
              <View style={styles.notifTextWrap}>
                <Text style={styles.formLabel}>{row.label}</Text>
                <Text style={styles.formSub}>{row.sub}</Text>
              </View>
              <Switch
                value={row.value}
                onValueChange={row.setter}
                trackColor={{ false: colors.surfaceHigher, true: colors.green }}
                thumbColor="#fff"
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
      {/* Nav bar */}
      <View style={styles.navBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Add subscription</Text>
        <Pressable onPress={handleSave}>
          <Text style={[styles.saveBtn, { color: formValid ? colors.blue : colors.label4 }]}>Save</Text>
        </Pressable>
      </View>

      {/* Body */}
      <View style={styles.body}>
        {selected || (query.length > 0 && matches.length === 0) ? renderForm() : renderSearch()}
      </View>

      {/* Fixed bottom save button */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={handleSave}
          style={[styles.saveButton, { backgroundColor: formValid ? colors.blue : "rgba(10,132,255,0.4)" }]}
        >
          <Text style={styles.saveButtonText}>Add Subscription</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },

  // Nav bar
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenH,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.separator,
    backgroundColor: colors.bg
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 60 },
  backChevron: { color: colors.blue, fontSize: 22, lineHeight: 22 },
  backText: { color: colors.blue, fontSize: 17 },
  navTitle: {
    ...typography.headline,
    color: colors.label,
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
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  searchIcon: { fontSize: 15, color: colors.label4 },
  searchInput: { flex: 1, ...typography.body, color: colors.label, paddingVertical: 0 },

  popularLabel: {
    ...typography.sectionHeader,
    color: colors.label3,
    paddingHorizontal: spacing.screenH,
    paddingBottom: 8,
    paddingTop: 4
  },
  popularGrid: { paddingHorizontal: 16, paddingBottom: 12, rowGap: 8 },
  popularRow: { gap: 8 },
  popularCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  popularCardName: { ...typography.subheadline, color: colors.label },
  popularCardPrice: { ...typography.caption1, color: colors.label3, marginTop: 2 },

  resultsList: {
    marginHorizontal: 16,
    backgroundColor: colors.surface,
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
  resultName: { ...typography.subheadline, color: colors.label },
  resultCategory: { ...typography.caption1, color: colors.label3, marginTop: 1 },
  resultPrice: { ...typography.subheadline, color: colors.label3 },
  rowSeparatorFromLeft: {
    position: "absolute",
    left: 62, right: 0, bottom: 0,
    height: 0.5,
    backgroundColor: colors.separator
  },

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
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  avatarLg: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  avatarLgText: { fontSize: 14, fontWeight: "700" },
  selectedName: { ...typography.headline, color: colors.label },
  selectedCategory: { ...typography.caption1, color: colors.label3, marginTop: 2 },
  changeLink: { ...typography.footnote, color: colors.blue },

  formCard: {
    marginHorizontal: spacing.screenH,
    marginBottom: 8,
    backgroundColor: colors.surface,
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
  formLabel: { ...typography.subheadline, color: colors.label },
  formSub: { ...typography.caption1, color: colors.label3, marginTop: 2 },
  formRowRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  formValueText: { ...typography.subheadline, color: colors.label3 },
  chevron: { fontSize: 18, color: colors.label4 },

  amountRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  amountCurrency: { ...typography.subheadline, color: colors.label3 },
  amountInput: { ...typography.subheadline, color: colors.label, width: 80, textAlign: "right" },

  renewalDate: { ...typography.subheadline, color: colors.blue },

  segmented: {
    flexDirection: "row",
    backgroundColor: colors.surfaceHigh,
    borderRadius: 8,
    padding: 2,
    gap: 2
  },
  segment: { borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  segmentActive: { backgroundColor: colors.bg },
  segmentText: { ...typography.subheadline, fontWeight: "600" },
  segmentTextActive: { color: colors.label },
  segmentTextInactive: { color: colors.label3 },

  notesInput: {
    ...typography.subheadline,
    color: colors.label,
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 14,
    minHeight: 44
  },

  fullSeparator: { height: 0.5, backgroundColor: colors.separator },

  notifHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  notifSectionLabel: { ...typography.sectionHeader, color: colors.label3 },
  notifRow: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  notifIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,159,10,0.15)",
    alignItems: "center", justifyContent: "center"
  },
  notifIcon: { fontSize: 18 },
  notifTextWrap: { flex: 1 },

  // Bottom save bar
  bottomBar: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.separator
  },
  saveButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  saveButtonText: { fontSize: 17, fontWeight: "600", color: "#fff" }
});
