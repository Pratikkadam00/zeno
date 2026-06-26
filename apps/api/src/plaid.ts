// Plaid adapter. Reads PLAID_CLIENT_ID / PLAID_SECRET / PLAID_ENV from the
// environment. When unset, plaidConfigured() is false and routes return a clear
// "not configured" response (mock mode) instead of calling Plaid.

const PLAID_ENV = process.env.PLAID_ENV ?? "sandbox";

function plaidBase(): string {
  if (PLAID_ENV === "production") return "https://production.plaid.com";
  if (PLAID_ENV === "development") return "https://development.plaid.com";
  return "https://sandbox.plaid.com";
}

export function plaidConfigured(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

// Plaid access tokens are bank-access CREDENTIALS and must never reach the client.
// They are held server-side, keyed to the authenticated account id.
//
// Persistence is gated on encryption: only when STORAGE_ENCRYPTION_KEY is set are
// tokens mirrored to Postgres, and then ONLY as an AES-256-GCM sealed envelope
// (see storage/pg.ts) — a raw token must never sit as plaintext at rest. Without
// the key (or without DATABASE_URL) tokens stay in-memory and are simply lost on
// restart (the user re-links), which is the safer failure mode.
import {
  encryptionConfigured,
  kvClear,
  kvPersist,
  openValue,
  registerHydrator,
  sealValue,
  type StoredEntry
} from "./storage/pg";

type StoredPlaidItem = { accessToken: string; itemId: string };
const plaidItemsByUser = new Map<string, StoredPlaidItem>();

export function storePlaidItem(userId: string, item: StoredPlaidItem): void {
  plaidItemsByUser.set(userId, item);
  if (encryptionConfigured()) kvPersist("plaid", userId, sealValue(item));
}

export function getStoredPlaidItem(userId: string): StoredPlaidItem | undefined {
  return plaidItemsByUser.get(userId);
}

export function clearPlaidItems(): void {
  plaidItemsByUser.clear();
  void kvClear("plaid");
}

// Decrypt persisted tokens on boot. Rows that can't be opened (key rotated/
// missing, tampered) are skipped — never resurrected as garbage.
registerHydrator("plaid", (entries: StoredEntry[]) => {
  for (const { key, value } of entries) {
    const item = openValue(value) as StoredPlaidItem | null;
    if (item && typeof item.accessToken === "string") plaidItemsByUser.set(key, item);
  }
});

async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${plaidBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.PLAID_CLIENT_ID,
      secret: process.env.PLAID_SECRET,
      ...body
    })
  });
  const json = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error(`Plaid ${path} failed (${response.status}): ${String(json.error_code ?? json.error_message ?? "unknown")}`);
  }
  return json as T;
}

export async function createLinkToken(userId: string): Promise<{ linkToken: string; expiration: string }> {
  const data = await plaidPost<{ link_token: string; expiration: string }>("/link/token/create", {
    client_name: "Zeno",
    user: { client_user_id: userId },
    products: ["transactions"],
    country_codes: ["US"],
    language: "en"
  });
  return { linkToken: data.link_token, expiration: data.expiration };
}

export async function exchangePublicToken(publicToken: string): Promise<{ accessToken: string; itemId: string }> {
  const data = await plaidPost<{ access_token: string; item_id: string }>("/item/public_token/exchange", {
    public_token: publicToken
  });
  return { accessToken: data.access_token, itemId: data.item_id };
}

export type PlaidTransaction = { date: string; name: string; amountMinor: number; currency: string };

type PlaidSyncResponse = {
  added: Array<{ date: string; name: string; merchant_name?: string; amount: number; iso_currency_code?: string }>;
  next_cursor: string;
  has_more: boolean;
};

// Pulls recently-added transactions via /transactions/sync, normalized to minor
// units (positive = money out). The client runs these through the same recurring
// detector used for CSV imports.
export async function getRecentTransactions(accessToken: string): Promise<PlaidTransaction[]> {
  const transactions: PlaidTransaction[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 10; page += 1) {
    const data = await plaidPost<PlaidSyncResponse>(
      "/transactions/sync",
      cursor ? { access_token: accessToken, cursor } : { access_token: accessToken }
    );
    for (const txn of data.added ?? []) {
      transactions.push({
        date: txn.date,
        name: txn.merchant_name ?? txn.name,
        amountMinor: Math.round(Math.abs(txn.amount) * 100),
        currency: txn.iso_currency_code ?? "USD"
      });
    }
    cursor = data.next_cursor;
    if (!data.has_more) break;
  }
  return transactions;
}

// Sandbox-only helper: mint a public token without the Plaid Link UI, so the
// full connect→exchange→transactions flow can be tested server-side.
export async function sandboxPublicToken(institutionId = "ins_109508"): Promise<string> {
  const data = await plaidPost<{ public_token: string }>("/sandbox/public_token/create", {
    institution_id: institutionId,
    initial_products: ["transactions"]
  });
  return data.public_token;
}
