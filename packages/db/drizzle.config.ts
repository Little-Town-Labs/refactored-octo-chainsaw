// Drizzle Kit config for @spyglass/db.
//
// F01 ships configuration only; schema definitions and migrations
// land in F03. The migrations/ directory exists with a .gitkeep until
// then.
//
// DATABASE_URL is read from process.env (typed via @spyglass/shared).
// Per Constitution v2.0.0 §I.6, drizzle-kit operations fail fast if
// the URL is missing or invalid — no silent fallback.

import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Run `vercel env pull .env.local --yes` " +
      "(once `vercel link` has been done) or populate .env.local " +
      "manually for local development.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./migrations",
  dbCredentials: { url: databaseUrl },
  // Strict mode — drizzle-kit will refuse risky migrations without
  // explicit override (F03 will configure migration policy in detail).
  strict: true,
  verbose: true,
});
