import { useEffect, useState, type ReactNode } from "react";
import { ScrollView, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import * as SecureStore from "expo-secure-store";
import { Button, CodeBoxes } from "../src/components/zeno";
import { fonts } from "../src/theme/zeno";
import { createHousehold, getHousehold, joinHousehold, leaveHousehold, setMemberSpend, type ApiFailureReason, type Household } from "../src/api/client";
import { useAuthStore } from "../src/auth/authStore";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { formatMoney } from "../src/utils/format";
import { useZenoTheme } from "../src/theme/theme-provider";

const HOUSEHOLD_KEY = "zeno.family.householdId";

// Turn a failure reason into an honest, action-specific message — so a network
// drop no longer reads as "no household found for that code" (P4.6 / §7).
function messageForReason(reason: ApiFailureReason, action: "create" | "join"): string {
  switch (reason) {
    case "offline":
      return "You're offline. Check your connection and try again.";
    case "auth":
      return "Please sign in again to manage your household.";
    case "not_found":
      return action === "join" ? "No household found for that code." : "That household no longer exists.";
    case "server":
      return action === "create"
        ? "Couldn't create a household right now. Please try again."
        : "Couldn't join right now. Please try again.";
  }
}

/**
 * A block of the household page: paper, hairline rule frame, no resting shadow.
 * Local so this screen no longer depends on the legacy src/components/ui kit.
 */
function Surface({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useZenoTheme();
  return (
    <View style={[{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.rule, borderRadius: 12, padding: 16, marginHorizontal: 20, marginTop: 12 }, style]}>
      {children}
    </View>
  );
}

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
        const result = await getHousehold(id);
        if (active && result.ok) {
          setHousehold(result.data);
        } else if (result.ok === false && result.reason === "not_found") {
          // The household was disbanded server-side — drop the stale local pointer
          // so we don't keep trying to restore a household that no longer exists.
          void SecureStore.deleteItemAsync(HOUSEHOLD_KEY).catch(() => undefined);
        }
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
      .then((result) => { if (result.ok) void persist(result.data); else setError(messageForReason(result.reason, "create")); })
      .finally(() => setBusy(false));
  };

  const onJoin = () => {
    if (code.trim().length < 4) { setError("Enter the 8-character code."); return; }
    setBusy(true); setError(null);
    void joinHousehold(code.trim(), memberId, memberName, totalMonthlyMinor, homeCurrency)
      .then((result) => { if (result.ok) void persist(result.data); else setError(messageForReason(result.reason, "join")); })
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
    // Best-effort re-push of this member's total; a failure just leaves the
    // last-known combined view in place until the next change (no user-facing error).
    void setMemberSpend(household.id, totalMonthlyMinor, homeCurrency).then((result) => {
      if (result.ok) setHousehold(result.data);
    });
    // household.id (not the whole object) is the dependency — setHousehold
    // above changes the object reference but not its id, so this doesn't loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id, totalMonthlyMinor, homeCurrency]);

  const combined = household ? household.members.reduce((sum, m) => sum + m.monthlySpendMinor, 0) : 0;
  const allSameCurrency = household ? household.members.every((m) => m.currency === household.members[0]?.currency) : true;

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
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
              <Text style={{ fontFamily: fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.8, color: theme.quietText, marginBottom: 10 }}>SHARE CODE</Text>
              {/* mono boxes — a code you read out loud, not a run-on string */}
              <CodeBoxes code={household.shareCode} length={household.shareCode.length || 8} />
              <Text style={{ color: theme.mutedText, marginTop: 10, textAlign: "center" }}>Anyone with this code can join your household.</Text>
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

            <Button variant="danger" size="lg" fullWidth onPress={onLeave}>Leave household</Button>
          </>
        ) : (
          <>
            <Surface>
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>Start a household</Text>
              <Text style={{ color: theme.mutedText, marginTop: 6, marginBottom: 12 }}>Create one and share the code with your family.</Text>
              <Button variant="primary" size="lg" fullWidth onPress={onCreate}>{busy ? "Working…" : "Create household"}</Button>
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
              <Button variant="primary" size="lg" fullWidth onPress={onJoin}>{busy ? "Working…" : "Join household"}</Button>
            </Surface>
          </>
        )}

        {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
      </ScrollView>
    </View>
  );
}
