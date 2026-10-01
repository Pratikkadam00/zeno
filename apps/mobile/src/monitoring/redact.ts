// P3.2: what leaves the app in an error report (the release log, and Sentry
// once a DSN is set) must never carry a credential or an email address. Error
// messages and stacks are free text, so the guarantee is made here, at the one
// exit, not by trusting every throw site.
//
// Redacted, in this order:
//  - URL query values of credential-like keys (token, code, …): the magic-link
//    verify URL and Gmail's revoke URL carry one-time tokens there;
//  - "Bearer <token>" (an Authorization header echoed into a message);
//  - JWTs (three base64url segments, the first starting "eyJ");
//  - email addresses;
//  - any other unbroken base64url/hex run of 32+ characters that contains a
//    digit (our refresh and magic-link tokens are 43-character random
//    base64url strings: the chance one has no digit is (54/64)^43, ≈ 0.07 %).
//    The digit keeps long CamelCase names in a component stack readable.
const QUERY_SECRET = /([?&](?:token|code|refresh_token|access_token|id_token|key|secret)=)[^&\s#"']+/gi;
const BEARER = /\b(Bearer)\s+[A-Za-z0-9._~+/=-]+/gi;
const JWT = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g;
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const LONG_TOKEN = /\b(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{32,}\b/g;

export function redactText(text: string): string {
  return text
    .replace(QUERY_SECRET, "$1[redacted]")
    .replace(BEARER, "$1 [redacted]")
    .replace(JWT, "[redacted-jwt]")
    .replace(EMAIL, "[redacted-email]")
    .replace(LONG_TOKEN, "[redacted]");
}

const MAX_DEPTH = 4;

/** A copy of `value` with every string redacted. Objects and arrays are walked
 *  to a bounded depth (cycles, huge trees); anything deeper is DROPPED as
 *  "[truncated]", never passed through unredacted. */
export function redactValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return redactText(value);
  if (value instanceof Error) return redactError(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => redactValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactValue(item, depth + 1)]));
}

/** The same Error when nothing needed redacting (its stack and identity intact); else a redacted copy. */
export function redactError(error: Error): Error {
  const message = redactText(error.message);
  const stack = error.stack === undefined ? undefined : redactText(error.stack);
  if (message === error.message && stack === error.stack) return error;
  const copy = new Error(message);
  copy.name = error.name;
  copy.stack = stack;
  return copy;
}
