import { createSign, generateKeyPairSync } from "node:crypto";
import fc from "fast-check";
import type { InjectOptions } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * P2.4: property-based fuzzing of EVERY route in the live inventory.
 *
 * For each route, fast-check sends arbitrary input (JSON bodies of any shape,
 * random query strings, with or without a valid access token) and checks the
 * properties no input may break:
 *   - the server never answers 500 (no input crashes a handler);
 *   - every answer is the API's envelope ({ data, error, meta.requestId }), and
 *     never carries internals (framework codes, stack frames, module paths,
 *     database text);
 *   - no request pollutes Object.prototype (`__proto__` / `constructor` keys);
 *   - deep nesting, null bytes and odd Unicode are handled like any other input.
 *
 * FUZZ_RUNS sets the runs per route: 200 by default (every CI run), 10 000 in
 * the nightly job (.github/workflows/nightly-fuzz.yml).
 */
const RUNS = Number(process.env.FUZZ_RUNS ?? 200);
// FAST_CHECK_SEED replays a failure exactly: a failing run prints its seed.
const SEED = process.env.FAST_CHECK_SEED ? Number(process.env.FAST_CHECK_SEED) : undefined;

const keys = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" }
});
process.env.JWT_PRIVATE_KEY = keys.privateKey;
process.env.JWT_PUBLIC_KEY = keys.publicKey;
delete process.env.JWT_ISSUER;
delete process.env.JWT_AUDIENCE;
process.env.REVENUECAT_WEBHOOK_AUTH = "fuzz-webhook-secret";

const { buildApp } = await import("./app");
const { concreteUrl, routesFromTree } = await import("./route-inventory.testutil");
type App = Awaited<ReturnType<typeof buildApp>>;

let app: App;
let routes: string[] = [];
beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  routes = routesFromTree(app.printRoutes({ commonPrefix: false }));
});
afterAll(async () => {
  await app.close();
});

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
/** A valid access token for a throwaway account, signed exactly as the API signs. */
function tokenFor(sub: string): string {
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: "RS256", typ: "JWT", kid: "fuzz" });
  const body = b64({ sub, iss: "zeno-api", aud: "zeno-mobile", iat: now, exp: now + 600 });
  const s = createSign("RSA-SHA256");
  s.update(`${head}.${body}`);
  s.end();
  return `${head}.${body}.${s.sign(keys.privateKey, "base64url")}`;
}

// FUZZ_STATS=<file> writes how often each route answered each status, to
// check the fuzz reaches the handlers (not only the guard or the validator).
const stats = new Map<string, number>();
afterAll(async () => {
  if (process.env.FUZZ_STATS) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(process.env.FUZZ_STATS, [...stats].sort().map(([k, v]) => `${k} x${v}`).join("\n"));
  }
});

let ipCounter = 0;
const nextIp = () => {
  ipCounter += 1;
  return `10.${(ipCounter >> 16) & 255}.${(ipCounter >> 8) & 255}.${ipCounter & 255}`;
};

// What an attacker controls: any JSON value (including nesting, unicode, null
// bytes via fc.string), plus a few hostile shapes mixed in on purpose.
const hostileKeys = fc.constantFrom("__proto__", "constructor", "prototype", "toString", "hasOwnProperty");
const jsonBody = fc.oneof(
  { weight: 5, arbitrary: fc.jsonValue() },
  { weight: 2, arbitrary: fc.dictionary(fc.oneof(fc.string(), hostileKeys), fc.jsonValue(), { maxKeys: 8 }) },
  { weight: 1, arbitrary: fc.string({ unit: "binary" }) }
);
const queryString = fc.dictionary(fc.string({ maxLength: 20 }), fc.string({ unit: "grapheme", maxLength: 40 }), { maxKeys: 5 })
  .map((q) => new URLSearchParams(q).toString());
const withToken = fc.boolean();

// Text that only a leaked internal could produce: framework error codes, stack
// frames, module paths, and Postgres's own error phrasing. (A looser
// `pg ... error` pattern was a false positive: the fuzz's account id " pG " is
// echoed by /account, and every envelope has an "error" key.)
const INTERNALS = [
  /FST_[A-Z_]+/,
  /\n\s+at /,
  /node_modules/,
  /ZodError/,
  /duplicate key value violates/,
  /violates (unique|foreign key|not-null|check) constraint/,
  /relation "[^"]+" does not exist/,
  /syntax error at or near/,
  /ECONNREFUSED/
];
// Account ids the fuzz signs tokens for. They are echoed back by /account, so
// they come from a plain alphabet that cannot imitate a leak pattern above.
const accountId = fc.stringMatching(/^[a-z0-9]{1,12}$/);

