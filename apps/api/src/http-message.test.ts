import { connect } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "./app";

// ASVS V4.1.1 and V4.2.1, on a real socket: every JSON answer says its charset,
// and a request whose length is ambiguous (both Content-Length and
// Transfer-Encoding: the classic request-smuggling shape) is refused, not read.

let app: Awaited<ReturnType<typeof buildApp>>;
let port = 0;
beforeAll(async () => {
  app = await buildApp();
  await app.listen({ port: 0, host: "127.0.0.1" });
  port = (app.server.address() as { port: number }).port;
});
afterAll(async () => {
  await app.close();
});

function raw(request: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = connect(port, "127.0.0.1", () => socket.end(request));
    let data = "";
    socket.on("data", (chunk) => (data += chunk.toString("latin1")));
    socket.on("end", () => resolve(data));
    socket.on("error", reject);
  });
}

describe("HTTP messages", () => {
  it("a JSON answer declares its charset (success and error alike)", async () => {
    for (const url of ["/api/v1/health", "/api/v1/no-such-route"]) {
      const res = await app.inject({ method: "GET", url });
      expect(res.headers["content-type"], url).toBe("application/json; charset=utf-8");
    }
  });

  // ASVS V15.3.7: a repeated parameter is refused, never silently resolved to
  // one of its values (which one a proxy and the API pick can differ).
  it("a query parameter sent twice is refused with 400", async () => {
    // The one route that reads its query without a schema (F219).
    for (const query of ["q=net&q=hulu", "limit=5&limit=500", "offset=0&offset=10"]) {
      const answer = await app.inject({ method: "GET", url: `/api/v1/services?${query}` });
      expect(answer.statusCode, query).toBe(400);
    }
    // Each one alone is still fine.
    expect((await app.inject({ method: "GET", url: "/api/v1/services?q=net&limit=5&offset=0" })).statusCode).toBe(200);
  });

  // ASVS V3.5.3, V14.2.1: using up a sign-in link is a POST with the token in
  // the body. The old GET with ?token= is gone, so a token in a URL does nothing.
  it("a sign-in link is used up by POST only; the old GET with the token in its URL is gone", async () => {
    const sent = await app.inject({ method: "POST", url: "/api/v1/auth/magic-link", payload: { email: "post-only@example.com" } });
    const token = decodeURIComponent((sent.json().data.devLink as string).split("token=")[1] ?? "");
    const byGet = await app.inject({ method: "GET", url: `/api/v1/auth/verify?token=${encodeURIComponent(token)}` });
    expect(byGet.statusCode).toBe(404);
    const byPost = await app.inject({ method: "POST", url: "/api/v1/auth/verify", payload: { token } });
    expect(byPost.statusCode).toBe(200);
  });

  // ASVS V13.4.4: TRACE is not served (it would echo the request, cookies and all).
  it("TRACE is refused and never echoes the request", async () => {
    const answer = await raw("TRACE /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Secret-Probe: trace-echo-42\r\nConnection: close\r\n\r\n");
    expect(answer.split("\r\n")[0]).toMatch(/^HTTP\/1\.1 (404|405) /);
    expect(answer).not.toContain("trace-echo-42");
  });

  it("a request with both Content-Length and Transfer-Encoding is refused with 400", async () => {
    const answer = await raw(
      "POST /api/v1/events HTTP/1.1\r\nHost: 127.0.0.1\r\nContent-Type: application/json\r\nContent-Length: 4\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\nGET /api/v1/health HTTP/1.1\r\nHost: 127.0.0.1\r\n\r\n"
    );
    expect(answer.split("\r\n")[0]).toBe("HTTP/1.1 400 Bad Request");
    // The smuggled second request is never answered.
    expect(answer.match(/HTTP\/1\.1 /g)).toHaveLength(1);
  });
});
