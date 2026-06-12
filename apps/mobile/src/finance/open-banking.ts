import { createMockOpenBankingAdapter, type OpenBankingConnectionIntent, type OpenBankingProvider } from "@subradar/shared";

export async function createDevOpenBankingIntent(provider: OpenBankingProvider): Promise<OpenBankingConnectionIntent> {
  const adapter = createMockOpenBankingAdapter(provider);
  return adapter.createConnectionIntent({
    provider,
    accountId: "acct_dev",
    redirectUri: "subradar://bank-connected"
  });
}
