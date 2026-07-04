const DEFAULT_TIMEOUT_MS = 12_000;

// Time-bound every network request so a dead/slow connection rejects instead of
// hanging a spinner forever. Uses AbortController (universally available in RN;
// AbortSignal.timeout is not guaranteed under Hermes). `retries` is opt-in and
// must ONLY be used for idempotent GETs — never for POSTs that mutate state.
// This lives in its own module (no imports) so client/auth/discovery can all use
// it without an import cycle.
export async function timedFetch(
  input: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; retries?: number } = {}
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retries = 0 } = opts;
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
      lastError = error;
      if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}
