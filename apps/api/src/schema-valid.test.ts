import { readFileSync } from "node:fs";
import fc from "fast-check";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * F89 (plan P2.4): property tests "driven by each zod schema: valid ⇒ expected
 * status". fuzz.test.ts sends arbitrary input and checks the API never breaks;
 * this file sends only input the route's OWN schema accepts and checks it gets
 * exactly the status the handler's rules give it (a valid body is never a 400
 * from validation, never a 500).
 *
 * Inputs are generated from z.toJSONSchema(schema) and then filtered through
 * schema.safeParse, so every input is valid by the real schema's definition
 * (refinements that JSON Schema cannot express included). Each route's expected
 * status is its handler's rule, read from the handler and cited below.
 */
const RUNS = Number(process.env.FUZZ_RUNS ?? 200);
const SEED = process.env.FAST_CHECK_SEED === undefined ? undefined : Number(process.env.FAST_CHECK_SEED);
const BODY_LIMIT = 1_048_576; // app.ts: Fastify({ bodyLimit: 1_048_576 }) — a larger valid body is a 413
const ENV_KEYS = [
  "RESEND_API_KEY", "REVENUECAT_SECRET_KEY", "REVENUECAT_WEBHOOK_AUTH", "RAZORPAY_WEBHOOK_SECRET", "PLAID_CLIENT_ID", "PLAID_SECRET", "COACH_PROVIDER",
  "ANTHROPIC_API_KEY", "GROQ_API_KEY", "APPLE_CLIENT_ID", "APPLE_BUNDLE_ID", "GOOGLE_EXPO_CLIENT_ID", "GOOGLE_WEB_CLIENT_ID",
  "GOOGLE_IOS_CLIENT_ID", "GOOGLE_ANDROID_CLIENT_ID", "ALLOW_UNVERIFIED_OAUTH_TOKENS", "DEMO_LOGIN_PASSWORD", "DATABASE_URL", "MONITORING_WEBHOOK_URL"
] as const;
const saved: Record<string, string | undefined> = {};

// ── JSON Schema (as zod emits it) → fast-check. Only the keywords the API's
//    schemas use are supported; anything else throws, so a new schema can never
//    be silently half-tested. ─────────────────────────────────────────────────
type Json = Record<string, unknown>;
const KNOWN = new Set(["$schema", "type", "properties", "required", "additionalProperties", "propertyNames", "minLength", "maxLength",
  "enum", "format", "pattern", "minimum", "maximum", "items", "maxItems", "minItems", "default"]);
// The parser rejects these keys by design (P2.4: onProtoPoisoning / onConstructorPoisoning).
const PARSER_REJECTED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
/** True when a parser-rejected key appears ANYWHERE in the value (not only at
 *  the top). Such bodies are the fuzz suite's business (fuzz.test.ts pins the
 *  parser's 400 for them); this suite generates only bodies the parser accepts. */
function hasRejectedKey(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasRejectedKey);
  return Object.keys(value).some((key) => PARSER_REJECTED_KEYS.has(key) || hasRejectedKey((value as Record<string, unknown>)[key]));
}

