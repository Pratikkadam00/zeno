import { Tabs } from "expo-router";
import { CalendarDays, House, LineChart } from "lucide-react-native";
import { colors } from "../../src/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.blue,
        tabBarInactiveTintColor: "rgba(255,255,255,0.3)",
        tabBarLabelStyle: { fontSize: 10, fontWeight: "500" },
        tabBarStyle: {
          borderTopColor: colors.separator,
          backgroundColor: colors.bg,
          borderTopWidth: 0.5,
          height: 86,
          paddingBottom: 24,
          paddingTop: 8
        },
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <House color={color} size={19} strokeWidth={2.4} />
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color }) => <CalendarDays color={color} size={19} strokeWidth={2.4} />
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: "Analytics",
          tabBarIcon: ({ color }) => <LineChart color={color} size={19} strokeWidth={2.4} />
        }}
      />
    </Tabs>
  );
}
