import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabsLayout from "../../app/(tabs)/_layout";
import { haptics } from "../theme/haptics";
import { ZenoThemeProvider } from "../theme/theme-provider";
import { zenoTokens } from "../theme/zeno";

/**
 * P3.8c: the tab bar (app/(tabs)/_layout.tsx). It hands expo-router's Tabs a
 * configuration, so the stand-in below records what it is given and the test
 * exercises each piece: the order and titles, each icon in both states, the
 * centre Discover action, and the tab-press haptic.
 */
type ScreenProps = { name: string; options: { title: string; tabBarIcon?: (p: { focused: boolean }) => React.ReactElement; tabBarButton?: (p: { onPress?: () => void }) => React.ReactElement } };
const mockTabs: { screens: ScreenProps[]; listeners?: { tabPress: () => void }; options?: Record<string, unknown> } = { screens: [] };
jest.mock("expo-router", () => {
  const Tabs = ({ children, screenListeners, screenOptions }: { children: React.ReactNode; screenListeners: { tabPress: () => void }; screenOptions: Record<string, unknown> }) => {
    mockTabs.listeners = screenListeners;
    mockTabs.options = screenOptions;
    return children;
  };
  Tabs.Screen = function TabsScreen(props: ScreenProps) {
    mockTabs.screens.push(props);
    return null;
  };
  return { Tabs };
});

const reduceMotion = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
const c = zenoTokens("light").color;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } };

async function mount() {
  mockTabs.screens = [];
  render(<SafeAreaProvider initialMetrics={metrics}><ZenoThemeProvider><TabsLayout /></ZenoThemeProvider></SafeAreaProvider>);
  await act(async () => {});
}
async function draw(el: React.ReactElement) {
  const r = render(<ZenoThemeProvider>{el}</ZenoThemeProvider>);
  await act(async () => {});
  return r;
}

beforeEach(() => reduceMotion.mockResolvedValue(false));

describe("the tab bar", () => {
  it("five tabs in order: Ledger, Subs, the centre Discover action, Calendar, Insights; no headers", async () => {
    await mount();
    expect(mockTabs.screens.map((s) => [s.name, s.options.title])).toEqual([
      ["dashboard", "Ledger"], ["subscriptions", "Subs"], ["discover", ""], ["calendar", "Calendar"], ["analytics", "Insights"]
    ]);
    expect(mockTabs.options).toMatchObject({ headerShown: false, tabBarActiveTintColor: c.textPrimary, tabBarInactiveTintColor: c.textTertiary });
  });

  it("a tab press gives the row haptic", async () => {
    await mount();
    const tick = jest.spyOn(haptics, "rowPress");
    mockTabs.listeners!.tabPress();
    expect(tick).toHaveBeenCalledTimes(1);
    tick.mockRestore();
  });

  it("each tab icon is strong ink when focused and quiet when not", async () => {
    await mount();
    for (const tab of mockTabs.screens.filter((s) => s.options.tabBarIcon)) {
      for (const focused of [true, false]) {
        const r = await draw(<View testID="icon">{tab.options.tabBarIcon!({ focused })}</View>);
        const svg = r.UNSAFE_root.findAll((n) => n.props.strokeWidth !== undefined && typeof n.props.color === "string")[0]!;
        expect(svg.props).toMatchObject({ color: focused ? c.textPrimary : c.textTertiary, strokeWidth: focused ? 2.3 : 1.8 });
        r.unmount();
      }
    }
  });

  it("under reduced motion the focus tick snaps instead of growing (still drawn)", async () => {
    reduceMotion.mockResolvedValue(true);
    await mount();
    const r = await draw(mockTabs.screens[0]!.options.tabBarIcon!({ focused: true }));
    expect(r.toJSON()).toBeTruthy();
  });

  it("the centre action is a named button that navigates to Discover with the primary haptic", async () => {
    await mount();
    const discover = mockTabs.screens.find((s) => s.name === "discover")!;
    const onPress = jest.fn();
    const primary = jest.spyOn(haptics, "primaryAction");
    await draw(discover.options.tabBarButton!({ onPress }));
    fireEvent.press(screen.getByRole("button", { name: "Discover subscriptions" }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(primary).toHaveBeenCalledTimes(1);
    primary.mockRestore();
  });

  it("the centre action without a handler is harmless", async () => {
    await mount();
    const discover = mockTabs.screens.find((s) => s.name === "discover")!;
    await draw(discover.options.tabBarButton!({}));
    expect(() => fireEvent.press(screen.getByRole("button", { name: "Discover subscriptions" }))).not.toThrow();
  });
});
