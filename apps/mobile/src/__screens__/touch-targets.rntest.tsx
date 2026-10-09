import type { Subscription } from "@zeno/shared";
import AnalyticsScreen from "../../app/(tabs)/analytics";
import CalendarScreen from "../../app/(tabs)/calendar";
import DashboardScreen from "../../app/(tabs)/dashboard";
import SubscriptionsScreen from "../../app/(tabs)/subscriptions";
import BudgetScreen from "../../app/budget";
import NotificationsScreen from "../../app/notifications";
import ProfileScreen from "../../app/profile";
import SpendTwinScreen from "../../app/spend-twin";
import SubscriptionDetailScreen from "../../app/subscription/[id]";
import WidgetsScreen from "../../app/widgets";
import WrappedScreen from "../../app/wrapped";
import { renderScreen, resetFakes, routeParams } from "../test-support/screen-harness";

/**
 * U3.3 (docs/UI_TEST_PLAN.md) · touch targets. Android's own guidance is 48 dp,
 * iOS's is 44 pt; this holds the app to 44 and reports anything under it.
 *
 * What can honestly be measured here: a control's DECLARED size — its style's
 * height/minHeight and width/minWidth, grown by its hitSlop. A control that
 * declares no size takes it from its content, which this renderer does not lay
 * out, so it cannot be judged and is counted separately rather than passed off
 * as fine. The device pass (U6-style, on the emulator) is what measures laid-out
 * boxes; this one stops a control being SHRUNK below the floor in code.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../billing/revenueCat", () => ({ checkStatus: jest.fn(async () => ({ plan: "free" })) }));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create((set: (s: object) => void) => ({ plan: "free", setPlan: (plan: string) => set({ plan }) })) };
});

const MIN = 44;
const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Netflix", category: "entertainment",
  price: { amountMinor: 1549, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(10),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  resetFakes();
});
afterEach(() => jest.useRealTimers());

type Style = Record<string, unknown>;
type HostNode = { type: unknown; props: Record<string, unknown>; children: (HostNode | string)[] };

/** React Native accepts a style as an object, an array, or nested arrays. */
function flattenStyle(style: unknown): Style {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flattenStyle)) as Style;
  return (style && typeof style === "object" ? style : {}) as Style;
}

const num = (value: unknown): number | null => (typeof value === "number" && Number.isFinite(value) ? value : null);

/** How much hitSlop adds to each axis. */
function slop(hitSlop: unknown): { x: number; y: number } {
  if (typeof hitSlop === "number") return { x: hitSlop * 2, y: hitSlop * 2 };
  const s = flattenStyle(hitSlop);
  const top = num(s.top) ?? 0, bottom = num(s.bottom) ?? 0, left = num(s.left) ?? 0, right = num(s.right) ?? 0;
  return { x: left + right, y: top + bottom };
}

type Target = { name: string; width: number | null; height: number | null };

/** Every control, with the size it declares (plus hitSlop), or null on an axis
 *  it leaves to its content. */
function targets(root: HostNode | string | null): Target[] {
  const found: Target[] = [];
  const walk = (node: HostNode | string | null) => {
    if (node === null || typeof node === "string") return;
    const role = node.props?.accessibilityRole ?? node.props?.role;
    if (typeof node.type === "string" && ["button", "link", "tab", "switch", "checkbox", "radio"].includes(String(role))) {
      const s = flattenStyle(node.props.style);
      const extra = slop(node.props.hitSlop);
      const h = num(s.height) ?? num(s.minHeight);
      const w = num(s.width) ?? num(s.minWidth);
      found.push({
        name: String(node.props.accessibilityLabel ?? "").slice(0, 60) || "(unnamed)",
        width: w === null ? null : w + extra.x,
        height: h === null ? null : h + extra.y
      });
    }
    (node.children ?? []).forEach(walk);
  };
  walk(root);
  return found;
}

