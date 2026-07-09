import type { ApiEnvelope, CurrencyCode, OpenBankingConnectionIntent } from "@zeno/shared";
import { useAuthStore } from "../auth/authStore";
import { getApiBaseUrl } from "./config";
import { timedFetch } from "./http";

// Attaches the signed-in user's bearer token to a protected request. The API
// derives identity from this token (never from a client-supplied id/header).
// Returns {} when signed out — the server then replies 401 and callers fall back.
async function authHeaders(): Promise<Record<string, string>> {
  const token = await useAuthStore.getState().getValidAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type MobileBackendStatus = {
  connected: boolean;
  apiBaseUrl: string;
  phase?: string;
  capabilities: string[];
  message: string;
};


export async function getMobileBackendStatus(): Promise<MobileBackendStatus> {
  const apiBaseUrl = getApiBaseUrl();
  try {
    const response = await timedFetch(`${apiBaseUrl}/capabilities`, {}, { retries: 1 });
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
  const response = await timedFetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
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
  // The server stores the access token; the client never receives it.
  await postJson<{ itemId: string; connected: boolean }>("/plaid/exchange", { publicToken });
  const { count } = await postJson<{ count: number }>("/plaid/transactions");
  return { transactionCount: count };
}

export type ServerEntitlement = { plan: "free" | "pro" | "family"; active: boolean; source: string };

// The server independently verifies entitlements with RevenueCat, so it's the
// source of truth for Pro/Family. Returns null if unreachable (caller falls back
// to the client SDK result).
export async function getServerEntitlement(): Promise<ServerEntitlement | null> {
  try {
    // Identity comes from the bearer token; the server ignores any client id.
    const response = await timedFetch(`${getApiBaseUrl()}/billing/entitlement`, { headers: await authHeaders() }, { retries: 1 });
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
export async function pushSyncChanges(changes: SyncChange[]): Promise<{ accepted: number; rejected: number; cursor: string } | null> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}/sync/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
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
export async function pullSyncChanges(cursor?: string): Promise<{ changes: SyncChange[]; cursor: string; hasMore: boolean } | null> {
  try {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const response = await timedFetch(`${getApiBaseUrl()}/sync/pull${query}`, {
      headers: await authHeaders()
    }, { retries: 1 });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<{ encryptedChanges: SyncChange[]; cursor: string; hasMore: boolean }>;
    if (!envelope.data) return null;
    return { changes: envelope.data.encryptedChanges, cursor: envelope.data.cursor, hasMore: envelope.data.hasMore };
  } catch {
    return null;
  }
}

export type CoachRecommendation = { title: string; detail: string; estimatedMonthlySavingsLabel?: string };
export type AiCoaching =
  | { source: "ai"; provider: "anthropic" | "groq"; model: string; outOfScope: boolean; summary: string; recommendations: CoachRecommendation[] }
  | { source: "unconfigured"; model: string };

export type CoachSubscriptionInput = { name: string; category: string; monthlyMinor: number; billingCycle: string };
export type CoachInsightInput = { title: string; body: string };
export type CoachRequestInput = {
  totalMonthlyMinor: number;
  currency?: string;
  subscriptions: CoachSubscriptionInput[];
  insights?: CoachInsightInput[];
  question?: string;
  budgetCapMinor?: number;
};

// Ask the server-side AI coach for a coaching plan. Returns null if the server
// is unreachable; { source: "unconfigured" } when no AI key is set on the
// server. Either way the screen falls back to local rule-based insights.
export async function getAiCoaching(input: CoachRequestInput): Promise<AiCoaching | null> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}/coach`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(input)
    }, { timeoutMs: 35_000 });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<AiCoaching>;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export type FamilyMember = { id: string; name: string; monthlySpendMinor: number; currency: CurrencyCode };
export type Household = { id: string; shareCode: string; ownerId: string; members: FamilyMember[]; createdAt: string };

async function familyPost(path: string, body: unknown): Promise<Household | null> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(body)
    });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<{ household: Household }>;
    return envelope.data?.household ?? null;
  } catch {
    return null;
  }
}

export function createHousehold(ownerId: string, ownerName: string, monthlySpendMinor: number, currency: CurrencyCode): Promise<Household | null> {
  return familyPost("/family/create", { ownerId, ownerName, monthlySpendMinor, currency });
}

export function joinHousehold(shareCode: string, memberId: string, memberName: string, monthlySpendMinor: number, currency: CurrencyCode): Promise<Household | null> {
  return familyPost("/family/join", { shareCode, memberId, memberName, monthlySpendMinor, currency });
}

// The server route exists (POST /api/v1/family/:householdId/spend) but until
// now was never called from anywhere in the app — a member's monthlySpendMinor
// was only ever sent once, at create/join time, so the household's combined
// view silently went stale as soon as any member's own subscriptions changed.
// See family.tsx's periodic re-push.
export function setMemberSpend(householdId: string, monthlySpendMinor: number, currency: CurrencyCode): Promise<Household | null> {
  return familyPost(`/family/${encodeURIComponent(householdId)}/spend`, { monthlySpendMinor, currency });
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}/family/${encodeURIComponent(householdId)}`, { headers: await authHeaders() }, { retries: 1 });
    if (!response.ok) return null;
    const envelope = await response.json() as ApiEnvelope<{ household: Household }>;
    return envelope.data?.household ?? null;
  } catch {
    return null;
  }
}

// Removes the caller from the household server-side (disbanding it if they were
// the last member). Returns whether the request succeeded; the caller clears its
// own local state regardless so leaving feels instant even if the network fails.
export async function leaveHousehold(householdId: string): Promise<boolean> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}/family/${encodeURIComponent(householdId)}/leave`, {
      method: "POST",
      headers: await authHeaders()
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Permanently deletes this account server-side: purges every kv_store namespace
// (entitlement cache, Plaid item, synced entities, household membership) and
// revokes every session. Unlike most calls in this file, failure is NOT
// swallowed into a soft fallback — the caller must not proceed to wipe local
// data or sign out until the server confirms deletion, since doing so on a
// failed request would tell the user their account is gone while server data
// still exists (violates the account-deletion promise and, for App Store
// review, Apple's in-app-deletion requirement).
export async function deleteAccountOnServer(): Promise<boolean> {
  try {
    const response = await timedFetch(`${getApiBaseUrl()}/account`, {
      method: "DELETE",
      headers: await authHeaders()
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function createOpenBankingIntentViaApi(provider: "plaid" | "mx"): Promise<OpenBankingConnectionIntent> {
  const response = await fetch(`${getApiBaseUrl()}/open-banking/${provider}/intent`, {
    method: "POST",
    headers: await authHeaders()
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

// Aggregate, anonymous product-funnel events (Phase 5.3) — see
// ZENO_MASTER_PLAN.md. Fire-and-forget: never blocks the caller, never
// throws, and a failed/offline post is silently dropped (this is a
// nice-to-have signal, not something a user action should ever wait on or
// fail over). Deliberately does NOT attach an auth header even when the user
// is signed in — the whole point is that no event can be linked to an
// account or device, so a local-only user and an authenticated user produce
// identical, uncorrelated pings.
export type FunnelEvent = "import_completed" | "share_card_generated" | "free_cap_hit" | "paywall_purchase_completed";

export function recordFunnelEvent(event: FunnelEvent, label?: string): void {
  void fetch(`${getApiBaseUrl()}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(label ? { event, label } : { event })
  }).catch(() => {
    // best-effort — a network failure here must never surface to the user
  });
}
