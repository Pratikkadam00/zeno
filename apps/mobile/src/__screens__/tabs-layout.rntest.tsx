import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabsLayout, { HOLD_MS, TAB_BAR_HEIGHT, quickAddOrigin, routeForQuickAction } from "../../app/(tabs)/_layout";
import { QUICK_ACTIONS, QuickAddArc, SEAL_SIZE, hitTest } from "../components/zeno/QuickAddArc";
import { routerMock } from "../test-support/screen-harness";
import { State } from "react-native-gesture-handler";
import { fireGestureHandler, getByGestureTestId } from "react-native-gesture-handler/jest-utils";
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
const mockTabs: { screens: ScreenProps[]; centrePress: jest.Mock; listeners?: { tabPress: () => void }; options?: Record<string, unknown> } = { screens: [], centrePress: jest.fn() };
jest.mock("expo-router", () => {
  const Tabs = ({ children, screenListeners, screenOptions }: { children: React.ReactNode; screenListeners: { tabPress: () => void }; screenOptions: Record<string, unknown> }) => {
    mockTabs.listeners = screenListeners;
    mockTabs.options = screenOptions;
    return children;
  };
  const { View: RNView } = jest.requireActual("react-native");
  Tabs.Screen = function TabsScreen(props: ScreenProps) {
    mockTabs.screens.push(props);
    // The centre action renders where expo-router would render it, so the
    // arc at the layout root and the ⊕ share one tree (F244).
    return props.options.tabBarButton ? <RNView>{props.options.tabBarButton({ onPress: mockTabs.centrePress })}</RNView> : null;
  };
  const { routerMock: r } = jest.requireActual("../test-support/screen-fakes");
  return { Tabs, router: r };
});

const reduceMotion = jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled");
const c = zenoTokens("light").color;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } };

async function mount() {
  mockTabs.screens = [];
  mockTabs.centrePress = jest.fn();
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
    const primary = jest.spyOn(haptics, "primaryAction");
    fireEvent.press(screen.getByRole("button", { name: "Discover subscriptions" }));
    expect(mockTabs.centrePress).toHaveBeenCalledTimes(1);
    expect(primary).toHaveBeenCalledTimes(1);
    primary.mockRestore();
  });

  it("the centre action without a handler is harmless", async () => {
    await mount();
    const discover = mockTabs.screens.find((s) => s.name === "discover")!;
    await draw(discover.options.tabBarButton!({}));
    expect(() => fireEvent.press(screen.getAllByRole("button", { name: "Discover subscriptions" }).at(-1)!)).not.toThrow();
  });
});

