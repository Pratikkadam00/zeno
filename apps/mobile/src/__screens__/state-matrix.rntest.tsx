import type { Subscription } from "@zeno/shared";
import { screen } from "@testing-library/react-native";
import AnalyticsScreen from "../../app/(tabs)/analytics";
import CalendarScreen from "../../app/(tabs)/calendar";
import DashboardScreen from "../../app/(tabs)/dashboard";
import SubscriptionsScreen from "../../app/(tabs)/subscriptions";
import BudgetRecapScreen from "../../app/budget-recap";
import BudgetScreen from "../../app/budget";
import BusinessScreen from "../../app/business";
import NotificationsScreen from "../../app/notifications";
import PartnersScreen from "../../app/partners";
import ProfileScreen from "../../app/profile";
import PublicApiScreen from "../../app/public-api";
import SpendTwinScreen from "../../app/spend-twin";
import SubscriptionDetailScreen from "../../app/subscription/[id]";
import WidgetsScreen from "../../app/widgets";
import WrappedScreen from "../../app/wrapped";
import { formatMoney } from "../utils/format";
import { renderScreen, resetFakes, routeParams } from "../test-support/screen-harness";

/**
 * U1 (docs/UI_TEST_PLAN.md) · every screen, every state. The per-screen files
 * already drive each screen's own empty / loading / error states; this one
 * covers the three cells none of them did, across the screens that render on
 * the standard fakes:
 *
 *   U1.3  many: the free cap (10) and 200 subscriptions
 *   U1.6  very long names, emoji, non-Latin and right-to-left text
 *   U1.8  no placeholder text, "undefined" or a raw key on any screen
 *
 * The matrix of which file proves which cell is in docs/UI_STATE_MATRIX.md.
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
// The store SDK never loads in jest (it ships untransformed ESM); the plan is
// read from the auth store, as the other screen files do.
jest.mock("../billing/revenueCat", () => ({ checkStatus: jest.fn(async () => ({ plan: "free" })) }));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create((set: (s: object) => void) => ({ plan: "free", setPlan: (plan: string) => set({ plan }) })) };
});

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const sub = (over: Partial<Subscription>): Subscription => ({
  id: "sub_x", createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: "Zzqx", category: "other",
  price: { amountMinor: 1000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(10),
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  resetFakes();
});
afterEach(() => jest.useRealTimers());

// ── the rendered text of a screen ──────────────────────────────────────────
type HostNode = { type: unknown; props: Record<string, unknown>; children: (HostNode | string)[] };

/** Every string the screen puts on the glass: its text nodes and the
 *  accessibility labels a screen reader would speak. */
function allText(root: HostNode | string | null): string[] {
  const out: string[] = [];
  const walk = (node: HostNode | string | null) => {
    if (node === null) return;
    if (typeof node === "string") {
      if (node.trim()) out.push(node);
      return;
    }
    for (const key of ["accessibilityLabel", "accessibilityHint", "accessibilityValue", "placeholder"]) {
      const value = node.props?.[key];
      if (typeof value === "string" && value.trim()) out.push(value);
      if (value && typeof value === "object" && typeof (value as { text?: string }).text === "string") out.push((value as { text: string }).text);
    }
    (node.children ?? []).forEach(walk);
  };
  walk(root);
  return out;
}

// What must never reach the glass. Each is a real way a screen goes wrong:
// a value that was undefined, a number that stopped being one, an object
// printed by accident, a raw i18n/template key, or copy nobody wrote.
const FORBIDDEN: [RegExp, string][] = [
  [/\bundefined\b/i, "the word undefined"],
  [/\bNaN\b/, "NaN"],
  [/\[object [A-Z]\w+\]/, "a stringified object"],
  [/\$NaN|[£€₹]NaN|\bNaN%/, "a broken amount"],
  [/\{\{|\}\}/, "an unfilled template slot"],
  [/\blorem ipsum\b/i, "lorem ipsum"],
  [/\bTODO\b|\bFIXME\b|\bTBD\b/, "a TODO left in the copy"],
  [/\bplaceholder\b/i, "the word placeholder"],
  [/^[a-z]+(\.[a-z][a-zA-Z]*){2,}$/, "a raw dotted key"],
  [/\bNULL\b|^null$/, "null"]
];

