// Apply Drizzle migrations to a connection URL.
//
// Used by the harness to seed a freshly-created Neon branch. We
// import drizzle's migrator dynamically because it's only needed in
// integration runs — keeping it out of the unit-test path avoids the
// pg native module loading on every test run.

import { resolve } from "node:path";

export async function applyMigrations(input: {
  connectionUrl: string;
  /** Absolute path to the migrations folder (e.g. `packages/db/migrations`). */
  migrationsFolder: string;
}): Promise<void> {
  const { Client } = await import("pg");
  const { drizzle } = await import("drizzle-orm/node-postgres");
  const { migrate } = await import("drizzle-orm/node-postgres/migrator");

  const client = new Client({ connectionString: input.connectionUrl });
  await client.connect();
  try {
    const db = drizzle(client);
    await migrate(db, { migrationsFolder: resolve(input.migrationsFolder) });
  } finally {
    await client.end();
  }
}
