import { router } from "expo-router";
import { Bell, Check, Lightbulb, Link2, Search, ShieldCheck, Sparkles, Users, X } from "lucide-react-native";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useAuthStore } from "../src/auth/authStore";
import { getOfferings, getPackagePrice, purchaseFamily, purchasePro, restorePurchases, type BillingPlan, type ProBillingPeriod, type ZenoOfferings } from "../src/billing/revenueCat";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { type as typography } from "../src/theme/typography";
import { fonts } from "../src/theme/zeno";
import { withAlpha } from "../src/utils/subscription-ui";

// ─── Constants ────────────────────────────────────────────────────────────────
// Pricing per the locked D2 decision (Pro $3.99/mo or $29.99/yr ≈ 37% off,
// Family $6.99/mo). These display strings must match the configured RevenueCat
// products before launch — the live price still comes from `getPackagePrice`.

const fallbackPrices = {
  proMonthly: "$3.99",
  proAnnual:  "$29.99",
  familyMonthly: "$6.99"
};

type IconCmp = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

const VALUE_PROPS: ReadonlyArray<{ Icon: IconCmp; title: string; sub: string }> = [
  { Icon: Search,      title: "Ongoing auto-discovery",     sub: "Repeat email & statement scans, automatically" },
  { Icon: Bell,        title: "7 and 3-day renewal alerts", sub: "Never get surprised by a charge again" },
  { Icon: Link2,       title: "Direct cancel deep-links",   sub: "400+ services with step-by-step guides" },
  { Icon: Lightbulb,   title: "Full insights & AI coach",   sub: "Finds savings and unused subscriptions" },
  { Icon: ShieldCheck, title: "No bank login, ever",        sub: "On-device & encrypted — your data stays yours" }
];

// ─── Helpers (logic unchanged) ────────────────────────────────────────────────

function closePaywall() {
  if (router.canGoBack()) { router.back(); return; }
  router.replace("/dashboard");
}

function showSuccessToast(message: string) {
  if (Platform.OS === "android") { ToastAndroid.show(message, ToastAndroid.SHORT); return; }
  Alert.alert("Success", message);
}

function openLegalUrl(url: string) { void Linking.openURL(url); }

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Purchase failed. Please try again.";
}

