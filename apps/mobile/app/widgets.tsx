import { ScrollView, Text, View } from "react-native";
import { LedgerLine, SectionHead, Stamp } from "../src/components/zeno";
import { useSubscriptionStore } from "../src/data/subscription-store";
import { useZenoTheme } from "../src/theme/theme-provider";
import { fonts } from "../src/theme/zeno";
import { formatDaysLabel } from "../src/utils/subscription-ui";

export default function WidgetsScreen() {
  const { theme } = useZenoTheme();
  const { widgetSnapshot } = useSubscriptionStore();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={{ fontFamily: fonts.mono.bold, fontSize: 10.5, letterSpacing: 1.8, color: theme.quietText }}>AT A GLANCE</Text>
          <Text style={{ fontFamily: fonts.display.bold, fontSize: 30, lineHeight: 34, letterSpacing: -0.8, color: theme.text, marginTop: 6 }}>
            Widgets + Watch
          </Text>
          <Text style={{ fontFamily: fonts.sans.regular, fontSize: 15, color: theme.mutedText, marginTop: 6, lineHeight: 22 }}>
            A compact local snapshot for Android widgets, iOS widgets, and Apple Watch complications.
          </Text>
        </View>

        {/* The "not shipped yet" status is stated as a stamp, and the meaning of
            the original notice is preserved word for word underneath. */}
        <View style={{ paddingHorizontal: 20, paddingTop: 18 }}>
          <Stamp tone="neutral" size="sm" angle={-3}>
            Preview only
          </Stamp>
          <Text style={{ fontFamily: fonts.sans.regular, fontSize: 13, color: theme.mutedText, marginTop: 12, lineHeight: 20 }}>
            This shows the data a home-screen widget or watch complication would display. Actually adding a Zeno widget to
            your home screen or watch face isn&apos;t available yet — we&apos;ll let you know when it ships.
          </Text>
        </View>

        <SectionHead>What it would show</SectionHead>
        <View style={{ paddingHorizontal: 20 }}>
          <LedgerLine
            label="Next renewal"
            value={
              widgetSnapshot.nextRenewal
                ? `${widgetSnapshot.nextRenewal.name} · ${widgetSnapshot.nextRenewal.amountLabel}`
                : "None"
            }
            {...(widgetSnapshot.nextRenewal ? { sub: formatDaysLabel(widgetSnapshot.nextRenewal.daysUntil).toUpperCase() } : {})}
          />
          <LedgerLine label="Complication" value={widgetSnapshot.watchComplicationText} />
          <LedgerLine
            label="Monthly glance"
            sub={`${widgetSnapshot.activeCount} ACTIVE`}
            value={widgetSnapshot.monthlySpendLabel}
            strong
          />
        </View>
      </ScrollView>
    </View>
  );
}
