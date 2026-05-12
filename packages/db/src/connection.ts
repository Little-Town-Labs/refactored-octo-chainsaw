// F02 B2 — Drizzle connection helper.
//
// Lazy singleton Drizzle client backed by node-postgres. The pool is
// created on first use against `DATABASE_URL` and is reused for the
// rest of the process lifetime.
//
// Connection details (TLS, pool size, timeouts) come from the URL —
// keeping the surface here minimal so consuming features (F02..)
// don't repeat boilerplate.

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";

import * as schema from "./schema/index.js";

export type Schema = typeof schema;
export type Db = NodePgDatabase<Schema>;

let cached: { pool: pg.Pool; db: Db } | undefined;

export function getDb(databaseUrl?: string): Db {
  if (cached) return cached.db;
  const connectionString = databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — required to create a Drizzle connection (Constitution §I.6).",
    );
  }
  const pool = new pg.Pool({ connectionString });
  const db = drizzle(pool, { schema });
  cached = { pool, db };
  return db;
}

export async function closeDb(): Promise<void> {
  if (!cached) return;
  await cached.pool.end();
  cached = undefined;
}
