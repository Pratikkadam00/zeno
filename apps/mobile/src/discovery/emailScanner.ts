import { getServiceBySlug, searchServices, services, type Service } from "@subradar/service-catalog";
import { exchangeCodeAsync, type AuthRequest, type AuthSessionResult } from "expo-auth-session";
import { discovery as googleDiscovery } from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";

export type ParsedSubscription = {
  name: string;
  amount: number;
  currency: string;
  billingCycle: "monthly" | "annual" | "weekly" | "unknown";
  lastCharged: string;
  nextRenewal: string;
  confidence: "high" | "medium" | "low";
  serviceId?: string;
  rawMerchant: string;
  cancelUrl?: string;
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
  messages?: Array<{ id: string; threadId?: string }>;
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
  headers?: Array<{ name: string; value: string }>;
  body?: { data?: string };
  parts?: GmailPayload[];
};

const gmailTokenKey = "zeno_gmail_token";
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

const billingSearchQuery = 'subject:(receipt OR invoice OR subscription OR "payment confirmation" OR "charge" OR "billing" OR "thank you for your purchase" OR "renewal") newer_than:180d';

export async function connectGmail(request: AuthRequest, result: AuthSessionResult): Promise<string> {
  if (result.type !== "success") {
    throw new Error("Gmail authorization was cancelled.");
  }

  const accessToken = result.authentication?.accessToken ?? await exchangeAuthorizationCode(request, result);
  await SecureStore.setItemAsync(gmailTokenKey, accessToken, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
  });
  return accessToken;
}

export async function fetchBillingEmails(accessToken: string): Promise<GmailMessage[]> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  url.searchParams.set("q", billingSearchQuery);
  url.searchParams.set("maxResults", "200");

  const list = await gmailFetch<GmailListResponse>(url.toString(), accessToken);
  const messageRefs = list.messages ?? [];
  const messages: GmailMessage[] = [];

  for (const messageRef of messageRefs) {
    const metadata = await fetchMessageMetadata(accessToken, messageRef.id);
    const sender = getHeader(metadata.payload, "from");
    const senderDomain = getKnownBillingDomain(extractSenderDomain(sender));
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
  }

  return messages;
}

export function parseEmailBody(emailBody: string, senderDomain: string): ParsedSubscription | null {
  const normalizedDomain = getKnownBillingDomain(senderDomain) ?? senderDomain.toLowerCase();
  const amount = extractAmount(emailBody);
  if (amount === null) {
    return null;
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
  const grouped = new Map<string, ParsedSubscription>();

  for (const subscription of parsed) {
    const matched = enrichWithCatalogMatch(subscription);
    const key = slugify(matched.serviceId ?? matched.name);
    const current = grouped.get(key);
    if (!current || compareParsed(matched, current) < 0) {
      grouped.set(key, matched);
    }
  }

  return [...grouped.values()].sort((a, b) => compareParsed(a, b));
}

export async function scanGmailSubscriptions(
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

  return processResults(parsed);
}

export async function disconnectGmail(): Promise<void> {
  const token = await SecureStore.getItemAsync(gmailTokenKey);
  try {
    if (token) {
      await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${encodeURIComponent(token)}`);
    }
  } finally {
    await SecureStore.deleteItemAsync(gmailTokenKey);
  }
}

export async function getStoredGmailToken(): Promise<string | null> {
  return SecureStore.getItemAsync(gmailTokenKey);
}

export async function fetchGmailAddress(accessToken: string): Promise<string | null> {
  const profile = await gmailFetch<{ emailAddress?: string }>("https://gmail.googleapis.com/gmail/v1/users/me/profile", accessToken);
  return profile.emailAddress ?? null;
}

async function exchangeAuthorizationCode(request: AuthRequest, result: AuthSessionResult): Promise<string> {
  if (result.type !== "success") {
    throw new Error("Google authorization did not complete successfully.");
  }

  const code = result.params.code;
  if (!code) {
    throw new Error("Google did not return an authorization code.");
  }

  const tokenResponse = await exchangeCodeAsync({
    clientId: request.clientId,
    clientSecret: request.clientSecret,
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
  const response = await fetch(url, {
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

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
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
  return sender.toLowerCase().replace(/^https?:\/\//, "").split("/")[0] ?? "";
}

function getKnownBillingDomain(domain: string): string | null {
  const normalized = domain.toLowerCase();
  return knownBillingDomains.find((knownDomain) => normalized === knownDomain || normalized.endsWith(`.${knownDomain}`)) ?? null;
}

function extractAmount(body: string): number | null {
  const patterns = [
    /\$\s*(\d+(?:\.\d{2})?)/g,
    /USD\s*(\d+(?:\.\d{2})?)/gi,
    /total[:\s]+\$?(\d+(?:\.\d{2})?)/gi,
    /amount[:\s]+\$?(\d+(?:\.\d{2})?)/gi,
    /charged[:\s]+\$?(\d+(?:\.\d{2})?)/gi,
    /payment of \$?(\d+(?:\.\d{2})?)/gi
  ];
  const counts = new Map<string, { amount: number; count: number }>();

  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const amount = Number.parseFloat(match[1]);
      if (!Number.isFinite(amount) || amount <= 0) {
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

function detectCurrency(body: string): string {
  if (/\bUSD\b|\$/i.test(body)) {
    return "USD";
  }
  if (/\bEUR\b|€/i.test(body)) {
    return "EUR";
  }
  if (/\bGBP\b|£/i.test(body)) {
    return "GBP";
  }
  return "USD";
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

function extractDate(body: string): Date | null {
  const patterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    /\b([A-Z][a-z]+ \d{1,2},? \d{4})\b/g,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2},? \d{4})\b/gi
  ];

  for (const pattern of patterns) {
    for (const match of body.matchAll(pattern)) {
      const parsed = Date.parse(match[1]);
      if (!Number.isNaN(parsed)) {
        return new Date(parsed);
      }
    }
  }

  return null;
}

function calculateNextRenewal(lastCharged: Date, cycle: ParsedSubscription["billingCycle"]): Date {
  const next = new Date(lastCharged);
  if (cycle === "weekly") {
    next.setDate(next.getDate() + 7);
  } else if (cycle === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
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
  const firstLine = body.split(/\r?\n/)[0] ?? "";
  const cleaned = firstLine
    .replace(/\b(receipt|invoice|subscription|payment|confirmation|billing|renewal|charged|charge|your|from|for)\b/gi, " ")
    .replace(/\$\s*\d+(?:\.\d{2})?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned ? titleCase(cleaned.split(" ").slice(0, 4).join(" ")) : null;
}

function enrichWithCatalogMatch(subscription: ParsedSubscription): ParsedSubscription {
  if (subscription.serviceId) {
    const service = getServiceBySlug(subscription.serviceId) ?? services.find((candidate) => candidate.id === subscription.serviceId);
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

function confidenceRank(confidence: ParsedSubscription["confidence"]): number {
  if (confidence === "high") {
    return 3;
  }
  if (confidence === "medium") {
    return 2;
  }
  return 1;
}

function isWithin(amount: number, expected: number, tolerance: number): boolean {
  return Math.abs(amount - expected) <= expected * tolerance;
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}
