import { fail, ok } from "@subradar/shared";
import type { FastifyPluginAsync } from "fastify";
import { createHash, createPublicKey, createSign, createVerify, generateKeyPairSync, randomBytes, randomInt, randomUUID, timingSafeEqual, type JsonWebKey } from "node:crypto";
import { z, ZodError } from "zod";

const accessTokenTtlSeconds = 15 * 60;
const magicLinkTtlSeconds = 10 * 60;
const refreshTokenTtlSeconds = 30 * 24 * 60 * 60;
const issuer = process.env.JWT_ISSUER ?? "zeno-api";
const audience = process.env.JWT_AUDIENCE ?? "zeno-mobile";
const defaultMagicLinkRedirect = process.env.MAGIC_LINK_REDIRECT_URL ?? "subradar://auth/verify";

const magicLinkRequestSchema = z.object({
  email: z.string().email()
});

const magicLinkVerifyQuerySchema = z.object({
  token: z.string().min(32).optional(),
  email: z.string().email().optional(),
  code: z.string().min(6).max(12).optional()
}).refine((value) => Boolean(value.token) || Boolean(value.email && value.code), {
  message: "Provide either token or email and code."
});

const legacyMagicLinkVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().min(6).max(12)
});

const appleOAuthSchema = z.object({
  identityToken: z.string().min(10),
  authorizationCode: z.string().min(4).optional(),
  email: z.string().email().optional(),
  fullName: z.string().min(1).optional()
});

const googleOAuthSchema = z.object({
  idToken: z.string().min(10).optional(),
  accessToken: z.string().min(10).optional(),
  serverAuthCode: z.string().min(4).optional(),
  email: z.string().email().optional()
}).refine((value) => Boolean(value.idToken || value.accessToken || value.serverAuthCode), {
  message: "Provide idToken, accessToken, or serverAuthCode."
});

const refreshSchema = z.object({
  refreshToken: z.string().min(32)
});

const demoLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const logoutSchema = z.object({
  refreshToken: z.string().min(32).optional()
});

type MagicLinkRecord = {
  accountId: string;
  email: string;
  tokenHash: string;
  code: string;
  expiresAt: number;
};

type RefreshRecord = {
  accountId: string;
  email: string;
  provider: AuthProvider;
  expiresAt: number;
  rotatedAt: number | null;
};

type AuthProvider = "magic_link" | "apple" | "google" | "demo";

type AuthSession = {
  accountId: string;
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  refreshExpiresInSeconds: number;
  tokenType: "Bearer";
};

type MagicLinkResponse = {
  delivered: true;
  channel: "resend" | "dev_log";
  expiresInSeconds: number;
  devCode?: string;
  devLink?: string;
};

type VerifiedIdentity = {
  subject: string;
  email: string | null;
};

type JwtHeader = {
  alg?: string;
  kid?: string;
};

type JwtPayload = {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  sub?: string;
};

type JwksResponse = {
  keys: JsonWebKey[];
};

const magicLinksByHash = new Map<string, MagicLinkRecord>();
const legacyCodesByEmail = new Map<string, MagicLinkRecord>();
const refreshSessionsByHash = new Map<string, RefreshRecord>();
const jwksCache = new Map<string, { expiresAt: number; keys: JsonWebKey[] }>();
const keyPair = loadSigningKeys();

