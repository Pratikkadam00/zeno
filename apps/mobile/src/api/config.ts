import Constants from "expo-constants";

const fallbackApiBaseUrl = "http://127.0.0.1:8787/api/v1";

// The API base URL, resolved from expo config (falling back to localhost for
// dev). This lives in its OWN module that imports no app code — mirroring
// http.ts's timedFetch — so both api/client (which needs auth/authStore for the
// bearer token) and auth/authStore (which needs the base URL) can import it
// without forming a require cycle between client and authStore (P4.5).
export function getApiBaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined;
  return extra?.apiBaseUrl ?? fallbackApiBaseUrl;
}
