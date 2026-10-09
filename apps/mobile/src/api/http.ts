const DEFAULT_TIMEOUT_MS = 12_000;

/**
 * A request that never reached a server, or never came back.
 *
 * F239: `fetch` rejects with whatever the platform threw, and on Android that
 * is a Java exception rendered into a string — a sign-in failure read
 * "fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to
 * 127.0.0.1 not permitted by network security policy" ON THE SIGN-IN SCREEN,
 * because the screens show `error.message` and for an API error that message
 * is the server's own, written for a person. Transport failures are now
 * wrapped here, where it is known that nothing was reached, so `.message` is
 * always a sentence; the platform's error is kept as `cause` for the log and
 * the crash report.
 */
export class NetworkError extends Error {
  override readonly name = "NetworkError";
  readonly timedOut: boolean;
  constructor(message: string, options: { cause: unknown; timedOut: boolean }) {
    super(message, { cause: options.cause });
    this.timedOut = options.timedOut;
  }
}

/** True when the failure is our own AbortController firing, not the caller's. */
function wasAborted(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

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
  // A caller that passed its own signal and then aborted it wants its own
  // error, not ours: only OUR timeout is reported as a timeout.
  const ours = wasAborted(lastError) && !init.signal;
  throw new NetworkError(
    ours
      ? "That took too long. Check your connection and try again."
      : "Could not reach Zeno. Check your connection and try again.",
    { cause: lastError, timedOut: ours }
  );
}
