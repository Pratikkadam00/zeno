// Node's global fetch (undici) has no deadline short enough to rely on: its own
// defaults wait 300 s for response headers and 300 s between body chunks
// (checked in Node 24's bundled undici 7.24.4), so a hung upstream holds the
// connection, and the request awaiting it, for minutes. Every outbound call from
// the API must therefore set an explicit deadline; outbound.test.ts checks that
// every call site does. fetchWithTimeout aborts after `timeoutMs`; the
// rejection propagates to the route handler, which maps it to a clean 5xx
// instead of hanging.
//
// AbortSignal.timeout is available on Node 18.17+/20+ (the API's runtime).

export const DEFAULT_FETCH_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<Response> {
  // Respect a caller-supplied signal if one is passed; otherwise install a
  // timeout signal. (No current caller passes one, but this keeps the helper safe.)
  const signal = init.signal ?? AbortSignal.timeout(timeoutMs);
  return fetch(input, { ...init, signal });
}
