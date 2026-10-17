import { router, Tabs } from "expo-router";
import { BookOpen, CalendarDays, ChartNoAxesColumn, Layers, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Pressable, View, type AccessibilityActionEvent, type LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUICK_ACTIONS, QuickAddArc, hitTest, type QuickActionId } from "../../src/components/zeno/QuickAddArc";
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

/** What the ⊕ needs from the layout, which owns the arc so the scrim can
 *  cover the whole page rather than the button's own tab cell. */
export type QuickAddController = {
  open: boolean;
  openArc: () => void;
  moveHot: (dx: number, dy: number) => void;
  pickHot: () => void;
  cancelArc: () => void;
  pick: (id: QuickActionId) => void;
};

/** Hold for 300ms (Chrome.jsx): the quick-pick arc. */
export const HOLD_MS = 300;

/** Where each quick pick goes. Exported so the tests pin the three routes. */
export function routeForQuickAction(id: QuickActionId): void {
  if (id === "manual") {
    router.push("/subscription/add");
  } else {
    // Discover runs the import or the Gmail connect itself when it arrives
    // with this param (app/(tabs)/discover.tsx), then clears it.
    router.push({ pathname: "/discover", params: { action: id } });
  }
}

/**
 * The arc's state and the haptics the design attaches to each transition,
 * kept by the layout. Measured on the device (F244): the first version drew
 * the arc inside the button's tab cell, so the scrim dimmed a 200dp rectangle
 * of tab bar and nothing else.
 */
export function useQuickAdd(): QuickAddController & { hot: QuickActionId | null } {
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState<QuickActionId | null>(null);
  const hotRef = useRef<QuickActionId | null>(null);

  const setHotSeal = useCallback((next: QuickActionId | null) => {
    if (next !== hotRef.current) {
      hotRef.current = next;
      setHot(next);
      // "selectionAsync() when the hot seal changes"
      if (next) haptics.pinDigit();
    }
  }, []);

  const openArc = useCallback(() => {
    setOpen(true);
    setHotSeal(null);
    haptics.primaryAction(); // "impactAsync(Medium) on open"
  }, [setHotSeal]);

  const closeArc = useCallback((picked: QuickActionId | null) => {
    setOpen(false);
    setHotSeal(null);
    if (picked) {
      haptics.rowPress(); // "impactAsync(Light) on pick"
      routeForQuickAction(picked);
    }
  }, [setHotSeal]);

  // Release picks whatever seal is hot at that moment. Read from the ref in a
  // callback, not in render: the gesture's handlers run when a finger lifts.
  const pickHot = useCallback(() => closeArc(hotRef.current), [closeArc]);
  const cancelArc = useCallback(() => closeArc(null), [closeArc]);
  const moveHot = useCallback((dx: number, dy: number) => setHotSeal(hitTest(dx, dy)), [setHotSeal]);
  const pick = useCallback((id: QuickActionId) => closeArc(id), [closeArc]);

  return { open, hot, openArc, moveHot, pickHot, cancelArc, pick };
}

/**
 * The center action is an INK SEAL: an ink-panel disc with a green plus and a
 * hairline outline ring, not a green pill. Green stays reserved for
 * money-positive moments; the seal is the app's stamp.
 *
 * The ⊕: a short tap opens the Discover hub (unchanged); HOLD fans the three
 * quick picks in an arc, sweep onto one and release to pick, release anywhere
 * else to cancel (F244, Chrome.jsx). A hold-and-sweep is not something a
 * screen reader can do, so the same three picks are offered as accessibility
 * actions on the button: TalkBack lists them, no gesture needed.
 */
