import { describe, expect, it } from "vitest";
import { listPartnerIntegrations } from "./partners";

describe("partner integrations", () => {
  it("lists partner manifests by category", () => {
    expect(listPartnerIntegrations("team_chat")[0]?.id).toBe("slack");
    expect(listPartnerIntegrations().length).toBeGreaterThanOrEqual(5);
  });
});
