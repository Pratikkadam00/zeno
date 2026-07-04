import "dotenv/config";
import { buildApp } from "./app";
import { assertConfigOrExit } from "./config";
import { sweepExpiredAuth } from "./routes/auth";
import { closeStorage, encryptionConfigured, initStorage, pgEnabled } from "./storage/pg";

// Validate configuration before doing anything else — a fatal misconfiguration
// (e.g. missing JWT keys or a malformed encryption key in production) exits here
// with a clear message instead of failing lazily on the first affected request.
assertConfigOrExit();

// PORT is injected by most hosts (Render, Railway, Fly, …); fall back to API_PORT
// for local dev. Host must be 0.0.0.0 in the cloud (set API_HOST=0.0.0.0 there).
const port = Number.parseInt(process.env.PORT ?? process.env.API_PORT ?? "8787", 10);
const host = process.env.API_HOST ?? "127.0.0.1";
const app = await buildApp({ logger: true });

// Rehydrate the in-memory stores (sync, billing, family, auth sessions) from
// Postgres before accepting traffic. No-op without DATABASE_URL; tolerant of a
// DB outage (logs and continues in-memory-only). buildApp() above has already
// imported the route/store modules, so every hydrator is registered by now.
await initStorage();

// One-line readiness summary so the Render logs unambiguously confirm whether
// provisioning took effect. No secrets — just modes.
console.log(
  `[zeno] persistence=${pgEnabled() ? "postgres" : "in-memory"} ` +
  `token-encryption=${encryptionConfigured() ? "on" : "off"} ` +
  `env=${process.env.NODE_ENV ?? "development"}`
);

// Single-instance guardrail. Reads are node-local and the sync sequence is a
// per-process counter, so running >1 replica silently corrupts sync and breaks
// auth (see docs/PRODUCTION_READINESS.md). We can't reliably detect sibling
// instances from one process, so this is a loud advisory, not a hard block —
// set ALLOW_MULTI_INSTANCE=1 to acknowledge and silence it once the
// multi-instance work is done.
if (pgEnabled() && process.env.ALLOW_MULTI_INSTANCE !== "1") {
  console.warn(
    "[zeno] SINGLE-INSTANCE ONLY — do not scale replicas: in-memory reads + a " +
    "per-process sync sequence mean >1 instance will corrupt sync and break auth."
  );
}

// Reclaim expired magic links / refresh sessions every 10 minutes. unref() so the
// timer never keeps the process alive on shutdown.
setInterval(sweepExpiredAuth, 10 * 60 * 1000).unref();

// Graceful shutdown: on a platform SIGTERM/SIGINT (every Render deploy), stop
// accepting new connections, let in-flight requests drain, close the Postgres
// pool, then exit. A hard-exit backstop guarantees the process still dies if the
// drain hangs.
let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, "graceful shutdown starting");
  const hardExit = setTimeout(() => {
    app.log.error("graceful shutdown timed out; forcing exit");
    process.exit(1);
  }, 10_000);
  hardExit.unref();
  try {
    await app.close();
    await closeStorage();
    clearTimeout(hardExit);
    process.exit(0);
  } catch (error) {
    app.log.error(error, "error during shutdown");
    process.exit(1);
  }
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// Last-resort handlers: a stray rejection is logged (not silently swallowed); an
// uncaught exception is logged and triggers a deliberate shutdown rather than an
// abrupt, unexplained process death.
process.on("unhandledRejection", (reason) => {
  app.log.error({ reason }, "unhandledRejection");
});
process.on("uncaughtException", (error) => {
  app.log.error(error, "uncaughtException — shutting down");
  void shutdown("uncaughtException");
});

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
