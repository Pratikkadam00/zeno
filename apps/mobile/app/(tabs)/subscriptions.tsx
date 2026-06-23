import { monthlyAmount, type Subscription, type SubscriptionStatus } from "@zeno/shared";
import { router } from "expo-router";
import { Inbox, Plus, Search } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Badge,
  Button,
  Card,
  IconButton,
  Input,
  ListRow,
  ServiceAvatar,
  type BadgeTone
} from "../../src/components/zeno";
import { useSubscriptionStore } from "../../src/data/subscription-store";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { formatShortDate } from "../../src/utils/subscription-ui";

const money = (minor: number) => `$${(minor / 100).toFixed(2)}`;

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

export default function SubscriptionsScreen() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const { subscriptions } = useSubscriptionStore();
  const [filter, setFilter] = useState<FilterKey>("All");
  const [query, setQuery] = useState("");

  const billing = subscriptions.filter((s) => s.status === "active" || s.status === "trial");
  const totalMinor = billing.reduce((sum, s) => sum + monthlyAmount(s), 0);

  const active = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  let list = subscriptions.filter(active.match);
  if (query.trim()) {
    list = list.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  }

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
          {billing.length} billing ·{" "}
          <Text style={{ fontFamily: t.fonts.mono.semibold, color: c.textSecondary }}>{money(totalMinor)}/mo</Text>
        </Text>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Input
          leftIcon={<Search size={18} color={c.textTertiary} strokeWidth={2} />}
          placeholder="Search subscriptions"
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
              <View
                key={f.key}
                onTouchEnd={() => setFilter(f.key)}
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
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 + insets.bottom }}>
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
          <Card padding="none">
            {list.map((s, i) => {
              const badge = statusBadge(s.status);
              const dimmed = s.status === "paused" || s.status === "cancelled";
              const sub =
                s.status === "active" || s.status === "trial"
                  ? formatShortDate(s.nextRenewalDate, "—")
                  : s.status === "paused"
                    ? "Paused"
                    : "";
              return (
                <ListRow
                  key={s.id}
                  divider={i < list.length - 1}
                  leading={<ServiceAvatar name={s.name} />}
                  title={s.name}
                  onPress={() => router.push(`/subscription/${s.id}`)}
                  style={dimmed ? { opacity: 0.6 } : undefined}
                  trailing={
                    <View style={{ alignItems: "flex-end", rowGap: 3 }}>
                      <Badge tone={badge.tone} dot={badge.dot}>
                        {badge.label}
                      </Badge>
                      <Text style={{ fontFamily: t.fonts.mono.bold, fontSize: t.fontSize.body, color: c.textPrimary }}>
                        {money(s.price.amountMinor)}
                      </Text>
                      {sub ? (
                        <Text style={{ fontFamily: t.fonts.sans.regular, fontSize: t.fontSize.micro, color: c.textTertiary }}>{sub}</Text>
                      ) : null}
                    </View>
                  }
                />
              );
            })}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
