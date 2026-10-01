import { assert, property, string } from "fast-check";
import { describe, expect, it } from "vitest";
import { emailClaim } from "./jwt-claims";

/**
 * P3.5: the magic-link check reads the issued access token's `email` claim.
 * The decoder is hand-written (no atob/TextDecoder reliance on Hermes), so it
 * is checked against Node's own base64url + UTF-8 decoding, including
 * non-ASCII addresses, and every malformed input returns null, never a guess.
 */
const part = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
const token = (payload: unknown) => `${part({ alg: "RS256", typ: "JWT" })}.${part(payload)}.c2ln`;
const rawToken = (payloadBytes: number[]) => `${part({ alg: "RS256" })}.${Buffer.from(payloadBytes).toString("base64url")}.c2ln`;

describe("emailClaim", () => {
  it.each([
    ["an ASCII address", "jane@example.com"],
    ["a plus address", "jane+zeno@mail.example.co.uk"],
    ["2-byte UTF-8", "jöhn@exämple.de"],
    ["3-byte UTF-8", "用户@例子.广告"],
    ["4-byte UTF-8 (outside the BMP)", "𝓳𝓪𝓷𝓮@example.com"]
  ])("reads %s exactly", (_name, email) => {
    expect(emailClaim(token({ sub: "acct_1", email, iat: 1 }))).toBe(email);
  });

  it("matches Node's decoding for any text (property, 500 cases)", () => {
    assert(property(string({ unit: "grapheme" }), (email) => emailClaim(token({ email })) === email), { numRuns: 500 });
  });

  it("tolerates base64 padding", () => {
    const t = token({ email: "a@b.co" });
    const [h, p, s] = t.split(".");
    expect(emailClaim(`${h}.${p}==.${s}`)).toBe("a@b.co");
  });

  it.each([
    ["no email claim", token({ sub: "acct_1" })],
    ["a non-string email", token({ email: 42 })],
    ["a null payload", token(null)],
    ["two parts", "abc.def"],
    ["four parts", "a.b.c.d"],
    ["a character outside base64url", `${part({})}.ab+c.sig`],
    ["a payload that is not JSON", rawToken([...Buffer.from("not json")])],
    ["a stray continuation byte", rawToken([0x7b, 0x80, 0x7d])],
    ["a truncated 2-byte sequence", rawToken([0x7b, 0xc3])],
    ["a lead byte with a bad continuation", rawToken([0xc3, 0x28])],
    ["an invalid lead byte (0xFF)", rawToken([0xff])],
    ["a 4-byte sequence above U+10FFFF", rawToken([0xf4, 0x90, 0x80, 0x80])]
  ])("returns null for %s", (_name, t) => {
    expect(emailClaim(t)).toBeNull();
  });
});
