import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    // Task 122 F-9: "Degrade, Never Fail" needs a time bound. Without these,
    // a WEDGED (not refused) Postgres hangs every force-dynamic page forever —
    // the static-catalogue fallback can only engage if the query actually
    // fails. connectionTimeoutMillis bounds acquiring a connection;
    // query_timeout bounds each statement client-side (node-postgres ≥ 8
    // ClientConfig options; the e2e fetch-failure pair only covered
    // connection-refused, which answers instantly).
    connectionTimeoutMillis: 5_000,
    query_timeout: 8_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);
