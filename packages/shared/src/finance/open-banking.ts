export type OpenBankingProvider = "plaid" | "mx";

export type OpenBankingConnectionRequest = {
  provider: OpenBankingProvider;
  accountId: string;
  redirectUri: string;
};

export type OpenBankingConnectionIntent = {
  provider: OpenBankingProvider;
  intentId: string;
  status: "created";
  hostedUrl: string;
  scopes: Array<"transactions_read">;
  serverSeesCredentials: false;
};

export type OpenBankingTransaction = {
  provider: OpenBankingProvider;
  transactionId: string;
  postedAt: string;
  merchant: string;
  amountMinor: number;
  currency: "USD";
};

export interface OpenBankingAdapter {
  provider: OpenBankingProvider;
  createConnectionIntent(request: OpenBankingConnectionRequest): Promise<OpenBankingConnectionIntent>;
  listRecentTransactions(accessTokenRef: string): Promise<OpenBankingTransaction[]>;
}

export function createMockOpenBankingAdapter(provider: OpenBankingProvider): OpenBankingAdapter {
  return {
    provider,
    async createConnectionIntent(request) {
      return {
        provider,
        intentId: `${provider}_intent_${request.accountId}`,
        status: "created",
        hostedUrl: `${request.redirectUri}?provider=${provider}&mode=dev`,
        scopes: ["transactions_read"],
        serverSeesCredentials: false
      };
    },
    async listRecentTransactions() {
      return [
        {
          provider,
          transactionId: `${provider}_txn_midjourney`,
          postedAt: "2026-05-24T00:00:00.000Z",
          merchant: "Midjourney",
          amountMinor: 1000,
          currency: "USD"
        }
      ];
    }
  };
}
