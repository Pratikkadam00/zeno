import "dotenv/config";
import { buildApp } from "./app";
import { initStorage } from "./storage/pg";

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

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
