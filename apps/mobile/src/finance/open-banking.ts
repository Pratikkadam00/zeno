import { createMockOpenBankingAdapter, type OpenBankingConnectionIntent, type OpenBankingProvider } from "@zeno/shared";

export async function createDevOpenBankingIntent(provider: OpenBankingProvider): Promise<OpenBankingConnectionIntent> {
  const adapter = createMockOpenBankingAdapter(provider);
  return adapter.createConnectionIntent({
    provider,
    accountId: "acct_dev",
    redirectUri: "zeno://bank-connected"
  });
}
