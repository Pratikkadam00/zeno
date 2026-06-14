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

async function postJson<T>(path: string, body: unknown = {}): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const envelope = await response.json() as ApiEnvelope<T>;
  if (!response.ok || envelope.data == null) {
    throw new Error(envelope.error?.message ?? `${path} failed (HTTP ${response.status})`);
  }
  return envelope.data;
}

// Create a Plaid Link token (production: hand this to the native Plaid Link SDK).
export async function createPlaidLinkToken(): Promise<{ linkToken: string; expiration: string }> {
  return postJson<{ linkToken: string; expiration: string }>("/plaid/link-token");
}

// Sandbox-only end-to-end connection (no native Link UI): mint a public token,
// exchange it, and pull transactions — returns how many were fetched.
export async function connectPlaidSandbox(): Promise<{ transactionCount: number }> {
  const { publicToken } = await postJson<{ publicToken: string }>("/plaid/sandbox/public-token");
  const { accessToken } = await postJson<{ accessToken: string }>("/plaid/exchange", { publicToken });
  const { count } = await postJson<{ count: number }>("/plaid/transactions", { accessToken });
  return { transactionCount: count };
}

export type ServerEntitlement = { plan: "free" | "pro" | "family"; active: boolean; source: string };

// The server independently verifies entitlements with RevenueCat, so it's the
// source of truth for Pro/Family. Returns null if unreachable (caller falls back
// to the client SDK result).
export async function getServerEntitlement(appUserId: string): Promise<ServerEntitlement | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/billing/entitlement?appUserId=${encodeURIComponent(appUserId)}`);
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<ServerEntitlement>;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export type SyncChange = {
  entityType: "subscription" | "preference" | "profile";
  entityId: string;
  operation: "create" | "update" | "delete";
  encryptedPayload: string;
  vectorClock: Record<string, number>;
};

// Push locally-encrypted changes to the cloud backup. Payloads are ciphertext —
// the server stores opaque blobs it can't read. Returns null if unreachable.
export async function pushSyncChanges(userId: string, changes: SyncChange[]): Promise<{ accepted: number; rejected: number; cursor: string } | null> {
  try {
    const response = await fetch(`${getApiBaseUrl()}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-zeno-user-id": userId },
      body: JSON.stringify({ encryptedChanges: changes })
    });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<{ accepted: number; rejected: number; cursor: string }>;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

// Pull encrypted changes since a cursor (for restore / multi-device merge).
export async function pullSyncChanges(userId: string, cursor?: string): Promise<{ changes: SyncChange[]; cursor: string; hasMore: boolean } | null> {
  try {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const response = await fetch(`${getApiBaseUrl()}/sync/pull${query}`, {
      headers: { "x-zeno-user-id": userId }
    });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<{ encryptedChanges: SyncChange[]; cursor: string; hasMore: boolean }>;
    if (!envelope.data) return null;
    return { changes: envelope.data.encryptedChanges, cursor: envelope.data.cursor, hasMore: envelope.data.hasMore };
  } catch {
    return null;
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
