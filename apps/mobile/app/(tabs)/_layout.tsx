import { Tabs } from "expo-router";
import { CalendarDays, Compass, House, LineChart } from "lucide-react-native";
import type { ComponentType } from "react";
import { View } from "react-native";
import { useZenoTheme } from "../../src/theme/theme-provider";
import { withAlpha } from "../../src/utils/subscription-ui";

type IconProps = { color: string; size: number; strokeWidth: number };

function TabIcon({ Icon, color, focused, tint }: { Icon: ComponentType<IconProps>; color: string; focused: boolean; tint: string }) {
  return (
    <View
      style={{
        width: 48,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: focused ? withAlpha(tint, 0.14) : "transparent"
      }}
    >
      <Icon color={color} size={focused ? 21 : 19} strokeWidth={focused ? 2.6 : 2.2} />
    </View>
  );
}

export default function TabsLayout() {
  const { theme } = useZenoTheme();

  return (
    <Tabs
      screenOptions={{
        animation: "fade",
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.quietText,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600", marginTop: 2 },
        tabBarStyle: {
          borderTopColor: theme.border,
          backgroundColor: theme.card,
          borderTopWidth: 0.5,
          height: 86,
          paddingBottom: 24,
          paddingTop: 10
        },
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={House} color={String(color)} focused={focused} tint={theme.primary} />
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={CalendarDays} color={String(color)} focused={focused} tint={theme.primary} />
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          title: "Discover",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={Compass} color={String(color)} focused={focused} tint={theme.primary} />
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color, focused }) => <TabIcon Icon={LineChart} color={String(color)} focused={focused} tint={theme.primary} />
        }}
      />
    </Tabs>
  );
}