function assertSafe(route: string, status: number, body: string, contentType: string | undefined) {
  expect(status, `${route} answered ${status}: ${body.slice(0, 200)}`).not.toBe(500);
  expect(status, route).toBeLessThan(600);
  for (const pattern of INTERNALS) {
    expect(body, `${route} leaked ${pattern}`).not.toMatch(pattern);
  }
  if (route === "GET /metrics" && status === 200) {
    expect(contentType).toContain("text/plain"); // Prometheus exposition format
    return;
  }
  const parsed = JSON.parse(body) as Record<string, unknown>;
  expect(Object.keys(parsed).sort(), route).toEqual(["data", "error", "meta"]);
  expect((parsed.meta as { requestId?: unknown }).requestId, route).toEqual(expect.any(String));
}

describe("every route survives arbitrary input", () => {
  it("the live inventory is non-empty (so the loop below really covers routes)", () => {
    expect(routes.length).toBeGreaterThanOrEqual(38);
  });

  it(`never a 500, always the envelope, never internals (${RUNS} runs per route)`, async () => {
    for (const route of routes) {
      const [method, pattern] = route.split(" ") as ["GET" | "POST" | "DELETE", string];
      const base = concreteUrl(pattern);
      await fc.assert(
        fc.asyncProperty(jsonBody, queryString, withToken, accountId, async (body, query, authed, account) => {
          const headers: Record<string, string> = authed ? { authorization: `Bearer ${tokenFor(`acct_fuzz_${account}`)}` } : {};
          const url = query ? `${base}?${query}` : base;
          const options: InjectOptions = method === "GET"
            ? { method, url, headers, remoteAddress: nextIp() }
            : { method, url, headers: { ...headers, "content-type": "application/json" }, remoteAddress: nextIp(), payload: JSON.stringify(body) };
          const r = await app.inject(options);
          if (process.env.FUZZ_STATS) {
            const key = `${route} ${r.statusCode}`;
            stats.set(key, (stats.get(key) ?? 0) + 1);
          }
          assertSafe(route, r.statusCode, r.body, r.headers["content-type"] as string | undefined);
        }),
        { numRuns: RUNS, ...(SEED === undefined ? {} : { seed: SEED }) }
      );
    }
  }, 600_000);
});

describe("hostile shapes, sent to every body-taking route", () => {
  const bodyRoutes = () => routes.filter((r) => !r.startsWith("GET "));

  it("prototype-poisoning bodies are rejected AT THE PARSER on every body route (400, before any handler), and nothing is polluted", async () => {
    const poisons = [
      '{"__proto__":{"polluted":"yes"}}',
      '{"constructor":{"prototype":{"polluted2":"yes"}}}',
      '{"a":{"__proto__":{"deep":"yes"}}}'
    ];
    for (const route of bodyRoutes()) {
      const [method, pattern] = route.split(" ") as ["POST" | "DELETE", string];
      for (const payload of poisons) {
        // A valid token, so token routes get past the guard and reach the parser.
        const r = await app.inject({
          method, url: concreteUrl(pattern), remoteAddress: nextIp(), payload,
          headers: { "content-type": "application/json", authorization: `Bearer ${tokenFor("proto")}` }
        });
        expect(r.statusCode, `${route} ${payload}`).toBe(400);
        expect(r.json().error, `${route} ${payload}`).toEqual({ code: "BAD_REQUEST", message: "Malformed request." });
      }
    }
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(({} as Record<string, unknown>).polluted2).toBeUndefined();
    expect(({} as Record<string, unknown>).deep).toBeUndefined();
  });

  it("JSON nested 10 000 levels deep, null bytes and odd Unicode never crash a route", async () => {
    const deep = `${"[".repeat(10_000)}${"]".repeat(10_000)}`;
    const nasty = JSON.stringify({ email: "a\u0000b@example.com", name: "‮\u0000😀".repeat(50), shareCode: "\u0000".repeat(8), refreshToken: "\u0000".repeat(64) });
    for (const route of bodyRoutes()) {
      const [method, pattern] = route.split(" ") as ["POST" | "DELETE", string];
      for (const payload of [deep, nasty]) {
        const r = await app.inject({
          method, url: concreteUrl(pattern), remoteAddress: nextIp(), payload,
          headers: { "content-type": "application/json", authorization: `Bearer ${tokenFor("acct_fuzz_deep")}` }
        });
        assertSafe(route, r.statusCode, r.body, r.headers["content-type"] as string | undefined);
      }
    }
  });
});