function splitPrice(priceStr: string): { dollars: string; cents: string } {
  const match = priceStr.match(/\$?(\d+)\.(\d+)/);
  if (!match) return { dollars: priceStr.replace("$", ""), cents: "00" };
  return { dollars: match[1], cents: match[2] };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { theme } = useZenoTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const setPlan = useAuthStore((state) => state.setPlan);
  const [period, setPeriod]                     = useState<ProBillingPeriod>("annual");
  const [offerings, setOfferings]               = useState<ZenoOfferings | null>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(true);
  const [isPurchasing, setIsPurchasing]         = useState(false);
  const [isPurchaseSuccess, setIsPurchaseSuccess] = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void getOfferings()
      .then((nextOfferings) => { if (mounted) setOfferings(nextOfferings); })
      .catch((loadError) => { if (mounted) setError(getErrorMessage(loadError)); })
      .finally(() => { if (mounted) setIsLoadingOfferings(false); });
    return () => { mounted = false; };
  }, []);

  const familyPrice = getPackagePrice(offerings?.familyMonthly ?? null, fallbackPrices.familyMonthly);

  // Annual is billed yearly; show the monthly-equivalent in the big number.
  const displayPrice = period === "annual" ? "$2.50" : "$3.99";
  const { dollars: priceDollars, cents: priceCents } = splitPrice(displayPrice);
  const pricePeriodDesc = period === "annual" ? "billed as $29.99/year" : "billed monthly · cancel anytime";

  async function handlePurchasePro() {
    setIsPurchasing(true);
    setError(null);
    try {
      const plan = await purchasePro(period);
      finishPurchase(plan);
    } catch (purchaseError) {
      setError(getErrorMessage(purchaseError));
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handlePurchaseFamily() {
    setIsPurchasing(true);
    setError(null);
    try {
      const plan = await purchaseFamily();
      finishPurchase(plan);
    } catch (purchaseError) {
      setError(getErrorMessage(purchaseError));
    } finally {
      setIsPurchasing(false);
    }
  }

  async function handleRestore() {
    setIsPurchasing(true);
    setError(null);
    try {
      const plan = await restorePurchases();
      setPlan(plan);
      if (plan === "free") {
        setError("No active Zeno subscription was found on this store account.");
        return;
      }
      showSuccessToast(`Restored Zeno ${plan}.`);
      closePaywall();
    } catch (restoreError) {
      setError(getErrorMessage(restoreError));
    } finally {
      setIsPurchasing(false);
    }
  }

  function finishPurchase(plan: BillingPlan) {
    setPlan(plan);
    showSuccessToast(`Zeno ${plan === "family" ? "Family" : "Pro"} is active.`);
    setIsPurchaseSuccess(true);
  }

  // ── Success state ──
  if (isPurchaseSuccess) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.successScreen]} edges={["top", "bottom"]}>
        <Sparkles size={48} color={theme.primary} strokeWidth={2} />
        <Text style={styles.successTitle}>Welcome to Pro</Text>
        <Text style={styles.successBody}>
          You now have access to everything.{"\n"}Time to find what you can cancel.
        </Text>
        <Pressable accessibilityRole="button" style={styles.successBtn} onPress={() => router.replace("/dashboard")}>
          <Text style={styles.successBtnText}>Get Started</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Main paywall ──
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Close button */}
      <Pressable accessibilityRole="button" accessibilityLabel="Close paywall" hitSlop={10} style={styles.closeBtn} onPress={closePaywall}>
        <X size={16} color={theme.mutedText} strokeWidth={2} />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Sparkles size={13} color={theme.primary} strokeWidth={2} />
            <Text style={styles.proBadgeText}>Zeno Pro</Text>
          </View>

          <Text style={styles.headline}>Unlock everything.</Text>
          <Text style={styles.headlineMuted}>Save more.</Text>
          <Text style={styles.heroBody}>
            Ongoing auto-discovery, 7 and 3-day alerts, cancel guides for 400+ services — and we never see your bank.
          </Text>
        </View>

        {/* Pricing toggle */}
        <View style={styles.toggle}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: period === "monthly" }}
            accessibilityLabel="Monthly plan, $3.99 per month"
            onPress={() => setPeriod("monthly")}
            style={[styles.toggleOption, period === "monthly" && styles.toggleOptionActive]}
          >
            <Text style={[styles.toggleTitle, period === "monthly" ? styles.toggleTitleActive : styles.toggleTitleInactive]}>Monthly</Text>
            <Text style={[styles.togglePrice, period === "monthly" ? styles.togglePriceActive : styles.togglePriceInactive]}>$3.99/mo</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: period === "annual" }}
            accessibilityLabel="Annual plan, $29.99 per year, save 37 percent"
            onPress={() => setPeriod("annual")}
            style={[styles.toggleOption, period === "annual" && styles.toggleOptionActive]}
          >
            <View style={styles.toggleTitleRow}>
              <Text style={[styles.toggleTitle, period === "annual" ? styles.toggleTitleActive : styles.toggleTitleInactive]}>Annual</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 37%</Text>
              </View>
            </View>
            <Text style={[styles.togglePrice, period === "annual" ? styles.togglePriceActive : styles.togglePriceInactive]}>$29.99/yr</Text>
          </Pressable>
        </View>

        {/* Price display */}
        <View style={styles.priceBlock}>
          {isLoadingOfferings ? (
            <ActivityIndicator color={theme.primary} size="large" />
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text style={styles.priceDollarSign}>$</Text>
                <Text style={styles.priceDollars}>{priceDollars}</Text>
                <View style={styles.priceRight}>
                  <Text style={styles.priceCents}>.{priceCents}</Text>
                  <Text style={styles.pricePer}>/mo</Text>
                </View>
              </View>
              <Text style={styles.priceDesc}>{pricePeriodDesc}</Text>
            </>
          )}
        </View>

        {/* Value props */}
        <View style={styles.groupCard}>
          {VALUE_PROPS.map((prop, index) => {
            const isLast = index === VALUE_PROPS.length - 1;
            return (
              <View key={prop.title}>
                <View style={styles.propRow}>
                  <View style={styles.propIcon} accessible={false} importantForAccessibility="no-hide-descendants">
                    <prop.Icon size={18} color={theme.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.propText}>
                    <Text style={styles.propTitle}>{prop.title}</Text>
                    <Text style={styles.propSub}>{prop.sub}</Text>
                  </View>
                  <Check size={16} color={theme.success} strokeWidth={2.5} />
                </View>
                {!isLast ? <View style={styles.propSep} /> : null}
              </View>
            );
          })}
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* CTA */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isPurchasing || isLoadingOfferings }}
          disabled={isPurchasing || isLoadingOfferings}
          onPress={() => void handlePurchasePro()}
          style={[styles.ctaBtn, (isPurchasing || isLoadingOfferings) && { opacity: 0.7 }]}
        >
          {isPurchasing
            ? <ActivityIndicator color={theme.onPrimary} />
            : <Text style={styles.ctaBtnText}>Start 7-day free trial</Text>
          }
        </Pressable>
        <Text style={styles.ctaSubText}>No charge until trial ends · we'll remind you before it does</Text>

        {/* Family plan row */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Family plan, up to 5 members, ${familyPrice} per month`}
          accessibilityState={{ disabled: isPurchasing || isLoadingOfferings }}
          disabled={isPurchasing || isLoadingOfferings}
          onPress={() => void handlePurchaseFamily()}
          style={styles.familyRow}
        >
          <View style={styles.familyIcon}>
            <Users size={20} color={theme.primary} strokeWidth={2} />
          </View>
          <View style={styles.familyText}>
            <Text style={styles.familyTitle}>Family plan</Text>
            <Text style={styles.familySub}>Up to 5 members · {familyPrice}/mo</Text>
          </View>
          <Text style={styles.familyViewLink}>Choose</Text>
        </Pressable>

        {/* Footer links */}
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" accessibilityLabel="Restore purchases" hitSlop={8} onPress={() => void handleRestore()}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </Pressable>
          <Text style={styles.footerDot} accessible={false}>·</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => openLegalUrl("https://zeno.app/legal/terms")}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.footerDot} accessible={false}>·</Text>
          <Pressable accessibilityRole="link" hitSlop={8} onPress={() => openLegalUrl("https://zeno.app/legal/privacy")}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Loading overlay */}
      {isPurchasing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={styles.overlayText}>Processing...</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    safeArea:     { flex: 1, backgroundColor: theme.background },
    scrollContent:{ paddingBottom: 40, backgroundColor: theme.background },

    // Close button
    closeBtn:     { position: "absolute", top: 52, right: 20, zIndex: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: theme.surfaceAlt, alignItems: "center", justifyContent: "center" },

    // Hero
    hero:         { alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 28 },
    proBadge:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.primarySurface, borderWidth: 0.5, borderColor: withAlpha(theme.primary, 0.25), borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24 },
    proBadgeText: { fontSize: 13, fontFamily: fonts.sans.semibold, color: theme.primary },
    headline:     { fontSize: 30, fontFamily: fonts.display.bold, color: theme.text, letterSpacing: -1.0, lineHeight: 34, textAlign: "center" },
    headlineMuted:{ fontSize: 30, fontFamily: fonts.display.bold, color: theme.mutedText, letterSpacing: -1.0, lineHeight: 34, textAlign: "center", marginBottom: 12 },
    heroBody:     { fontSize: 16, fontFamily: fonts.sans.regular, color: theme.mutedText, lineHeight: 24, textAlign: "center" },

    // Toggle
    toggle:           { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 14, padding: 3, flexDirection: "row", gap: 3 },
    toggleOption:     { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center" },
    toggleOptionActive:{ backgroundColor: theme.surfaceAlt },
    toggleTitleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
    toggleTitle:      { fontSize: 14, fontFamily: fonts.sans.semibold, textAlign: "center" },
    toggleTitleActive: { color: theme.text },
    toggleTitleInactive:{ color: theme.mutedText },
    togglePrice:      { fontSize: 12, fontFamily: fonts.mono.regular, textAlign: "center", marginTop: 2 },
    togglePriceActive:{ color: theme.mutedText },
    togglePriceInactive:{ color: theme.quietText },
    saveBadge:        { backgroundColor: theme.successSurface, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
    saveBadgeText:    { fontSize: 10, fontFamily: fonts.sans.bold, color: theme.success },

    // Price display
    priceBlock:    { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
    priceRow:      { flexDirection: "row", alignItems: "baseline", gap: 4 },
    priceDollarSign:{ fontSize: 24, fontFamily: fonts.mono.regular, color: theme.mutedText, marginBottom: 8 },
    priceDollars:  { fontSize: 56, fontFamily: fonts.mono.bold, color: theme.text, letterSpacing: -3, fontVariant: ["tabular-nums"] },
    priceRight:    { flexDirection: "column", alignItems: "flex-start", marginBottom: 8, gap: 2 },
    priceCents:    { fontSize: 24, fontFamily: fonts.mono.regular, color: theme.mutedText },
    pricePer:      { fontSize: 14, fontFamily: fonts.sans.regular, color: theme.quietText, marginTop: 2 },
    priceDesc:     { marginTop: 8, fontSize: 14, fontFamily: fonts.sans.regular, color: theme.quietText, textAlign: "center" },

    // Value props
    groupCard:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    propRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 13 },
    propIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: theme.primarySurface },
    propText:      { flex: 1 },
    propTitle:     { ...typography.subheadline, color: theme.text },
    propSub:       { ...typography.caption1, color: theme.mutedText, marginTop: 2 },
    propSep:       { position: "absolute", left: 66, right: 0, bottom: 0, height: 0.5, backgroundColor: theme.border },

    // Error
    errorText:     { ...typography.footnote, color: theme.danger, textAlign: "center", marginHorizontal: 16 },

    // CTA
    ctaBtn:        { marginHorizontal: 16, marginBottom: 12, backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
    ctaBtnText:    { fontSize: 17, fontFamily: fonts.sans.bold, color: theme.onPrimary, letterSpacing: -0.3 },
    ctaSubText:    { textAlign: "center", fontSize: 12, fontFamily: fonts.sans.regular, color: theme.quietText, marginTop: 8, marginBottom: 20 },

    // Family row
    familyRow:     { marginHorizontal: 16, marginBottom: 16, backgroundColor: theme.card, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
    familyIcon:    { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.primarySurface, alignItems: "center", justifyContent: "center" },
    familyText:    { flex: 1 },
    familyTitle:   { ...typography.subheadline, color: theme.text },
    familySub:     { ...typography.caption1, color: theme.mutedText },
    familyViewLink:{ fontSize: 14, fontFamily: fonts.sans.semibold, color: theme.primary },

    // Footer
    footer:        { paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 16 },
    footerLink:    { fontSize: 12, fontFamily: fonts.sans.regular, color: theme.quietText },
    footerDot:     { fontSize: 12, color: theme.quietText },

    // Loading overlay
    overlay:       { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: theme.overlay, alignItems: "center", justifyContent: "center", zIndex: 100 },
    overlayCard:   { backgroundColor: theme.card, borderRadius: 20, padding: 28, alignItems: "center", gap: 16 },
    overlayText:   { fontSize: 16, fontFamily: fonts.sans.medium, color: theme.text, marginTop: 8 },

    // Success screen
    successScreen: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
    successTitle:  { fontSize: 28, fontFamily: fonts.display.bold, color: theme.text, letterSpacing: -1.0, marginBottom: 12, marginTop: 24, textAlign: "center" },
    successBody:   { fontSize: 16, fontFamily: fonts.sans.regular, color: theme.mutedText, textAlign: "center", lineHeight: 24, marginBottom: 36 },
    successBtn:    { backgroundColor: theme.primary, borderRadius: 14, paddingVertical: 17, paddingHorizontal: 32 },
    successBtnText:{ fontSize: 17, fontFamily: fonts.sans.semibold, color: theme.onPrimary }
  });
}
