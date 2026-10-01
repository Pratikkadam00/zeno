// Central crash/error reporting seam. Real Sentry wiring (Phase 5.1), but
// completely inert without EXPO_PUBLIC_SENTRY_DSN — Sentry.init() is only
// called when a DSN is actually configured, exactly mirroring how
// src/billing/revenueCat.ts's initRevenueCat() no-ops without an API key. No
// DSN exists yet (no Sentry project has been created), so today this still
// only logs — but the SDK is real, not a placeholder, and starts capturing
// the moment a DSN is set and the app is rebuilt (native module — a JS-only
// reload is not enough).
import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";
import { redactValue } from "./redact";
import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";

let initialized = false;

function getSentryDsn(): string | null {
  const extra = Constants.expoConfig?.extra as { sentryDsn?: string } | undefined;
  return process.env.EXPO_PUBLIC_SENTRY_DSN ?? extra?.sentryDsn ?? null;
}

// Call once at app startup (see app/_layout.tsx). Safe to call multiple times.
export function initErrorReporting(): void {
  if (initialized) {
    return;
  }
  const dsn = getSentryDsn();
  if (!dsn) {
    return;
  }
  // tracesSampleRate: 0 — error capture only, no performance tracing. Adding
  // trace sampling is a separate, deliberate decision (more data collected),
  // not something to default on silently. The privacy settings are spelled out
  // even where they match the SDK's defaults (7.11), so a changed default or a
  // careless edit fails a test instead of shipping: no default PII (so no IP
  // inference), no screenshot or view hierarchy of a finance screen. Whatever
  // is sent is scrubbed first (P3.3, sentry-scrub.ts).
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    sendDefaultPii: false,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: scrubBreadcrumb,
    beforeSend: scrubEvent
  });
  initialized = true;
}

// Redacted before anything leaves (P3.2): no token or email reaches the log or
// Sentry, whatever the error's message, stack or context carries (redact.ts).
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const safeError = redactValue(error);
  const safeContext = context === undefined ? undefined : (redactValue(context) as Record<string, unknown>);
  console.error("[zeno] captured error:", safeError, safeContext ?? {});
  if (initialized) {
    Sentry.captureException(safeError, safeContext ? { extra: safeContext } : undefined);
  }
}
