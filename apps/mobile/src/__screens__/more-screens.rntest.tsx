import type { Subscription } from "@zeno/shared";
import { act, fireEvent, screen } from "@testing-library/react-native";
import BackendRoute from "../../app/backend";
import BusinessScreen from "../../app/business";
import OpenBankingRoute from "../../app/open-banking";
import PartnersScreen from "../../app/partners";
import PublicApiScreen from "../../app/public-api";
import SpendTwinScreen from "../../app/spend-twin";
import WidgetsScreen from "../../app/widgets";
import { renderScreen, resetFakes, routerMock, unnamedControls } from "../test-support/screen-harness";

/**
 * P3.8f-2: the small screens. The two developer screens (open-banking,
 * backend) are rendered in a development build with their API calls faked (no
 * Plaid or network call is made), and in a release build (F151).
 */
jest.mock("../storage/database", () => jest.requireActual("../test-support/screen-fakes").fakeDatabaseModule);
jest.mock("../storage/subscription-repository", () => jest.requireActual("../test-support/screen-fakes").fakeRepositoryModule);
jest.mock("../fx/rates", () => jest.requireActual("../test-support/screen-fakes").fakeFxModule);
jest.mock("../notifications/notificationService", () => jest.requireActual("../test-support/screen-fakes").fakeNotificationsModule);
jest.mock("expo-router", () => jest.requireActual("../test-support/screen-fakes").fakeExpoRouterModule);
jest.mock("../api/client", () => ({ getMobileBackendStatus: jest.fn(), createPlaidLinkToken: jest.fn(), connectPlaidSandbox: jest.fn() }));
/* eslint-disable-next-line @typescript-eslint/no-require-imports */
const api = require("../api/client") as Record<string, jest.Mock>;

const sub = (over: Partial<Subscription>): Subscription => ({
  id: "s", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z", version: 1, name: "Gym", category: "health",
  price: { amountMinor: 4000, currency: "USD" }, billingCycle: "monthly", nextRenewalDate: "2026-10-12T09:00:00.000Z",
  status: "active", ownerProfileId: "profile_local", source: "manual", ...over
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date("2026-10-10T12:00:00.000Z"));
  for (const f of Object.values(api)) f.mockReset();
});
afterEach(() => jest.useRealTimers());

const show = async (ui: React.ReactElement, rows: Subscription[] = [sub({})]) => {
  resetFakes({ rows });
  return renderScreen(ui, { settleMs: 300 });
};
const press = async (name: string) => {
  await act(async () => { fireEvent.press(screen.getAllByRole("button", { name }).at(-1)!); });
};
async function asRelease(run: () => Promise<void>) {
  const g = globalThis as { __DEV__?: boolean };
  const was = g.__DEV__;
  g.__DEV__ = false;
  try { await run(); } finally { g.__DEV__ = was; }
}

describe("widgets preview", () => {
  it("says it is a preview, promises nothing it can't keep (F152), and shows what a widget would", async () => {
    await show(<WidgetsScreen />);
    expect(screen.getByText("Preview only")).toBeTruthy();
    expect(screen.queryByText(/let you know/)).toBeNull();
    expect(screen.getByText(/^Gym · \$40\.00/)).toBeTruthy();
    expect(screen.getByText("1 ACTIVE")).toBeTruthy();
  });

  it("nothing tracked: no next renewal", async () => {
    await show(<WidgetsScreen />, []);
    expect(screen.getByText("None")).toBeTruthy();
  });
});

describe("spend twin", () => {
  it("converts the month into everyday things, and says the prices are fixed references", async () => {
    await show(<SpendTwinScreen />);
    expect(screen.getByText("$40.00 per month, converted into everyday things.")).toBeTruthy();
    expect(screen.getByText("Equivalents")).toBeTruthy();
    expect(screen.getByText(/^Comparisons use fixed reference prices built into the app/)).toBeTruthy();
  });

  it("nothing tracked: nothing to compare", async () => {
    await show(<SpendTwinScreen />, []);
    expect(screen.getByText("NOTHING TO COMPARE")).toBeTruthy();
  });
});

