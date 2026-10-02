import { services } from "@zeno/service-catalog";
import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { Alert, Platform, ToastAndroid } from "react-native";
import DiscoverScreen from "../../app/(tabs)/discover";
import { parseCSV } from "../discovery/csvParser";
import type { ParsedSubscription } from "../discovery/emailScanner";
import { fakeNotificationsModule, fakeStorage, renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8c-2: the Discover tab, the scan entry points (bank CSV, Gmail) and the
 * results receipt, through the real subscription store. The Gmail and file
 * boundaries are faked (the inbox scan, Google's auth hook, the file picker);
 * the CSV parser, the free-plan cap and the found-money summary are real.
 */
jest.mock("../security/lock-store", () => jest.requireActual("../test-support/screen-fakes").fakeLockStoreModule);
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);

const mockGmail = {
  list: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn(),
  scan: jest.fn()
};
jest.mock("../discovery/emailScanner", () => ({
  listConnectedGmailAccounts: () => mockGmail.list(),
  connectGmail: (...a: unknown[]) => mockGmail.connect(...a),
  disconnectGmailAccount: (...a: unknown[]) => mockGmail.disconnect(...a),
  scanAllGmailAccounts: (...a: unknown[]) => mockGmail.scan(...a)
}));
const mockAuth = { request: {} as object | null, response: null as object | null, prompt: jest.fn() };
jest.mock("expo-auth-session/providers/google", () => ({ useAuthRequest: () => [mockAuth.request, mockAuth.response, mockAuth.prompt] }));
jest.mock("expo-auth-session", () => ({ ResponseType: { Code: "code" } }));
const mockPick = jest.fn();
jest.mock("expo-document-picker", () => ({ getDocumentAsync: (...a: unknown[]) => mockPick(...a) }));
let mockUuid = 0;
jest.mock("expo-crypto", () => ({ randomUUID: () => `uuid-${(mockUuid += 1)}` }));
const mockFunnel = jest.fn();
jest.mock("../api/client", () => ({ recordFunnelEvent: (...a: unknown[]) => mockFunnel(...a) }));
const mockShare = jest.fn();
jest.mock("../utils/share", () => ({ shareText: (...a: unknown[]) => mockShare(...a) }));
jest.mock("../auth/authStore", () => {
  const { create } = jest.requireActual("zustand");
  return { useAuthStore: create(() => ({ plan: "free" })) };
});
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const { useAuthStore } = require("../auth/authStore") as { useAuthStore: { setState: (s: object) => void } };

const DAY = 86_400_000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
const found = (over: Partial<ParsedSubscription>): ParsedSubscription => ({
  name: "Spotify", amount: 11.99, currency: "USD", billingCycle: "monthly", lastCharged: iso(-20), nextRenewal: iso(10),
  confidence: "high", rawMerchant: "SPOTIFY", ...over
});
const tracked = (n: number): Subscription[] => Array.from({ length: n }, (_, i) => ({
  id: `t${i}`, createdAt: iso(-90), updatedAt: iso(-90), version: 1, name: `Tracked ${i}`, category: "other",
  price: { amountMinor: 500, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: iso(5), status: "active",
  ownerProfileId: "profile_local", source: "manual"
}));
const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});

beforeEach(() => {
  jest.useFakeTimers();
  resetFakes();
  mockGmail.list.mockReset().mockResolvedValue([]);
  mockGmail.connect.mockReset();
  mockGmail.disconnect.mockReset().mockResolvedValue(undefined);
  mockGmail.scan.mockReset().mockResolvedValue([]);
  mockAuth.request = {};
  mockAuth.response = null;
  mockAuth.prompt.mockReset().mockResolvedValue(undefined);
  mockPick.mockReset();
  mockFunnel.mockReset();
  mockShare.mockReset().mockResolvedValue(undefined);
  alert.mockClear();
  useAuthStore.setState({ plan: "free" });
  delete process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
});
afterEach(() => jest.useRealTimers());

const press = async (name: string | RegExp) => {
  await act(async () => { fireEvent.press(screen.getByRole("button", { name })); });
};
async function withScanResults(results: ParsedSubscription[]) {
  mockGmail.list.mockResolvedValue([{ address: "me@gmail.test", token: "t" }]);
  mockGmail.scan.mockResolvedValue(results);
  await renderScreen(<DiscoverScreen />);
  await press("Scan inbox");
}

