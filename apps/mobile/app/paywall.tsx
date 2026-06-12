import { router } from "expo-router";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, ToastAndroid, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../src/auth/authStore";
import { getOfferings, getPackagePrice, purchaseFamily, purchasePro, restorePurchases, type BillingPlan, type ProBillingPeriod, type ZenoOfferings } from "../src/billing/revenueCat";
import { colors } from "../src/theme/colors";
import { type as typography } from "../src/theme/typography";
import { spacing } from "../src/theme/spacing";

// ─── Constants ────────────────────────────────────────────────────────────────

const fallbackPrices = {
  proMonthly: "$4.99",
  proAnnual:  "$39.99",
  familyMonthly: "$7.99"
};

const VALUE_PROPS = [
  { icon: "🔍", bg: "rgba(10,132,255,0.15)",  title: "Email auto-discovery",      sub: "Finds every subscription automatically" },
  { icon: "⚡", bg: "rgba(255,69,58,0.15)",   title: "7 and 3-day renewal alerts", sub: "Never get surprised by a charge again" },
  { icon: "🔗", bg: "rgba(48,209,88,0.15)",   title: "Direct cancel deep-links",   sub: "400+ services with step-by-step guides" },
  { icon: "💡", bg: "rgba(191,90,242,0.15)",  title: "Spend insights engine",       sub: "Finds savings and unused subscriptions" },
  { icon: "🎨", bg: "rgba(255,214,10,0.15)",  title: "All 3 generational themes",   sub: "Pulse, Clarity, and Command" }
] as const;

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

  const proPrice    = useMemo(() => period === "annual"
    ? getPackagePrice(offerings?.proAnnual ?? null, fallbackPrices.proAnnual)
    : getPackagePrice(offerings?.proMonthly ?? null, fallbackPrices.proMonthly),
    [offerings, period]
  );
  const familyPrice = getPackagePrice(offerings?.familyMonthly ?? null, fallbackPrices.familyMonthly);

  const displayPrice = period === "annual" ? "$3.50" : "$4.99";
  const { dollars: priceDollars, cents: priceCents } = splitPrice(displayPrice);
  const pricePeriodDesc = period === "annual" ? "billed as $41.99/year" : "billed monthly · cancel anytime";

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
        <Text style={styles.successIcon}>✦</Text>
        <Text style={styles.successTitle}>Welcome to Pro</Text>
        <Text style={styles.successBody}>
          You now have access to everything.{"\n"}Time to find what you can cancel.
        </Text>
        <Pressable style={styles.successBtn} onPress={() => router.replace("/dashboard")}>
          <Text style={styles.successBtnText}>Get Started</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Main paywall ──
  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={closePaywall}>
        <Text style={styles.closeBtnText}>✕</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.proBadge}>
            <Text style={styles.proBadgeStar}>✦</Text>
            <Text style={styles.proBadgeText}>Zeno Pro</Text>
          </View>

          <Text style={styles.headline}>Unlock everything.</Text>
          <Text style={styles.headlineMuted}>Save more.</Text>
          <Text style={styles.heroBody}>
            Auto-discovery, 3-day alerts, cancel guides for 400+ services, and all 3 themes.
          </Text>
        </View>

        {/* Pricing toggle */}
        <View style={styles.toggle}>
          <Pressable onPress={() => setPeriod("monthly")} style={[styles.toggleOption, period === "monthly" && styles.toggleOptionActive]}>
            <Text style={[styles.toggleTitle, period === "monthly" ? styles.toggleTitleActive : styles.toggleTitleInactive]}>Monthly</Text>
            <Text style={[styles.togglePrice, period === "monthly" ? styles.togglePriceActive : styles.togglePriceInactive]}>$4.99/mo</Text>
          </Pressable>

          <Pressable onPress={() => setPeriod("annual")} style={[styles.toggleOption, period === "annual" && styles.toggleOptionActive]}>
            <View style={styles.toggleTitleRow}>
              <Text style={[styles.toggleTitle, period === "annual" ? styles.toggleTitleActive : styles.toggleTitleInactive]}>Annual</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveBadgeText}>Save 30%</Text>
              </View>
            </View>
            <Text style={[styles.togglePrice, period === "annual" ? styles.togglePriceActive : styles.togglePriceInactive]}>$41.99/yr</Text>
          </Pressable>
        </View>

        {/* Price display */}
        <View style={styles.priceBlock}>
          {isLoadingOfferings ? (
            <ActivityIndicator color={colors.blue} size="large" />
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
                  <View style={[styles.propIcon, { backgroundColor: prop.bg }]}>
                    <Text style={styles.propIconText}>{prop.icon}</Text>
                  </View>
                  <View style={styles.propText}>
                    <Text style={styles.propTitle}>{prop.title}</Text>
                    <Text style={styles.propSub}>{prop.sub}</Text>
                  </View>
                  <Text style={styles.propCheck}>✓</Text>
                </View>
                {!isLast ? <View style={styles.propSep} /> : null}
              </View>
            );
          })}
        </View>

        {/* Social proof */}
        <View style={styles.socialRow}>
          <View style={styles.avatarStack}>
            {[{ color: colors.blue, letter: "M" }, { color: colors.purple, letter: "S" }, { color: colors.green, letter: "D" }].map((a, i) => (
              <View key={a.letter} style={[styles.socialAvatar, { backgroundColor: a.color, marginLeft: i === 0 ? 0 : -8 }]}>
                <Text style={styles.socialAvatarText}>{a.letter}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.socialProofText}>14,000+ people saving money with Zeno</Text>
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* CTA */}
        <Pressable
          disabled={isPurchasing || isLoadingOfferings}
          onPress={() => void handlePurchasePro()}
          style={[styles.ctaBtn, (isPurchasing || isLoadingOfferings) && { opacity: 0.7 }]}
        >
          {isPurchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaBtnText}>Start 7-day free trial</Text>
          }
        </Pressable>
        <Text style={styles.ctaSubText}>No charge until trial ends · Cancel anytime</Text>

        {/* Family plan row */}
        <Pressable
          disabled={isPurchasing || isLoadingOfferings}
          onPress={() => void handlePurchaseFamily()}
          style={styles.familyRow}
        >
          <Text style={styles.familyIcon}>👨‍👩‍👧</Text>
          <View style={styles.familyText}>
            <Text style={styles.familyTitle}>Family plan</Text>
            <Text style={styles.familySub}>Up to 5 members · {familyPrice}/mo</Text>
          </View>
          <Text style={styles.familyViewLink}>View →</Text>
        </Pressable>

        {/* Footer links */}
        <View style={styles.footer}>
          <Pressable onPress={() => void handleRestore()}>
            <Text style={styles.footerLink}>Restore purchases</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => openLegalUrl("https://zeno.app/terms")}>
            <Text style={styles.footerLink}>Terms of Service</Text>
          </Pressable>
          <Text style={styles.footerDot}>·</Text>
          <Pressable onPress={() => openLegalUrl("https://zeno.app/privacy")}>
            <Text style={styles.footerLink}>Privacy Policy</Text>
          </Pressable>
        </View>

      </ScrollView>

      {/* Loading overlay */}
      {isPurchasing ? (
        <View style={styles.overlay}>
          <View style={styles.overlayCard}>
            <ActivityIndicator size="large" color={colors.blue} />
            <Text style={styles.overlayText}>Processing...</Text>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea:     { flex: 1, backgroundColor: colors.bg },
  scrollContent:{ paddingBottom: 40, backgroundColor: colors.bg },

  // Close button
  closeBtn:     { position: "absolute", top: 52, right: 20, zIndex: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surfaceHigh, alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, fontWeight: "500", color: colors.label3 },

  // Hero
  hero:         { alignItems: "center", paddingHorizontal: 24, paddingTop: 60, paddingBottom: 28 },
  proBadge:     { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(10,132,255,0.1)", borderWidth: 0.5, borderColor: "rgba(10,132,255,0.25)", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24 },
  proBadgeStar: { fontSize: 12, color: colors.blue },
  proBadgeText: { fontSize: 13, fontWeight: "600", color: colors.blue, letterSpacing: 0.02 },
  headline:     { fontSize: 30, fontWeight: "800", color: colors.label, letterSpacing: -1.2, lineHeight: 34, textAlign: "center" },
  headlineMuted:{ fontSize: 30, fontWeight: "800", color: colors.label3, letterSpacing: -1.2, lineHeight: 34, textAlign: "center", marginBottom: 12 },
  heroBody:     { fontSize: 16, color: colors.label3, lineHeight: 24, letterSpacing: -0.2, textAlign: "center" },

  // Toggle
  toggle:           { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 14, padding: 3, flexDirection: "row", gap: 3 },
  toggleOption:     { flex: 1, borderRadius: 11, paddingVertical: 10, alignItems: "center" },
  toggleOptionActive:{ backgroundColor: colors.surfaceHigh },
  toggleTitleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  toggleTitle:      { fontSize: 14, fontWeight: "600", textAlign: "center" },
  toggleTitleActive: { color: colors.label },
  toggleTitleInactive:{ color: colors.label3 },
  togglePrice:      { fontSize: 12, textAlign: "center", marginTop: 2 },
  togglePriceActive:{ color: colors.label3 },
  togglePriceInactive:{ color: colors.label4 },
  saveBadge:        { backgroundColor: "rgba(48,209,88,0.12)", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  saveBadgeText:    { fontSize: 10, fontWeight: "700", color: colors.green },

  // Price display
  priceBlock:    { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 },
  priceRow:      { flexDirection: "row", alignItems: "baseline", gap: 4 },
  priceDollarSign:{ fontSize: 24, fontWeight: "300", color: colors.label3, marginBottom: 8 },
  priceDollars:  { fontSize: 56, fontWeight: "700", color: colors.label, letterSpacing: -3, fontVariant: ["tabular-nums"] },
  priceRight:    { flexDirection: "column", alignItems: "flex-start", marginBottom: 8, gap: 2 },
  priceCents:    { fontSize: 24, fontWeight: "300", color: colors.label3 },
  pricePer:      { fontSize: 14, color: colors.label4, marginTop: 2 },
  priceDesc:     { marginTop: 8, fontSize: 14, color: colors.label4, textAlign: "center" },

  // Value props
  groupCard:     { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, overflow: "hidden" },
  propRow:       { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 13 },
  propIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  propIconText:  { fontSize: 16, textAlign: "center", lineHeight: 36 },
  propText:      { flex: 1 },
  propTitle:     { ...typography.subheadline, color: colors.label },
  propSub:       { ...typography.caption1, color: colors.label3, marginTop: 2 },
  propCheck:     { fontSize: 14, fontWeight: "600", color: colors.green },
  propSep:       { position: "absolute", left: 66, right: 0, bottom: 0, height: 0.5, backgroundColor: colors.separator },

  // Social proof
  socialRow:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 16 },
  avatarStack:   { flexDirection: "row" },
  socialAvatar:  { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.bg, alignItems: "center", justifyContent: "center" },
  socialAvatarText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  socialProofText:{ fontSize: 13, color: colors.label3, marginLeft: 4 },

  // Error
  errorText:     { ...typography.footnote, color: colors.red, textAlign: "center", marginHorizontal: 16 },

  // CTA
  ctaBtn:        { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.blue, borderRadius: 16, paddingVertical: 18, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  ctaBtnText:    { fontSize: 17, fontWeight: "700", color: "#fff", letterSpacing: -0.3 },
  ctaSubText:    { textAlign: "center", fontSize: 12, color: colors.label4, marginTop: 8, marginBottom: 20 },

  // Family row
  familyRow:     { marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  familyIcon:    { fontSize: 22 },
  familyText:    { flex: 1 },
  familyTitle:   { ...typography.subheadline, color: colors.label },
  familySub:     { ...typography.caption1, color: colors.label3 },
  familyViewLink:{ fontSize: 14, fontWeight: "600", color: colors.blue },

  // Footer
  footer:        { paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20, marginBottom: 16 },
  footerLink:    { fontSize: 12, color: colors.label4, letterSpacing: -0.1 },
  footerDot:     { fontSize: 12, color: colors.label4 },

  // Loading overlay
  overlay:       { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.6)", alignItems: "center", justifyContent: "center", zIndex: 100 },
  overlayCard:   { backgroundColor: colors.surface, borderRadius: 20, padding: 28, alignItems: "center", gap: 16 },
  overlayText:   { fontSize: 16, fontWeight: "500", color: colors.label, marginTop: 8 },

  // Success screen
  successScreen: { alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successIcon:   { fontSize: 56, color: colors.blue, marginBottom: 24 },
  successTitle:  { fontSize: 28, fontWeight: "800", color: colors.label, letterSpacing: -1.2, marginBottom: 12, textAlign: "center" },
  successBody:   { fontSize: 16, color: colors.label3, textAlign: "center", lineHeight: 24, marginBottom: 36 },
  successBtn:    { backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 17, paddingHorizontal: 32 },
  successBtnText:{ fontSize: 17, fontWeight: "600", color: "#fff" }
});
