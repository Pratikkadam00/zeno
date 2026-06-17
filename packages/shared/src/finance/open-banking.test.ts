import { describe, expect, it } from "vitest";
import { createMockOpenBankingAdapter } from "./open-banking";

describe("open banking adapter", () => {
  it("creates read-only dev connection intents without credential access", async () => {
    const adapter = createMockOpenBankingAdapter("plaid");
    const intent = await adapter.createConnectionIntent({
      provider: "plaid",
      accountId: "acct_dev",
      redirectUri: "zeno://bank-connected"
    });

    expect(intent.scopes).toEqual(["transactions_read"]);
    expect(intent.serverSeesCredentials).toBe(false);
  });
});
