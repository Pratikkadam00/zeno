import { getServiceBySlug, searchServices, services, type Service } from "@zeno/service-catalog";
import { extractStoreAppName } from "@zeno/shared";
import { exchangeCodeAsync, type AuthRequest, type AuthSessionResult } from "expo-auth-session";
import * as Crypto from "expo-crypto";
import { discovery as googleDiscovery } from "expo-auth-session/providers/google";
import { timedFetch } from "../api/http";
import { getGmailAccountToken, listGmailAddresses, removeGmailAccount, saveGmailAccount } from "../security/secure-store";
import { calculateNextRenewal, confidenceRank, detectCurrency, inferRecurringCycle, isWithin, slugify, titleCase } from "./discovery-helpers";
import { parseDay } from "../utils/day-text";

export type BilledThrough = "app_store" | "play_store";

export type ParsedSubscription = {
  name: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "quarterly" | "annual" | "weekly" | "unknown";
  lastCharged: string;
  nextRenewal: string;
  confidence: "high" | "medium" | "low";
  serviceId?: string;
  rawMerchant: string;
  cancelUrl?: string;
  // Set when billed via the App Store / Play Store — the subscriptions Rocket
  // Money can't see (the charge is from Apple/Google, not the app).
  billedThrough?: BilledThrough;
};

export type GmailMessage = {
  id: string;
  threadId?: string;
  sender: string;
  senderDomain: string;
  subject: string;
  receivedAt: string;
  body: string;
};