function arbitraryFor(schema: Json, ascii = false): fc.Arbitrary<unknown> {
  for (const key of Object.keys(schema)) {
    if (!KNOWN.has(key)) throw new Error(`unsupported JSON Schema keyword "${key}": extend arbitraryFor() first`);
  }
  if (Array.isArray(schema.enum)) return fc.constantFrom(...(schema.enum as unknown[]));
  switch (schema.type) {
    case "string": {
      const min = (schema.minLength as number | undefined) ?? 0;
      const max = (schema.maxLength as number | undefined) ?? min + 64;
      const fits = (s: string) => s.length >= min && s.length <= max;
      if (schema.format === "email") return fc.emailAddress().filter(fits);
      if (typeof schema.pattern === "string") return fc.stringMatching(new RegExp(schema.pattern)).filter(fits);
      const short = fc.string({ minLength: min, maxLength: Math.min(max, min + 48), unit: ascii ? "grapheme-ascii" : "grapheme" }).filter(fits);
      // The edges are where off-by-one validation lives.
      return fc.oneof({ weight: 6, arbitrary: short }, { weight: 1, arbitrary: fc.constant("x".repeat(min)) }, { weight: 1, arbitrary: fc.constant("y".repeat(max)) });
    }
    case "integer": {
      const min = (schema.minimum as number | undefined) ?? -1_000_000;
      const max = (schema.maximum as number | undefined) ?? 1_000_000;
      return fc.oneof({ weight: 6, arbitrary: fc.integer({ min, max }) }, { weight: 1, arbitrary: fc.constantFrom(min, max) });
    }
    case "array": {
      const minLength = (schema.minItems as number | undefined) ?? 0;
      const maxItems = (schema.maxItems as number | undefined) ?? 8;
      const item = arbitraryFor(schema.items as Json, ascii);
      return fc.oneof({ weight: 6, arbitrary: fc.array(item, { minLength, maxLength: Math.min(maxItems, minLength + 6) }) },
        { weight: 1, arbitrary: fc.array(item, { minLength: maxItems, maxLength: maxItems }) });
    }
    case "object": {
      const properties = (schema.properties as Record<string, Json> | undefined) ?? {};
      const required = (schema.required as string[] | undefined) ?? [];
      const model = Object.fromEntries(Object.entries(properties).map(([k, v]) => [k, arbitraryFor(v, ascii)]));
      const known = fc.record(model, { requiredKeys: required });
      const extra = schema.additionalProperties;
      if (extra === undefined) return known;
      const keyArb = (schema.propertyNames ? arbitraryFor(schema.propertyNames as Json, ascii) : fc.string({ maxLength: 12 }))
        .filter((k) => typeof k === "string" && !PARSER_REJECTED_KEYS.has(k) && !(k in properties)) as fc.Arbitrary<string>;
      // Free-form values can nest keys of their own: keep the parser-rejected
      // ones out at every depth (found by this test's 193rd case: a nested
      // "__proto__" inside a webhook's passthrough field, correctly a 400).
      const valueArb = Object.keys(extra as Json).length === 0
        ? fc.jsonValue({ maxDepth: 2 }).filter((v) => !hasRejectedKey(v))
        : arbitraryFor(extra as Json, ascii);
      return fc.tuple(known, fc.dictionary(keyArb, valueArb, { maxKeys: 4 })).map(([k, more]) => ({ ...more, ...(k as object) }));
    }
    default:
      throw new Error(`unsupported JSON Schema type ${JSON.stringify(schema.type)}`);
  }
}

/** Only values the route's own schema accepts (as the server will see them). */
function validFor(schema: z.ZodType, seen: (v: unknown) => unknown = (v) => v, ascii = false): fc.Arbitrary<unknown> {
  return arbitraryFor(z.toJSONSchema(schema, { io: "input" }) as Json, ascii).filter((v) => schema.safeParse(seen(v)).success);
}
const asQuery = (v: unknown) => Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, String(x)]));

beforeEach(() => {
  vi.resetModules();
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  process.env.REVENUECAT_WEBHOOK_AUTH = "hook-secret";
  process.env.RAZORPAY_WEBHOOK_SECRET = "razorpay-hook-secret";
});
afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.restoreAllMocks();
});

