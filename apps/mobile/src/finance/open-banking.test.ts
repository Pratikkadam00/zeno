import { describe, expect, it } from "vitest";
import { createDevOpenBankingIntent } from "./open-banking";

// The dev intent is built by the shared in-memory mock adapter: no network,
// no credentials. (Exercised with the "mx" provider only.)
describe("createDevOpenBankingIntent", () => {
  it("creates a dev-mode, read-only connection intent that returns to the app's deep link", async () => {
    await expect(createDevOpenBankingIntent("mx")).resolves.toEqual({
      provider: "mx",
      intentId: "mx_intent_acct_dev",
      status: "created",
      hostedUrl: "zeno://bank-connected?provider=mx&mode=dev",
      scopes: ["transactions_read"],
      serverSeesCredentials: false
    });
  });
});
