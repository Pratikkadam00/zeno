import { randomBytes } from "node:crypto";
import type { ErrorEvent } from "@sentry/react-native";
import { describe, expect, it } from "vitest";
import { scrubBreadcrumb, scrubEvent, scrubText, scrubValue } from "./sentry-scrub";

/**
 * P3.3: nothing sent to Sentry carries a credential, an email address, or an
 * amount of money, wherever in the event it sits. The token is generated (the
 * shape of our 43-character base64url refresh/magic tokens), not a literal.
 */
// redact.ts catches a BARE token by its length plus a digit; about 0.07 % of
// random tokens have no digit (its documented limit), so the sample is drawn
// until it has one, keeping this test deterministic.
function tokenWithDigit(): string {
  for (;;) {
    const token = randomBytes(32).toString("base64url");
    if (/\d/.test(token)) return token;
  }
}
const TOKEN = tokenWithDigit();
const EMAIL = "jane.doe+zeno@mail.example.co.uk";
// Each must be gone from the output, as text (the figure itself, not only its marker).
const FIGURES = ["15.49", "1,299", "12.00", "12.99", "7.50"];

function leaks(value: unknown): string[] {
  const flat = JSON.stringify(value);
  return [TOKEN, EMAIL, ...FIGURES].filter((secret) => flat.includes(secret));
}

describe("scrubText — redact.ts's rules, plus money", () => {
  it.each([
    ["$15.49", "[amount]"],
    ["€9", "[amount]"],
    ["₹1,299", "[amount]"],
    ["Rs. 99", "[amount]"],
    ["£7.50", "[amount]"],
    ["12.99 USD", "[amount]"],
    ["12.99 usd", "[amount]"],
    // The currency's letters stay; the figure goes.
    ["CA$12.00", "CA[amount]"],
    ["-$5", "-[amount]"]
  ])("removes the amount %s", (amount, expected) => {
    expect(scrubText(`Failed to save Netflix (${amount}/mo)`)).toBe(`Failed to save Netflix (${expected}/mo)`);
  });

  it("still removes tokens and emails (redact.ts)", () => {
    expect(scrubText(`verify?token=${TOKEN} for ${EMAIL}`)).toBe("verify?token=[redacted] for [redacted-email]");
  });

  it("leaves diagnostics that only look numeric: line numbers, ids, routes, statuses", () => {
    for (const text of [
      "at verify (authStore.ts:180)",
      "at SubscriptionHydrationBoundaryProviderComponent (index.android.bundle:1:23456)",
      "GET /api/v1/sync/pull → 503",
      "sub_netflix renews in 3 days"
    ]) expect(scrubText(text)).toBe(text);
  });
});

describe("scrubValue", () => {
  it("replaces money-named keys' values even as bare numbers, and recurses into everything else", () => {
    expect(
      scrubValue({ amountMinor: 1549, price: "15.49", totalCount: 3, budget: { monthlyCost: 900 }, list: [EMAIL, null, true] })
    ).toEqual({
      amountMinor: "[amount]",
      price: "[amount]",
      totalCount: "[amount]",
      budget: { monthlyCost: "[amount]" },
      list: ["[redacted-email]", null, true]
    });
  });

  it("an Error becomes scrubbed text; past the depth limit a value is DROPPED, never passed through", () => {
    expect(scrubValue(new TypeError(`No account for ${EMAIL} ($5)`))).toBe("TypeError: No account for [redacted-email] ([amount])");
    expect(scrubValue({ a: { b: { c: { d: { e: EMAIL } } } } })).toEqual({ a: { b: { c: { d: "[truncated]" } } } });
    expect(scrubValue(42)).toBe(42);
  });
});

describe("scrubBreadcrumb — every breadcrumb, before it is stored (and synced to native)", () => {
  it("strips the whole query string from a fetch breadcrumb's URL, keeping the rest", () => {
    const result = scrubBreadcrumb({
      category: "fetch",
      data: { url: `https://api.zeno.app/auth/verify?token=${TOKEN}&next=1`, method: "GET", status_code: 400 }
    });
    expect(result.data).toEqual({ url: "https://api.zeno.app/auth/verify", method: "GET", status_code: 400 });
    expect(result.category).toBe("fetch");
  });

  it("strips the query string from an xhr breadcrumb's URL", () => {
    const result = scrubBreadcrumb({ category: "xhr", data: { url: `https://oauth2.googleapis.com/revoke?token=${TOKEN}` } });
    expect(result.data?.url).toBe("https://oauth2.googleapis.com/revoke");
  });

  it("scrubs a console breadcrumb's message and arguments (the console integration records them)", () => {
    const result = scrubBreadcrumb({
      category: "console",
      message: `sync failed for ${EMAIL}: Bearer ${TOKEN}, owed $15.49`,
      data: { arguments: [`for ${EMAIL}`, { amountMinor: 1549 }], logger: "console" }
    });
    expect(leaks(result)).toEqual([]);
    expect(result.message).toBe("sync failed for [redacted-email]: Bearer [redacted], owed [amount]");
    expect(result.data?.logger).toBe("console");
  });

  it("other categories: data is scrubbed by the rules, but a url-like value keeps its non-secret query", () => {
    expect(scrubBreadcrumb({ category: "navigation", data: { from: "/home?tab=2", to: `/verify?token=${TOKEN}` } }).data).toEqual({
      from: "/home?tab=2",
      to: "/verify?token=[redacted]"
    });
  });

  it("an http breadcrumb with no url, or with no data at all, passes through unchanged", () => {
    const noUrl = { category: "fetch", data: { method: "GET" } };
    expect(scrubBreadcrumb(noUrl)).toEqual(noUrl);
    const noData = { category: "fetch", message: "no data on this one" };
    expect(scrubBreadcrumb(noData)).toEqual(noData);
  });
});

