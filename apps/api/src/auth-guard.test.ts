import { describe, expect, it } from "vitest";
import { buildApp } from "./app";

/**
 * The fail-closed identity guard. Verification runs UNCONDITIONALLY (even with
 * no header), so no client-chosen input decides whether it runs (CodeQL
 * js/user-controlled-bypass). Every way of not presenting a valid bearer token
 * must end in the SAME 401 — no header, wrong scheme, empty token, garbage —
 * and an unknown route must still be a 404, not a 401 that hides it or a 200.
 */
const PROTECTED = "/api/v1/account";

async function hit(headers: Record<string, string>, url = PROTECTED) {
  const app = await buildApp();
  const response = await app.inject({ method: "GET", url, headers });
  await app.close();
  return response;
}

describe("auth guard", () => {
  const badHeaders: Array<[string, Record<string, string>]> = [
    ["no Authorization header", {}],
    ["empty header", { authorization: "" }],
    ["scheme only", { authorization: "Bearer" }],
    ["scheme and a space", { authorization: "Bearer " }],
    ["whitespace token", { authorization: "Bearer    " }],
    ["wrong scheme", { authorization: "Basic dXNlcjpwYXNz" }],
    ["lowercase scheme (not accepted)", { authorization: "bearer a.b.c" }],
    ["not a JWT", { authorization: "Bearer not-a-jwt" }],
    ["three empty parts", { authorization: "Bearer .." }],
    ["alg none", { authorization: `Bearer ${Buffer.from('{"alg":"none"}').toString("base64url")}.${Buffer.from('{"sub":"x","exp":9999999999}').toString("base64url")}.` }]
  ];

  for (const [label, headers] of badHeaders) {
    it(`401 for ${label}`, async () => {
      const response = await hit(headers);
      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
      expect(body.data ?? null).toBeNull();
    });
  }

  it("every rejection has the same body apart from the request id (no oracle on WHY)", async () => {
    const bodies = new Set<string>();
    for (const [, headers] of badHeaders) {
      const body = (await hit(headers)).json();
      bodies.add(JSON.stringify({ ...body, meta: { ...body.meta, requestId: "-" } }));
    }
    expect(bodies.size).toBe(1);
  });

  it("an unknown route is a 404 NOT_FOUND, never masked as 401 or served", async () => {
    const response = await hit({}, "/api/v1/definitely-not-a-route");
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe("NOT_FOUND");
  });
});
