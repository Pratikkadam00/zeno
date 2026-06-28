import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { CreditCard, LogOut, ShieldCheck } from "lucide-react-native";
import { useAuthStore } from "../src/auth/authStore";
import { useLockStore } from "../src/security/lock-store";
import { ServiceAvatar } from "../src/components/zeno";
import { useZenoTheme } from "../src/theme/theme-provider";
import type { ThemeTokens } from "../src/theme/tokens";
import { palette } from "../src/theme/zeno";

export default function ProfileScreen() {
  const { theme } = useZenoTheme();
  const styles = createStyles(theme);
  const { plan, accountId, logout } = useAuthStore((state) => ({
    plan: state.plan,
    accountId: state.accountId,
    logout: state.logout
  }));
  const lockEnabled = useLockStore((s) => s.enabled);

  const email = accountId ?? "you@example.com";
  const planLabel = plan === "pro" ? "Pro" : plan === "family" ? "Family" : "Free plan";

  const confirmSignOut = () =>
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() }
    ]);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <ServiceAvatar name={email} size={72} shape="circle" color={palette.category.teal} />
          <Text style={styles.email} numberOfLines={1}>{email}</Text>
          <View style={[styles.planBadge, { backgroundColor: plan === "free" ? theme.surfaceAlt : theme.primarySurface }]}>
            <Text style={[styles.planBadgeText, { color: plan === "free" ? theme.mutedText : theme.primary }]}>{planLabel}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Pressable accessibilityRole="button" accessibilityLabel="Plan and billing" style={styles.row} onPress={() => router.push("/paywall")}>
            <View style={[styles.rowIcon, { backgroundColor: palette.category.violet }]}>
              <CreditCard size={17} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Plan & billing</Text>
              <Text style={styles.rowSub}>{plan === "free" ? "Upgrade to Pro or Family" : `You're on ${planLabel}`}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.separator} />

          <Pressable accessibilityRole="button" accessibilityLabel="Security" style={styles.row} onPress={() => router.push("/security" as never)}>
            <View style={[styles.rowIcon, { backgroundColor: palette.category.green }]}>
              <ShieldCheck size={17} color="#FFFFFF" strokeWidth={2} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>App lock</Text>
              <Text style={styles.rowSub}>{lockEnabled ? "On · Face ID + PIN" : "Off"}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.metaLabel}>ACCOUNT ID</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.accountId} numberOfLines={1}>{accountId ?? "—"}</Text>
          </View>
        </View>

        <View style={styles.privacyNote}>
          <ShieldCheck size={16} color={theme.success} strokeWidth={2} />
          <Text style={styles.privacyText}>Your financial data is encrypted on this device. We never see your bank login or your data.</Text>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Sign out" style={styles.signOut} onPress={confirmSignOut}>
          <LogOut size={17} color={theme.text} strokeWidth={2} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ThemeTokens) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    content: { padding: 20, paddingBottom: 60, gap: 12 },
    header: { alignItems: "center", gap: 10, paddingVertical: 12 },
    email: { fontSize: 18, fontWeight: "800", color: theme.text, maxWidth: "90%" },
    planBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
    planBadgeText: { fontSize: 13, fontWeight: "700" },
    card: { backgroundColor: theme.card, borderRadius: 16, overflow: "hidden" },
    row: { minHeight: 44, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
    rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { fontSize: 16, fontWeight: "600", color: theme.text },
    rowSub: { fontSize: 13, color: theme.mutedText, marginTop: 2 },
    chevron: { fontSize: 22, color: theme.quietText },
    separator: { height: StyleSheet.hairlineWidth, backgroundColor: theme.border, marginLeft: 60 },
    metaLabel: { fontSize: 12, fontWeight: "700", color: theme.mutedText, marginTop: 8, marginLeft: 4 },
    accountId: { fontSize: 14, color: theme.mutedText, fontFamily: theme.numberFontFamily },
    privacyNote: { flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: theme.successSurface, borderRadius: 12, padding: 12, marginTop: 4 },
    privacyText: { flex: 1, fontSize: 12.5, color: theme.mutedText, lineHeight: 18 },
    signOut: { marginTop: 8, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, height: 50, borderRadius: 14, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border },
    signOutText: { fontSize: 16, fontWeight: "700", color: theme.text }
  });
}
