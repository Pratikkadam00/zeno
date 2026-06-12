import { describe, expect, it } from "vitest";
import { canUseScope, createPublicApiKeyPreview, type PublicApiKey } from "./keys";

describe("public API keys", () => {
  const key: PublicApiKey = {
    id: "key_1",
    label: "Dashboard export",
    prefix: "sr_live",
    scopes: ["subscriptions:read", "analytics:read"],
    createdAt: "2026-05-24T00:00:00.000Z"
  };

  it("masks key material in previews", () => {
    expect(createPublicApiKeyPreview(key).maskedKey).toBe("sr_live_************************");
  });

  it("checks scope availability", () => {
    expect(canUseScope(key, "analytics:read")).toBe(true);
    expect(canUseScope(key, "webhooks:write")).toBe(false);
  });
});