// Auth endpoints get much stricter limits than the global bucket: magic-link
// codes are 6 digits, so verification attempts must be expensive to repeat.
const requestLimit = { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } };
const verifyLimit = { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } };

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/auth/magic-link", requestLimit, async (request, reply) => {
    const parsed = parseRequest(magicLinkRequestSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    return requestMagicLink(parsed.data.email, request.id);
  });

  app.get("/auth/verify", verifyLimit, async (request, reply) => {
    const parsed = parseRequest(magicLinkVerifyQuerySchema, request.query, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    const record = parsed.data.token
      ? consumeMagicToken(parsed.data.token)
      : consumeLegacyCode(parsed.data.email ?? "", parsed.data.code ?? "");

    if (!record) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid or expired magic link.", request.id);
    }

    return ok(issueSession(record.accountId, record.email, "magic_link"), request.id);
  });

  app.post("/auth/apple", verifyLimit, async (request, reply) => {
    const parsed = parseRequest(appleOAuthSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    const verified = await verifyAppleIdentityToken(parsed.data.identityToken, reply, request.id);
    if (!verified) {
      return reply.sent ? undefined : fail("UNAUTHORIZED", "Invalid Apple identity token.", request.id);
    }

    const subject = verified.subject;
    const email = normalizeEmail(parsed.data.email ?? verified.email ?? `apple-${stableId(subject)}@privaterelay.appleid.com`);
    return ok(issueSession(accountIdForSubject("apple", subject), email, "apple"), request.id);
  });

  app.post("/auth/google", verifyLimit, async (request, reply) => {
    const parsed = parseRequest(googleOAuthSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    const subjectToken = parsed.data.idToken ?? parsed.data.accessToken ?? parsed.data.serverAuthCode ?? "";
    if (!parsed.data.idToken && (getGoogleAudiences().length > 0 || !allowUnverifiedOAuthTokens())) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Google idToken is required.", request.id);
    }

    const verified = parsed.data.idToken
      ? await verifyGoogleIdentityToken(parsed.data.idToken, reply, request.id)
      : null;
    if (parsed.data.idToken && !verified) {
      return reply.sent ? undefined : fail("UNAUTHORIZED", "Invalid Google identity token.", request.id);
    }

    const subject = verified?.subject ?? subjectToken;
    const email = normalizeEmail(parsed.data.email ?? verified?.email ?? `google-${stableId(subject)}@accounts.google.local`);
    return ok(issueSession(accountIdForSubject("google", subject), email, "google"), request.id);
  });

  app.post("/auth/refresh", verifyLimit, async (request, reply) => {
    const parsed = parseRequest(refreshSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    const session = refreshSessionsByHash.get(hashToken(parsed.data.refreshToken));
    if (!session || session.rotatedAt || session.expiresAt <= Date.now()) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Refresh token is invalid, expired, or already rotated.", request.id);
    }

    session.rotatedAt = Date.now();
    return ok(issueSession(session.accountId, session.email, session.provider), request.id);
  });

  app.post("/auth/demo-login", requestLimit, async (request, reply) => {
    const parsed = parseRequest(demoLoginSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    if (!isDemoLoginEnabled()) {
      reply.code(404);
      return fail("NOT_FOUND", "Demo login is not enabled.", request.id);
    }

    const expectedEmail = getDemoEmail();
    const expectedPassword = getDemoPassword();
    if (normalizeEmail(parsed.data.email) !== expectedEmail || !constantTimeEqual(parsed.data.password, expectedPassword)) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid demo account credentials.", request.id);
    }

    return ok(issueSession(accountIdForEmail(expectedEmail), expectedEmail, "demo"), request.id);
  });

  app.post("/auth/logout", async (request) => {
    const parsed = logoutSchema.safeParse(request.body ?? {});
    if (parsed.success && parsed.data.refreshToken) {
      refreshSessionsByHash.delete(hashToken(parsed.data.refreshToken));
    }

    return ok({ loggedOut: true }, request.id);
  });

  app.post("/auth/magic-link/request", requestLimit, async (request, reply) => {
    const parsed = parseRequest(magicLinkRequestSchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    return requestMagicLink(parsed.data.email, request.id);
  });

  app.post("/auth/magic-link/verify", verifyLimit, async (request, reply) => {
    const parsed = parseRequest(legacyMagicLinkVerifySchema, request.body, request.id);
    if (!parsed.ok) {
      reply.code(400);
      return parsed.error;
    }

    const record = consumeLegacyCode(parsed.data.email, parsed.data.code);
    if (!record) {
      reply.code(401);
      return fail("UNAUTHORIZED", "Invalid or expired magic link code.", request.id);
    }

    return ok(issueSession(record.accountId, record.email, "magic_link"), request.id);
  });
};

async function requestMagicLink(emailInput: string, requestId: string) {
  const email = normalizeEmail(emailInput);
  const token = randomToken();
  const code = randomNumericCode();
  const record: MagicLinkRecord = {
    accountId: accountIdForEmail(email),
    email,
    tokenHash: hashToken(token),
    code,
    expiresAt: Date.now() + magicLinkTtlSeconds * 1000
  };

  magicLinksByHash.set(record.tokenHash, record);
  legacyCodesByEmail.set(email, record);

  const link = `${defaultMagicLinkRedirect}?token=${encodeURIComponent(token)}`;
  await deliverMagicLink(email, link, code, requestId);

  const response: MagicLinkResponse = {
    delivered: true,
    channel: isDevMailAdapter() ? "dev_log" : "resend",
    expiresInSeconds: magicLinkTtlSeconds
  };
  if (isDevMailAdapter()) {
    response.devCode = code;
    response.devLink = link;
  }

  return ok(response, requestId);
}

type ParseResult<T extends z.ZodType> =
  | { ok: true; data: z.infer<T> }
  | { ok: false; error: ReturnType<typeof fail> };

function parseRequest<T extends z.ZodType>(schema: T, body: unknown, requestId: string): ParseResult<T> {
  try {
    return { ok: true, data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        ok: false,
        error: fail("BAD_REQUEST", "Request validation failed.", requestId, {
          issues: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        })
      };
    }
    return { ok: false, error: fail("BAD_REQUEST", "Request validation failed.", requestId) };
  }
}

