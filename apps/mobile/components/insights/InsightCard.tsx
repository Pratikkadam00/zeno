import { router } from "expo-router";
import { useMemo, useRef } from "react";
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { Insight } from "../../src/insights/insightsEngine";
import { useSubRadarTheme } from "../../src/theme/theme-provider";
import type { ThemeTokens } from "../../src/theme/tokens";

type InsightCardProps = {
  insight: Insight;
  onAction: () => void;
  onDismiss: () => void;
};

const typeMeta: Record<Insight["type"], { icon: string }> = {
  unused: { icon: "🕐" },
  duplicate: { icon: "🔄" },
  annual_saving: { icon: "💰" },
  trial_ending: { icon: "⏰" },
  price_spike: { icon: "📈" },
  spend_summary: { icon: "📋" },
  high_spend: { icon: "📊" },
  cancellation_reminder: { icon: "✅" }
};

/** Theme-aware accent color for an insight's left border. */
function insightAccent(type: Insight["type"], theme: ThemeTokens): string {
  switch (type) {
    case "unused":
      return theme.warning;
    case "duplicate":
      return theme.primary;
    case "annual_saving":
      return theme.success;
    case "trial_ending":
    case "price_spike":
      return theme.danger;
    case "high_spend":
      return theme.secondary;
    case "cancellation_reminder":
      return theme.mutedText;
    case "spend_summary":
      return "transparent";
    default:
      return theme.border;
  }
}

