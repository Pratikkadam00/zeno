// API process lifecycle: validate config, build the app, rehydrate storage,
// start the sweeper, install signal/crash handlers, listen. Moved out of
// server.ts (which is now only the entry point) so every branch can be tested
// with injected dependencies instead of a real process, port and database.
// Behaviour is unchanged from the previous server.ts.
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app";
import { assertConfigOrExit } from "./config";
import { sweepExpiredAuth } from "./routes/auth";
import { buildLoggerOptions } from "./server-options";
import { closeStorage, encryptionConfigured, initStorage, pgEnabled } from "./storage/pg";

type ProcessLike = {
  on(event: "SIGTERM" | "SIGINT", listener: () => void): unknown;
  on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown;
  on(event: "uncaughtException", listener: (error: Error) => void): unknown;
  exit(code: number): void;
};

export type StartDeps = {
  env: NodeJS.ProcessEnv;
  process: ProcessLike;
  assertConfig: () => void;
  buildApp: typeof buildApp;
  initStorage: () => Promise<void>;
  closeStorage: () => Promise<void>;
  sweepExpiredAuth: () => void;
  pgEnabled: () => boolean;
  encryptionConfigured: () => boolean;
  setInterval: (fn: () => void, ms: number) => { unref(): unknown };
  setTimeout: (fn: () => void, ms: number) => { unref(): unknown };
  clearTimeout: (handle: ReturnType<StartDeps["setTimeout"]>) => void;
  console: Pick<Console, "log" | "warn">;
};

export const SWEEP_INTERVAL_MS = 10 * 60 * 1000;
export const SHUTDOWN_TIMEOUT_MS = 10_000;

export function defaultDeps(): StartDeps {
  return {
    env: process.env,
    process,
    assertConfig: assertConfigOrExit,
    buildApp,
    initStorage,
    closeStorage,
    sweepExpiredAuth,
    pgEnabled,
    encryptionConfigured,
    setInterval: (fn, ms) => setInterval(fn, ms),
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (handle) => clearTimeout(handle as NodeJS.Timeout),
    console
  };
}

/** PORT is injected by most hosts (Render, Railway, Fly, …); API_PORT is the
 *  local-dev fallback. Host must be 0.0.0.0 in the cloud (API_HOST=0.0.0.0). */
export function listenAddress(env: NodeJS.ProcessEnv): { port: number; host: string } {
  return {
    port: Number.parseInt(env.PORT ?? env.API_PORT ?? "8787", 10),
    host: env.API_HOST ?? "127.0.0.1"
  };
}

export async function startServer(deps: StartDeps = defaultDeps()): Promise<{ app: FastifyInstance; shutdown: (signal: string) => Promise<void> }> {
  // Validate configuration before anything else — a fatal misconfiguration
  // (missing JWT keys, malformed encryption key, bad DATABASE_SSL in
  // production) exits here with a clear message, not lazily on a request.
  deps.assertConfig();

  const { port, host } = listenAddress(deps.env);
  const app = await deps.buildApp({ logger: buildLoggerOptions(deps.env) });

  // Rehydrate the in-memory stores from Postgres before accepting traffic.
  // No-op without DATABASE_URL; tolerant of a DB outage.
  await deps.initStorage();

  // One-line readiness summary so the host's logs confirm the modes. No secrets.
  deps.console.log(
    `[zeno] persistence=${deps.pgEnabled() ? "postgres" : "in-memory"} ` +
      `token-encryption=${deps.encryptionConfigured() ? "on" : "off"} ` +
      `env=${deps.env.NODE_ENV ?? "development"}`
  );

  // Single-instance guardrail: reads are node-local and the sync sequence is a
  // per-process counter, so >1 replica corrupts sync and breaks auth. A loud
  // advisory (one process cannot see its siblings); ALLOW_MULTI_INSTANCE=1
  // silences it once the multi-instance work is done.
  if (deps.pgEnabled() && deps.env.ALLOW_MULTI_INSTANCE !== "1") {
    deps.console.warn(
      "[zeno] SINGLE-INSTANCE ONLY — do not scale replicas: in-memory reads + a " +
        "per-process sync sequence mean >1 instance will corrupt sync and break auth."
    );
  }

  // Reclaim expired magic links / refresh sessions every 10 minutes; unref() so
  // the timer never keeps the process alive on shutdown.
  deps.setInterval(deps.sweepExpiredAuth, SWEEP_INTERVAL_MS).unref();

  // Graceful shutdown on SIGTERM/SIGINT (every deploy): stop accepting
  // connections, drain in-flight requests, close the Postgres pool, exit. A
  // hard-exit backstop guarantees the process dies if the drain hangs.
  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "graceful shutdown starting");
    const hardExit = deps.setTimeout(() => {
      app.log.error("graceful shutdown timed out; forcing exit");
      deps.process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    hardExit.unref();
    try {
      await app.close();
      await deps.closeStorage();
      deps.clearTimeout(hardExit);
      deps.process.exit(0);
    } catch (error) {
      app.log.error(error, "error during shutdown");
      deps.process.exit(1);
    }
  }
  deps.process.on("SIGTERM", () => void shutdown("SIGTERM"));
  deps.process.on("SIGINT", () => void shutdown("SIGINT"));

  // Last-resort handlers: a stray rejection is logged (not swallowed); an
  // uncaught exception is logged and triggers a deliberate shutdown.
  deps.process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "unhandledRejection");
  });
  deps.process.on("uncaughtException", (error) => {
    app.log.error(error, "uncaughtException — shutting down");
    void shutdown("uncaughtException");
  });

  try {
    await app.listen({ port, host });
  } catch (error) {
    app.log.error(error);
    deps.process.exit(1);
  }
  return { app, shutdown };
}
