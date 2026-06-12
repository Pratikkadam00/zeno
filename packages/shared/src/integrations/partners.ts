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
    status: "dev_adapter",
    requiredScopes: ["spreadsheets.write"],
    exportsFinancialData: true
  },
  {
    id: "slack",
    name: "Slack",
    category: "team_chat",
    status: "dev_adapter",
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
