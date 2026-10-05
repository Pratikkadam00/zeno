import { describe, expect, it, vi } from "vitest";
import { defaultDeps, listenAddress, SHUTDOWN_TIMEOUT_MS, startServer, SWEEP_INTERVAL_MS, type StartDeps } from "./start";

/**
 * The API process lifecycle, with every dependency injected: no real port,
 * database, signals or process.exit. Covers boot order, the readiness line,
 * the single-instance warning, the sweeper, graceful shutdown (incl. the
 * hard-exit backstop and a failing close), crash handlers and listen failure.
 */
type Handlers = Record<string, ((arg?: unknown) => void) | undefined>;

function harness(over: Partial<StartDeps> = {}, appOver: Partial<Record<"close" | "listen", () => Promise<unknown>>> = {}) {
  const order: string[] = [];
  const handlers: Handlers = {};
  const timers: { fn: () => void; ms: number; unref: ReturnType<typeof vi.fn> }[] = [];
  const app = {
    log: { info: vi.fn(), error: vi.fn() },
    close: vi.fn(appOver.close ?? (async () => undefined)),
    listen: vi.fn(appOver.listen ?? (async () => "listening"))
  };
  const deps: StartDeps = {
    env: { NODE_ENV: "test", PORT: "9999", API_HOST: "0.0.0.0" },
    process: {
      on: vi.fn((event: string, listener: (arg?: unknown) => void) => {
        handlers[event] = listener;
      }) as unknown as StartDeps["process"]["on"],
      exit: vi.fn()
    },
    assertConfig: vi.fn(() => order.push("assertConfig")),
    buildApp: vi.fn(async () => {
      order.push("buildApp");
      return app as never;
    }) as unknown as StartDeps["buildApp"],
    initStorage: vi.fn(async () => {
      order.push("initStorage");
    }),
    closeStorage: vi.fn(async () => undefined),
    sweepExpiredAuth: vi.fn(),
    pgEnabled: vi.fn(() => false),
    encryptionConfigured: vi.fn(() => false),
    setInterval: vi.fn((fn: () => void, ms: number) => {
      const unref = vi.fn();
      timers.push({ fn, ms, unref });
      return { unref };
    }),
    setTimeout: vi.fn((fn: () => void, ms: number) => {
      const unref = vi.fn();
      timers.push({ fn, ms, unref });
      return { unref };
    }),
    clearTimeout: vi.fn(),
    console: { log: vi.fn(), warn: vi.fn() },
    ...over
  };
  return { deps, app, handlers, timers, order };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("listenAddress", () => {
  it("PORT wins, then API_PORT, then 8787; host defaults to loopback", () => {
    expect(listenAddress({ PORT: "1", API_PORT: "2" })).toEqual({ port: 1, host: "127.0.0.1" });
    expect(listenAddress({ API_PORT: "2" })).toEqual({ port: 2, host: "127.0.0.1" });
    expect(listenAddress({})).toEqual({ port: 8787, host: "127.0.0.1" });
    expect(listenAddress({ API_HOST: "0.0.0.0" }).host).toBe("0.0.0.0");
  });
});

describe("startServer", () => {
  it("boots in order: config → app (with the query-free logger) → storage → listen", async () => {
    const h = harness();
    await startServer(h.deps);
    expect(h.order).toEqual(["assertConfig", "buildApp", "initStorage"]);
    const buildArg = vi.mocked(h.deps.buildApp).mock.calls[0]?.[0] as { logger: { level: string; serializers: { req: unknown } } };
    expect(buildArg.logger.level).toBe("debug");
    expect(typeof buildArg.logger.serializers.req).toBe("function");
    expect(h.app.listen).toHaveBeenCalledWith({ port: 9999, host: "0.0.0.0" });
    expect(h.deps.process.exit).not.toHaveBeenCalled();
  });

  it("prints a secret-free readiness line reflecting the real modes", async () => {
    const h = harness({ pgEnabled: vi.fn(() => true), encryptionConfigured: vi.fn(() => true), env: { NODE_ENV: "production", ALLOW_MULTI_INSTANCE: "1" } });
    await startServer(h.deps);
    expect(h.deps.console.log).toHaveBeenCalledWith("[zeno] persistence=postgres token-encryption=on env=production");
    const h2 = harness({ env: {} });
    await startServer(h2.deps);
    expect(h2.deps.console.log).toHaveBeenCalledWith("[zeno] persistence=in-memory token-encryption=off env=development");
  });

  it("warns single-instance only when Postgres is on and not acknowledged", async () => {
    const on = harness({ pgEnabled: vi.fn(() => true) });
    await startServer(on.deps);
    expect(on.deps.console.warn).toHaveBeenCalledTimes(1);
    expect(on.deps.console.warn).toHaveBeenCalledWith(
      "[zeno] SINGLE-INSTANCE ONLY — do not scale replicas: in-memory reads + a per-process sync sequence mean >1 instance will corrupt sync and break auth."
    );
    const acked = harness({ pgEnabled: vi.fn(() => true), env: { ALLOW_MULTI_INSTANCE: "1" } });
    await startServer(acked.deps);
    expect(acked.deps.console.warn).not.toHaveBeenCalled();
    const off = harness();
    await startServer(off.deps);
    expect(off.deps.console.warn).not.toHaveBeenCalled();
  });

  it("starts the auth sweeper every 10 minutes, unref'd", async () => {
    const h = harness();
    await startServer(h.deps);
    // The literal, not only the constant: a test against SWEEP_INTERVAL_MS alone
    // passes whatever the constant says (P6.2).
    expect(SWEEP_INTERVAL_MS).toBe(10 * 60 * 1000);
    const sweep = h.timers.find((t) => t.ms === SWEEP_INTERVAL_MS);
    expect(sweep).toBeDefined();
    expect(sweep!.unref).toHaveBeenCalled();
    sweep!.fn();
    expect(h.deps.sweepExpiredAuth).toHaveBeenCalledTimes(1);
  });

  it("SIGTERM: closes the app, then storage, clears the backstop, exits 0 — once", async () => {
    const h = harness();
    await startServer(h.deps);
    h.handlers.SIGTERM!();
    await flush();
    expect(h.app.close).toHaveBeenCalledTimes(1);
    expect(h.deps.closeStorage).toHaveBeenCalledTimes(1);
    expect(h.deps.clearTimeout).toHaveBeenCalledTimes(1);
    expect(h.deps.process.exit).toHaveBeenCalledWith(0);
    const backstop = h.timers.find((t) => t.ms === SHUTDOWN_TIMEOUT_MS);
    expect(backstop!.unref).toHaveBeenCalled();
    // A second signal is ignored (no double close).
    h.handlers.SIGINT!();
    await flush();
    expect(h.app.close).toHaveBeenCalledTimes(1);
  });

  // P6.2: which signal started a shutdown is the first line an operator reads after
  // a deploy or a crash; the signal names were blanked and no test noticed.
  it("logs which signal (or crash) started the shutdown", async () => {
    for (const [event, arg] of [["SIGTERM", undefined], ["SIGINT", undefined], ["uncaughtException", new Error("crash")]] as const) {
      const h = harness();
      await startServer(h.deps);
      h.handlers[event]!(arg);
      await flush();
      expect(h.app.log.info, event).toHaveBeenCalledWith({ signal: event }, "graceful shutdown starting");
    }
  });

  it("returns the app and its shutdown, which a caller can run itself", async () => {
    const h = harness();
    const started = await startServer(h.deps);
    expect(started.app).toBe(h.app);
    await started.shutdown("manual");
    expect(h.app.log.info).toHaveBeenCalledWith({ signal: "manual" }, "graceful shutdown starting");
    expect(h.deps.process.exit).toHaveBeenCalledWith(0);
  });

  it("SIGINT alone also shuts down gracefully", async () => {
    const h = harness();
    await startServer(h.deps);
    h.handlers.SIGINT!();
    await flush();
    expect(h.deps.process.exit).toHaveBeenCalledWith(0);
  });

  it("a failing close exits 1 and logs the error", async () => {
    const h = harness({}, { close: async () => { throw new Error("drain failed"); } });
    await startServer(h.deps);
    h.handlers.SIGTERM!();
    await flush();
    expect(h.app.log.error).toHaveBeenCalledWith(expect.any(Error), "error during shutdown");
    expect(h.deps.process.exit).toHaveBeenCalledWith(1);
  });

  it("the hard-exit backstop forces exit 1 if the drain hangs", async () => {
    const h = harness({}, { close: () => new Promise(() => {}) });
    await startServer(h.deps);
    h.handlers.SIGTERM!();
    await flush();
    const backstop = h.timers.find((t) => t.ms === SHUTDOWN_TIMEOUT_MS)!;
    backstop.fn();
    expect(h.app.log.error).toHaveBeenCalledWith("graceful shutdown timed out; forcing exit");
    expect(h.deps.process.exit).toHaveBeenCalledWith(1);
  });

  it("an unhandled rejection is logged, never swallowed, and does not exit", async () => {
    const h = harness();
    await startServer(h.deps);
    h.handlers.unhandledRejection!("boom");
    expect(h.app.log.error).toHaveBeenCalledWith({ reason: "boom" }, "unhandledRejection");
    expect(h.deps.process.exit).not.toHaveBeenCalled();
  });

  it("an uncaught exception is logged and triggers a graceful shutdown", async () => {
    const h = harness();
    await startServer(h.deps);
    const error = new Error("crash");
    h.handlers.uncaughtException!(error);
    await flush();
    expect(h.app.log.error).toHaveBeenCalledWith(error, "uncaughtException — shutting down");
    expect(h.app.close).toHaveBeenCalledTimes(1);
    expect(h.deps.process.exit).toHaveBeenCalledWith(0);
  });

  it("a listen failure is logged and exits 1", async () => {
    const h = harness({}, { listen: async () => { throw new Error("EADDRINUSE"); } });
    await startServer(h.deps);
    expect(h.app.log.error).toHaveBeenCalledWith(expect.any(Error));
    expect(h.deps.process.exit).toHaveBeenCalledWith(1);
  });
});

describe("defaultDeps", () => {
  it("wires the real modules and timer wrappers", () => {
    const d = defaultDeps();
    expect(d.env).toBe(process.env);
    expect(d.process).toBe(process);
    for (const k of ["assertConfig", "buildApp", "initStorage", "closeStorage", "sweepExpiredAuth", "pgEnabled", "encryptionConfigured"] as const) {
      expect(typeof d[k], k).toBe("function");
    }
    const noop = vi.fn();
    const interval = d.setInterval(noop, 60_000);
    interval.unref();
    clearInterval(interval as unknown as NodeJS.Timeout);
    const timeout = d.setTimeout(noop, 60_000);
    timeout.unref();
    d.clearTimeout(timeout);
    expect(noop).not.toHaveBeenCalled();
  });

  it("its clearTimeout really cancels a pending timer", async () => {
    const d = defaultDeps();
    const fired = vi.fn();
    d.clearTimeout(d.setTimeout(fired, 10));
    await new Promise((r) => setTimeout(r, 40));
    expect(fired).not.toHaveBeenCalled();
    expect(d.console).toBe(console);
  });
});