type GmailListResponse = {
  messages?: { id: string; threadId?: string }[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

type GmailApiMessage = {
  id: string;
  threadId?: string;
  internalDate?: string;
  payload?: GmailPayload;
  snippet?: string;
};

type GmailPayload = {
  mimeType?: string;
  headers?: { name: string; value: string }[];
  body?: { data?: string };
  parts?: GmailPayload[];
};

const gmailScopes = ["https://www.googleapis.com/auth/gmail.readonly"];

const knownBillingDomains = [
  "netflix.com",
  "spotify.com",
  "adobe.com",
  "apple.com",
  "google.com",
  "amazon.com",
  "openai.com",
  "anthropic.com",
  "midjourney.com",
  "notion.so",
  "figma.com",
  "github.com",
  "atlassian.com",
  "slack.com",
  "zoom.us",
  "dropbox.com",
  "microsoft.com",
  "discord.com",
  "canva.com",
  "grammarly.com",
  "hulu.com",
  "disneyplus.com",
  "max.com",
  "peacocktv.com",
  "paramountplus.com",
  "crunchyroll.com",
  "twitch.tv",
  "duolingo.com",
  "coursera.org",
  "linkedin.com",
  "skillshare.com",
  "masterclass.com",
  "audible.com",
  "headspace.com",
  "calm.com",
  "noom.com",
  "nordvpn.com",
  "expressvpn.com",
  "1password.com",
  "lastpass.com",
  "bitwarden.com",
  "proton.me",
  "revenuecat.com",
  "stripe.com",
  "paypal.com",
  "recurly.com",
  "chargebee.com",
  "paddle.com",
  "braintree.com",
  "zuora.com",
  "cursor.com",
  "runwayml.com",
  "elevenlabs.io",
  "perplexity.ai",
  "heygen.com",
  "jasper.ai",
  "copy.ai",
  "writesonic.com",
  "kling.ai",
  "linear.app",
  "asana.com",
  "monday.com",
  "clickup.com",
  "airtable.com",
  "miro.com",
  "webflow.com",
  "vercel.com",
  "supabase.com",
  "railway.app",
  "xbox.com",
  "playstation.com",
  "nintendo.com",
  "ea.com",
  "ubisoft.com",
  "peloton.com",
  "strava.com",
  "fitbit.com",
  "whoop.com",
  "myfitnesspal.com",
  "ynab.com",
  "monarchmoney.com",
  "robinhood.com",
  "acorns.com",
  "readwise.io",
  "blinkist.com",
  "brilliant.org",
  "datacamp.com",
  "loom.com",
  "superhuman.com",
  "beehiiv.com",
  "substack.com"
];

// 365 days so annually-billed subscriptions are caught (a 6-month window missed them).
const billingSearchQuery = 'subject:(receipt OR invoice OR subscription OR "payment confirmation" OR "charge" OR "billing" OR "thank you for your purchase" OR "renewal" OR membership OR "your plan" OR "auto-renew") newer_than:365d';
// Subject signals that make an UNKNOWN sender worth parsing (known senders are always parsed).
const subscriptionSubjectSignal = /subscription|renew|membership|recurring|your plan|auto-?renew|monthly|annual/i;
const maxMessagesPerAccount = 400;

export type GmailAccount = { address: string; token: string };

export async function connectGmail(request: AuthRequest, result: AuthSessionResult): Promise<GmailAccount> {
  if (result.type !== "success") {
    throw new Error("Gmail authorization was cancelled.");
  }

  const accessToken = result.authentication?.accessToken ?? await exchangeAuthorizationCode(request, result);
  // Fallback label when the profile lookup fails. Random, NOT derived from the
  // token: the label is stored in the account index and shown in the UI, and it
  // used to embed the token's first 8 characters (finding F12).
  const address = (await fetchGmailAddress(accessToken).catch(() => null)) ?? `inbox-${Crypto.randomUUID().slice(0, 8)}`;
  await saveGmailAccount(address, accessToken);
  return { address, token: accessToken };
}

export async function listConnectedGmailAccounts(): Promise<GmailAccount[]> {
  const addresses = await listGmailAddresses();
  const accounts = await Promise.all(addresses.map(async (address) => {
    const token = await getGmailAccountToken(address);
    return token ? { address, token } : null;
  }));
  return accounts.filter((account): account is GmailAccount => account !== null);
}

async function listBillingMessageRefs(accessToken: string): Promise<{ id: string; threadId?: string }[]> {
  const refs: { id: string; threadId?: string }[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    url.searchParams.set("q", billingSearchQuery);
    url.searchParams.set("maxResults", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }
    const list = await gmailFetch<GmailListResponse>(url.toString(), accessToken);
    refs.push(...(list.messages ?? []));
    pageToken = list.nextPageToken;
  } while (pageToken && refs.length < maxMessagesPerAccount);

  return refs.slice(0, maxMessagesPerAccount);
}

export async function fetchBillingEmails(accessToken: string): Promise<GmailMessage[]> {
  const messageRefs = await listBillingMessageRefs(accessToken);
  const messages: GmailMessage[] = [];

  for (const messageRef of messageRefs) {
    // One failing message (rate limit, deleted mid-scan) must not abort the
    // whole scan — skip it and keep going.
    try {
      const metadata = await fetchMessageMetadata(accessToken, messageRef.id);
      const sender = getHeader(metadata.payload, "from");
      const subject = getHeader(metadata.payload, "subject");
      const rawDomain = extractSenderDomain(sender);
      const knownDomain = getKnownBillingDomain(rawDomain);
      // Known billing senders are always parsed; unknown senders only when the
      // subject clearly signals a subscription (keeps one-off receipts out).
      const senderDomain = knownDomain ?? (subscriptionSubjectSignal.test(subject) ? rawDomain : null);
      if (!senderDomain) {
        continue;
      }

      const full = await fetchMessageFull(accessToken, messageRef.id);
      messages.push({
        id: full.id,
        threadId: full.threadId,
        sender,
        senderDomain,
        subject: getHeader(full.payload, "subject"),
        receivedAt: getMessageDate(full),
        body: extractBody(full.payload)
      });
    } catch {
      // Skip this message and continue scanning the rest.
    }
  }

  return messages;
}

export function parseEmailBody(emailBody: string, senderDomain: string): ParsedSubscription | null {
  const normalizedDomain = getKnownBillingDomain(senderDomain) ?? senderDomain.toLowerCase();
  const amount = extractAmount(emailBody);
  if (amount === null) {
    return null;
  }

  // App Store / Play Store receipts: the biller is Apple/Google, but the real
  // subscription is the underlying app — resolve it instead of labelling "Apple".
  const billedThrough = detectStoreBiller(normalizedDomain, emailBody);
  if (billedThrough) {
    const appName = extractStoreAppName(emailBody);
    const appService = appName ? searchServices(appName, 1)[0] : undefined;
    const resolvedName = appService?.name ?? appName ?? (billedThrough === "app_store" ? "App Store subscription" : "Play Store subscription");
    const storeBillingCycle = detectBillingCycle(emailBody, amount, appService);
    const storeDate = extractDate(emailBody) ?? new Date();
    return {
      name: resolvedName,
      amount,
      currency: detectCurrency(emailBody),
      billingCycle: storeBillingCycle,
      lastCharged: storeDate.toISOString(),
      nextRenewal: calculateNextRenewal(storeDate, storeBillingCycle).toISOString(),
      confidence: appService ? "high" : appName ? "medium" : "low",
      serviceId: appService?.id,
      rawMerchant: appName ?? resolvedName,
      cancelUrl: appService?.cancelUrl,
      billedThrough
    };
  }

  const service = matchService(normalizedDomain, emailBody);
  const merchantName = service?.name ?? merchantFromDomain(normalizedDomain) ?? parseMerchantFromSubject(emailBody);
  const billingCycle = detectBillingCycle(emailBody, amount, service);
  const detectedDate = extractDate(emailBody);
  const lastChargedDate = detectedDate ?? new Date();
  const nextRenewal = calculateNextRenewal(lastChargedDate, billingCycle);
  const confidence = service && detectedDate ? "high" : merchantName ? "medium" : "low";

  return {
    name: service?.name ?? merchantName ?? "Unknown subscription",
    amount,
    currency: detectCurrency(emailBody),
    billingCycle,
    lastCharged: lastChargedDate.toISOString(),
    nextRenewal: nextRenewal.toISOString(),
    confidence,
    serviceId: service?.id,
    rawMerchant: merchantName ?? normalizedDomain,
    cancelUrl: service?.cancelUrl
  };
}

export function processResults(parsed: ParsedSubscription[]): ParsedSubscription[] {
  // Group ALL receipts per service (not just the single best), so the cadence
  // across multiple charges can confirm a recurring subscription.
  const groups = new Map<string, ParsedSubscription[]>();
  for (const subscription of parsed) {
    const matched = enrichWithCatalogMatch(subscription);
    const key = slugify(matched.serviceId ?? matched.name);
    const list = groups.get(key) ?? [];
    list.push(matched);
    groups.set(key, list);
  }

  return [...groups.values()].map(collapseRecurringGroup).sort((a, b) => compareParsed(a, b));
}

// Collapse a service's receipts into one detection. With ≥2 dated charges, the
// gaps between them infer the real billing cycle (beating a single email's
// text guess) and confirm recurrence (confidence → high, renewal projected
// from the latest charge).
function collapseRecurringGroup(group: ParsedSubscription[]): ParsedSubscription {
  const best = [...group].sort((a, b) => compareParsed(a, b))[0] as ParsedSubscription;
  if (group.length < 2) {
    return best;
  }

  const dates = group
    .map((candidate) => Date.parse(candidate.lastCharged))
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => a - b);
  if (dates.length < 2) {
    return best;
  }

  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i += 1) {
    gaps.push((dates[i]! - dates[i - 1]!) / 86_400_000);
  }
  const cycle = inferRecurringCycle(gaps);
  if (!cycle) {
    return best;
  }

  const lastCharged = new Date(dates[dates.length - 1]!);
  return {
    ...best,
    billingCycle: cycle,
    lastCharged: lastCharged.toISOString(),
    nextRenewal: calculateNextRenewal(lastCharged, cycle).toISOString(),
    confidence: "high"
  };
}

