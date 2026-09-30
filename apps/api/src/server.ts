// Entry point for the API process (`npm run start --workspace @zeno/api`).
// Everything it does lives in start.ts so it can be tested; this file only loads
// .env (local development) and starts the server with the real dependencies.
import "dotenv/config";
import { startServer } from "./start";

await startServer();