describe("scrubEvent — Sentry's beforeSend", () => {
  // Every place a JS error event carries free text, each holding a secret.
  const event = (): ErrorEvent => ({
    type: undefined,
    event_id: "0123456789abcdef0123456789abcdef",
    release: "com.zeno.app@1.0.0+1",
    message: `failed for ${EMAIL}`,
    logentry: { message: `charged $15.49 to ${EMAIL}`, params: [TOKEN, { price: 1549 }] },
    exception: {
      values: [
        {
          type: "Error",
          value: `verify?token=${TOKEN} failed for ${EMAIL} (₹1,299)`,
          stacktrace: {
            frames: [
              {
                filename: "app:///index.android.bundle",
                function: "verify",
                lineno: 180,
                colno: 12,
                context_line: `fetch(\`/verify?token=${TOKEN}\`)`,
                pre_context: [`// ${EMAIL}`],
                post_context: ["// $7.50"],
                vars: { token: TOKEN }
              }
            ]
          }
        }
      ]
    },
    breadcrumbs: [{ category: "fetch", data: { url: `https://api.zeno.app/auth/verify?token=${TOKEN}` } }],
    extra: { screen: "dashboard", amountMinor: 1549, note: `for ${EMAIL}` },
    contexts: {
      trace: { trace_id: "fedcba9876543210fedcba9876543210", span_id: "0123456789abcdef" },
      react: { componentStack: `in Row (for ${EMAIL}, CA$12.00)` }
    },
    tags: { screen: `/verify?token=${TOKEN}`, retried: true },
    request: {
      method: "GET",
      url: `https://api.zeno.app/auth/verify?token=${TOKEN}`,
      headers: { Authorization: `Bearer ${TOKEN}`, cookie: `s=${TOKEN}`, "User-Agent": "okhttp", "X-Email": EMAIL },
      cookies: { s: TOKEN },
      query_string: `token=${TOKEN}`,
      data: { email: EMAIL, total: 12.99 },
      env: { REMOTE_ADDR: "203.0.113.7" }
    },
    user: { ip_address: "203.0.113.7", email: EMAIL, username: "jane" }
  });

  it("no token, email or amount survives anywhere in the event", () => {
    const out = scrubEvent(event());
    expect(leaks(out)).toEqual([]);
    expect(JSON.stringify(out)).not.toContain("203.0.113.7");
  });

  it("drops the user, local variables, auth and cookie headers, cookies, query string and env whole", () => {
    const out = scrubEvent(event());
    expect(out.user).toBeUndefined();
    expect(out.exception?.values?.[0]?.stacktrace?.frames?.[0]).not.toHaveProperty("vars");
    expect(out.request).toEqual({
      method: "GET",
      url: "https://api.zeno.app/auth/verify",
      headers: { "User-Agent": "okhttp", "X-Email": "[redacted-email]" },
      data: { email: "[redacted-email]", total: "[amount]" }
    });
  });

  it("keeps what Sentry needs to group and symbolicate: ids, release, frames, the trace context", () => {
    const out = scrubEvent(event());
    expect(out.event_id).toBe("0123456789abcdef0123456789abcdef");
    expect(out.release).toBe("com.zeno.app@1.0.0+1");
    expect(out.contexts?.trace).toEqual({ trace_id: "fedcba9876543210fedcba9876543210", span_id: "0123456789abcdef" });
    expect(out.exception?.values?.[0]).toMatchObject({
      type: "Error",
      value: "verify?token=[redacted] failed for [redacted-email] ([amount])",
      stacktrace: { frames: [{ filename: "app:///index.android.bundle", function: "verify", lineno: 180, colno: 12 }] }
    });
    expect(out.tags).toEqual({ screen: "/verify?token=[redacted]", retried: true });
    expect(out.extra).toEqual({ screen: "dashboard", amountMinor: "[amount]", note: "for [redacted-email]" });
  });

  it("does not mutate the SDK's event", () => {
    const original = event();
    const copy = structuredClone(original);
    scrubEvent(original);
    expect(original).toEqual(copy);
  });

  it("an event with none of these parts comes back as it went in, never dropped", () => {
    expect(scrubEvent({ type: undefined })).toEqual({ type: undefined });
    const sparse: ErrorEvent = {
      type: undefined,
      logentry: {},
      exception: { values: [{}, { stacktrace: {} }, { stacktrace: { frames: [{ lineno: 1 }] } }] },
      request: {}
    };
    expect(scrubEvent(sparse)).toEqual(sparse);
  });
});
