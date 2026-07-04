// Central crash/error reporting seam. Today it logs (so boundary catches and the
// app's degradation warnings are visible in native/dev logs); wire a provider
// here (e.g. @sentry/react-native.captureException) once a DSN is configured.
// Kept as a single dependency-free function so no native SDK is added blind —
// the one line below is the only place to change when adding real crash reporting.
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  console.error("[zeno] captured error:", error, context ?? {});
}
