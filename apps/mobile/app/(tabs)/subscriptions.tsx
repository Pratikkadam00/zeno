import { monthlyAmount, monthlyAmountIn, type Subscription, type SubscriptionStatus } from "@zeno/shared";
import { router } from "expo-router";
import { Inbox, Plus, Search } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  IconButton,
  Input,
  ListRow,
  ServiceAvatar,
  type BadgeTone
} from "../../src/components/zeno";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { formatMoney } from "../../src/utils/format";
import { formatShortDate } from "../../src/utils/subscription-ui";

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
  const sub =
    subscription.status === "active" || subscription.status === "trial"
      ? formatShortDate(subscription.nextRenewalDate, "—")
      : subscription.status === "paused"
        ? "Paused"
        : "";
  return (
    <ListRow
      divider={!isLast}
      leading={<ServiceAvatar name={subscription.name} />}
      title={subscription.name}
      onPress={() => onPress(subscription.id)}
      style={dimmed ? { opacity: 0.6 } : undefined}
      trailing={
        <View style={{ alignItems: "flex-end", rowGap: 3 }}>
          <Badge tone={badge.tone} dot={badge.dot}>
            {badge.label}
          </Badge>
          <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: t.fontSize.body, color: c.textPrimary }}>
            {formatMoney(subscription.price.amountMinor, subscription.price.currency)}
          </Text>
          {sub ? (
            <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.micro, color: c.textTertiary }}>{sub}</Text>
          ) : null}
        </View>
      }
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
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: t.fonts.display.bold, fontSize: 30, letterSpacing: 30 * t.letterSpacing.tight, color: c.textPrimary }}>
          Subscriptions
        </Text>
        <IconButton variant="secondary" label="Add subscription" onPress={() => router.push("/subscription/add")}>
          <Plus size={20} color={c.textPrimary} strokeWidth={2} />
        </IconButton>
      </View>

      {/* Billing total */}
      <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
        <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: t.fontSize.bodySm, color: c.textTertiary }}>
          {billingCount} billing ·{" "}
          <Text style={{ fontFamily: t.fonts.mono.semibold, color: c.textSecondary }}>{money(totalMinor)}/mo</Text>
        </Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Input
          leftIcon={<Search size={18} color={c.textTertiary} strokeWidth={2} />}
          placeholder="Search subscriptions"
          accessibilityLabel="Search subscriptions"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {/* Filter chips */}
      <View style={{ paddingBottom: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, columnGap: 7 }}>
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const count = subscriptions.filter(f.match).length;
            return (
              <Pressable
                key={f.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Filter: ${f.key}`}
                onPress={() => setFilter(f.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  columnGap: 6,
                  height: 32,
                  paddingHorizontal: 13,
                  borderRadius: t.radius.pill,
                  borderWidth: 1,
                  borderColor: on ? "transparent" : c.borderDefault,
                  backgroundColor: on ? c.surfaceInverse : "transparent"
                }}
              >
                <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.bodySm, color: on ? c.textInverse : c.textSecondary }}>
                  {f.key}
                </Text>
                <Text style={{ fontFamily: t.fonts.mono.regular, fontSize: t.fontSize.micro, color: on ? c.textInverse : c.textTertiary, opacity: 0.7 }}>
                  {count}
                </Text>
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
        <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 30, rowGap: 4 }}>
          <Inbox size={30} color={c.textTertiary} strokeWidth={2} />
          <Text style={{ fontFamily: t.fonts.sans.semibold, fontSize: t.fontSize.body, color: c.textSecondary, marginTop: 8 }}>{empty[0]}</Text>
          <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.bodySm, color: c.textTertiary, textAlign: "center" }}>{empty[1]}</Text>
          {filter === "All" ? (
            <Button variant="secondary" onPress={() => router.push("/subscription/add")} style={{ marginTop: 16 }}>
              Add a subscription
            </Button>
          ) : null}
        </View>
      ) : (
        <View
          style={{
            flex: 1,
            marginHorizontal: 16,
            backgroundColor: c.surfaceCard,
            borderWidth: 1,
            borderColor: c.borderSubtle,
            borderRadius: t.radius.lg,
            overflow: "hidden"
          }}
        >
          <FlatList
            data={list}
            keyExtractor={(s) => s.id}
            renderItem={({ item, index }) => (
              <SubscriptionRow subscription={item} isLast={index === list.length - 1} onPress={handleRowPress} />
            )}
            showsVerticalScrollIndicator={false}
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
