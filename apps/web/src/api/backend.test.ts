import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiEnvelope } from "@zeno/shared";
import { getBackendStatus } from "./backend";

const originalApiBaseUrl = process.env.PUBLIC_API_BASE_URL;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalApiBaseUrl === undefined) delete process.env.PUBLIC_API_BASE_URL;
  else process.env.PUBLIC_API_BASE_URL = originalApiBaseUrl;
});

function envelope<T>(data: T): ApiEnvelope<T> {
  return { data, error: null, meta: { requestId: "test" } };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("getBackendStatus", () => {
  it("reports connected with capabilities, phase, and service count on success", async () => {
    const fetchMock = vi.fn((url: string | URL | Request) => {
      const href = url.toString();
      if (href.endsWith("/capabilities")) {
        return Promise.resolve(jsonResponse(envelope({ phase: "beta", capabilities: ["discovery", "coach"] })));
      }
      if (href.endsWith("/services")) {
        return Promise.resolve(jsonResponse(envelope({ services: [{}, {}, {}] })));
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const status = await getBackendStatus();

    expect(status).toEqual({
      connected: true,
      apiBaseUrl: "http://127.0.0.1:8787/api/v1",
      phase: "beta",
      capabilities: ["discovery", "coach"],
      serviceCount: 3,
      message: "Web frontend is connected to the Fastify API."
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/v1/capabilities", { cache: "no-store" });
    expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8787/api/v1/services", { cache: "no-store" });
  });

  it("omits phase when the capabilities envelope doesn't include one", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string | URL | Request) => {
      const href = url.toString();
      if (href.endsWith("/capabilities")) return Promise.resolve(jsonResponse(envelope({ capabilities: [] })));
      return Promise.resolve(jsonResponse(envelope({ services: [] })));
    }));

    const status = await getBackendStatus();

    expect(status.connected).toBe(true);
    expect(status.phase).toBeUndefined();
  });

  it("defaults capabilities to [] and serviceCount to 0 when envelope data is null", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(jsonResponse(envelope(null)))));

    const status = await getBackendStatus();

    expect(status.connected).toBe(true);
    expect(status.capabilities).toEqual([]);
    expect(status.serviceCount).toBe(0);
  });

  it("reports disconnected with the HTTP statuses when either response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string | URL | Request) => {
      const href = url.toString();
      if (href.endsWith("/capabilities")) return Promise.resolve(new Response(null, { status: 503 }));
      return Promise.resolve(jsonResponse(envelope({ services: [] })));
    }));

    const status = await getBackendStatus();

    expect(status).toMatchObject({
      connected: false,
      capabilities: [],
      message: "Backend responded with HTTP 503/200."
    });
  });

  it("reports disconnected with the error message when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network unreachable"))));

    const status = await getBackendStatus();

    expect(status).toMatchObject({
      connected: false,
      capabilities: [],
      message: "network unreachable"
    });
  });

  it("falls back to a generic message when a non-Error value is thrown", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject("boom")));

    const status = await getBackendStatus();

    expect(status).toMatchObject({
      connected: false,
      message: "Backend connection failed."
    });
  });

  it("uses PUBLIC_API_BASE_URL when set instead of the localhost default", async () => {
    process.env.PUBLIC_API_BASE_URL = "https://api.zeno.example/v1";
    const fetchMock = vi.fn(() => Promise.resolve(jsonResponse(envelope({ capabilities: [], services: [] }))));
    vi.stubGlobal("fetch", fetchMock);

    const status = await getBackendStatus();

    expect(status.apiBaseUrl).toBe("https://api.zeno.example/v1");
    expect(fetchMock).toHaveBeenCalledWith("https://api.zeno.example/v1/capabilities", { cache: "no-store" });
  });
});
