import { monthlyAmount, type Subscription } from "@subradar/shared";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { G, Path, Rect, Text as SvgText } from "react-native-svg";
import { useSubRadarTheme } from "../../src/theme/theme-provider";

type SpendChartProps = {
  subscriptions: Subscription[];
};

type CategorySpend = {
  category: string;
  label: string;
  amount: number;
  color: string;
};

const categoryColors: Record<string, string> = {
  streaming: "#EF4444",
  ai_tools: "#8B5CF6",
  productivity: "#3B82F6",
  gaming: "#10B981",
  health: "#F59E0B",
  education: "#06B6D4",
  music: "#EC4899",
  other: "#6B7280"
};

export function SpendChart({ subscriptions }: SpendChartProps) {
  const { theme } = useSubRadarTheme();
  const categorySpend = useMemo(() => calculateCategorySpend(subscriptions), [subscriptions]);
  const total = categorySpend.reduce((sum, item) => sum + item.amount, 0);
  const trend = useMemo(() => calculateMonthlyTrend(subscriptions), [subscriptions]);
  const maxTrend = Math.max(...trend.map((month) => month.amount), 1);

  return (
    <View style={[styles.container, { borderColor: theme.border, backgroundColor: theme.card, borderRadius: theme.cardRadius }]}>
      <View style={styles.donutWrap}>
        <Svg width={190} height={190} viewBox="0 0 190 190">
          <G x={95} y={95}>
            {categorySpend.length === 0 ? (
              <Path d={describeArc(0, 0, 80, 0, 359.99)} stroke={theme.border} strokeWidth={30} fill="none" />
            ) : renderSlices(categorySpend, total)}
            <SvgText x={0} y={-4} textAnchor="middle" fill={theme.text} fontSize="18" fontWeight="800">
              {formatMoney(total)}
            </SvgText>
            <SvgText x={0} y={17} textAnchor="middle" fill={theme.mutedText} fontSize="11" fontWeight="700">
              per month
            </SvgText>
          </G>
        </Svg>
      </View>

      <View style={styles.legend}>
        {categorySpend.map((item) => {
          const percent = total > 0 ? Math.round((item.amount / total) * 100) : 0;
          return (
            <View key={item.category} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={[styles.legendName, { color: theme.text }]}>{item.label}</Text>
              <Text style={[styles.legendValue, { color: theme.mutedText }]}>{formatMoney(item.amount)} · {percent}%</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <Text style={[styles.chartTitle, { color: theme.text }]}>Monthly trend</Text>
      <Svg width="100%" height={150} viewBox="0 0 330 150">
        {trend.map((month, index) => {
          const barWidth = 34;
          const gap = 20;
          const x = 16 + index * (barWidth + gap);
          const height = Math.max(8, (month.amount / maxTrend) * 82);
          const y = 104 - height;
          const isCurrent = index === trend.length - 1;
          return (
            <G key={month.label}>
              <SvgText x={x + barWidth / 2} y={y - 8} textAnchor="middle" fill={theme.mutedText} fontSize="10" fontWeight="700">
                {formatMoney(month.amount, true)}
              </SvgText>
              <Rect x={x} y={y} width={barWidth} height={height} rx={8} fill={isCurrent ? theme.primary : withOpacity(theme.quietText, 0.34)} />
              <SvgText x={x + barWidth / 2} y={132} textAnchor="middle" fill={theme.quietText} fontSize="10" fontWeight="800">
                {month.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

function calculateCategorySpend(subscriptions: Subscription[]): CategorySpend[] {
  const totals = new Map<string, number>();
  for (const subscription of subscriptions.filter((item) => item.status === "active" || item.status === "trial")) {
    const category = normalizeCategory(subscription.category);
    totals.set(category, (totals.get(category) ?? 0) + monthlyAmount(subscription) / 100);
  }

  return [...totals.entries()]
    .map(([category, amount]) => ({
      category,
      label: labelCategory(category),
      amount: Math.round(amount * 100) / 100,
      color: categoryColors[category] ?? categoryColors.other
    }))
    .sort((a, b) => b.amount - a.amount);
}

function calculateMonthlyTrend(subscriptions: Subscription[]): Array<{ label: string; amount: number }> {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0, 23, 59, 59, 999);
    const amount = subscriptions
      .filter((subscription) => Date.parse(subscription.createdAt) <= monthEnd.getTime())
      .filter((subscription) => !subscription.deletedAt || Date.parse(subscription.deletedAt) > month.getTime())
      .filter((subscription) => subscription.status !== "cancelled" || (subscription.nextRenewalDate && Date.parse(subscription.nextRenewalDate) >= month.getTime()))
      .reduce((sum, subscription) => sum + monthlyAmount(subscription) / 100, 0);
    return {
      label: month.toLocaleDateString(undefined, { month: "short" }),
      amount: Math.round(amount * 100) / 100
    };
  });
}

function renderSlices(categorySpend: CategorySpend[], total: number) {
  let cursor = 0;
  return categorySpend.map((item) => {
    const degrees = total > 0 ? (item.amount / total) * 360 : 0;
    const start = cursor;
    const end = Math.min(cursor + degrees, 359.99);
    cursor = end;
    return (
      <Path
        key={item.category}
        d={describeArc(0, 0, 65, start, end)}
        stroke={item.color}
        strokeWidth={30}
        strokeLinecap="butt"
        fill="none"
      />
    );
  });
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number): { x: number; y: number } {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians)
  };
}

function normalizeCategory(category: string): string {
  if (category === "entertainment" || category === "family") {
    return "streaming";
  }
  if (category === "developer_tools") {
    return "productivity";
  }
  if (category in categoryColors) {
    return category;
  }
  return "other";
}

function labelCategory(category: string): string {
  return category.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatMoney(value: number, compact = false): string {
  if (compact && value >= 1000) {
    return `$${Math.round(value / 100) / 10}k`;
  }
  return `$${value.toFixed(value % 1 === 0 ? 0 : 2)}`;
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

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    padding: 16,
    gap: 14
  },
  donutWrap: {
    alignItems: "center"
  },
  legend: {
    gap: 9
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 5
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "800"
  },
  legendValue: {
    fontSize: 12,
    fontWeight: "700"
  },
  divider: {
    height: 1
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "900"
  }
});