function DiscoverTabButton({ onPress, quickAdd }: { onPress?: () => void; quickAdd: QuickAddController }) {
  const t = useZenoTokens();
  const c = t.color;
  const reduced = useReducedMotion();
  const { open, openArc, moveHot, pickHot, cancelArc, pick } = quickAdd;
  const rotate = useSharedValue(0);

  useEffect(() => {
    // "The plus rotates 45° while open (release-to-cancel cue)."
    rotate.value = reduced ? (open ? 45 : 0) : withTiming(open ? 45 : 0, { duration: 200, easing: Easing.bezier(0.22, 0.8, 0.26, 1) });
  }, [open, reduced, rotate]);

  const plusStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotate.value}deg` }] }));

  // The gesture: a long press arms the arc, and the touch that follows (one
  // continuous finger) moves the hot seal and picks on release. Its handlers
  // run on the JS thread (`runOnJS(true)`): every one of them only sets React
  // state, a 300ms hold is not a 60fps animation, and it keeps reanimated's
  // worklet bridge out of a tab bar. Memoised, as react-native-gesture-handler
  // asks, so the detector is not rebuilt on every render.
  //
  // shouldCancelWhenOutside(false): a long press cancels by default the moment
  // the finger leaves the view (LongPressGesture's constructor sets it true),
  // and this one is meant to travel 134dp up to a seal. Measured on the device
  // before this line existed: the arc opened on the hold and vanished on the
  // first move.
  //
  // react-hooks/refs is switched off for this one expression: the rule reads
  // the useMemo factory as render and so forbids it to touch callbacks that
  // read a ref (pickHot, on release). These are gesture-handler event
  // handlers; they run when a finger lifts, never during render, which is
  // exactly the case the rule exists to allow. Nothing here is called in render.
  /* eslint-disable react-hooks/refs */
  const hold = useMemo(
    () =>
      Gesture.LongPress()
        .runOnJS(true)
        .minDuration(HOLD_MS)
        .maxDistance(1_000) // the finger is meant to travel after the hold
        .shouldCancelWhenOutside(false)
        .onStart(openArc)
        .onTouchesMove((event) => {
          const touch = event.allTouches[0];
          if (!touch) return;
          // Touch coordinates are relative to the 52dp button; the arc's
          // geometry is relative to its centre.
          moveHot(touch.x - 26, touch.y - 26);
        })
        .onEnd((_event, success) => {
          if (success) pickHot();
        })
        .onFinalize((_event, success) => {
          // A hold lifted before 300ms, or interrupted, closes without a pick.
          if (!success) cancelArc();
        })
        .withTestId("quick-add-hold"),
    [openArc, moveHot, pickHot, cancelArc]
  );
  /* eslint-enable react-hooks/refs */

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const action = QUICK_ACTIONS.find((q) => q.id === event.nativeEvent.actionName);
    if (action) pick(action.id);
  };

  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <GestureDetector gesture={hold}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Discover subscriptions"
          accessibilityHint="Hold for quick add"
          accessibilityActions={QUICK_ACTIONS.map((q) => ({ name: q.id, label: q.label }))}
          onAccessibilityAction={onAccessibilityAction}
          onPress={() => {
            // A tap that ended a hold is the hold's business, not a Discover visit.
            if (open) return;
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
              transform: [{ scale: pressed || open ? 0.93 : 1 }]
            },
            t.shadow.md
          ]}
        >
          <Animated.View style={plusStyle}>
            <Plus size={26} color={c.accent} strokeWidth={2.4} />
          </Animated.View>
        </Pressable>
      </GestureDetector>
    </View>
  );
}

/** The tab bar's height, as tabBarStyle below sets it (before the bottom inset). */
export const TAB_BAR_HEIGHT = 70;

/**
 * Where the ⊕'s centre is within the layout: the tab bar sits at the bottom,
 * the button is 52dp with a -10 margin under 8dp of padding, so its centre is
 * 8 - 10 + 26 = 24dp below the bar's top edge. Arithmetic rather than a
 * measurement: it cannot be stale, and it holds in the test renderer.
 */
export function quickAddOrigin(root: { width: number; height: number }, bottomInset: number): { x: number; y: number } {
  return { x: root.width / 2, y: root.height - TAB_BAR_HEIGHT - bottomInset + 24 };
}

export default function TabsLayout() {
  const t = useZenoTokens();
  const c = t.color;
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const quickAdd = useQuickAdd();
  const [root, setRoot] = useState({ width: 0, height: 0 });
  const onRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setRoot({ width, height });
  };

  return (
    <View style={{ flex: 1 }} onLayout={onRootLayout} testID="tabs-root">
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
          tabBarButton: (props) => <DiscoverTabButton onPress={props.onPress as () => void} quickAdd={quickAdd} />
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
    {/* Over the page AND the bar, so the scrim dims the page as the design says. */}
    <QuickAddArc open={quickAdd.open} hot={quickAdd.hot} reduced={reduced} origin={quickAddOrigin(root, insets.bottom)} />
    </View>
  );
}
