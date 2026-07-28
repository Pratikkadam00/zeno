import { Tabs } from "expo-router";
import { BookOpen, CalendarDays, ChartNoAxesColumn, Layers, Plus } from "lucide-react-native";
import { useEffect, type ComponentType } from "react";
import { Pressable, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useZenoTokens } from "../../src/theme/useZenoTokens";
import { useReducedMotion } from "../../src/theme/motion";
import { haptics } from "../../src/theme/haptics";

/* Shared chrome — ledger language: a paper tab bar under a hairline rule, the
   active tab marked by an OVERLINE TICK (the ledger index tab), and an ink-seal
   center action. Ported from Zeno Design System/ui_kits/app/Chrome.jsx. */

type IconProps = { color: string; size: number; strokeWidth: number };

/** Tab item: the green index tick grows in above a settling icon. */
function TabIcon({ Icon, focused }: { Icon: ComponentType<IconProps>; focused: boolean }) {
  const t = useZenoTokens();
  const c = t.color;
  const reduced = useReducedMotion();
  const grow = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    grow.value = reduced
      ? focused
        ? 1
        : 0
      : withTiming(focused ? 1 : 0, { duration: 240, easing: Easing.bezier(0.22, 0.8, 0.26, 1) });
  }, [focused, reduced, grow]);

  // grows from the left like a ruled line being drawn (zn-grow-x)
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: grow.value }], opacity: grow.value }));

  return (
    <View style={{ alignItems: "center", justifyContent: "flex-start" }}>
      <Animated.View
        style={[
          { width: 18, height: 2.5, backgroundColor: c.accent, marginBottom: 7, transformOrigin: "left" },
          tickStyle
        ]}
      />
      <Icon color={focused ? c.textPrimary : c.textTertiary} size={22} strokeWidth={focused ? 2.3 : 1.8} />
    </View>
  );
}

/**
 * The center action is an INK SEAL — an ink-panel disc with a green plus and a
 * hairline outline ring, not a green pill. Green stays reserved for
 * money-positive moments; the seal is the app's stamp.
 */
function DiscoverTabButton({ onPress }: { onPress?: () => void }) {
  const t = useZenoTokens();
  const c = t.color;
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discover subscriptions"
        onPress={() => {
          haptics.primaryAction();
          onPress?.();
        }}
        style={({ pressed }) => [
          {
            width: 52,
            height: 52,
            marginTop: -10,
            borderRadius: t.radius.pill,
            backgroundColor: c.inkPanel,
            alignItems: "center",
            justifyContent: "center",
            // the seal's outline ring (web: outline + offset 3)
            borderWidth: 1,
            borderColor: c.ruleStrong,
            transform: [{ scale: pressed ? 0.93 : 1 }]
          },
          t.shadow.md
        ]}
      >
        <Plus size={26} color={c.accent} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        tabBarActiveTintColor: c.textPrimary,
        tabBarInactiveTintColor: c.textTertiary,
        // caps-mono index labels, like a ledger's column heads
        tabBarLabelStyle: { fontFamily: t.fonts.mono.bold, fontSize: 9, letterSpacing: 0.9, textTransform: "uppercase", marginTop: 2 },
        tabBarStyle: {
          backgroundColor: c.surfaceCard,
          borderTopColor: c.ruleStrong,
          borderTopWidth: 1,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8
        },
        headerShown: false
      }}
      screenListeners={{ tabPress: () => haptics.rowPress() }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Ledger",
          tabBarIcon: ({ focused }) => <TabIcon Icon={BookOpen} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Subs",
          tabBarIcon: ({ focused }) => <TabIcon Icon={Layers} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "",
          tabBarButton: (props) => <DiscoverTabButton onPress={props.onPress as () => void} />
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ focused }) => <TabIcon Icon={CalendarDays} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Insights",
          tabBarIcon: ({ focused }) => <TabIcon Icon={ChartNoAxesColumn} focused={focused} />
        }}
      />
    </Tabs>
  );
}
