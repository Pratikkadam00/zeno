import { Tabs } from "expo-router";
import { CalendarDays, House, Layers, PieChart, Plus } from "lucide-react-native";
import type { ComponentType } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useZenoTokens } from "../../src/theme/useZenoTokens";

type IconProps = { color: string; size: number; strokeWidth: number };

function TabIcon({ Icon, color, focused }: { Icon: ComponentType<IconProps>; color: string; focused: boolean }) {
  return <Icon color={color} size={23} strokeWidth={focused ? 2.4 : 2} />;
}

/** Elevated center Discover action — the green pill from the design chrome. */
function DiscoverTabButton({ onPress }: { onPress?: () => void }) {
  const t = useZenoTokens();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Discover subscriptions"
        onPress={onPress}
        style={({ pressed }) => [
          {
            width: 52,
            height: 52,
            marginTop: -14,
            borderRadius: t.radius.pill,
            backgroundColor: t.color.accent,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.94 : 1 }]
          },
          t.shadow.accent
        ]}
      >
        <Plus size={26} color={t.color.textOnAccent} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export default function TabsLayout() {
  const t = useZenoTokens();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        tabBarActiveTintColor: t.color.accentText,
        tabBarInactiveTintColor: t.color.textTertiary,
        tabBarLabelStyle: { fontFamily: t.fonts.sans.semibold, fontSize: 10, marginTop: 3 },
        tabBarStyle: {
          backgroundColor: t.color.surfaceCard,
          borderTopColor: t.color.borderSubtle,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 10
        },
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} color={String(color)} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="subscriptions"
        options={{
          title: "Subs",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Layers} color={String(color)} focused={focused} />
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
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={CalendarDays} color={String(color)} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={PieChart} color={String(color)} focused={focused} />
        }}
      />
    </Tabs>
  );
}
