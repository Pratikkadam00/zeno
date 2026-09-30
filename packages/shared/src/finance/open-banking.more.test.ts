import { describe, expect, it } from "vitest";
import { createMockOpenBankingAdapter } from "./open-banking";

describe("mock open banking adapter (dev only)", () => {
  const adapter = createMockOpenBankingAdapter("mx");

  it("labels its intents as dev mode for the provider it was created for", async () => {
    const intent = await adapter.createConnectionIntent({ provider: "mx", accountId: "acct_1", redirectUri: "zeno://bank-connected" });
    expect(intent).toEqual({
      provider: "mx",
      intentId: "mx_intent_acct_1",
      status: "created",
      hostedUrl: "zeno://bank-connected?provider=mx&mode=dev",
      scopes: ["transactions_read"],
      serverSeesCredentials: false
    });
  });

  it("returns a fixed sample transaction in integer minor units, tagged with its provider", async () => {
    expect(adapter.provider).toBe("mx");
    expect(await adapter.listRecentTransactions("ref_unused")).toEqual([
      { provider: "mx", transactionId: "mx_txn_midjourney", postedAt: "2026-05-24T00:00:00.000Z", merchant: "Midjourney", amountMinor: 1000, currency: "USD" }
    ]);
  });
});
