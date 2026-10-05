import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

// ASVS V9.2.1: a token is not accepted before its "not before" time. Our own
// access tokens carry no nbf, but the verifier honours one when present. The key
// pair is set before auth.ts loads, so tokens signed here are ours.
const keys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
process.env.JWT_PRIVATE_KEY = keys.privateKey;
process.env.JWT_PUBLIC_KEY = keys.publicKey;
delete process.env.JWT_ISSUER;
delete process.env.JWT_AUDIENCE;
const { verifyAccessToken } = await import("./auth");

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
function sign(claims: Record<string, unknown>): string {
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ sub: "acct_nbf", iss: "zeno-api", aud: "zeno-mobile", iat: now(), exp: now() + 600, ...claims });
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${body}`);
  return `${head}.${body}.${signer.sign(keys.privateKey, "base64url")}`;
}

describe("an access token's not-before (nbf)", () => {
  it("none, or one already passed, is accepted; one in the future is refused", () => {
    expect(verifyAccessToken(sign({}))?.sub).toBe("acct_nbf");
    expect(verifyAccessToken(sign({ nbf: now() - 60 }))?.sub).toBe("acct_nbf");
    expect(verifyAccessToken(sign({ nbf: now() + 60 }))).toBeNull();
  });
});
