import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

// P6.2: a household member's monthly spend and currency, as sent. Stryker turned
// `monthlySpendMinor ?? 0` into `&& 0` on create and join (every amount stored as
// 0) and blanked the "USD" default on join, and no test noticed: every test
// created households without a spend. Plus the second open-banking provider.

type App = Awaited<ReturnType<typeof buildApp>>;
let ip = 0;
const nextIp = () => `10.88.0.${(ip += 1)}`;

async function tokenFor(app: App, email: string): Promise<string> {
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email }, remoteAddress: nextIp() });
  const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1] ?? "");
  const verified = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(raw)}`, remoteAddress: nextIp() });
  return verified.json().data.accessToken as string;
}
const auth = (token: string) => ({ authorization: `Bearer ${token}` });

describe("household spend, as sent", () => {
  it("create and join keep the member's monthly spend and currency; join defaults the currency to USD", async () => {
    const app = await buildApp();
    const owner = await tokenFor(app, "spend-owner@zeno.test");
    const created = await app.inject({
      method: "POST", url: "/api/v1/family/create", headers: auth(owner), remoteAddress: nextIp(),
      payload: { ownerName: "Asha", monthlySpendMinor: 4599, currency: "INR" }
    });
    expect(created.statusCode).toBe(200);
    const household = created.json().data.household as { shareCode: string; members: Array<{ name: string; monthlySpendMinor: number; currency: string }> };
    expect(household.members[0]).toMatchObject({ name: "Asha", monthlySpendMinor: 4599, currency: "INR" });

    const member = await tokenFor(app, "spend-member@zeno.test");
    const joined = await app.inject({
      method: "POST", url: "/api/v1/family/join", headers: auth(member), remoteAddress: nextIp(),
      payload: { shareCode: household.shareCode, memberName: "Ravi", monthlySpendMinor: 1250 }
    });
    expect(joined.statusCode).toBe(200);
    const members = joined.json().data.household.members as Array<{ name: string; monthlySpendMinor: number; currency: string }>;
    expect(members.find((m) => m.name === "Ravi")).toMatchObject({ monthlySpendMinor: 1250, currency: "USD" });
    await app.close();
  });
});

describe("open-banking intents", () => {
  it("accepts both providers by name, and nothing else", async () => {
    const app = await buildApp();
    const token = await tokenFor(app, "ob-intent@zeno.test");
    for (const provider of ["plaid", "mx"]) {
      const r = await app.inject({ method: "POST", url: `/api/v1/open-banking/${provider}/intent`, headers: auth(token), remoteAddress: nextIp(), payload: {} });
      expect(r.statusCode, provider).toBe(200);
    }
    const other = await app.inject({ method: "POST", url: "/api/v1/open-banking/yodlee/intent", headers: auth(token), remoteAddress: nextIp(), payload: {} });
    expect(other.statusCode).toBe(400);
    await app.close();
  });
});
