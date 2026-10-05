export type PartnerIntegrationId =
  | "monarch_money"
  | "ynab"
  | "google_sheets"
  | "slack"
  | "zapier";

export type PartnerIntegrationManifest = {
  id: PartnerIntegrationId;
  name: string;
  category: "finance" | "spreadsheet" | "team_chat" | "automation";
  status: "planned" | "dev_adapter" | "ready_for_review";
  requiredScopes: string[];
  exportsFinancialData: boolean;
};

// Served publicly (GET /api/v1/partners) and shown on the website's /partners page,
// so each field is a statement to users, pinned in partners.test.ts. "dev_adapter"
// means code for it exists in this repository; none of these has any yet, so all
// are "planned" (Sheets and Slack read "dev_adapter" with no code behind them until
// P6.1, F207).
export const partnerIntegrationManifests: PartnerIntegrationManifest[] = [
  {
    id: "monarch_money",
    name: "Monarch Money",
    category: "finance",
    status: "planned",
    requiredScopes: ["transactions:read"],
    exportsFinancialData: false
  },
  {
    id: "ynab",
    name: "YNAB",
    category: "finance",
    status: "planned",
    requiredScopes: ["budget:read"],
    exportsFinancialData: false
  },
  {
    id: "google_sheets",
    name: "Google Sheets",
    category: "spreadsheet",
    status: "planned",
    requiredScopes: ["spreadsheets.write"],
    exportsFinancialData: true
  },
  {
    id: "slack",
    name: "Slack",
    category: "team_chat",
    status: "planned",
    requiredScopes: ["chat:write"],
    exportsFinancialData: false
  },
  {
    id: "zapier",
    name: "Zapier",
    category: "automation",
    status: "planned",
    requiredScopes: ["webhook:write"],
    exportsFinancialData: false
  }
];

export function listPartnerIntegrations(category?: PartnerIntegrationManifest["category"]): PartnerIntegrationManifest[] {
  return category
    ? partnerIntegrationManifests.filter((manifest) => manifest.category === category)
    : partnerIntegrationManifests;
}
