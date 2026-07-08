import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { PrimaryButton, Screen, Surface } from "../src/components/ui";
import { createHousehold, getHousehold, joinHousehold, leaveHousehold, setMemberSpend, type Household } from "../src/api/client";
import { useAuthStore } from "../src/auth/authStore";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

const HOUSEHOLD_KEY = "zeno.family.householdId";

export default function FamilyScreen() {
  const { theme } = useZenoTheme();
  const accountId = useAuthStore((state) => state.accountId);
  const { totalMonthlyMinor, homeCurrency } = useSubscriptionStore();

  const memberId = accountId ?? "device-member";
  const memberName = accountId ? (accountId.split("@")[0] ?? accountId) : "You";

  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      const id = await SecureStore.getItemAsync(HOUSEHOLD_KEY).catch(() => null);
      if (id) {
        const existing = await getHousehold(id);
        if (active && existing) setHousehold(existing);
      }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const persist = async (next: Household) => {
    setHousehold(next);
    await SecureStore.setItemAsync(HOUSEHOLD_KEY, next.id).catch(() => undefined);
  };

  const onCreate = () => {
    setBusy(true); setError(null);
    void createHousehold(memberId, memberName, totalMonthlyMinor, homeCurrency)
      .then((next) => { if (next) void persist(next); else setError("Couldn't create a household. Is the server running?"); })
      .finally(() => setBusy(false));
  };

  const onJoin = () => {
    if (code.trim().length < 4) { setError("Enter the 8-character code."); return; }
    setBusy(true); setError(null);
    void joinHousehold(code.trim(), memberId, memberName, totalMonthlyMinor, homeCurrency)
      .then((next) => { if (next) void persist(next); else setError("No household found for that code."); })
      .finally(() => setBusy(false));
  };

  const onLeave = () => {
    const householdId = household?.id;
    // Clear local state immediately so leaving feels instant; the server call to
    // actually remove the member (so other members stop seeing them/their spend)
    // is fire-and-forget best-effort — a network failure shouldn't block leaving.
    void SecureStore.deleteItemAsync(HOUSEHOLD_KEY).catch(() => undefined);
    setHousehold(null);
    setCode("");
    if (householdId) void leaveHousehold(householdId);
  };

  // The server's /spend route existed but was never called after the initial
  // create/join — a member's monthlySpendMinor (and currency) went stale the
  // moment their own subscriptions or home-currency setting changed. Re-push on
  // every value change (and once per app open, since household.id becoming
  // defined after the initial load also triggers this).
  useEffect(() => {
    if (!household) {
      return;
    }
    void setMemberSpend(household.id, totalMonthlyMinor, homeCurrency).then((updated) => {
      if (updated) setHousehold(updated);
    });
    // household.id (not the whole object) is the dependency — setHousehold
    // above changes the object reference but not its id, so this doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, totalMonthlyMinor, homeCurrency]);

  const combined = household ? household.members.reduce((sum, m) => sum + m.monthlySpendMinor, 0) : 0;
  const allSameCurrency = household ? household.members.every((m) => m.currency === household.members[0]?.currency) : true;

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <View>
          <Text style={{ color: theme.text, fontSize: 30, lineHeight: 36, fontWeight: "900" }}>Family</Text>
          <Text style={{ color: theme.mutedText, marginTop: 6, fontSize: 16, lineHeight: 22 }}>
            Share a household view of subscriptions. Each member shares only their monthly total — never their individual subscriptions.
          </Text>
        </View>

        {loading ? (
          <Surface><Text style={{ color: theme.mutedText }}>Loading…</Text></Surface>
        ) : household ? (
          <>
            <Surface>
              <Text style={{ color: theme.mutedText, fontSize: 13 }}>Share code</Text>
              <Text style={{ color: theme.text, fontSize: 28, fontWeight: "900", letterSpacing: 4, marginTop: 4 }}>{household.shareCode}</Text>
              <Text style={{ color: theme.mutedText, marginTop: 6 }}>Anyone with this code can join your household.</Text>
            </Surface>

            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800", marginBottom: 10 }}>
                {household.members.length} member{household.members.length === 1 ? "" : "s"}
                {allSameCurrency
                  ? ` · ${formatMoney(combined, household.members[0]?.currency ?? homeCurrency)}/mo combined`
                  : " · mixed currencies — see below"}
              </Text>
              <View style={{ gap: 10 }}>
                {household.members.map((m) => (
                  <View key={m.id} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ color: theme.text }}>{m.name}{m.id === household.ownerId ? "  ·  owner" : ""}</Text>
                    <Text style={{ color: theme.mutedText, fontVariant: ["tabular-nums"] }}>{formatMoney(m.monthlySpendMinor, m.currency)}/mo</Text>
                  </View>
                ))}
              </View>
            </Surface>

            <PrimaryButton onPress={onLeave}>Leave household</PrimaryButton>
          </>
        ) : (
          <>
            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Start a household</Text>
              <Text style={{ color: theme.mutedText, marginTop: 6, marginBottom: 12 }}>Create one and share the code with your family.</Text>
              <PrimaryButton onPress={onCreate}>{busy ? "Working…" : "Create household"}</PrimaryButton>
            </Surface>

            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Join with a code</Text>
              <TextInput
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
                autoCapitalize="characters"
                placeholder="ABC12XYZ"
                placeholderTextColor={theme.mutedText}
                maxLength={8}
                accessibilityLabel="Household share code"
                style={{ marginTop: 10, marginBottom: 12, borderWidth: 1, borderColor: theme.border, borderRadius: theme.radius, paddingHorizontal: 14, paddingVertical: 12, color: theme.text, fontSize: 18, letterSpacing: 3 }}
              />
              <PrimaryButton onPress={onJoin}>{busy ? "Working…" : "Join household"}</PrimaryButton>
            </Surface>
          </>
        )}

        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      </ScrollView>
    </Screen>
  );
}
