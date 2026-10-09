import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkError, timedFetch } from "./http";

// timedFetch is the app's only network entry point. It enforces two safety
// properties that matter beyond convenience:
//   1. every request is time-bounded, so a dead/slow connection can never hang
//      a spinner (or hold a request open) indefinitely;
//   2. retries are OPT-IN, so a mutating POST is never silently repeated.
// Both are asserted here.

const ok = { ok: true, status: 200 } as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("timedFetch — success path", () => {
  it("returns the response and calls fetch exactly once", async () => {
    fetchMock.mockResolvedValue(ok);
    await expect(timedFetch("https://api.test/x")).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("forwards method, headers and body unchanged", async () => {
    fetchMock.mockResolvedValue(ok);
    await timedFetch("https://api.test/x", { method: "POST", headers: { A: "1" }, body: "{}" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.test/x");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as { headers: Record<string, string> }).headers.A).toBe("1");
    expect((init as RequestInit).body).toBe("{}");
  });

  it("always attaches an AbortSignal — no request is ever unbounded", async () => {
    fetchMock.mockResolvedValue(ok);
    await timedFetch("https://api.test/x");
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.signal).toBeDefined();
    expect(init.signal?.aborted).toBe(false);
  });
});

describe("timedFetch — timeout enforcement", () => {
  it("aborts the in-flight request once the timeout elapses", async () => {
    let captured: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      captured = init.signal ?? undefined;
      return new Promise(() => {}); // never settles
    });
    void timedFetch("https://api.test/slow", {}, { timeoutMs: 5000 });
    await Promise.resolve();
    expect(captured?.aborted).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(captured?.aborted).toBe(true);
  });

  it("does NOT abort a request that resolves before the deadline", async () => {
    let captured: AbortSignal | undefined;
    fetchMock.mockImplementation((_url: string, init: RequestInit) => {
      captured = init.signal ?? undefined;
      return Promise.resolve(ok);
    });
    await timedFetch("https://api.test/fast", {}, { timeoutMs: 5000 });
    vi.advanceTimersByTime(10_000);
    // the timer was cleared on completion, so the signal stays un-aborted
    expect(captured?.aborted).toBe(false);
  });
});

describe("timedFetch — retry policy", () => {
  it("does NOT retry by default (a mutating POST must never be repeated)", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(timedFetch("https://api.test/pay", { method: "POST" })).rejects.toThrow("Could not reach Zeno");
    // F239: the platform's error is not shown, but it is not lost either.
    await expect(timedFetch("https://api.test/pay", { method: "POST" })).rejects.toMatchObject({
      name: "NetworkError",
      cause: expect.objectContaining({ message: "Network request failed" })
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries exactly `retries` extra times, then rethrows the LAST error", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("first"))
      .mockRejectedValueOnce(new Error("second"));
    const promise = timedFetch("https://api.test/get", {}, { retries: 1 });
    // the LAST attempt's error is the one kept as the cause
    const assertion = expect(promise).rejects.toMatchObject({
      name: "NetworkError",
      cause: expect.objectContaining({ message: "second" })
    });
    await vi.advanceTimersByTimeAsync(1000); // clear the backoff wait
    await assertion;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops retrying as soon as a call succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("blip")).mockResolvedValueOnce(ok);
    const promise = timedFetch("https://api.test/get", {}, { retries: 3 });
    await vi.advanceTimersByTimeAsync(1000);
    await expect(promise).resolves.toBe(ok);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("backs off between attempts rather than hammering immediately", async () => {
    fetchMock.mockRejectedValue(new Error("down"));
    const promise = timedFetch("https://api.test/get", {}, { retries: 1 });
    const assertion = expect(promise).rejects.toMatchObject({ cause: expect.objectContaining({ message: "down" }) });
    await Promise.resolve();
    // still only the first attempt before the backoff window elapses
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });

  it("gives each retry attempt its own fresh AbortSignal", async () => {
    const signals: (AbortSignal | undefined)[] = [];
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signals.push(init.signal ?? undefined);
      return Promise.reject(new Error("nope"));
    });
    const promise = timedFetch("https://api.test/get", {}, { retries: 1 });
    const assertion = expect(promise).rejects.toMatchObject({ cause: expect.objectContaining({ message: "nope" }) });
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
    expect(signals).toHaveLength(2);
    expect(signals[0]).not.toBe(signals[1]);
  });
});

/** Await a call that must reject, and hand back the error, typed. */
async function rejection(promise: Promise<unknown>): Promise<NetworkError> {
  return promise.then(
    () => { throw new Error("expected the call to reject, but it resolved"); },
    (error: unknown) => error as NetworkError
  );
}

describe("F239 — a transport failure never shows the platform's exception", () => {
  // The sign-in screen renders `error.message`. For an API error that message
  // is the server's own, written for a person; for a transport failure it used
  // to be whatever Android threw, and a real sign-in read
  // "fetch failed: java.net.UnknownServiceException: CLEARTEXT communication
  // to 127.0.0.1 not permitted by network security policy".
  const PLATFORM_NOISE = /java\.|Exception|CLEARTEXT|ECONN|at .*\(/;

  it("the Android cleartext exception becomes a sentence, and is kept as the cause", async () => {
    const android = new TypeError(
      "fetch failed: java.net.UnknownServiceException: CLEARTEXT communication to 127.0.0.1 not permitted by network security policy"
    );
    fetchMock.mockRejectedValue(android);
    const error = await rejection(timedFetch("http://127.0.0.1:8787/api/v1/auth/request", { method: "POST" }));
    expect(error.message).toBe("Could not reach Zeno. Check your connection and try again.");
    expect(error.message).not.toMatch(PLATFORM_NOISE);
    expect(error.cause).toBe(android);
  });

  it("our own timeout says so, and says it without jargon", async () => {
    fetchMock.mockImplementation((_u: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }))))
    );
    const promise = timedFetch("https://api.test/slow", {}, { timeoutMs: 100 });
    const assertion = expect(promise).rejects.toMatchObject({ name: "NetworkError", timedOut: true, message: "That took too long. Check your connection and try again." });
    await vi.advanceTimersByTimeAsync(200);
    await assertion;
  });

  it("a caller that aborts with its OWN signal is not called a timeout", async () => {
    const caller = new AbortController();
    fetchMock.mockRejectedValue(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    const error = await rejection(timedFetch("https://api.test/x", { signal: caller.signal }));
    expect(error.timedOut).toBe(false);
  });
});
