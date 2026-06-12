import Constants from "expo-constants";
import type { ApiEnvelope, OpenBankingConnectionIntent } from "@subradar/shared";

const fallbackApiBaseUrl = "http://127.0.0.1:8787/api/v1";

export type MobileBackendStatus = {
  connected: boolean;
  apiBaseUrl: string;
  phase?: string;
  capabilities: string[];
  message: string;
};

export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl ?? fallbackApiBaseUrl;
}

export async function getMobileBackendStatus(): Promise<MobileBackendStatus> {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await fetch(`${apiBaseUrl}/capabilities`);
    if (!response.ok) {
      return {
        connected: false,
        apiBaseUrl,
        capabilities: [],
        message: `Backend returned HTTP ${response.status}.`
      };
    }

    const envelope = await response.json() as ApiEnvelope<{
      phase: string;
      capabilities: string[];
    }>;

    return {
      connected: true,
      apiBaseUrl,
      phase: envelope.data?.phase,
      capabilities: envelope.data?.capabilities ?? [],
      message: "Mobile frontend is connected to the Fastify API."
    };
  } catch (error) {
    return {
      connected: false,
      apiBaseUrl,
      capabilities: [],
      message: error instanceof Error ? error.message : "Backend connection failed."
    };
  }
}

export async function createOpenBankingIntentViaApi(provider: "plaid" | "mx"): Promise<OpenBankingConnectionIntent> {
  const response = await fetch(`${getApiBaseUrl()}/open-banking/${provider}/intent`, {
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Open banking intent failed with HTTP ${response.status}`);
  }
  const envelope = await response.json() as ApiEnvelope<{ intent: OpenBankingConnectionIntent }>;
  if (!envelope.data?.intent) {
    throw new Error(envelope.error?.message ?? "Open banking intent missing from API response.");
  }
  return envelope.data.intent;
}
