import { act, render, screen } from "@testing-library/react-native";
import type { Subscription } from "@zeno/shared";
import { ZenoThemeProvider } from "../theme/theme-provider";
import SubscriptionDetailScreen from "../../app/subscription/[id]";
import SubscriptionCancelScreen from "../../app/subscription/cancel/[id]";

/**
 * P3.5: the two routes that take a parameter from a link,
 * zeno://subscription/<id> and zeno://subscription/cancel/<id>. The id must
 * resolve to one of THIS user's subscriptions, or the screen shows "not found"
 * and does nothing else, whatever the link carries (unknown, empty, a path, a
 * repeated parameter that arrives as an array, a lookalike).
 */
let mockParams: Record<string, unknown> = {};
jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn(), replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => mockParams
}));
const mockStore = { subscriptions: [] as Subscription[] };
jest.mock("./subscription-store", () => ({
  useSubscriptionStore: () => ({
    subscriptions: mockStore.subscriptions,
    notificationSettings: {},
    updateNotificationSettings: jest.fn(),
    updateSubscription: jest.fn(),
    deleteSubscription: jest.fn(),
    pauseSubscription: jest.fn(),
    markVerifiedCancelled: jest.fn(),
    markStillCharging: jest.fn(),
    requestCancellation: jest.fn()
  })
}));
jest.mock("../notifications/notificationService", () => ({
  cancelNotificationsForSubscription: jest.fn(),
  scheduleRenewalNotificationsWithPreferences: jest.fn()
}));

const netflix: Subscription = {
  id: "sub_netflix",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  version: 1,
  name: "Netflix",
  category: "entertainment",
  price: { amountMinor: 1549, currency: "USD" },
  billingCycle: "monthly",
  status: "active",
  ownerProfileId: "profile_local",
  source: "manual"
};

beforeEach(() => {
  mockStore.subscriptions = [netflix];
});

async function shown(Screen: () => React.JSX.Element, params: Record<string, unknown>) {
  mockParams = params;
  const r = render(<ZenoThemeProvider><Screen /></ZenoThemeProvider>);
  await act(async () => {}); // theme provider's storage reads
  return r;
}

const ROUTES = [
  ["zeno://subscription/<id>", SubscriptionDetailScreen],
  ["zeno://subscription/cancel/<id>", SubscriptionCancelScreen]
] as const;

const UNRESOLVABLE: [string, Record<string, unknown>][] = [
  ["an unknown id", { id: "sub_someone_else" }],
  ["no id", {}],
  ["an empty id", { id: "" }],
  ["a path", { id: "../settings" }],
  ["a repeated parameter (an array)", { id: ["sub_netflix", "sub_netflix"] }],
  ["a lookalike", { id: "sub_netflix " }],
  ["a different case", { id: "SUB_NETFLIX" }]
];

describe.each(ROUTES)("%s", (_route, Screen) => {
  it.each(UNRESOLVABLE)("%s shows \"not found\" and nothing of anyone's data", async (_name, params) => {
    await shown(Screen as () => React.JSX.Element, params);
    expect(screen.getByText("Subscription not found")).toBeTruthy();
    expect(screen.queryByText("Netflix")).toBeNull();
  });

  it("the user's own id opens that subscription", async () => {
    await shown(Screen as () => React.JSX.Element, { id: "sub_netflix" });
    expect(screen.queryByText("Subscription not found")).toBeNull();
    expect(screen.getAllByText("Netflix").length).toBeGreaterThan(0);
  });
});
