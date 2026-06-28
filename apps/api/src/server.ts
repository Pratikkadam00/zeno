import "dotenv/config";
import { buildApp } from "./app";
import { sweepExpiredAuth } from "./routes/auth";
import { encryptionConfigured, initStorage, pgEnabled } from "./storage/pg";

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

// Reclaim expired magic links / refresh sessions every 10 minutes. unref() so the
// timer never keeps the process alive on shutdown.
setInterval(sweepExpiredAuth, 10 * 60 * 1000).unref();

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
