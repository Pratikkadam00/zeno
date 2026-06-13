import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { formatMoney } from "../../src/utils/format";
import { useZenoTheme } from "../../src/theme/theme-provider";
import type { Subscription } from "@subradar/shared";

type DayPanelProps = {
  date: string;
  subscriptions: Subscription[];
  onClose: () => void;
  onNavigateToDetail: (id: string) => void;
  onNavigateToCancel: (id: string) => void;
};

function cycleLabel(value: "weekly" | "monthly" | "quarterly" | "annual" | "trial" | "unknown" | string) {
  if (value === "monthly" || value === "annual") {
    return value[0].toUpperCase() + value.slice(1);
  }
  return value === "trial" ? "Trial" : "Monthly";
}

export function DayPanel({ date, subscriptions, onClose, onNavigateToDetail, onNavigateToCancel }: DayPanelProps) {
  const { theme } = useZenoTheme();
  const panelY = useRef(new Animated.Value(120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const today = new Date(date);
  const items = subscriptions;
  const headerDate = Number.isNaN(today.getTime())
    ? date
    : today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const dayTotal = items.reduce((sum, subscription) => sum + subscription.price.amountMinor / 100, 0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(panelY, {
        toValue: 0,
        useNativeDriver: true,
        duration: 300
      }),
      Animated.timing(opacity, {
        toValue: 0.42,
        useNativeDriver: true,
        duration: 300
      })
    ]).start();
  }, [opacity, panelY]);

  return (
    <>
      <Pressable onPress={onClose} style={styles.backdropWrap}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </Pressable>
      <Animated.View style={[styles.panel, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: panelY }] }]}>
        <Text style={[styles.dateHeader, { color: theme.text }]}>{headerDate}</Text>

        {items.length > 0 ? (
          <>
            {items.map((subscription) => (
              <Pressable key={subscription.id} style={styles.row} onPress={() => onNavigateToDetail(subscription.id)}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.avatarText, { color: theme.onPrimary }]}>{subscription.name.trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.rowMain}>
                  <Text style={[styles.name, { color: theme.text }]}>{subscription.name}</Text>
                  <Text style={[styles.meta, { color: theme.mutedText }]}>{cycleLabel(subscription.billingCycle)}</Text>
                </View>
                <Text style={[styles.amount, { color: theme.text }]}>
                  {formatMoney(subscription.price.amountMinor, subscription.price.currency)}
                </Text>
                <TouchableOpacity onPress={() => onNavigateToCancel(subscription.id)}>
                  <Text style={[styles.cancel, { color: theme.danger }]}>Cancel</Text>
                </TouchableOpacity>
              </Pressable>
            ))}
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <Text style={[styles.footerLabel, { color: theme.mutedText }]}>Total</Text>
              <Text style={[styles.footerValue, { color: theme.text }]}>{formatMoney(Math.round(dayTotal * 100), "USD")}</Text>
            </View>
          </>
        ) : (
          <Text style={[styles.empty, { color: theme.mutedText }]}>No renewals on this day</Text>
        )}
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdropWrap: {
    ...StyleSheet.absoluteFill,
    zIndex: 1
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000000",
    opacity: 0.45
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12
  },
  dateHeader: {
    fontSize: 18,
    fontWeight: "900"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 14,
    fontWeight: "900"
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    gap: 4
  },
  name: {
    fontWeight: "700"
  },
  meta: {
    fontSize: 12
  },
  amount: {
    fontWeight: "900"
  },
  cancel: {
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  footerLabel: {
    fontWeight: "700"
  },
  footerValue: {
    fontWeight: "900"
  },
  empty: {
    textAlign: "center",
    fontSize: 14,
    paddingVertical: 18
  }
});
