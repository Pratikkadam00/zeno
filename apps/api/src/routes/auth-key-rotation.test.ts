import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

// P8 key rotation (docs/RUNBOOKS.md): while JWT_PUBLIC_KEY_PREVIOUS is set, a
// token signed by the previous key still verifies, so swapping the signing key
// refuses none of the access tokens already out. Any other key is still refused.
// The keys are set before auth.ts loads, as in production.
const pair = () => generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });
const current = pair();
const previous = pair();
const stranger = pair();
process.env.JWT_PRIVATE_KEY = current.privateKey;
process.env.JWT_PUBLIC_KEY = current.publicKey;
process.env.JWT_PUBLIC_KEY_PREVIOUS = previous.publicKey;
delete process.env.JWT_ISSUER;
delete process.env.JWT_AUDIENCE;
const { verifyAccessToken } = await import("./auth");

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const now = () => Math.floor(Date.now() / 1000);
function signWith(privateKey: string, sub: string): string {
  const head = b64({ alg: "RS256", typ: "JWT" });
  const body = b64({ sub, iss: "zeno-api", aud: "zeno-mobile", iat: now(), exp: now() + 600 });
  const signer = createSign("RSA-SHA256");
  signer.update(`${head}.${body}`);
  return `${head}.${body}.${signer.sign(privateKey, "base64url")}`;
}

describe("signing-key rotation", () => {
  it("a token from the current key verifies", () => {
    expect(verifyAccessToken(signWith(current.privateKey, "acct_current"))?.sub).toBe("acct_current");
  });

  it("a token from the previous key still verifies during the overlap", () => {
    expect(verifyAccessToken(signWith(previous.privateKey, "acct_previous"))?.sub).toBe("acct_previous");
  });

  it("a token from any other key is refused", () => {
    expect(verifyAccessToken(signWith(stranger.privateKey, "acct_stranger"))).toBeNull();
  });
});
