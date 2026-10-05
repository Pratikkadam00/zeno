import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { check, probe } from "./uptime-check.mjs";

// P8: the uptime check, against a real local server playing the API.
let server: Server | undefined;
afterEach(() => new Promise<void>((done) => (server ? server.close(() => done()) : done())));

async function serve(answers: Array<{ status: number; body: unknown }>): Promise<string> {
  let call = 0;
  server = createServer((_req, res) => {
    const answer = answers[Math.min(call, answers.length - 1)]!;
    call += 1;
    res.writeHead(answer.status, { "content-type": "application/json" });
    res.end(JSON.stringify(answer.body));
  });
  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", done));
  return `http://127.0.0.1:${(server!.address() as AddressInfo).port}/api/v1/health/ready`;
}

const READY = { status: 200, body: { data: { status: "ready", checks: { postgres: "ok" } } } };
const noWait = { timeoutMs: 2000, retryAfterMs: 0, wait: async () => {} };

describe("uptime check", () => {
  it("up: 200, ready, every check ok", async () => {
    expect(await check(await serve([READY]), noWait)).toEqual([]);
  });

  it("the database down is down, even with a 200", async () => {
    const url = await serve([{ status: 200, body: { data: { status: "ready", checks: { postgres: "error" } } } }]);
    expect(await probe(url, 2000)).toBe("failing checks: postgres=error");
    expect(await check(url, noWait)).toEqual(["failing checks: postgres=error", "failing checks: postgres=error"]);
  });

  it("not ready, or a 503, is down", async () => {
    expect(await probe(await serve([{ status: 200, body: { data: { status: "starting" } } }]), 2000)).toMatch(/^not ready/);
    await new Promise<void>((done) => server!.close(() => done()));
    expect(await probe(await serve([{ status: 503, body: {} }]), 2000)).toBe("status 503");
  });

  it("a cold start (first try fails, the retry is ready) counts as up", async () => {
    expect(await check(await serve([{ status: 502, body: {} }, READY]), noWait)).toEqual([]);
  });

  it("nothing listening is down, with the reason", async () => {
    expect(await probe("http://127.0.0.1:1/api/v1/health/ready", 2000)).toMatch(/^no answer/);
  });
});
