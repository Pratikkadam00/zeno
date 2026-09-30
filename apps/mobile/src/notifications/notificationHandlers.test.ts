import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// notificationHandlers.ts wires expo-notifications to expo-router. Both are
// native/RN modules that cannot load under Vitest's node environment, so they
// are stubbed at the module boundary: the foreground handler and the tap
// listener are captured, and router.push is recorded. What is under test is the
// module's own logic: what a tap does with the notification's `data`.

type Listener = (response: unknown) => void;
const listeners: Listener[] = [];
const removals: ReturnType<typeof vi.fn>[] = [];

vi.mock("expo-router", () => ({ router: { push: vi.fn() } }));
vi.mock("expo-notifications", () => ({
  setNotificationHandler: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn((listener: Listener) => {
    listeners.push(listener);
    const remove = vi.fn();
    removals.push(remove);
    return { remove };
  })
}));

const { router } = await import("expo-router");
const Notifications = await import("expo-notifications");
const { setupNotificationHandlers, cleanupNotificationHandlers } = await import("./notificationHandlers");
const push = vi.mocked(router.push);

// A tap as expo-notifications delivers it: the payload sits at
// response.notification.request.content.data.
function tap(data: unknown, listener: Listener | undefined = listeners.at(-1)): void {
  if (!listener) throw new Error("no tap listener registered");
  listener({ notification: { request: { content: { data } } } });
}

const UUID_ID = "sub_3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b";

beforeEach(() => {
  listeners.length = 0;
  removals.length = 0;
  push.mockClear();
  vi.mocked(Notifications.setNotificationHandler).mockClear();
  vi.mocked(Notifications.addNotificationResponseReceivedListener).mockClear();
});

afterEach(() => {
  cleanupNotificationHandlers();
});

describe("setupNotificationHandlers — foreground presentation", () => {
  it("shows a notification that arrives while the app is open (banner, list, sound, badge)", async () => {
    setupNotificationHandlers();
    const handler = vi.mocked(Notifications.setNotificationHandler).mock.calls[0]?.[0];
    expect(handler).toBeDefined();
    await expect(handler!.handleNotification({} as never)).resolves.toEqual({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true
    });
  });
});

describe("notification tap — navigation for the app's own reminders", () => {
  beforeEach(() => setupNotificationHandlers());

  it("'cancel' opens the cancel flow for that subscription", () => {
    tap({ subscriptionId: UUID_ID, action: "cancel" });
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith(`/subscription/cancel/${UUID_ID}`);
  });

  it("'view' opens the subscription's detail screen (seed-style ids too)", () => {
    tap({ subscriptionId: "sub_family_disney", action: "view" });
    expect(push).toHaveBeenCalledWith("/subscription/sub_family_disney");
  });

  it("'confirm' (the day-of 'was this expected?') opens the dashboard, with or without an id", () => {
    tap({ subscriptionId: UUID_ID, action: "confirm" });
    tap({ action: "confirm" });
    expect(push.mock.calls).toEqual([["/dashboard"], ["/dashboard"]]);
  });

  it("does nothing for an unknown action, a missing action, or no data at all", () => {
    tap({ subscriptionId: UUID_ID, action: "delete" });
    tap({ subscriptionId: UUID_ID });
    tap({});
    tap(undefined);
    tap(null);
    expect(push).not.toHaveBeenCalled();
  });

  it("'cancel' and 'view' do nothing without a string subscription id", () => {
    tap({ action: "cancel" });
    tap({ action: "view", subscriptionId: 42 });
    tap({ action: "cancel", subscriptionId: { id: UUID_ID } });
    expect(push).not.toHaveBeenCalled();
  });
});

describe("notification tap — untrusted data never re-targets navigation (§8)", () => {
  // Besides our own local reminders, a remote push to this device's Expo push
  // token can carry any data. The id is spliced into a route path, so anything
  // that is not shaped like one of the app's ids must be refused.
  beforeEach(() => setupNotificationHandlers());

  const hostile = [
    "../../settings",
    "x/../../paywall",
    "a/b",
    "sub_1?next=/paywall",
    "sub_1#frag",
    "%2e%2e%2fsettings",
    "sub 1",
    "sub_1\u0000",
    "",
    "s".repeat(129)
  ];

  for (const subscriptionId of hostile) {
    it(`refuses subscriptionId ${JSON.stringify(subscriptionId.length > 20 ? `${subscriptionId.slice(0, 12)}…(${subscriptionId.length})` : subscriptionId)}`, () => {
      tap({ subscriptionId, action: "cancel" });
      tap({ subscriptionId, action: "view" });
      expect(push).not.toHaveBeenCalled();
    });
  }

  it("accepts an id at the 128-character limit", () => {
    const longest = "s".repeat(128);
    tap({ subscriptionId: longest, action: "view" });
    expect(push).toHaveBeenCalledWith(`/subscription/${longest}`);
  });
});

describe("listener lifecycle", () => {
  it("setting up twice replaces the previous tap listener, so one tap navigates once", () => {
    setupNotificationHandlers();
    setupNotificationHandlers();
    expect(listeners).toHaveLength(2);
    expect(removals[0]).toHaveBeenCalledTimes(1);
    expect(removals[1]).not.toHaveBeenCalled();
  });

  it("cleanup removes the live listener once; a second cleanup is a no-op", () => {
    setupNotificationHandlers();
    cleanupNotificationHandlers();
    cleanupNotificationHandlers();
    expect(removals[0]).toHaveBeenCalledTimes(1);
  });

  it("setup after cleanup does not try to remove the already-removed listener again", () => {
    setupNotificationHandlers();
    cleanupNotificationHandlers();
    setupNotificationHandlers();
    expect(removals[0]).toHaveBeenCalledTimes(1);
    expect(removals[1]).not.toHaveBeenCalled();
  });
});