describe("Discover, before any scan", () => {
  it("both ways in, the export guides, the empty state; every control named", async () => {
    const r = await renderScreen(<DiscoverScreen />);
    expect(screen.getByText("Discover")).toBeTruthy();
    expect(screen.getByText("Find your subscriptions")).toBeTruthy();
    expect(screen.queryByText("Chase")).toBeNull();
    await press("How to export from your bank");
    expect(screen.getByText("Chase")).toBeTruthy();
    expect(screen.getByRole("button", { name: "How to export from your bank" }).props.accessibilityState).toMatchObject({ expanded: true });
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
    await press("Skip for now");
    expect(routerMock.replace).toHaveBeenLastCalledWith("/dashboard");
  });

  it("Connect Gmail without a client id says what is missing, and opens nothing", async () => {
    await renderScreen(<DiscoverScreen />);
    await press("Connect Gmail");
    expect(screen.getByText("Add EXPO_PUBLIC_GOOGLE_CLIENT_ID before connecting Gmail.")).toBeTruthy();
    expect(mockAuth.prompt).not.toHaveBeenCalled();
  });

  it("with a client id, Connect Gmail opens Google's consent; before the request is ready it is disabled", async () => {
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = "client.apps.googleusercontent.com";
    await renderScreen(<DiscoverScreen />);
    await press("Connect Gmail");
    expect(mockAuth.prompt).toHaveBeenCalledTimes(1);
    mockAuth.request = null;
    await renderScreen(<DiscoverScreen />);
    expect(screen.getAllByRole("button", { name: "Connect Gmail" }).at(-1)!.props.accessibilityState).toMatchObject({ disabled: true });
  });
});

