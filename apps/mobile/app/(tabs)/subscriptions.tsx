import { monthlyAmount, monthlyAmountIn, type Subscription, type SubscriptionStatus } from "@zeno/shared";
import { router } from "expo-router";
import { Plus, Search } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  ColumnHeads,
  IconButton,
  Input,
  ListRow,
  Masthead,
  ServiceAvatar,
  Stamp,
  type BadgeTone
} from "../../src/components/zeno";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { formatMoney } from "../../src/utils/format";
import { categoryLabel, formatShortDate } from "../../src/utils/subscription-ui";

type FilterKey = "All" | "Active" | "Paused" | "Pending" | "Cancelled";
const FILTERS: { key: FilterKey; match: (s: Subscription) => boolean }[] = [
  { key: "All", match: () => true },
  { key: "Active", match: (s) => s.status === "active" || s.status === "trial" },
  { key: "Paused", match: (s) => s.status === "paused" },
  // Pending verification + "still being charged" (the cancellation lifecycle).
  { key: "Pending", match: (s) => s.status === "pending" || s.status === "attention" },
  { key: "Cancelled", match: (s) => s.status === "cancelled" }
];

const EMPTY_COPY: Record<FilterKey, [string, string]> = {
  All: ["Nothing tracked yet", "Run a scan or add a subscription to get started."],
  Active: ["No active subscriptions", "Anything currently billing will show here."],
  Paused: ["Nothing paused", "Pause a subscription to keep it without tracking renewals."],
  Pending: ["Nothing pending", "Cancellations waiting to be verified appear here."],
  Cancelled: ["Nothing cancelled yet", "Subscriptions you've verified-cancelled live here."]
};

function statusBadge(status: SubscriptionStatus): { tone: BadgeTone; label: string; dot: boolean } {
  switch (status) {
    case "active":
      return { tone: "success", label: "Active", dot: true };
    case "trial":
      return { tone: "warning", label: "Free trial", dot: true };
    case "paused":
      return { tone: "neutral", label: "Paused", dot: true };
    case "pending":
      return { tone: "info", label: "Pending verification", dot: false };
    case "attention":
      return { tone: "danger", label: "Still charging", dot: false };
    case "cancelled":
      return { tone: "neutral", label: "Verified cancelled", dot: false };
    default:
      return { tone: "neutral", label: "Unknown", dot: false };
  }
}

// Memoized row (P4.3): with a stable subscription identity (the store memoizes
// its display list), a stable onPress, and a stable isLast, an unchanged row
// skips re-rendering when the screen re-renders for unrelated reasons (typing in
// search, a filter-chip tap). All per-row derivation lives here.
const SubscriptionRow = memo(function SubscriptionRow({
  subscription,
  isLast,
  onPress
}: {
  subscription: Subscription;
  isLast: boolean;
  onPress: (id: string) => void;
}) {
  const t = useZenoTokens();
  const c = t.color;
  const badge = statusBadge(subscription.status);
  const dimmed = subscription.status === "paused" || subscription.status === "cancelled";
  const money = formatMoney(subscription.price.amountMinor, subscription.price.currency);
  // A verified cancellation carries a mini STAMP — the proof-of-work page.
  // A still-charging entry states the amount in alert ink instead.
  const trailing =
    subscription.status === "cancelled" ? (
      <Stamp size="sm" angle={-4}>
        Verified
      </Stamp>
    ) : subscription.status === "attention" ? (
      <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 12, color: c.stampAlert }}>{money} !</Text>
    ) : (
      <View style={{ alignItems: "flex-end" }}>
        <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 14.5, color: c.textPrimary }}>{money}</Text>
        <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 9.5, letterSpacing: 0.6, color: c.textTertiary, marginTop: 1 }}>
          {subscription.status === "paused" ? "PAUSED" : formatShortDate(subscription.nextRenewalDate, "—").toUpperCase()}
        </Text>
      </View>
    );
  return (
    <ListRow
      divider={!isLast}
      leading={<ServiceAvatar name={subscription.name} style={dimmed ? { opacity: 0.45 } : undefined} />}
      title={subscription.name}
      subtitle={subscription.status === "active" ? categoryLabel(subscription.category).toUpperCase() : badge.label}
      onPress={() => onPress(subscription.id)}
      style={dimmed ? { opacity: 0.6 } : undefined}
      trailing={trailing}
    />
  );
});