async function collectCandidates(
  accessToken: string,
  onProgress: (current: number, total: number) => void
): Promise<ParsedSubscription[]> {
  const messages = await fetchBillingEmails(accessToken);
  onProgress(0, messages.length);

  const parsed: ParsedSubscription[] = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const candidate = parseEmailBody(`${message.subject}\n${message.body}`, message.senderDomain);
    if (candidate) {
      parsed.push(candidate);
    }
    onProgress(index + 1, messages.length);
  }

  return parsed;
}

export async function scanGmailSubscriptions(
  accessToken: string,
  onProgress: (current: number, total: number) => void
): Promise<ParsedSubscription[]> {
  return processResults(await collectCandidates(accessToken, onProgress));
}

// Scans every connected inbox and merges + dedupes across all of them, so a
// user with personal + work Gmail accounts gets a single combined result set.
export async function scanAllGmailAccounts(
  onProgress: (current: number, total: number) => void
): Promise<ParsedSubscription[]> {
  const accounts = await listConnectedGmailAccounts();
  if (accounts.length === 0) {
    return [];
  }

  const all: ParsedSubscription[] = [];
  let messagesScannedBefore = 0;

  for (const account of accounts) {
    let accountMessageTotal = 0;
    const candidates = await collectCandidates(account.token, (current, total) => {
      // Aggregate progress across inboxes, measured in MESSAGES (not detected subs).
      accountMessageTotal = total;
      onProgress(messagesScannedBefore + current, messagesScannedBefore + total);
    });
    all.push(...candidates);
    messagesScannedBefore += accountMessageTotal;
  }

  return processResults(all);
}