function consumeMagicToken(token: string): MagicLinkRecord | null {
  const tokenHash = hashToken(token);
  const record = magicLinksByHash.get(tokenHash);
  if (!record || record.expiresAt <= Date.now()) {
    magicLinksByHash.delete(tokenHash);
    return null;
  }

  magicLinksByHash.delete(tokenHash);
  legacyCodesByEmail.delete(record.email);
  return record;
}

function consumeLegacyCode(email: string, code: string): MagicLinkRecord | null {
  const normalized = normalizeEmail(email);
  const record = legacyCodesByEmail.get(normalized);
  if (!record || record.code !== code || record.expiresAt <= Date.now()) {
    legacyCodesByEmail.delete(normalized);
    return null;
  }

  legacyCodesByEmail.delete(normalized);
  magicLinksByHash.delete(record.tokenHash);
  return record;
}

function issueSession(accountId: string, email: string, provider: AuthProvider): AuthSession {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const refreshToken = randomToken();
  refreshSessionsByHash.set(hashToken(refreshToken), {
    accountId,
    email,
    provider,
    expiresAt: Date.now() + refreshTokenTtlSeconds * 1000,
    rotatedAt: null
  });

  return {
    accountId,
    accessToken: signAccessToken({
      sub: accountId,
      email,
      provider,
      iss: issuer,
      aud: audience,
      iat: nowSeconds,
      exp: nowSeconds + accessTokenTtlSeconds,
      jti: randomUUID()
    }),
    refreshToken,
    expiresInSeconds: accessTokenTtlSeconds,
    refreshExpiresInSeconds: refreshTokenTtlSeconds,
    tokenType: "Bearer"
  };
}