export default function SubscriptionsScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions, homeCurrency, fx } = useSubscriptionStore();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [query, setQuery] = useState("");
  // The Input stays bound to `query` for a responsive field; the filtering uses a
  // debounced copy so we don't re-filter + re-render the list on every keystroke
  // (P4.3). Only the trailing value after 200ms of idle drives the list.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Aggregate total (summed across all billing subscriptions) — shown in the
  // home-currency setting, converted via fx when a rate table is available. The
  // per-item row uses formatMoney with that subscription's own stored currency.
  const money = (minor: number) => formatMoney(minor, homeCurrency);

  const { billingCount, totalMinor } = useMemo(() => {
    const billing = subscriptions.filter((s) => s.status === "active" || s.status === "trial");
    const total = billing.reduce((sum, s) => {
      const amount = fx ? monthlyAmountIn(s, fx.homeCurrency, fx.rates) : monthlyAmount(s);
      return amount === null ? sum : sum + amount;
    }, 0);
    return { billingCount: billing.length, totalMinor: total };
  }, [subscriptions, fx]);

  const list = useMemo(() => {
    const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
    const base = subscriptions.filter(active.match);
    const q = debouncedQuery.trim().toLowerCase();
    return q ? base.filter((s) => s.name.toLowerCase().includes(q)) : base;
  }, [subscriptions, filter, debouncedQuery]);

  const handleRowPress = useCallback((id: string) => router.push(`/subscription/${id}`), []);

  const empty = EMPTY_COPY[filter];

  return (
    <View style={{ flex: 1, backgroundColor: c.bgApp, paddingTop: insets.top }}>
      {/* Masthead — the kicker states the ledger's standing balance. */}
      <Masthead
        kicker={`${billingCount} BILLING · ${money(totalMinor)}/MO`}
        title="Subscriptions"
        rule={false}
        right={
          <IconButton variant="secondary" label="Add subscription" onPress={() => router.push("/subscription/add")}>
            <Plus size={20} color={c.textPrimary} strokeWidth={2} />
          </IconButton>
        }
      />

      {/* Search */}
      <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
        <Input
          leftIcon={<Search size={17} color={c.textTertiary} strokeWidth={2} />}
          placeholder="Search the ledger"
          accessibilityLabel="Search the ledger"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Text-tab filters — caps-mono with an underline tick, sitting on the
          page's column rule. Deliberately NOT pill chips (the DS slop audit). */}
      <View style={{ borderBottomWidth: 1, borderColor: c.ruleStrong }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, columnGap: 14 }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const count = subscriptions.filter(f.match).length;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${f.key}, ${count}`}
                onPress={() => setFilter(f.key)}
                style={{ flexDirection: "row", alignItems: "baseline", columnGap: 5, paddingTop: 4, paddingBottom: 9 }}
              >
                <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.3, textTransform: "uppercase", color: on ? c.textPrimary : c.textTertiary }}>
                  {f.key}
                </Text>
                <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: 9, color: on ? c.accentText : c.textDisabled }}>{count}</Text>
                {/* the underline tick that marks the open page */}
                <View style={{ position: "absolute", left: 0, right: 0, bottom: -1, height: 2.5, backgroundColor: on ? c.accent : "transparent" }} />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* List — virtualized (P4.3). The rounded surface + hairline border
          replicate the Card="none" chrome the rows used to sit inside, while the
          FlatList windows rows for a long (paid) portfolio and skips re-rendering
          unchanged rows. */}
      {list.length === 0 ? (
        // An empty filter is an empty page, stated plainly and left-aligned.
        <View style={{ paddingVertical: 56, paddingHorizontal: 32 }}>
          <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: 10, letterSpacing: 1.8, color: c.textTertiary, marginBottom: 8 }}>EMPTY PAGE</Text>
          <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 20, color: c.textPrimary, marginBottom: 5 }}>{empty[0]}</Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: 13.5, color: c.textSecondary, lineHeight: 20 }}>{empty[1]}</Text>
          {filter === "All" ? (
            <Button variant="secondary" onPress={() => router.push("/subscription/add")} style={{ marginTop: 18 }}>
              Add a subscription
            </Button>
          ) : null}
        </View>
      ) : (
        // Rows sit on the paper under real table column heads — no card box.
        // Virtualization and the memoized row (P4.3) are unchanged.
        <View style={{ flex: 1 }}>
          <ColumnHeads left="SERVICE" right="AMOUNT / NEXT" style={{ marginTop: 14, marginHorizontal: 6 }} />
          <FlatList
            data={list}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <SubscriptionRow subscription={item} isLast={index === list.length - 1} onPress={handleRowPress} />
            )}
            showsVerticalScrollIndicator={false}
            style={{ paddingHorizontal: 6 }}
            contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
            initialNumToRender={12}
            windowSize={11}
            removeClippedSubviews
          />
        </View>
      )}
    </View>
  );
}
