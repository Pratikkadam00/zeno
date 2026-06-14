import "dotenv/config";
import { buildApp } from "./app";

const port = Number.parseInt(process.env.API_PORT ?? "8787", 10);
const host = process.env.API_HOST ?? "127.0.0.1";
const app = await buildApp({ logger: true });

try {
  await app.listen({ port, host });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