// Google's documented revocation endpoint, called per RFC 7009 §2.1: POST with
// the token in an application/x-www-form-urlencoded BODY. The previous call was
// a GET to the legacy accounts.google.com endpoint with the token in the URL
// query, where proxies and server logs record it (finding F12).
export const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export async function disconnectGmailAccount(address: string): Promise<void> {
  const token = await getGmailAccountToken(address);
  try {
    if (token) {
      await timedFetch(GOOGLE_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `token=${encodeURIComponent(token)}`
      });
    }
  } finally {
    await removeGmailAccount(address);
  }
}

// One inbox at a time, on purpose: removeGmailAccount rewrites the shared
// address index (read-filter-write), so parallel removals would race and could
// leave an address behind. Every inbox is attempted; if any revoke or removal
// failed, this rejects afterwards with the count, so an erase can say so.
// disconnectGmailAccount forgets the local token even when the revoke fails.
export async function disconnectAllGmailAccounts(): Promise<void> {
  const addresses = await listGmailAddresses();
  let failed = 0;
  for (const address of addresses) {
    try {
      await disconnectGmailAccount(address);
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) {
    throw new Error(`${failed} of ${addresses.length} Gmail inboxes could not be fully disconnected`);
  }
}

export async function fetchGmailAddress(accessToken: string): Promise<string | null> {
  const profile = await gmailFetch<{ emailAddress?: string }>("https://gmail.googleapis.com/gmail/v1/users/me/profile", accessToken);
  return profile.emailAddress ?? null;
}

// Typed to the result variant that carries `params` (expo-auth-session puts
// "error" | "success" in one union member): connectGmail, the only caller, has
// already rejected every outcome except "success", so a second type check here
// was unreachable.
type AuthResultWithParams = Extract<AuthSessionResult, { params: Record<string, string> }>;

async function exchangeAuthorizationCode(request: AuthRequest, result: AuthResultWithParams): Promise<string> {
  const code = result.params.code;
  if (!code) {
    throw new Error("Google did not return an authorization code.");
  }

  // PKCE exchange — no client secret (native app). The code_verifier proves the
  // exchange comes from the same client that started the flow.
  const tokenResponse = await exchangeCodeAsync({
    clientId: request.clientId,
    code,
    redirectUri: request.redirectUri,
    scopes: gmailScopes,
    extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined
  }, googleDiscovery);

  return tokenResponse.accessToken;
}

async function fetchMessageMetadata(accessToken: string, messageId: string): Promise<GmailApiMessage> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set("format", "metadata");
  url.searchParams.append("metadataHeaders", "From");
  url.searchParams.append("metadataHeaders", "Subject");
  url.searchParams.append("metadataHeaders", "Date");
  return gmailFetch<GmailApiMessage>(url.toString(), accessToken);
}

async function fetchMessageFull(accessToken: string, messageId: string): Promise<GmailApiMessage> {
  const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set("format", "full");
  return gmailFetch<GmailApiMessage>(url.toString(), accessToken);
}

