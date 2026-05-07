// Connectivity smoke test for the configured DATABASE_URL.
//
// Not part of CI — this is a one-shot script you run manually after
// configuring credentials. It does NOT mutate the database; it
// connects, runs `SELECT 1, version(), now()`, and disconnects.
//
// Run via: `pnpm --filter @spyglass/db exec tsx scripts/db-smoke.ts`
// after sourcing .env.local.

import { Client } from "pg";

import { loadEnv } from "../../shared/src/env.js";

const env = loadEnv();

if (!env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Populate .env.local or run vercel env pull.");
  process.exit(1);
}

const client = new Client({ connectionString: env.DATABASE_URL });

try {
  await client.connect();
  const result = await client.query<{
    one: number;
    version: string;
    now: Date;
  }>("SELECT 1 as one, version(), now()");
  const row = result.rows[0];
  if (!row) {
    console.error("query returned no rows");
    process.exit(1);
  }
  console.log("connection ok");
  console.log(`  one     = ${row.one}`);
  console.log(`  version = ${row.version.split(",")[0]}`);
  console.log(`  now     = ${row.now.toISOString()}`);
} catch (err) {
  console.error("connection failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client.end();
}