describe("Discover, Gmail", () => {
  it("after Google approves, the inbox is connected and scanned; a failed connection is shown", async () => {
    mockGmail.connect.mockResolvedValueOnce({ address: "new@gmail.test", token: "t" });
    mockGmail.scan.mockResolvedValue([found({})]);
    mockAuth.response = { type: "success", url: "zeno://auth?code=1" };
    await renderScreen(<DiscoverScreen />);
    expect(mockGmail.connect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Found 1 subscriptions")).toBeTruthy();

    resetFakes();
    mockGmail.connect.mockRejectedValueOnce(new Error("Gmail authorization was cancelled."));
    mockAuth.response = { type: "success", url: "zeno://auth?code=2" };
    await renderScreen(<DiscoverScreen />);
    expect(screen.getAllByText("Gmail authorization was cancelled.").length).toBeGreaterThan(0);
  });

  it("connected inboxes are listed; Disconnect removes one; two inboxes scan as 'all'", async () => {
    mockGmail.list.mockResolvedValue([{ address: "a@gmail.test", token: "1" }, { address: "b@gmail.test", token: "2" }]);
    // The client id is read while rendering, so set it first.
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID = "client.apps.googleusercontent.com";
    await renderScreen(<DiscoverScreen />);
    expect(screen.getByRole("button", { name: "Scan all inboxes" })).toBeTruthy();
    await press("Disconnect a@gmail.test");
    expect(mockGmail.disconnect).toHaveBeenCalledWith("a@gmail.test");
    expect(screen.queryByText("a@gmail.test")).toBeNull();
    expect(screen.getByRole("button", { name: "Scan inbox" })).toBeTruthy();
    await press("Add another Gmail inbox");
    expect(mockAuth.prompt).toHaveBeenCalledTimes(1);
  });

  it("while scanning: progress and a working Cancel (late results are dropped)", async () => {
    let finish!: (v: ParsedSubscription[]) => void;
    mockGmail.list.mockResolvedValue([{ address: "me@gmail.test", token: "t" }]);
    mockGmail.scan.mockImplementation((onProgress: (c: number, t: number) => void) => new Promise((res) => { onProgress(3, 10); finish = res; }));
    await renderScreen(<DiscoverScreen />);
    await press("Scan inbox");
    expect(screen.getByText("Scanning 3 of 10 emails...")).toBeTruthy();
    await press("Cancel scan");
    await act(async () => { finish([found({})]); });
    expect(screen.queryByText(/^Found /)).toBeNull();
    expect(screen.getByRole("button", { name: "Scan inbox" })).toBeTruthy();
  });

  it("a failed scan is shown, not swallowed", async () => {
    mockGmail.list.mockResolvedValue([{ address: "me@gmail.test", token: "t" }]);
    mockGmail.scan.mockRejectedValue(new Error("Gmail rate limit"));
    await renderScreen(<DiscoverScreen />);
    await press("Scan inbox");
    expect(screen.getByText("Gmail rate limit")).toBeTruthy();
  });
});

describe("Discover, bank CSV", () => {
  const csv = [
    "Date,Description,Amount",
    `${iso(-75).slice(0, 10)},NETFLIX.COM,-15.49`,
    `${iso(-45).slice(0, 10)},NETFLIX.COM,-15.49`,
    `${iso(-15).slice(0, 10)},NETFLIX.COM,-15.49`
  ].join("\n");

  it("a picked file goes through the real parser; what it finds is shown and announced", async () => {
    const expected = parseCSV(csv, "USD");
    expect(expected.subscriptions.length).toBeGreaterThan(0);
    mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file://x.csv", file: { text: async () => csv } }] });
    await renderScreen(<DiscoverScreen />);
    await press("Import CSV file");
    expect(screen.getByText(`Found ${expected.subscriptions.length} subscriptions`)).toBeTruthy();
    expect(alert).toHaveBeenCalledWith("Zeno", `Found ${expected.subscriptions.length} subscriptions from ${expected.detectedFormat}.`);
    expect(screen.getAllByText("Bank import").length).toBe(expected.subscriptions.length);
  });

  it("cancelling the picker changes nothing; a picker failure is shown", async () => {
    mockPick.mockResolvedValueOnce({ canceled: true, assets: [] });
    await renderScreen(<DiscoverScreen />);
    await press("Import CSV file");
    expect(screen.getByText("Find your subscriptions")).toBeTruthy();
    mockPick.mockRejectedValueOnce("not an Error");
    await press("Import CSV file");
    expect(screen.getByText("Discovery scan failed.")).toBeTruthy();
  });
});

describe("Discover, the results receipt", () => {
  it("each result is an editable row with a named checkbox; the seed's Netflix is marked already tracked and unselected", async () => {
    await withScanResults([found({ name: "Spotify" }), found({ name: "Netflix", serviceId: "netflix", amount: 15.49 }), found({ name: "Duolingo", billedThrough: "app_store", confidence: "low" })]);
    expect(screen.getByText("Found 3 subscriptions")).toBeTruthy();
    expect(screen.getByText("Already tracked")).toBeTruthy();
    expect(screen.getByText("App Store")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Deselect Spotify" }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByRole("checkbox", { name: "Select Netflix" }).props.accessibilityState).toMatchObject({ checked: false });
    expect(screen.getByText("2 selected")).toBeTruthy();
    fireEvent.press(screen.getByRole("checkbox", { name: "Deselect Spotify" }));
    expect(screen.getByText("1 selected")).toBeTruthy();
    await press("Select all subscriptions");
    expect(screen.getByText("3 selected")).toBeTruthy();
    await press("Deselect all subscriptions");
    expect(screen.getByText("Select subscriptions to add")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select subscriptions to add" }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("adding saves each selected one, schedules its reminders, records the import, and returns to the ledger", async () => {
    await withScanResults([found({ name: "Spotify" }), found({ name: "Hulu", amount: 7.99 })]);
    await press("Add 2 subscriptions");
    const saved = [...fakeStorage.rows.values()].filter((s) => ["Spotify", "Hulu"].includes(s.name));
    expect(saved.map((s) => [s.name, s.price.amountMinor, s.source])).toEqual([["Spotify", 1199, "email"], ["Hulu", 799, "email"]]);
    expect(fakeNotificationsModule.scheduleRenewalNotifications).toHaveBeenCalledTimes(2);
    expect(mockFunnel).toHaveBeenCalledWith("import_completed", "email");
    expect(alert).toHaveBeenCalledWith("Zeno", "Added 2 subscriptions.");
    expect(routerMock.replace).toHaveBeenLastCalledWith("/dashboard");
  });

  it("the free plan cap: with 8 tracked, 3 selected adds 2 and sends the user to upgrade", async () => {
    resetFakes({ rows: tracked(8) });
    await withScanResults([found({ name: "A" }), found({ name: "B" }), found({ name: "C" })]);
    expect(screen.getByText("Free plan tracks up to 10 — you can add 2 more of these 3.")).toBeTruthy();
    await press("Add 2 of 3 (Free plan)");
    expect([...fakeStorage.rows.values()].filter((s) => ["A", "B", "C"].includes(s.name))).toHaveLength(2);
    expect(mockFunnel).toHaveBeenCalledWith("free_cap_hit");
    expect(alert).toHaveBeenCalledWith("Zeno", "Added 2 of 3 — Free plan tracks up to 10. Upgrade to track the rest.");
    expect(routerMock.push).toHaveBeenLastCalledWith("/paywall");
  });

  it("at the cap nothing is added, and the user is told to upgrade", async () => {
    resetFakes({ rows: tracked(10) });
    await withScanResults([found({ name: "A" })]);
    expect(screen.getByText("Free plan limit reached (10 tracked). Upgrade to track any of these.")).toBeTruthy();
    await press("Upgrade to add 1 subscriptions");
    expect(alert).toHaveBeenCalledWith("Zeno", "Free plan limit reached (10 tracked). Upgrade to track any of the 1 you selected.");
    expect([...fakeStorage.rows.values()].some((s) => s.name === "A")).toBe(false);
  });

  it("a paid plan is never capped", async () => {
    resetFakes({ rows: tracked(10) });
    useAuthStore.setState({ plan: "pro" });
    await withScanResults([found({ name: "A" })]);
    await press("Add 1 subscriptions");
    expect([...fakeStorage.rows.values()].some((s) => s.name === "A")).toBe(true);
  });

  it("the found-money card totals a year of what was found and shares it", async () => {
    await withScanResults([found({ name: "Spotify", amount: 10 }), found({ name: "Hulu", amount: 5 })]);
    expect(screen.getByText("$180.00/year")).toBeTruthy();
    await press("Share what Zeno found");
    expect(mockShare).toHaveBeenCalledWith("Zeno found $180.00/year in subscriptions I'd forgotten I was paying for.");
    expect(mockFunnel).toHaveBeenCalledWith("share_card_generated", "found_money");
  });

  it("Start over returns to the scan screen", async () => {
    await withScanResults([found({})]);
    await press("Start over");
    expect(screen.getByText("Discover")).toBeTruthy();
  });
});

describe("Discover, edges", () => {
  it("a result matching a tracked subscription by catalog slug alone (different name) is still 'already tracked'", async () => {
    // The seed tracks Netflix with serviceSlug "netflix"; the email names it differently.
    await withScanResults([found({ name: "NETFLIX.COM Premium", serviceId: "netflix" })]);
    expect(screen.getByText("Already tracked")).toBeTruthy();
    expect(screen.getByRole("checkbox", { name: "Select NETFLIX.COM Premium" }).props.accessibilityState).toMatchObject({ checked: false });
  });

  it("a medium-confidence result shows its confidence; a cancelled subscription does not count as already tracked", async () => {
    resetFakes({ rows: [{ ...tracked(1)[0]!, name: "Hulu", status: "cancelled" }] });
    await withScanResults([found({ name: "Hulu", confidence: "medium" })]);
    expect(screen.getByText("medium")).toBeTruthy();
    expect(screen.queryByText("Already tracked")).toBeNull();
    expect(screen.getByRole("checkbox", { name: "Deselect Hulu" })).toBeTruthy();
  });

  it("a failed inbox listing or disconnect never breaks the screen", async () => {
    mockGmail.list.mockRejectedValueOnce(new Error("keychain locked"));
    await renderScreen(<DiscoverScreen />);
    expect(screen.getByRole("button", { name: "Connect Gmail" })).toBeTruthy();

    mockGmail.list.mockResolvedValue([{ address: "a@gmail.test", token: "1" }]);
    mockGmail.disconnect.mockRejectedValueOnce(new Error("revoke failed"));
    await renderScreen(<DiscoverScreen />);
    await press("Disconnect a@gmail.test");
    expect(screen.queryByText("a@gmail.test")).toBeNull();
  });

  it("reconnecting an inbox that is already listed does not list it twice", async () => {
    mockGmail.list.mockResolvedValue([{ address: "me@gmail.test", token: "t" }]);
    mockGmail.connect.mockResolvedValueOnce({ address: "me@gmail.test", token: "t2" });
    mockGmail.scan.mockImplementation(() => new Promise(() => {})); // stays scanning
    mockAuth.response = { type: "success", url: "zeno://auth?code=3" };
    await renderScreen(<DiscoverScreen />);
    expect(screen.getAllByText("me@gmail.test")).toHaveLength(1);
  });

  it("a catalog match is saved under its catalog slug, its category mapped to the app's", async () => {
    resetFakes({ rows: [] });
    const cases = [
      ["netflix", "entertainment"], ["xbox-game-pass-ultimate", "entertainment"], ["spotify-premium", "entertainment"],
      ["chatgpt-plus", "ai_tools"], ["adobe-creative-cloud", "productivity"], ["peloton", "health"], ["ynab", "finance"],
      ["duolingo-plus", "education"], ["icloud-plus", "developer_tools"], ["nordpass", "developer_tools"], ["patreon", "other"]
    ] as const;
    useAuthStore.setState({ plan: "pro" });
    await withScanResults(cases.map(([id]) => found({ name: `Found ${id}`, serviceId: id })));
    await press(`Add ${cases.length} subscriptions`);
    const saved = new Map([...fakeStorage.rows.values()].map((s) => [s.name, s]));
    for (const [id, category] of cases) {
      expect([id, saved.get(`Found ${id}`)?.serviceSlug, saved.get(`Found ${id}`)?.category]).toEqual([id, services.find((x) => x.id === id)!.slug, category]);
    }
  });

  it("on a phone the picked file is read from its uri (no web File object)", async () => {
    const csvText = ["Date,Description,Amount", `${iso(-75).slice(0, 10)},HULU,-7.99`, `${iso(-45).slice(0, 10)},HULU,-7.99`, `${iso(-15).slice(0, 10)},HULU,-7.99`].join("\n");
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValue({ text: async () => csvText } as Response);
    mockPick.mockResolvedValue({ canceled: false, assets: [{ uri: "file:///cache/stmt.csv" }] });
    await renderScreen(<DiscoverScreen />);
    await press("Import CSV file");
    expect(fetchSpy).toHaveBeenCalledWith("file:///cache/stmt.csv");
    expect(screen.getByText(/^Found \d+ subscriptions$/)).toBeTruthy();
    fetchSpy.mockRestore();
  });

  it("on Android the confirmation is a toast, not an alert", async () => {
    const toast = jest.spyOn(ToastAndroid, "show").mockImplementation(() => {});
    const os = jest.replaceProperty(Platform, "OS", "android");
    try {
      await withScanResults([found({ name: "Spotify" })]);
      await press("Add 1 subscriptions");
      expect(toast).toHaveBeenCalledWith("Added 1 subscriptions.", ToastAndroid.SHORT);
      expect(alert).not.toHaveBeenCalled();
    } finally {
      // Only what this test replaced: the file-level Alert spy must survive.
      os.restore();
      toast.mockRestore();
    }
  });
});

describe("Discover, editing a result (F113)", () => {
  const open = async () => {
    await withScanResults([found({ name: "Spotify", amount: 11.99, nextRenewal: "2026-11-05T00:00:00.000Z" })]);
    await press("Edit Spotify");
  };
  const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
  // Like a keyboard: each keystroke edits what the field CURRENTLY shows (after
  // the last re-render), not the string the test has in mind.
  const keys = (label: string, chars: string) => {
    for (const ch of chars) type(label, `${screen.getByLabelText(label).props.value}${ch}`);
  };
  const backspace = (label: string, times: number) => {
    for (let i = 0; i < times; i += 1) type(label, String(screen.getByLabelText(label).props.value).slice(0, -1));
  };

  it("the amount can be typed with cents, keystroke by keystroke", async () => {
    await open();
    backspace("Amount", 5); // "11.99" -> ""
    keys("Amount", "9.99");
    expect(screen.getByLabelText("Amount").props.value).toBe("9.99");
    await press("Save");
    expect(screen.getByText("$9.99")).toBeTruthy();
  });

  it("the renewal date can be cleared and retyped without crashing, and partial input is never rewritten", async () => {
    await open();
    expect(() => {
      backspace("Next renewal date", 10); // "2026-11-05" -> "" one key at a time
      keys("Next renewal date", "2026-12-01");
    }).not.toThrow();
    expect(screen.getByLabelText("Next renewal date").props.value).toBe("2026-12-01");
  });

  it("an incomplete or impossible date cannot be saved, and says why", async () => {
    await open();
    backspace("Next renewal date", 10);
    keys("Next renewal date", "2026-1");
    expect(screen.getByLabelText("Next renewal date").props.value).toBe("2026-1");
    expect(screen.getByText("Use YYYY-MM-DD")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" }).props.accessibilityState).toMatchObject({ disabled: true });
    type("Next renewal date", "2026-02-30");
    expect(screen.getByRole("button", { name: "Save" }).props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("name and cycle edits are saved; Cancel discards", async () => {
    await open();
    type("Service name", "Spotify Duo");
    await press("annual");
    await press("Save");
    expect(screen.getByText("Spotify Duo")).toBeTruthy();
    expect(screen.getByText("annual")).toBeTruthy();
    await press("Edit Spotify Duo");
    type("Service name", "Discarded");
    await press("Cancel");
    expect(screen.queryByText("Discarded")).toBeNull();
  });
});
