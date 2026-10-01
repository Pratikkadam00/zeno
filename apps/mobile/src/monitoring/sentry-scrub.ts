// P3.3: what Sentry receives. Everything that leaves for Sentry passes
// redact.ts's rules (credentials, JWTs, emails, long tokens) PLUS money:
// amounts stay readable in the on-device log (P3.2, they help diagnose), but
// a third party gets no figure from anyone's finances.
//
// Two hooks, set in report.ts:
//  - beforeBreadcrumb (scrubBreadcrumb): runs before a breadcrumb is stored,
//    and therefore before the SDK copies it to the native layer (scopeSync.js
//    syncs the stored breadcrumb), so native crash reports get the scrubbed one;
//  - beforeSend (scrubEvent): every JS error event, whatever captured it
//    (captureError, the global handler, an unhandled rejection).
// Native (Java/NDK) crash events never reach beforeSend (wrapper.js strips it
// from the native options); they carry the native stack plus the synced,
// already-scrubbed breadcrumbs.
//
// Left alone on purpose, because Sentry needs them to group and symbolicate:
// event_id, timestamps, release/dist/environment, sdk, modules, fingerprint,
// debug_meta, each frame's filename/function/line, and the `trace` context's ids.
import type { Breadcrumb, Event, Exception, StackFrame } from "@sentry/react-native";
import { MAX_DEPTH, redactText } from "./redact";

// A currency marker next to a number ("$15.49", "€9", "₹1,299", "Rs. 99",
// "CA$12" leaves only "CA"), or a number then an ISO code ("12.99 USD").
// A bare number can't be told from a line number or an id, so it is kept,
// except under a money-named key (MONEY_KEY).
const AMOUNT = /(?:\$|€|£|₹|\bRs\.?)\s?-?\d[\d,]*(?:\.\d+)?|\b\d[\d,]*(?:\.\d+)?\s?(?:USD|EUR|GBP|INR|CAD|AUD)\b/gi;
const MONEY_KEY = /amount|price|cost|total|balance|spend|income/i;
const DROPPED_HEADERS = /^(?:authorization|cookie|set-cookie|proxy-authorization)$/i;

export function scrubText(text: string): string {
  return redactText(text).replace(AMOUNT, "[amount]");
}

/** A scrubbed copy: strings scrubbed, money-named keys' values replaced, and
 *  anything past the depth limit DROPPED as "[truncated]". */
export function scrubValue(value: unknown, depth = 0): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value instanceof Error) return scrubText(`${value.name}: ${value.message}`);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      MONEY_KEY.test(key) && (typeof item === "number" || typeof item === "string") ? "[amount]" : scrubValue(item, depth + 1)
    ])
  );
}

function stripQuery(url: string): string {
  return scrubText(url.split("?")[0]!);
}

// Every breadcrumb: message and data scrubbed. Magic-link verification
// (authStore.ts) and Gmail OAuth revocation (emailScanner.ts) call fetch() with
// a one-time token in the query string, and Sentry's fetch/xhr breadcrumbs
// record the full URL regardless of tracesSampleRate, so an http breadcrumb's
// URL also loses its whole query string.
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const out: Breadcrumb = { ...breadcrumb };
  if (typeof breadcrumb.message === "string") out.message = scrubText(breadcrumb.message);
  if (breadcrumb.data) {
    const data = scrubValue(breadcrumb.data) as Record<string, unknown>;
    const url = breadcrumb.data.url;
    if ((breadcrumb.category === "fetch" || breadcrumb.category === "xhr") && typeof url === "string") {
      data.url = stripQuery(url);
    }
    out.data = data;
  }
  return out;
}

function scrubFrame(frame: StackFrame): StackFrame {
  // Local variables can hold anything; Hermes doesn't send them, but never forward them.
  const { vars: _vars, ...out } = frame;
  if (out.context_line !== undefined) out.context_line = scrubText(out.context_line);
  if (out.pre_context) out.pre_context = out.pre_context.map(scrubText);
  if (out.post_context) out.post_context = out.post_context.map(scrubText);
  return out;
}

function scrubException(exception: Exception): Exception {
  const out: Exception = { ...exception };
  if (exception.value !== undefined) out.value = scrubText(exception.value);
  if (exception.stacktrace?.frames) {
    out.stacktrace = { ...exception.stacktrace, frames: exception.stacktrace.frames.map(scrubFrame) };
  }
  return out;
}

function scrubRequest(request: NonNullable<Event["request"]>): NonNullable<Event["request"]> {
  const out: NonNullable<Event["request"]> = {};
  if (request.method !== undefined) out.method = request.method;
  if (request.url !== undefined) out.url = stripQuery(request.url);
  if (request.headers) {
    out.headers = Object.fromEntries(
      Object.entries(request.headers)
        .filter(([name]) => !DROPPED_HEADERS.test(name))
        .map(([name, value]) => [name, scrubText(value)])
    );
  }
  if (request.data !== undefined) out.data = scrubValue(request.data);
  // query_string, cookies and env are dropped whole.
  return out;
}

/** Sentry's beforeSend: a scrubbed copy of the event. Never drops the event. */
export function scrubEvent<E extends Event>(event: E): E {
  const out: E = { ...event };
  if (event.message !== undefined) out.message = scrubText(event.message);
  if (event.logentry) {
    out.logentry = {
      ...(event.logentry.message !== undefined && { message: scrubText(event.logentry.message) }),
      ...(event.logentry.params && { params: event.logentry.params.map((param) => scrubValue(param)) })
    };
  }
  if (event.exception?.values) out.exception = { values: event.exception.values.map(scrubException) };
  if (event.breadcrumbs) out.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  if (event.extra) out.extra = scrubValue(event.extra) as E["extra"];
  if (event.contexts) {
    out.contexts = Object.fromEntries(
      Object.entries(event.contexts).map(([name, context]) => [name, name === "trace" ? context : scrubValue(context)])
    ) as E["contexts"];
  }
  if (event.tags) {
    out.tags = Object.fromEntries(
      Object.entries(event.tags).map(([name, value]) => [name, typeof value === "string" ? scrubText(value) : value])
    );
  }
  if (event.request) out.request = scrubRequest(event.request);
  // We never call setUser; drop whatever an integration might add (ip, username, email).
  delete out.user;
  return out;
}