async function gmailFetch<T>(url: string, accessToken: string): Promise<T> {
  const response = await timedFetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Gmail request failed with HTTP ${response.status}.`);
  }

  return response.json() as Promise<T>;
}

function getHeader(payload: GmailPayload | undefined, headerName: string): string {
  return payload?.headers?.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value ?? "";
}

function getMessageDate(message: GmailApiMessage): string {
  const headerDate = getHeader(message.payload, "date");
  const parsedHeaderDate = Date.parse(headerDate);
  if (!Number.isNaN(parsedHeaderDate)) {
    return new Date(parsedHeaderDate).toISOString();
  }

  const internalDate = Number(message.internalDate);
  return Number.isFinite(internalDate) ? new Date(internalDate).toISOString() : new Date().toISOString();
}

function extractBody(payload: GmailPayload | undefined): string {
  if (!payload) {
    return "";
  }

  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    return payload.mimeType?.includes("html") ? stripHtml(decoded) : decoded;
  }

  const textPart = findPayloadPart(payload, "text/plain");
  if (textPart?.body?.data) {
    return decodeBase64Url(textPart.body.data);
  }

  const htmlPart = findPayloadPart(payload, "text/html");
  return htmlPart?.body?.data ? stripHtml(decodeBase64Url(htmlPart.body.data)) : "";
}

function findPayloadPart(payload: GmailPayload, mimeType: string): GmailPayload | null {
  if (payload.mimeType === mimeType) {
    return payload;
  }

  for (const part of payload.parts ?? []) {
    const found = findPayloadPart(part, mimeType);
    if (found) {
      return found;
    }
  }

  return null;
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    const binary = globalThis.atob(padded);
    const percentEncoded = Array.from(binary)
      .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join("");
    return decodeURIComponent(percentEncoded);
  } catch {
    try {
      return globalThis.atob(padded);
    } catch {
      return "";
    }
  }
}

// HTML email → plain text for amount/merchant parsing. The output is only ever
// PARSED, never rendered (no WebView/innerHTML anywhere in the app), so this is
// a correctness filter, not an XSS sanitizer. It still has to be complete: text
// left behind by a missed tag is fed to the amount parser as if it were the
// visible receipt. Hence end tags with whitespace/attributes (`</script >`,
// `</SCRIPT\n>` — CodeQL js/bad-tag-filter) and comments removed first (a `>`
// inside a comment would otherwise end the generic tag match early).
export function stripHtml(value: string): string {
  return value
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\b[^>]*>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\b[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractSenderDomain(sender: string): string {
  const emailMatch = sender.match(/@([A-Z0-9.-]+\.[A-Z]{2,})/i);
  if (emailMatch?.[1]) {
    return emailMatch[1].toLowerCase();
  }
  // Everything before the first "/" (a URL-style sender). A regex, not
  // split("/")[0] ?? "", whose fallback could never run: split always returns
  // at least one element.
  return sender.toLowerCase().replace(/^https?:\/\//, "").replace(/\/[\s\S]*$/, "");
}

function getKnownBillingDomain(domain: string): string | null {
  const normalized = domain.toLowerCase();
  return knownBillingDomains.find((knownDomain) => normalized === knownDomain || normalized.endsWith(`.${knownDomain}`)) ?? null;
}

function detectStoreBiller(senderDomain: string, body: string): BilledThrough | null {
  const looksApple = senderDomain === "apple.com" || /\bapp\s?store\b/i.test(body);
  if (looksApple && /subscription|renew|receipt|auto-?renew|membership/i.test(body)) {
    return "app_store";
  }
  if (/\bgoogle\s?play\b/i.test(body)) {
    return "play_store";
  }
  return null;
}

// Normalize a raw money token to a major-unit number, disambiguating grouping
// vs decimal separators so "$1,299.00" -> 1299 (not 1) and "€10,99" -> 10.99.
// `raw` is always a regex capture that starts and ends on a digit (see the
// patterns in extractAmount), so `cleaned` always holds a digit; anything
// unparseable still ends as null through the finite/positive check below.
function parseAmountToken(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized: string;
  if (lastComma === -1 && lastDot === -1) {
    normalized = cleaned;
  } else if (lastComma > lastDot) {
    // Comma is right-most. Three trailing digits with no dot = thousands
    // grouping ("1,299"); otherwise it's a decimal comma ("10,99" / "1.299,00").
    const decimals = cleaned.length - lastComma - 1;
    normalized = lastDot === -1 && decimals === 3
      ? cleaned.replace(/,/g, "")
      : cleaned.replace(/\./g, "").replace(",", ".");
  } else {
    // Dot is right-most. Three trailing digits with no comma = European
    // thousands grouping ("2.500" -> 2500); otherwise the dot is the decimal
    // separator and any commas group thousands ("1,299.00" -> 1299.00).
    const decimals = cleaned.length - lastDot - 1;
    normalized = lastComma === -1 && decimals === 3
      ? cleaned.replace(/\./g, "")
      : cleaned.replace(/,/g, "");
  }
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

// Returns a MAJOR-unit amount (e.g. 15.49), consistent with ParsedSubscription.amount
// and the CSV importer — NOT integer minor units.
function extractAmount(body: string): number | null {
  // The number sub-pattern starts and ends on a digit so it never captures a
  // stray leading/trailing separator, but tolerates internal "," and ".".
  const patterns = [
    /[$€£₹]\s*(\d[\d.,]*\d|\d)/gi,
    /\b(?:USD|EUR|GBP|INR|CAD|AUD)\s*(\d[\d.,]*\d|\d)/gi,
    // A bare number followed by a currency CODE must carry a 2-digit decimal
    // group so a stray integer (e.g. an order number or "2026 USD" year) can't
    // be mistaken for an amount; symbol/keyword patterns still catch integers.
    /(\d[\d.,]*[.,]\d{2})\s*(?:USD|EUR|GBP|INR|CAD|AUD)\b/gi,
    /(?:total|amount|charged|price|payment of)[:\s]+[$€£₹]?\s*(\d[\d.,]*\d|\d)/gi
  ];
  const counts = new Map<string, { amount: number; count: number }>();

  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const amount = parseAmountToken(match[1]);
      if (amount === null) {
        continue;
      }
      const key = amount.toFixed(2);
      counts.set(key, {
        amount,
        count: (counts.get(key)?.count ?? 0) + 1
      });
    }
  }

  const ranked = [...counts.values()].sort((a, b) => b.count - a.count || b.amount - a.amount);
  return ranked[0]?.amount ?? null;
}


function detectBillingCycle(body: string, amount: number, service?: Service): ParsedSubscription["billingCycle"] {
  if (/\b(monthly|per month|\/mo)\b/i.test(body)) {
    return "monthly";
  }
  if (/\b(annual|yearly|per year|\/yr)\b/i.test(body)) {
    return "annual";
  }
  if (/\bweekly\b/i.test(body)) {
    return "weekly";
  }
  if (service?.defaultMonthlyPrice && isWithin(amount, service.defaultMonthlyPrice, 0.15)) {
    return "monthly";
  }
  if (service?.defaultAnnualPrice && isWithin(amount, service.defaultAnnualPrice, 0.15)) {
    return "annual";
  }
  return "unknown";
}

// The first date-shaped text that names a REAL day (F21: `Date.parse` accepted
// "February 31, 2026" as 2 March, and read every form as local time). ISO and
// day-first forms ("15 Jan 2026") are receipts too, not only the US forms.
function extractDate(body: string): Date | null {
  const patterns = [
    /\b(\d{4}-\d{2}-\d{2})\b/g,
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    /\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2},? \d{4})\b/gi,
    /\b(\d{1,2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{4})\b/gi
  ];

  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const parsed = parseDay(match[1]!);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
}

function matchService(senderDomain: string, body: string): Service | undefined {
  const domainMatch = services.find((service) => {
    const websiteDomain = extractSenderDomain(service.website);
    const cancelDomain = extractSenderDomain(service.cancelUrl);
    return [websiteDomain, cancelDomain].some((domain) => domain === senderDomain || domain.endsWith(`.${senderDomain}`) || senderDomain.endsWith(`.${domain}`));
  });
  if (domainMatch) {
    return domainMatch;
  }

  const merchant = merchantFromDomain(senderDomain) ?? parseMerchantFromSubject(body);
  return merchant ? searchServices(merchant, 1)[0] : undefined;
}

function merchantFromDomain(senderDomain: string): string | null {
  const firstLabel = senderDomain.split(".")[0];
  return firstLabel ? titleCase(firstLabel.replace(/[-_]/g, " ")) : null;
}

function parseMerchantFromSubject(body: string): string | null {
  // The first line (up to the first LF or CRLF), without a dead `?? ""`.
  const firstLine = body.replace(/\r?\n[\s\S]*$/, "");
  const cleaned = firstLine
    .replace(/\b(receipt|invoice|subscription|payment|confirmation|billing|renewal|charged|charge|your|from|for)\b/gi, " ")
    .replace(/\$\s*\d+(?:\.\d{2})?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? titleCase(cleaned.split(" ").slice(0, 4).join(" ")) : null;
}

function enrichWithCatalogMatch(subscription: ParsedSubscription): ParsedSubscription {
  if (subscription.serviceId) {
    // id === slug for every catalog entry (pinned by the catalog invariant
    // test), so a lookup by slug is complete; a second lookup by id could
    // never find anything the first missed.
    const service = getServiceBySlug(subscription.serviceId);
    return service ? { ...subscription, serviceId: service.id, cancelUrl: service.cancelUrl, name: service.name } : subscription;
  }

  const service = searchServices(subscription.name, 1)[0] ?? searchServices(subscription.rawMerchant, 1)[0];
  if (!service) {
    return subscription;
  }

  return {
    ...subscription,
    name: service.name,
    serviceId: service.id,
    cancelUrl: service.cancelUrl
  };
}

function compareParsed(a: ParsedSubscription, b: ParsedSubscription): number {
  const confidenceDelta = confidenceRank(b.confidence) - confidenceRank(a.confidence);
  return confidenceDelta || b.amount - a.amount;
}