function offenders(root: HostNode | string | null): string[] {
  const found: string[] = [];
  for (const text of allText(root)) {
    for (const [pattern, why] of FORBIDDEN) {
      if (pattern.test(text)) found.push(`${why}: ${JSON.stringify(text.slice(0, 80))}`);
    }
  }
  return found;
}

// Screens that render on the standard fakes with no route parameter. The rest
// (login, paywall, coach, family, discover, the developer screens) need their
// own module fakes and are swept inside their own files; UI_STATE_MATRIX.md
// says which file covers which.
const SCREENS: [string, () => React.ReactElement][] = [
  ["dashboard", () => <DashboardScreen />],
  ["subscriptions", () => <SubscriptionsScreen />],
  ["calendar", () => <CalendarScreen />],
  ["analytics", () => <AnalyticsScreen />],
  ["budget", () => <BudgetScreen />],
  ["budget-recap", () => <BudgetRecapScreen />],
  ["notifications", () => <NotificationsScreen />],
  ["profile", () => <ProfileScreen />],
  ["wrapped", () => <WrappedScreen />],
  ["widgets", () => <WidgetsScreen />],
  ["spend-twin", () => <SpendTwinScreen />],
  ["business", () => <BusinessScreen />],
  ["partners", () => <PartnersScreen />],
  ["public-api", () => <PublicApiScreen />]
];

describe("U1.8 · no placeholder text, 'undefined' or a raw key on any screen", () => {
  it.each(SCREENS)("%s: empty", async (_name, ui) => {
    resetFakes({ rows: [] });
    const r = await renderScreen(ui(), { settleMs: 400 });
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });

  it.each(SCREENS)("%s: with subscriptions", async (_name, ui) => {
    resetFakes({ rows: [sub({ id: "a", name: "Netflix", category: "entertainment", price: { amountMinor: 1549, currency: "USD" } }),
      sub({ id: "b", name: "Spotify", category: "entertainment", billingCycle: "annual", price: { amountMinor: 11900, currency: "USD" } }),
      sub({ id: "c", name: "Gym", category: "health", status: "paused" })] });
    const r = await renderScreen(ui(), { settleMs: 400 });
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });

  it("the sweep really catches a broken value (control)", () => {
    const broken = { type: "Text", props: {}, children: ["Next renewal: undefined"] } as never;
    expect(offenders(broken)).toEqual(['the word undefined: "Next renewal: undefined"']);
    const okay = { type: "Text", props: {}, children: ["Next renewal: 12 Oct"] } as never;
    expect(offenders(okay)).toEqual([]);
  });

  it("a subscription with no renewal date and no note still says something real", async () => {
    resetFakes({ rows: [sub({ id: "n", name: "No Date", nextRenewalDate: "" })] });
    const r = await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    expect(offenders(r.toJSON() as never)).toEqual([]);
    expect(screen.getByText("No Date")).toBeTruthy();
  });
});

describe("U1.3 · many: the free cap and 200 subscriptions", () => {
  const many = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      sub({ id: `sub_${i}`, name: `Service ${i + 1}`, price: { amountMinor: 100 * (i + 1), currency: "USD" }, nextRenewalDate: iso((i % 28) + 1) })
    );

  it("ten (the free cap): every one is a row, and the ledger totals them", async () => {
    resetFakes({ rows: many(10) });
    await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    expect(screen.getAllByRole("button", { name: /, next / })).toHaveLength(10);
    // 100 + 200 + … + 1000 minor = 5500
    expect(screen.getByText(`10 BILLING · ${formatMoney(5500, "USD")}/MO`)).toBeTruthy();
  });

  it("200: counted and totalled in full, drawn a window at a time (the list virtualises)", async () => {
    const rows = many(200);
    resetFakes({ rows });
    const r = await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    const total = rows.reduce((sum, s) => sum + s.price.amountMinor, 0); // 100 × (200 × 201 / 2) = 2,010,000
    expect(total).toBe(2_010_000);
    // The count and the total come from all 200, whatever is on the glass.
    expect(screen.getByText(`200 BILLING · ${formatMoney(total, "USD")}/MO`)).toBeTruthy();
    // Only the rows near the viewport are drawn: that is the list doing its
    // job (200 mounted rows would be the bug). The window is the first ones,
    // in order, and every drawn row is one of the 200 — none invented.
    const drawn = screen.getAllByRole("button", { name: /, next / }).map((b) => String(b.props.accessibilityLabel));
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(rows.length);
    expect(drawn[0]).toMatch(/^Service 1, /);
    const names = new Set(rows.map((s) => s.name));
    expect(drawn.filter((label) => !names.has(label.split(",")[0]!))).toEqual([]);
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });

  it("200 on the ledger and the insights: both render, with no broken value", async () => {
    resetFakes({ rows: many(200) });
    const ledger = await renderScreen(<DashboardScreen />, { settleMs: 400 });
    expect(offenders(ledger.toJSON() as never)).toEqual([]);
    ledger.unmount();
    resetFakes({ rows: many(200) });
    const insights = await renderScreen(<AnalyticsScreen />, { settleMs: 400 });
    expect(offenders(insights.toJSON() as never)).toEqual([]);
  });
});

