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
  // not something to default on silently.
  Sentry.init({ dsn, tracesSampleRate: 0 });
  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[zeno] captured error:", error, context ?? {});
  if (initialized) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  }
}
