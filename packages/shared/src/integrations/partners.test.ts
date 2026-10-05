import { describe, expect, it } from "vitest";
import { listPartnerIntegrations, partnerIntegrationManifests } from "./partners";

describe("partner integrations", () => {
  // The public API and the website show this list as it is, so every field is a
  // statement to users. Pinned whole: a changed status, scope or export flag has to
  // be a deliberate edit here too (P6.1, F207).
  it("is exactly the five planned integrations, with their scopes and export flags", () => {
    expect(partnerIntegrationManifests).toEqual([
      { id: "monarch_money", name: "Monarch Money", category: "finance", status: "planned", requiredScopes: ["transactions:read"], exportsFinancialData: false },
      { id: "ynab", name: "YNAB", category: "finance", status: "planned", requiredScopes: ["budget:read"], exportsFinancialData: false },
      { id: "google_sheets", name: "Google Sheets", category: "spreadsheet", status: "planned", requiredScopes: ["spreadsheets.write"], exportsFinancialData: true },
      { id: "slack", name: "Slack", category: "team_chat", status: "planned", requiredScopes: ["chat:write"], exportsFinancialData: false },
      { id: "zapier", name: "Zapier", category: "automation", status: "planned", requiredScopes: ["webhook:write"], exportsFinancialData: false }
    ]);
  });

  it("claims no integration is being built: none has code in this repository", () => {
    expect(partnerIntegrationManifests.filter((manifest) => manifest.status !== "planned")).toEqual([]);
  });

  it("lists all of them, or one category's", () => {
    expect(listPartnerIntegrations()).toBe(partnerIntegrationManifests);
    expect(listPartnerIntegrations("finance").map((manifest) => manifest.id)).toEqual(["monarch_money", "ynab"]);
    expect(listPartnerIntegrations("team_chat").map((manifest) => manifest.id)).toEqual(["slack"]);
  });
});