export function InsightCard({ insight, onAction, onDismiss }: InsightCardProps) {
  const { theme } = useSubRadarTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(theme, insight), [insight, theme]);
  const meta = typeMeta[insight.type];

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => {
      if (gesture.dx > 0) {
        translateX.setValue(gesture.dx);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > 96) {
        Animated.timing(translateX, {
          toValue: 420,
          duration: 180,
          useNativeDriver: true
        }).start(onDismiss);
        return;
      }
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true
      }).start();
    }
  }), [onDismiss, translateX]);

  function handleAction() {
    onAction();
    if (insight.actionRoute) {
      router.push(insight.actionRoute as never);
    }
  }

  return (
    <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
      <View style={styles.card}>
        {insight.type !== "spend_summary" ? <View style={[styles.leftBorder, { backgroundColor: insightAccent(insight.type, theme) }]} /> : null}
        <View style={styles.headerRow}>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>{meta.icon}</Text>
            <Text style={styles.title}>{formatTitle(insight, theme)}</Text>
          </View>
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.dismissButton}>
            <Text style={styles.dismissText}>×</Text>
          </Pressable>
        </View>

        {insight.type === "duplicate" ? <DuplicateNames insight={insight} theme={theme} /> : null}
        {insight.type === "annual_saving" && insight.savingAmount ? <SavingAmount amount={insight.savingAmount} theme={theme} /> : null}
        {insight.type === "trial_ending" ? <DaysRemaining title={insight.title} theme={theme} /> : null}
        {insight.type === "spend_summary" ? <SummaryStats message={insight.message} theme={theme} /> : null}
        {insight.type === "cancellation_reminder" ? <ProminentDate title={insight.title} theme={theme} /> : null}

        <Text style={styles.message}>{insight.message}</Text>

        {insight.actionLabel ? (
          <Pressable onPress={handleAction} style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}>
            <Text style={styles.actionText}>{insight.actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

function DuplicateNames({ insight, theme }: { insight: Insight; theme: ThemeTokens }) {
  const styles = useMemo(() => createStyles(theme, insight), [insight, theme]);
  const [first, second] = extractDuplicateNames(insight.message);
  if (!first || !second) {
    return null;
  }
  return (
    <View style={styles.duplicateRow}>
      <Text style={styles.duplicatePill} numberOfLines={1}>{first}</Text>
      <Text style={styles.duplicateVs}>vs</Text>
      <Text style={styles.duplicatePill} numberOfLines={1}>{second}</Text>
    </View>
  );
}

function SavingAmount({ amount, theme }: { amount: number; theme: ThemeTokens }) {
  return (
    <Text style={{ color: theme.success, fontSize: 24, lineHeight: 30, fontWeight: "900", marginTop: 10 }}>
      ${amount.toFixed(0)} saved
    </Text>
  );
}

function DaysRemaining({ title, theme }: { title: string; theme: ThemeTokens }) {
  const days = title.match(/\d+/)?.[0] ?? "0";
  return (
    <Text style={{ color: theme.danger, fontSize: 28, lineHeight: 34, fontWeight: "900", marginTop: 8 }}>
      {days} days
    </Text>
  );
}

function ProminentDate({ title, theme }: { title: string; theme: ThemeTokens }) {
  const date = title.split(" until ")[1] ?? "";
  if (!date) {
    return null;
  }
  return (
    <Text style={{ color: theme.mutedText, fontSize: 18, lineHeight: 24, fontWeight: "900", marginTop: 8 }}>
      {date}
    </Text>
  );
}

function SummaryStats({ message, theme }: { message: string; theme: ThemeTokens }) {
  const amount = message.match(/\$\d+(?:\.\d+)?/)?.[0] ?? "$0";
  const count = message.match(/across (\d+)/)?.[1] ?? "0";
  const renewals = message.match(/(\d+) renewals/)?.[1] ?? "0";
  const stats = [
    ["Monthly", amount],
    ["Subs", count],
    ["This week", renewals]
  ];
  return (
    <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
      {stats.map(([label, value]) => (
        <View
          key={label}
          style={{
            flex: 1,
            borderRadius: theme.radius,
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.surfaceAlt,
            padding: 10
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16, fontWeight: "900", fontFamily: theme.numberFontFamily }}>{value}</Text>
          <Text style={{ color: theme.quietText, fontSize: 11, fontWeight: "800", marginTop: 2 }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function formatTitle(insight: Insight, theme: ThemeTokens): string {
  if (theme.id === "genz" && insight.type === "unused") {
    return `⚠️ ${insight.title}`;
  }
  return insight.title;
}

function extractDuplicateNames(message: string): [string | null, string | null] {
  const match = message.match(/both (.+?) \(\$.*?\) and (.+?) \(\$/);
  return [match?.[1] ?? null, match?.[2] ?? null];
}

function withOpacity(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length !== 7) {
    return hex;
  }
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function createStyles(theme: ThemeTokens, insight: Insight) {
  const compact = theme.id === "genx";
  const borderColor = insightAccent(insight.type, theme);
  return StyleSheet.create({
    card: {
      borderRadius: insight.type === "spend_summary" ? theme.cardRadius : Math.max(theme.cardRadius, compact ? 4 : 12),
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      padding: compact ? 12 : 14,
      paddingLeft: insight.type === "spend_summary" ? 14 : compact ? 16 : 18,
      overflow: "hidden",
      shadowColor: "#020617",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: theme.shadows ? 0.1 : 0,
      shadowRadius: 16,
      elevation: theme.shadows ? 3 : 0
    },
    leftBorder: {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: compact ? 4 : 5,
      backgroundColor: borderColor
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 12
    },
    titleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8
    },
    icon: {
      fontSize: compact ? 16 : 18,
      lineHeight: 22
    },
    title: {
      flex: 1,
      color: theme.id === "genz" && insight.type === "unused" ? theme.primary : theme.text,
      fontSize: 15,
      lineHeight: 20,
      fontWeight: "900"
    },
    dismissButton: {
      width: 24,
      height: 24,
      alignItems: "center",
      justifyContent: "center"
    },
    dismissText: {
      color: theme.quietText,
      fontSize: 20,
      lineHeight: 22,
      fontWeight: "700"
    },
    message: {
      color: theme.mutedText,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
      marginTop: 9
    },
    actionButton: {
      alignSelf: "flex-start",
      minHeight: 34,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: withOpacity(theme.primary, 0.45),
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12
    },
    actionText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: "900"
    },
    pressed: {
      opacity: 0.72
    },
    duplicateRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10
    },
    duplicatePill: {
      flex: 1,
      borderRadius: 999,
      backgroundColor: withOpacity(theme.primary, 0.1),
      color: theme.text,
      paddingHorizontal: 10,
      paddingVertical: 7,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
      overflow: "hidden"
    },
    duplicateVs: {
      color: theme.quietText,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    }
  });
}

