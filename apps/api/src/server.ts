import "dotenv/config";
import { buildApp } from "./app";

// PORT is injected by most hosts (Render, Railway, Fly, …); fall back to API_PORT
// for local dev. Host must be 0.0.0.0 in the cloud (set API_HOST=0.0.0.0 there).
const port = Number.parseInt(process.env.PORT ?? process.env.API_PORT ?? "8787", 10);
const host = process.env.API_HOST ?? "127.0.0.1";
const app = await buildApp({ logger: true });

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