function signAccessToken(payload: Record<string, unknown>): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: keyPair.kid
  };
  const encodedHeader = encodeJson(header);
  const encodedPayload = encodeJson(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(keyPair.privateKey, "base64url")}`;
}

function encodeJson(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function loadSigningKeys(): { kid: string; privateKey: string; publicKey: string } {
  const privateKey = normalizePem(process.env.JWT_PRIVATE_KEY);
  const publicKey = normalizePem(process.env.JWT_PUBLIC_KEY);
  if (privateKey && publicKey) {
    return {
      kid: process.env.JWT_KEY_ID ?? "zeno-rs256-env",
      privateKey,
      publicKey
    };
  }

  const generated = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" }
  });

  return {
    kid: "zeno-rs256-dev",
    privateKey: generated.privateKey,
    publicKey: generated.publicKey
  };
}

function normalizePem(value: string | undefined): string | null {
  return value ? value.replace(/\\n/g, "\n") : null;
}

async function deliverMagicLink(email: string, link: string, code: string, requestId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_API_KEY is required for production magic-link delivery.");
    }
    // The code/link are returned to the dev client in the response body
    // (devCode/devLink); never write credentials or emails to logs.
    console.info({ requestId }, "Dev magic link issued; code returned in response.");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL ?? "Zeno <login@zeno.app>",
      to: [email],
      subject: "Sign in to Zeno",
      text: `Use this secure link to sign in to Zeno: ${link}\n\nCode: ${code}\n\nThis link expires in 10 minutes.`,
      html: `<p>Use this secure link to sign in to Zeno:</p><p><a href="${escapeHtml(link)}">Sign in to Zeno</a></p><p>Code: <strong>${code}</strong></p><p>This link expires in 10 minutes.</p>`
    })
  });

  if (!response.ok) {
    throw new Error(`Resend failed with HTTP ${response.status}`);
  }
}

async function verifyAppleIdentityToken(token: string, reply: { code: (statusCode: number) => unknown }, requestId: string): Promise<VerifiedIdentity | null> {
  const audiences = getAppleAudiences();
  if (audiences.length === 0) {
    if (allowUnverifiedOAuthTokens()) {
      return { subject: token, email: null };
    }
    console.warn({ requestId }, "Apple sign-in rejected: no APPLE_CLIENT_ID/APPLE_BUNDLE_ID configured.");
    reply.code(401);
    return null;
  }

  try {
    return await verifyRemoteJwt(token, {
      audiences,
      issuer: "https://appleid.apple.com",
      jwksUrl: "https://appleid.apple.com/auth/keys"
    });
  } catch (error) {
    console.warn({ requestId, error: getErrorMessage(error) }, "Apple identity token verification failed.");
    reply.code(401);
    return null;
  }
}

async function verifyGoogleIdentityToken(token: string, reply: { code: (statusCode: number) => unknown }, requestId: string): Promise<VerifiedIdentity | null> {
  const audiences = getGoogleAudiences();
  if (audiences.length === 0) {
    if (allowUnverifiedOAuthTokens()) {
      return { subject: token, email: null };
    }
    console.warn({ requestId }, "Google sign-in rejected: no GOOGLE_*_CLIENT_ID configured.");
    reply.code(401);
    return null;
  }

  try {
    return await verifyRemoteJwt(token, {
      audiences,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs"
    });
  } catch (error) {
    console.warn({ requestId, error: getErrorMessage(error) }, "Google identity token verification failed.");
    reply.code(401);
    return null;
  }
}

async function verifyRemoteJwt(token: string, options: { audiences: string[]; issuer: string | string[]; jwksUrl: string }): Promise<VerifiedIdentity> {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("JWT must contain header, payload, and signature.");
  }

  const header = decodeJwtPart<JwtHeader>(encodedHeader);
  const payload = decodeJwtPart<JwtPayload>(encodedPayload);
  if (header.alg !== "RS256" || !header.kid) {
    throw new Error("JWT must use RS256 and include a key id.");
  }

  const jwks = await fetchJwks(options.jwksUrl);
  const jwk = jwks.find((candidate) => candidate.kid === header.kid);
  if (!jwk) {
    throw new Error("JWT signing key was not found.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const validSignature = verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), Buffer.from(encodedSignature, "base64url"));
  if (!validSignature) {
    throw new Error("JWT signature is invalid.");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload.sub || !payload.exp || payload.exp <= nowSeconds) {
    throw new Error("JWT subject or expiry is invalid.");
  }

  const issuers = Array.isArray(options.issuer) ? options.issuer : [options.issuer];
  if (!payload.iss || !issuers.includes(payload.iss)) {
    throw new Error("JWT issuer is invalid.");
  }

  const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
  if (!tokenAudiences.some((audience) => options.audiences.includes(audience))) {
    throw new Error("JWT audience is invalid.");
  }

  return {
    subject: payload.sub,
    email: payload.email ?? null
  };
}

async function fetchJwks(url: string): Promise<JsonWebKey[]> {
  const cached = jwksCache.get(url);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`JWKS request failed with HTTP ${response.status}`);
  }

  const body = await response.json() as JwksResponse;
  jwksCache.set(url, {
    expiresAt: Date.now() + 60 * 60 * 1000,
    keys: body.keys
  });
  return body.keys;
}

function decodeJwtPart<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

function randomNumericCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function stableId(value: string): string {
  return createHash("sha256").update(value).digest("base64url").slice(0, 18);
}

function accountIdForEmail(email: string): string {
  return `acct_${stableId(normalizeEmail(email))}`;
}

function accountIdForSubject(provider: "apple" | "google", subject: string): string {
  return `acct_${provider}_${stableId(subject)}`;
}

function isDemoLoginEnabled(): boolean {
  return process.env.NODE_ENV !== "production"
    && process.env.DEMO_LOGIN_ENABLED !== "false"
    && Boolean(process.env.DEMO_LOGIN_PASSWORD);
}

function allowUnverifiedOAuthTokens(): boolean {
  const flagEnabled = process.env.ALLOW_UNVERIFIED_OAUTH_TOKENS === "true";
  if (process.env.NODE_ENV === "production") {
    // Unverified OAuth subjects must never be accepted in production, even if the
    // env var is set. Refuse the flag and require real JWKS verification.
    if (flagEnabled) {
      console.warn("ALLOW_UNVERIFIED_OAUTH_TOKENS is ignored in production; real token verification is required.");
    }
    return false;
  }
  return flagEnabled;
}

function isDevMailAdapter(): boolean {
  return !process.env.RESEND_API_KEY && process.env.NODE_ENV !== "production";
}

function getDemoEmail(): string {
  return normalizeEmail(process.env.DEMO_LOGIN_EMAIL ?? "demo@zeno.local");
}

function getDemoPassword(): string {
  const password = process.env.DEMO_LOGIN_PASSWORD;
  if (!password) {
    throw new Error("DEMO_LOGIN_PASSWORD must be set to enable demo login.");
  }
  return password;
}

function constantTimeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function getAppleAudiences(): string[] {
  return readEnvValues("APPLE_CLIENT_ID", "APPLE_BUNDLE_ID");
}

function getGoogleAudiences(): string[] {
  return readEnvValues(
    "GOOGLE_EXPO_CLIENT_ID",
    "GOOGLE_WEB_CLIENT_ID",
    "GOOGLE_IOS_CLIENT_ID",
    "GOOGLE_ANDROID_CLIENT_ID"
  );
}

function readEnvValues(...names: string[]): string[] {
  return names.flatMap((name) => (process.env[name] ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown verification error.";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