let ipCounter = 0;
const nextIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${(ipCounter & 255) || 1}`;
};

describe("F89: every input a route's own schema accepts gets exactly the status its handler gives it", () => {
  // Reads the route SOURCE as text. Stryker runs tests against its instrumented
  // copy, where every call is wrapped and this scan cannot match; a text scan can
  // never notice a mutant anyway (it does not run the code), so it skips there only.
  const itReadsSource = process.env.STRYKER_MUTATOR_WORKER ? it.skip : it;
  itReadsSource("covers every route that parses a request schema (a new one fails here until it is added)", () => {
    // Every schema-parsing call site in the route code, by schema name.
    const sites: string[] = [];
    for (const file of ["app.ts", "routes/auth.ts"]) {
      const code = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      for (const m of code.matchAll(/\bparse(?:Body|Request)\((\w+),/g)) sites.push(m[1]!);
      for (const m of code.matchAll(/\b(\w+Schema)\.safeParse\(request\./g)) sites.push(m[1]!);
    }
    expect(sites.sort()).toEqual(Object.values(ROUTES).map((r) => r.schemaName).sort());
  });

  for (const [route, spec] of Object.entries(ROUTES)) {
    it(`${route}: ${spec.rule}`, async () => {
      const { buildApp } = await import("./app");
      const app = await buildApp();
      const ctx = await spec.setup?.(app);
      const schema = await spec.schema();
      const arbitrary = spec.generator ? spec.generator(schema, ctx) : validFor(schema, spec.query ? asQuery : undefined, Boolean(spec.query));
      const state: State = { magicLinks: new Map(), households: 0 };
      await fc.assert(fc.asyncProperty(arbitrary, async (input) => {
        const [method, path] = route.split(" ") as ["GET" | "POST", string];
        const headers: Record<string, string> = { ...(spec.headers ? await spec.headers(app, ctx) : {}) };
        const url = (ctx?.path ?? path) + (spec.query ? `?${new URLSearchParams(asQuery(input))}` : "");
        const payload = spec.query ? undefined : JSON.stringify(input);
        if (payload !== undefined) headers["content-type"] = "application/json";
        const r = await app.inject({ method, url, headers, remoteAddress: nextIp(), ...(payload === undefined ? {} : { payload }) });
        const tooBig = payload !== undefined && Buffer.byteLength(payload) > BODY_LIMIT;
        const expected = tooBig ? 413 : spec.expect(input, state, ctx);
        expect(r.statusCode, `${route} ${JSON.stringify(input).slice(0, 300)} → ${r.body.slice(0, 200)}`).toBe(expected);
        // The shared envelope (packages/shared/src/api.ts): ok() → { data, error: null, meta }; fail() → error set.
        const envelope = r.json() as { data: unknown; error: unknown; meta: { requestId?: unknown } };
        expect(typeof envelope.meta.requestId, r.body.slice(0, 200)).toBe("string");
        if (expected === 200) expect(envelope.error, r.body.slice(0, 200)).toBeNull();
        else expect(envelope.error, r.body.slice(0, 200)).not.toBeNull();
      }), { numRuns: spec.runs ?? RUNS, ...(SEED === undefined ? {} : { seed: SEED }) });
    // Measured at 10 000 runs: 58 s for all 19 tests, the slowest route 10.2 s
    // (about 1 ms per run). 60 ms per run leaves ~59x headroom for a slow runner.
    }, Math.max(120_000, RUNS * 60));
  }
});

// ── The routes, each with its handler's rule for a VALID input in this
//    environment (no Resend, RevenueCat REST, Plaid, coach, Apple/Google
//    audiences or demo password configured; the webhook secret is). ─────────
type App = Awaited<ReturnType<typeof import("./app")["buildApp"]>>;
type State = { magicLinks: Map<string, number>; households: number };
type Ctx = { path?: string; shareCode?: string } | undefined;
type Spec = {
  schemaName: string;
  schema: () => Promise<z.ZodType>;
  rule: string;
  expect: (input: unknown, state: State, ctx: Ctx) => number;
  query?: boolean;
  runs?: number;
  headers?: (app: App, ctx: Ctx) => Promise<Record<string, string>>;
  setup?: (app: App) => Promise<Ctx>;
  generator?: (schema: z.ZodType, ctx: Ctx) => fc.Arbitrary<unknown>;
};

async function bearer(app: App, email = `valid-${Math.random().toString(36).slice(2)}@zeno.test`): Promise<Record<string, string>> {
  const ip = nextIp();
  const requested = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", remoteAddress: ip, payload: { email } });
  const raw = decodeURIComponent(String(requested.json().data.devLink).split("token=")[1]!);
  const verified = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token: raw }, remoteAddress: ip });
  return { authorization: `Bearer ${verified.json().data.accessToken as string}` };
}
const app_ = () => import("./app");
const auth_ = () => import("./routes/auth");
const shared_ = () => import("@zeno/shared");
/** One account per app for routes limited per IP (each request uses a new IP). */
const sharedBearer = new WeakMap<App, Promise<Record<string, string>>>();
const oneAccount = (app: App) => {
  if (!sharedBearer.has(app)) sharedBearer.set(app, bearer(app));
  return sharedBearer.get(app)!;
};
/** magic-link: 5 requests per address per 15 minutes (routes/auth.ts magicLinkEmailRateLimited); the 6th+ is a 429. */
// Random addresses almost never repeat, so the cap would never be reached: a
// small pool (with case variants, as the server lower-cases addresses) makes
// the 5th and 6th request for one address happen.
const magicLinkInputs = (schema: z.ZodType) => fc.oneof(
  validFor(schema),
  fc.constantFrom("repeat@zeno.test", "Repeat@Zeno.test", "REPEAT@ZENO.TEST", "other@zeno.test").map((email) => ({ email }))
).filter((v) => schema.safeParse(v).success);
function magicLinkRule(input: unknown, state: State): number {
  const email = String((input as { email: string }).email).trim().toLowerCase();
  const n = (state.magicLinks.get(email) ?? 0) + 1;
  state.magicLinks.set(email, n);
  return n > 5 ? 429 : 200;
}

const ROUTES: Record<string, Spec> = {
  "POST /api/v1/events": {
    schemaName: "productEventSchema", schema: async () => (await app_()).productEventSchema,
    rule: "200 only for an allowlisted event with an allowed label (metrics.ts recordProductEvent), else 400",
    // Random strings plus the real allowlist (so the success path runs) plus the
    // names every plain object inherits (a lookup on an object literal finds them).
    generator: (schema) => fc.oneof(
      validFor(schema),
      allowlisted(),
      fc.record({ event: fc.constantFrom("constructor", "toString", "hasOwnProperty", "valueOf", "__proto__", "isPrototypeOf"), label: fc.option(fc.constantFrom("csv", "x"), { nil: undefined }) })
        .map(({ event, label }) => (label === undefined ? { event } : { event, label }))
    ).filter((v) => schema.safeParse(v).success),
    expect: (input) => (allowed(input as { event: string; label?: string }) ? 200 : 400)
  },
  "POST /api/v1/family/create": {
    schemaName: "familyCreateSchema", schema: async () => (await app_()).familyCreateSchema,
    rule: "200 until the owner has 5 households (family.ts MAX_HOUSEHOLDS_PER_OWNER), then 409",
    headers: (app) => oneAccount(app),
    expect: (_input, state) => (++state.households <= 5 ? 200 : 409)
  },
  "POST /api/v1/family/join": {
    schemaName: "familyJoinSchema", schema: async () => (await app_()).familyJoinSchema,
    rule: "200 when the code, trimmed and upper-cased, is a household's (family.ts joinHousehold), else 404",
    setup: async (app) => {
      const owner = await bearer(app);
      const created = await app.inject({ method: "POST", url: "/api/v1/family/create", remoteAddress: nextIp(), headers: owner, payload: { ownerName: "Owner" } });
      return { shareCode: created.json().data.household.shareCode as string };
    },
    headers: (app) => oneAccount(app),
    generator: (schema, ctx) => fc.oneof(validFor(schema), validFor(schema).map((v) => ({ ...(v as object), shareCode: ` ${ctx!.shareCode!.toLowerCase()} ` })))
      .filter((v) => schema.safeParse(v).success),
    // The one account re-joining just updates its membership, so the member cap never applies.
    expect: (input, _state, ctx) => ((input as { shareCode: string }).shareCode.trim().toUpperCase() === ctx!.shareCode ? 200 : 404)
  },
  "POST /api/v1/family/:householdId/spend": {
    schemaName: "familySpendSchema", schema: async () => (await app_()).familySpendSchema,
    rule: "a member updating their own household's spend: 200",
    setup: async (app) => {
      const created = await app.inject({ method: "POST", url: "/api/v1/family/create", remoteAddress: nextIp(), headers: await oneAccount(app), payload: { ownerName: "Me" } });
      return { path: `/api/v1/family/${created.json().data.household.id as string}/spend` };
    },
    headers: (app) => oneAccount(app),
    expect: () => 200
  },
  "POST /api/v1/coach": {
    schemaName: "coachRequestSchema", schema: async () => (await app_()).coachRequestSchema,
    rule: "no provider configured: 200 { source: \"unconfigured\" } (a fresh account per request: the coach allows 10/min per account)",
    headers: (app) => bearer(app),
    runs: Math.min(RUNS, 200),
    expect: () => 200
  },
  "POST /api/v1/billing/webhook": {
    schemaName: "revenueCatWebhookSchema", schema: async () => (await app_()).revenueCatWebhookSchema,
    rule: "authenticated: 200 (the cached entitlement is dropped; F85)",
    headers: async () => ({ authorization: "Bearer hook-secret" }),
    expect: () => 200
  },
  "POST /api/v1/billing/razorpay/webhook": {
    schemaName: "razorpayWebhookSchema", schema: async () => (await app_()).razorpayWebhookSchema,
    // The invariant worth fuzzing here is the gate, not the grant: no body the
    // schema accepts may be acted on without a valid signature over the raw
    // bytes, and the handler checks that before it reads anything.
    rule: "a body with no valid signature: 401, whatever it contains",
    headers: async () => ({ "x-razorpay-signature": "0".repeat(64) }),
    expect: () => 401
  },
  "POST /api/v1/plaid/exchange": {
    schemaName: "plaidExchangeSchema", schema: async () => (await app_()).plaidExchangeSchema,
    rule: "Plaid not configured (the production state): 503 before the body is used",
    headers: (app) => oneAccount(app),
    expect: () => 503
  },
  "GET /api/v1/sync/pull": {
    schemaName: "syncPullSchema", schema: async () => (await shared_()).syncPullSchema, query: true,
    rule: "200",
    headers: (app) => oneAccount(app),
    expect: () => 200
  },
  "POST /api/v1/sync/push": {
    schemaName: "syncPushSchema", schema: async () => (await shared_()).syncPushSchema,
    rule: "200 (a body over the 1 MiB limit is a 413)",
    headers: (app) => oneAccount(app),
    expect: () => 200
  },
  "POST /api/v1/auth/magic-link": {
    schemaName: "magicLinkRequestSchema", schema: async () => (await auth_()).magicLinkRequestSchema,
    rule: "200; the 6th request for one address within 15 minutes is a 429", generator: magicLinkInputs, expect: magicLinkRule
  },
  "POST /api/v1/auth/magic-link/request": {
    schemaName: "magicLinkRequestSchema", schema: async () => (await auth_()).magicLinkRequestSchema,
    rule: "the legacy route: the same as /auth/magic-link", generator: magicLinkInputs, expect: magicLinkRule
  },
  "POST /api/v1/auth/verify": {
    schemaName: "magicLinkVerifySchema", schema: async () => (await auth_()).magicLinkVerifySchema,
    rule: "no link or code was issued for it: 401", expect: () => 401
  },
  "POST /api/v1/auth/magic-link/verify": {
    schemaName: "legacyMagicLinkVerifySchema", schema: async () => (await auth_()).legacyMagicLinkVerifySchema,
    rule: "no code was issued for it: 401", expect: () => 401
  },
  "POST /api/v1/auth/apple": {
    schemaName: "appleOAuthSchema", schema: async () => (await auth_()).appleOAuthSchema,
    rule: "no Apple audience configured and the unverified flag off: 401", expect: () => 401
  },
  "POST /api/v1/auth/google": {
    schemaName: "googleOAuthSchema", schema: async () => (await auth_()).googleOAuthSchema,
    rule: "no Google audience configured and the unverified flag off: 401 (with or without an idToken)", expect: () => 401
  },
  "POST /api/v1/auth/refresh": {
    schemaName: "refreshSchema", schema: async () => (await auth_()).refreshSchema,
    rule: "an unknown refresh token: 401", expect: () => 401
  },
  "POST /api/v1/auth/demo-login": {
    schemaName: "demoLoginSchema", schema: async () => (await auth_()).demoLoginSchema,
    rule: "demo login not enabled (no DEMO_LOGIN_PASSWORD): 404", expect: () => 404
  },
  "POST /api/v1/auth/logout": {
    schemaName: "logoutSchema", schema: async () => (await auth_()).logoutSchema,
    rule: "200 whatever the token", expect: () => 200
  }
};

// The real allowlist, so the success path of /events is exercised too.
let labels: Record<string, readonly string[]> = {};
const ready = import("./metrics").then((m) => { labels = m.PRODUCT_EVENT_LABELS; });
function allowlisted(): fc.Arbitrary<unknown> {
  const events = Object.keys(labels);
  return fc.constantFrom(...events).chain((event) => {
    const allowedLabels = labels[event]!;
    return allowedLabels.length === 0 ? fc.constant({ event }) : fc.constantFrom(...allowedLabels).map((label) => ({ event, label }));
  });
}
function allowed({ event, label }: { event: string; label?: string }): boolean {
  const allowedLabels = Object.prototype.hasOwnProperty.call(labels, event) ? labels[event] : undefined;
  if (!allowedLabels) return false;
  return allowedLabels.length > 0 ? label !== undefined && allowedLabels.includes(label) : label === undefined;
}
await ready;