describe("U1.6 · long names, emoji, non-Latin and right-to-left text", () => {
  // One of each way a name can be hostile to a layout.
  const NAMES = {
    long: "A".repeat(120),
    longWord: "Supercalifragilisticexpialidocious".repeat(4),
    emoji: "🎬 Movies 🍿 Plus 🎞️",
    japanese: "ネットフリックス",
    hindi: "नेटफ्लिक्स",
    arabic: "نيتفليكس",
    combining: "Nétflîx",
    mixed: "Netflix 日本 🎬 نيتفليكس"
  } as const;

  const rows = Object.entries(NAMES).map(([key, name], i) =>
    sub({ id: `sub_${key}`, name, price: { amountMinor: 1000 * (i + 1), currency: "USD" }, nextRenewalDate: iso(i + 1) })
  );

  it("the ledger lists every one by its own name, and totals them", async () => {
    resetFakes({ rows });
    const r = await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    for (const name of Object.values(NAMES)) expect(screen.getByText(name)).toBeTruthy();
    const total = rows.reduce((sum, s) => sum + s.price.amountMinor, 0);
    expect(screen.getByText(`${rows.length} BILLING · ${formatMoney(total, "USD")}/MO`)).toBeTruthy();
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });

  it("each screen that shows a name renders them all without a broken value", async () => {
    for (const ui of [<DashboardScreen key="d" />, <CalendarScreen key="c" />, <AnalyticsScreen key="a" />, <WrappedScreen key="w" />]) {
      resetFakes({ rows });
      const r = await renderScreen(ui, { settleMs: 400 });
      expect(offenders(r.toJSON() as never)).toEqual([]);
      r.unmount();
    }
  });

  it("a subscription page opens on a name of each kind, and shows that name", async () => {
    for (const row of rows) {
      resetFakes({ rows });
      routeParams.current = { id: row.id };
      const r = await renderScreen(<SubscriptionDetailScreen />, { settleMs: 400 });
      expect(screen.getAllByText(row.name).length).toBeGreaterThan(0);
      expect(offenders(r.toJSON() as never)).toEqual([]);
      r.unmount();
    }
  });

  it("an extreme amount is still money, never a broken number", async () => {
    resetFakes({ rows: [
      sub({ id: "big", name: "Enterprise", price: { amountMinor: 99_999_999, currency: "USD" } }),
      sub({ id: "small", name: "Cent", price: { amountMinor: 1, currency: "USD" } })
    ] });
    const r = await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    expect(screen.getByText(formatMoney(99_999_999, "USD"))).toBeTruthy();
    expect(screen.getByText(formatMoney(1, "USD"))).toBeTruthy();
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });
});

describe("U1.7 · every currency on a screen, not just in the formatter", () => {
  // format.behavior.test.ts pins the six symbols and separators; this proves a
  // screen renders each one as the formatter writes it, with no guessed sign.
  it.each(["USD", "EUR", "GBP", "INR", "CAD", "AUD"] as const)("%s: the row reads as the formatter writes it", async (currency) => {
    resetFakes({ rows: [sub({ id: "c", name: "One Service", price: { amountMinor: 123_456, currency } })] });
    const r = await renderScreen(<SubscriptionsScreen />, { settleMs: 400 });
    expect(screen.getByText(formatMoney(123_456, currency))).toBeTruthy();
    expect(offenders(r.toJSON() as never)).toEqual([]);
  });
});