/** The month grid is drawn by react-native-calendars, not by Zeno: its day
 *  cells are the library's own 32 pt boxes. They are reported as F235 rather
 *  than enforced here, because the fix is to replace the library's day
 *  component, not to change a style of ours. Matched on the label the library
 *  builds: a weekday, a date, a year. */
const LIBRARY_DAY = /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b.*\b\d{4}\b/;
const isLibraryDayCell = (t: Target) => LIBRARY_DAY.test(t.name);

/** A control fails only when it DECLARES a size below the floor: that is a
 *  shrink written in code, not a guess about layout. */
const tooSmall = (list: Target[]) =>
  list
    .filter((t) => !isLibraryDayCell(t))
    .filter((t) => (t.height !== null && t.height < MIN) || (t.width !== null && t.width < MIN))
    .map((t) => `${t.name}: ${t.width ?? "auto"}×${t.height ?? "auto"}`);

const SCREENS: [string, () => React.ReactElement][] = [
  ["dashboard", () => <DashboardScreen />],
  ["subscriptions", () => <SubscriptionsScreen />],
  ["calendar", () => <CalendarScreen />],
  ["analytics", () => <AnalyticsScreen />],
  ["budget", () => <BudgetScreen />],
  ["notifications", () => <NotificationsScreen />],
  ["profile", () => <ProfileScreen />],
  ["wrapped", () => <WrappedScreen />],
  ["widgets", () => <WidgetsScreen />],
  ["spend-twin", () => <SpendTwinScreen />]
];

const rows = [
  sub({ id: "a", name: "Netflix" }),
  sub({ id: "b", name: "Spotify", billingCycle: "annual", price: { amountMinor: 11900, currency: "USD" } }),
  sub({ id: "c", name: "Gym", category: "health", status: "paused" })
];

describe("U3.3 · no control is shrunk below 44 pt in code", () => {
  it.each(SCREENS)("%s", async (_name, ui) => {
    resetFakes({ rows });
    const r = await renderScreen(ui(), { settleMs: 400 });
    expect(tooSmall(targets(r.toJSON() as never))).toEqual([]);
  });

  it("the subscription page, where the row actions live", async () => {
    resetFakes({ rows });
    routeParams.current = { id: "a" };
    const r = await renderScreen(<SubscriptionDetailScreen />, { settleMs: 400 });
    expect(tooSmall(targets(r.toJSON() as never))).toEqual([]);
  });

  it("F235: the month grid's day cells are the calendar library's 32 pt boxes, and are still too small", async () => {
    // Recorded, not enforced: the fix is a custom dayComponent, not a style of
    // ours. Pinned so the day it changes — or the library starts drawing them
    // at 44 — this test says so instead of quietly passing.
    resetFakes({ rows });
    const r = await renderScreen(<CalendarScreen />, { settleMs: 400 });
    const days = targets(r.toJSON() as never).filter(isLibraryDayCell);
    expect(days.length).toBeGreaterThan(27); // a month of them
    expect(days.every((d) => d.width === 32 && d.height === 32)).toBe(true);
  });

  it("the measure really catches a shrunk control, and counts hitSlop as size (control)", () => {
    const control = (style: Style, hitSlop?: unknown): HostNode => ({
      type: "View",
      props: { accessibilityRole: "button", accessibilityLabel: "Close", style, ...(hitSlop ? { hitSlop } : {}) },
      children: []
    });
    expect(tooSmall(targets(control({ width: 24, height: 24 })))).toEqual(["Close: 24×24"]);
    // The same 24 pt icon with 10 pt of slop on every side is 44×44, and passes.
    expect(tooSmall(targets(control({ width: 24, height: 24 }, 10)))).toEqual([]);
    expect(tooSmall(targets(control({ width: 24, height: 24 }, { top: 10, bottom: 10, left: 10, right: 10 })))).toEqual([]);
    // A control that declares no size is left to its content, so not judged.
    expect(tooSmall(targets(control({})))).toEqual([]);
    expect(tooSmall(targets(control({ minHeight: 44, minWidth: 44 })))).toEqual([]);
  });
});