describe("the quick-pick arc behind the centre action (F244, Chrome.jsx)", () => {
  beforeEach(() => { routerMock.push.mockClear(); });

  it("fans three seals: ADD BY HAND left, IMPORT CSV top, SCAN EMAIL right, in that pop order", () => {
    expect(QUICK_ACTIONS.map((q) => [q.id, q.label, q.tx, q.ty])).toEqual([
      ["manual", "ADD BY HAND", -96, -94],
      ["csv", "IMPORT CSV", 0, -134],
      ["email", "SCAN EMAIL", 96, -94]
    ]);
  });

  it("the hold is the design's 300ms", () => {
    expect(HOLD_MS).toBe(300);
  });

  it("hit-testing: a finger on a seal (or its label, or just outside its edge) is that seal; the ⊕ itself and the gaps are nothing", () => {
    for (const q of QUICK_ACTIONS) {
      expect(hitTest(q.tx, q.ty)).toBe(q.id);
      expect(hitTest(q.tx, q.ty + SEAL_SIZE / 2 + 10)).toBe(q.id); // the label under the disc
      expect(hitTest(q.tx + SEAL_SIZE / 2 + 5, q.ty)).toBe(q.id); // 6dp of slop sideways
      expect(hitTest(q.tx + SEAL_SIZE / 2 + 7, q.ty + SEAL_SIZE)).not.toBe(q.id);
    }
    expect(hitTest(0, 0)).toBeNull();
    expect(hitTest(-48, -60)).toBeNull();
  });

  it("the ⊕'s centre is 24dp below the tab bar's top edge, in the middle of the layout", () => {
    expect(TAB_BAR_HEIGHT).toBe(70);
    expect(quickAddOrigin({ width: 390, height: 844 }, 34)).toEqual({ x: 195, y: 844 - 70 - 34 + 24 });
    expect(quickAddOrigin({ width: 0, height: 0 }, 0)).toEqual({ x: 0, y: -46 });
  });

  it("each pick goes where it says: add by hand to the form, CSV and email to Discover carrying the action", () => {
    routeForQuickAction("manual");
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
    routeForQuickAction("csv");
    expect(routerMock.push).toHaveBeenLastCalledWith({ pathname: "/discover", params: { action: "csv" } });
    routeForQuickAction("email");
    expect(routerMock.push).toHaveBeenLastCalledWith({ pathname: "/discover", params: { action: "email" } });
  });

  it("the arc draws its three named seals, and the hot one is marked selected", async () => {
    const r = await draw(<QuickAddArc open hot="csv" reduced={false} origin={{ x: 195, y: 40 }} />);
    for (const q of QUICK_ACTIONS) {
      const seal = screen.getByLabelText(q.label);
      expect(seal.props.accessibilityState).toEqual({ selected: q.id === "csv" });
    }
    r.unmount();
  });

  it("closed, the arc hides its seals from assistive technology", async () => {
    const r = await draw(<QuickAddArc open={false} hot={null} reduced={false} origin={{ x: 195, y: 40 }} />);
    expect(screen.getByTestId("quick-add-arc", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
    for (const q of QUICK_ACTIONS) expect(screen.getByLabelText(q.label, { includeHiddenElements: true }).props.accessible).toBe(false);
    r.unmount();
  });

  it("under reduced motion the seals still appear in place", async () => {
    const r = await draw(<QuickAddArc open hot={null} reduced origin={{ x: 195, y: 40 }} />);
    expect(screen.getByLabelText("IMPORT CSV")).toBeTruthy();
    r.unmount();
  });

  it("the arc is drawn at the layout root, over the page, not inside the tab cell", async () => {
    await mount();
    const root = screen.getByTestId("tabs-root");
    expect(screen.getByTestId("quick-add-arc", { includeHiddenElements: true })).toBeTruthy();
    // The arc is the root view's last child: above the tabs, over the whole page.
    // (Compared by type: a failed identity match would make jest print the tree.)
    const last = root.children.at(-1);
    expect(typeof last === "object" ? last.type : last).toBe(QuickAddArc);
  });

  it("the centre action exposes the three picks as accessibility actions, each routing like a pick", async () => {
    await mount();
    const button = screen.getByRole("button", { name: "Discover subscriptions" });
    expect(button.props.accessibilityActions).toEqual(QUICK_ACTIONS.map((q) => ({ name: q.id, label: q.label })));
    expect(button.props.accessibilityHint).toBe("Hold for quick add");
    fireEvent(button, "accessibilityAction", { nativeEvent: { actionName: "manual" } });
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
    fireEvent(button, "accessibilityAction", { nativeEvent: { actionName: "nope" } });
    expect(routerMock.push).toHaveBeenCalledTimes(1);
  });

  it("a short tap still opens Discover, and the arc stays closed", async () => {
    await mount();
    fireEvent.press(screen.getByRole("button", { name: "Discover subscriptions" }));
    expect(mockTabs.centrePress).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("quick-add-arc", { includeHiddenElements: true }).props.accessibilityElementsHidden).toBe(true);
  });
});

describe("holding the centre action (F244): the gesture itself", () => {
  // gesture-handler's jest utility appends an END to every event list it is
  // given (fillMissingStatesTransitions), so one call is one whole gesture. The
  // sweep-then-release path is therefore driven through the gesture's own
  // handlers, which with runOnJS(true) are the plain functions the ⊕ registered.
  type Handlers = {
    onStart?: (event: unknown) => void;
    onEnd?: (event: unknown, success: boolean) => void;
    onFinalize?: (event: unknown, success: boolean) => void;
    onTouchesMove?: (event: { allTouches: { x: number; y: number }[] }, manager: unknown) => void;
  };
  const gesture = () => getByGestureTestId("quick-add-hold");
  const handlers = () => gesture().handlers as unknown as Handlers;
  const arcHidden = () => screen.getByTestId("quick-add-arc", { includeHiddenElements: true }).props.accessibilityElementsHidden;
  const hold = () => act(() => { handlers().onStart?.({}); });
  const lift = (success: boolean) => act(() => { handlers().onEnd?.({}, success); handlers().onFinalize?.({}, success); });
  /** The ⊕ is 52dp; touches are relative to it, the arc to its centre. */
  const touchAt = (dx: number, dy: number) => act(() => { handlers().onTouchesMove?.({ allTouches: [{ x: dx + 26, y: dy + 26 }] }, {}); });

  beforeEach(() => { routerMock.push.mockClear(); });

  it("the gesture does not cancel when the finger leaves the button: it is meant to travel to a seal", async () => {
    await mount();
    const config = gesture().config as { shouldCancelWhenOutside?: boolean; minDurationMs?: number };
    expect(config.shouldCancelWhenOutside).toBe(false);
    expect(config.minDurationMs).toBe(HOLD_MS);
  });

  it("a whole hold-and-lift through the gesture system: opens with the primary haptic, and a lift over nothing closes without a pick", async () => {
    await mount();
    const primary = jest.spyOn(haptics, "primaryAction");
    expect(arcHidden()).toBe(true);
    await act(async () => { fireGestureHandler(gesture(), [{ state: State.BEGAN }, { state: State.ACTIVE }, { state: State.END }]); });
    expect(primary).toHaveBeenCalledTimes(1);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(arcHidden()).toBe(true);
    primary.mockRestore();
  });

  it("the hold opens the arc over the page and the seals become reachable", async () => {
    await mount();
    hold();
    expect(arcHidden()).toBe(false);
    expect(screen.getByLabelText("IMPORT CSV").props.accessible).toBe(true);
  });

  it("sweeping onto a seal makes it hot with the selection haptic; staying on it buzzes once; sweeping off clears it", async () => {
    await mount();
    const select = jest.spyOn(haptics, "pinDigit");
    hold();
    const top = QUICK_ACTIONS.find((q) => q.id === "csv")!;
    touchAt(top.tx, top.ty);
    expect(screen.getByLabelText("IMPORT CSV").props.accessibilityState).toEqual({ selected: true });
    expect(select).toHaveBeenCalledTimes(1);
    touchAt(top.tx, top.ty + 4);
    expect(select).toHaveBeenCalledTimes(1);
    touchAt(0, 0); // back over the ⊕: nothing hot
    expect(screen.getByLabelText("IMPORT CSV").props.accessibilityState).toEqual({ selected: false });
    select.mockRestore();
  });

  it("lifting on a seal picks it with the light haptic and closes the arc", async () => {
    await mount();
    const light = jest.spyOn(haptics, "rowPress");
    hold();
    const left = QUICK_ACTIONS.find((q) => q.id === "manual")!;
    touchAt(left.tx, left.ty);
    lift(true);
    expect(routerMock.push).toHaveBeenLastCalledWith("/subscription/add");
    expect(light).toHaveBeenCalledTimes(1);
    expect(arcHidden()).toBe(true);
    light.mockRestore();
  });

  it("lifting anywhere else cancels: the arc closes and nothing is picked", async () => {
    await mount();
    hold();
    touchAt(-40, -40); // the gap between the ⊕ and the left seal
    lift(true);
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(arcHidden()).toBe(true);
  });

  it("a finger lifted before the hold completes closes without a pick", async () => {
    await mount();
    await act(async () => { fireGestureHandler(gesture(), [{ state: State.BEGAN }, { state: State.FAILED }]); });
    expect(routerMock.push).not.toHaveBeenCalled();
    expect(arcHidden()).toBe(true);
  });

  it("a touch event with no touches is ignored", async () => {
    await mount();
    hold();
    expect(() => act(() => { handlers().onTouchesMove?.({ allTouches: [] }, {}); })).not.toThrow();
    expect(arcHidden()).toBe(false);
  });

  it("while the arc is open, a press on the ⊕ is not a visit to Discover", async () => {
    await mount();
    hold();
    fireEvent.press(screen.getByRole("button", { name: "Discover subscriptions" }));
    expect(mockTabs.centrePress).not.toHaveBeenCalled();
  });

  it("the arc fans from the ⊕'s centre, computed from the layout's size", async () => {
    await mount();
    fireEvent(screen.getByTestId("tabs-root"), "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 390, height: 844 } } });
    hold();
    expect(arcHidden()).toBe(false);
  });

  it("under reduced motion the hold still opens and a lift still closes", async () => {
    reduceMotion.mockResolvedValue(true);
    await mount();
    hold();
    expect(arcHidden()).toBe(false);
    lift(true);
    expect(arcHidden()).toBe(true);
  });
});
