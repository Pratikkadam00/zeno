import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "./http";

afterEach(() => vi.unstubAllGlobals());

describe("fetchWithTimeout", () => {
  it("resolves normally for a fast response and forwards init", async () => {
    const stub = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response("ok")));
    vi.stubGlobal("fetch", stub);
    const res = await fetchWithTimeout("https://example.test", { method: "POST" }, 1000);
    expect(await res.text()).toBe("ok");
    expect(stub).toHaveBeenCalledOnce();
    // The init we passed is forwarded, plus a signal is installed.
    const init = stub.mock.calls[0]![1]!;
    expect(init.method).toBe("POST");
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects when the response is slower than the timeout (the signal aborts)", async () => {
    // A fetch that never settles on its own — only the timeout's abort resolves it.
    vi.stubGlobal("fetch", (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      })
    );
    await expect(fetchWithTimeout("https://example.test", {}, 20)).rejects.toThrow();
  });

  // ASVS V15.3.2 (F218), on a real local socket: a redirect is refused, and the
  // host it points at is never called.
  it("never follows a redirect", async () => {
    let followed = 0;
    const target = createServer((_req, res) => { followed += 1; res.end("followed"); });
    const redirector = createServer((_req, res) => {
      res.writeHead(302, { location: `http://127.0.0.1:${(target.address() as AddressInfo).port}/` });
      res.end();
    });
    await Promise.all([target, redirector].map((s) => new Promise<void>((done) => s.listen(0, "127.0.0.1", done))));
    try {
      await expect(fetchWithTimeout(`http://127.0.0.1:${(redirector.address() as AddressInfo).port}/`, {}, 2000)).rejects.toThrow();
      expect(followed).toBe(0);
    } finally {
      await Promise.all([target, redirector].map((s) => new Promise((done) => s.close(done))));
    }
  });

  it("respects a caller-supplied signal instead of installing its own", async () => {
    const stub = vi.fn((_url: string, _init?: RequestInit) => Promise.resolve(new Response("ok")));
    vi.stubGlobal("fetch", stub);
    const controller = new AbortController();
    await fetchWithTimeout("https://example.test", { signal: controller.signal }, 1000);
    const init = stub.mock.calls[0]![1]!;
    expect(init.signal).toBe(controller.signal);
  });
});