describe("coming soon", () => {
  it.each([
    ["Business", <BusinessScreen key="b" />],
    ["Partners", <PartnersScreen key="p" />],
    ["Public API", <PublicApiScreen key="a" />]
  ])("%s: says it isn't built, with no waitlist button (F153)", async (title, ui) => {
    const r = await show(ui);
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText("COMING SOON")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(unnamedControls(r.toJSON() as never)).toEqual([]);
  });
});

describe("developer screens (F151)", () => {
  it("release build: open-banking calls nothing and says it isn't in this version; Go back", async () => {
    await asRelease(async () => {
      await show(<OpenBankingRoute />);
      expect(screen.getByText("This screen isn't part of this version of Zeno.")).toBeTruthy();
      expect(screen.queryByText("Connect a sandbox bank")).toBeNull();
      await press("Go back");
      expect(routerMock.back).toHaveBeenCalledTimes(1);
    });
    expect(api.createPlaidLinkToken).not.toHaveBeenCalled();
    expect(api.connectPlaidSandbox).not.toHaveBeenCalled();
  });

  it("release build: backend makes no network check and shows no API address", async () => {
    await asRelease(async () => {
      await show(<BackendRoute />);
      expect(screen.getByText("This screen isn't part of this version of Zeno.")).toBeTruthy();
    });
    expect(api.getMobileBackendStatus).not.toHaveBeenCalled();
  });

  it("development build: open-banking, with its calls faked (no Plaid call is made)", async () => {
    api.createPlaidLinkToken!.mockResolvedValueOnce({ linkToken: "x", expiration: "2026-10-10T13:00:00.000Z" }).mockRejectedValueOnce(new Error("Not configured")).mockRejectedValueOnce("x");
    api.connectPlaidSandbox!.mockResolvedValueOnce({ transactionCount: 12 }).mockRejectedValueOnce(new Error("Sandbox down")).mockRejectedValueOnce("x");
    await show(<OpenBankingRoute />);
    expect(screen.getByText("Not connected.")).toBeTruthy();
    await press("Check connection");
    expect(screen.getByText(/^Server is configured\. Link token ready/)).toBeTruthy();
    await press("Check connection");
    expect(screen.getByText("Not configured")).toBeTruthy();
    await press("Check connection");
    expect(screen.getByText("Bank connect is not configured on the server.")).toBeTruthy();
    await press("Connect a sandbox bank");
    expect(screen.getByText(/^Sandbox bank connected\. Pulled 12 transactions/)).toBeTruthy();
    await press("Connect a sandbox bank");
    expect(screen.getByText("Sandbox down")).toBeTruthy();
    await press("Connect a sandbox bank");
    expect(screen.getByText("Sandbox connection failed.")).toBeTruthy();
  });

  it("development build: open-banking says it's working while a request runs", async () => {
    api.createPlaidLinkToken!.mockImplementation(() => new Promise(() => {}));
    await show(<OpenBankingRoute />);
    await press("Check connection");
    expect(screen.getByText("Requesting a secure link token…")).toBeTruthy();
  });

  it("development build: backend shows the connection and its capabilities, and refreshes", async () => {
    api.getMobileBackendStatus!
      .mockResolvedValueOnce({ connected: true, apiBaseUrl: "https://api.test/api/v1", capabilities: ["cloud_sync", "family_vault"], message: "OK" })
      .mockResolvedValueOnce({ connected: false, apiBaseUrl: "https://api.test/api/v1", capabilities: [], message: "Backend returned HTTP 503." });
    await show(<BackendRoute />);
    expect(screen.getByText("Connected")).toBeTruthy();
    expect(screen.getByText("cloud sync")).toBeTruthy();
    await press("Refresh connection");
    expect(screen.getByText("Not connected")).toBeTruthy();
    expect(screen.getByText("Backend returned HTTP 503.")).toBeTruthy();
  });

  it("development build: backend before the first answer", async () => {
    api.getMobileBackendStatus!.mockImplementation(() => new Promise(() => {}));
    await show(<BackendRoute />);
    expect(screen.getByText("Checking backend...")).toBeTruthy();
  });
});
