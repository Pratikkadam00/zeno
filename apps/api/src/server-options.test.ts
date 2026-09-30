import { Writable } from "node:stream";
import { describe, expect, it } from "vitest";
import { buildApp } from "./app";
import { buildLoggerOptions, LOG_REDACT_PATHS, pathOnly, serializeRequest } from "./server-options";

describe("pathOnly", () => {
  it("strips the query string and fragment, keeps the path", () => {
    expect(pathOnly("/api/v1/auth/verify?token=abc")).toBe("/api/v1/auth/verify");
    expect(pathOnly("/a/b#frag")).toBe("/a/b");
    expect(pathOnly("/a?x=1#y")).toBe("/a");
    expect(pathOnly("/a?")).toBe("/a");
    expect(pathOnly("/plain")).toBe("/plain");
    expect(pathOnly("")).toBe("");
    expect(pathOnly(undefined)).toBeUndefined();
  });
});

describe("serializeRequest (Fastify's default fields, minus the query)", () => {
  it("keeps method, path, host, address and port", () => {
    expect(
      serializeRequest({
        method: "GET",
        url: "/api/v1/auth/verify?token=SECRET",
        headers: { "accept-version": "1.x" },
        host: "api.example.com",
        ip: "203.0.113.7",
        socket: { remotePort: 51234 }
      })
    ).toEqual({ method: "GET", url: "/api/v1/auth/verify", version: "1.x", host: "api.example.com", remoteAddress: "203.0.113.7", remotePort: 51234 });
  });

  it("tolerates a missing socket, headers, and a non-string accept-version", () => {
    expect(serializeRequest({ method: "POST", url: "/x", socket: null })).toEqual({
      method: "POST",
      url: "/x",
      version: undefined,
      host: undefined,
      remoteAddress: undefined,
      remotePort: undefined
    });
    expect(serializeRequest({ headers: { "accept-version": ["1", "2"] } }).version).toBeUndefined();
  });
});

describe("buildLoggerOptions", () => {
  it("info in production, debug elsewhere, LOG_LEVEL wins", () => {
    expect(buildLoggerOptions({ NODE_ENV: "production" }).level).toBe("info");
    expect(buildLoggerOptions({ NODE_ENV: "development" }).level).toBe("debug");
    expect(buildLoggerOptions({}).level).toBe("debug");
    expect(buildLoggerOptions({ NODE_ENV: "production", LOG_LEVEL: "warn" }).level).toBe("warn");
  });

  it("removes every secret-bearing path and installs the query-free request serializer", () => {
    const opts = buildLoggerOptions({ NODE_ENV: "production" });
    expect(opts.redact).toEqual({ paths: [...LOG_REDACT_PATHS], remove: true });
    expect(opts.redact.paths).toEqual(expect.arrayContaining(["req.headers.authorization", "req.body.refreshToken", "req.body.token"]));
    expect(opts.serializers.req).toBe(serializeRequest);
  });

  it("returns a fresh redact array (callers cannot mutate the shared list)", () => {
    const a = buildLoggerOptions({});
    a.redact.paths.push("mutated");
    expect(LOG_REDACT_PATHS).not.toContain("mutated");
  });
});

describe("F9 regression: the real app, the production logger config, a real request", () => {
  async function logsFor(inject: (app: Awaited<ReturnType<typeof buildApp>>) => Promise<unknown>): Promise<string> {
    const lines: string[] = [];
    const stream = new Writable({
      write(chunk, _enc, cb) {
        lines.push(String(chunk));
        cb();
      }
    });
    const app = await buildApp({ logger: { ...buildLoggerOptions({ NODE_ENV: "production" }), stream } });
    await inject(app);
    await app.close();
    expect(lines.length).toBeGreaterThan(0); // the logger really ran
    return lines.join("");
  }

  it("a magic-link token in the URL query never reaches the logs; the path does", async () => {
    const out = await logsFor((app) => app.inject({ method: "GET", url: "/api/v1/auth/verify?token=MAGIC-SECRET-111" }));
    expect(out).not.toContain("MAGIC-SECRET-111");
    expect(out).toContain('"url":"/api/v1/auth/verify"');
  });

  it("a bearer token and a body token are not logged either", async () => {
    const out = await logsFor((app) =>
      app.inject({
        method: "POST",
        url: "/api/v1/auth/refresh?x=QUERY-SECRET-222",
        headers: { authorization: "Bearer HEADER-SECRET-333" },
        payload: { refreshToken: "BODY-SECRET-444" }
      })
    );
    for (const secret of ["QUERY-SECRET-222", "HEADER-SECRET-333", "BODY-SECRET-444"]) expect(out, secret).not.toContain(secret);
  });
});
