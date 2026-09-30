import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import pg from "pg";

/**
 * A REAL Postgres for the P2.1 suites, reached through the same `pg` driver,
 * pool and SQL the API uses in production (not a mock of storage/pg.ts).
 *
 *  - CI sets TEST_DATABASE_URL to a `postgres` service container (a real
 *    server): see .github/workflows/ci.yml.
 *  - Locally, PGlite (Postgres compiled to WebAssembly) is embedded behind its
 *    wire-protocol socket server on an ephemeral port, so no install is needed.
 *
 * Either way the API sees an ordinary DATABASE_URL. TLS is off (DATABASE_SSL=
 * disable) because both are local: PGlite's socket server has no SSL, and the
 * CI service is on the runner's loopback network.
 */
export type RealPg = {
  url: string;
  kind: "pglite" | "server";
  /** A direct client for assertions, independent of the API's own pool. */
  query: <T extends pg.QueryResultRow = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  stop: () => Promise<void>;
};

export async function startRealPg(): Promise<RealPg> {
  const external = process.env.TEST_DATABASE_URL;
  let url: string;
  let kind: RealPg["kind"];
  let stopEngine = async () => {};

  if (external) {
    url = external;
    kind = "server";
  } else {
    const db = await PGlite.create();
    // The API's pool opens up to 5 connections; the socket server multiplexes
    // them over PGlite's single connection, queueing at the query level.
    const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0, maxConnections: 16 });
    await server.start();
    url = `postgres://postgres@${server.getServerConn()}/postgres`;
    kind = "pglite";
    stopEngine = async () => {
      await server.stop();
      await db.close();
    };
  }

  const admin = new pg.Pool({ connectionString: url, max: 2 });
  return {
    url,
    kind,
    query: async <T extends pg.QueryResultRow>(sql: string, params: unknown[] = []) => (await admin.query<T>(sql, params)).rows,
    stop: async () => {
      await admin.end();
      await stopEngine();
    }
  };
}
