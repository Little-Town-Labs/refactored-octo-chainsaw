// Spyglass environment manifest — single source of truth.
//
// Per Constitution v2.0.0 §I.6 (Secure-by-Default / fail-safe defaults)
// and §III.2 (typed agent semantics), env vars are declared as a typed
// Zod schema. Missing or invalid values cause `getEnv()` to throw at
// first call rather than producing undefined behavior.
//
// `.env.example` is GENERATED from this file via `pnpm gen:env-example`.
// Do not hand-edit `.env.example`. CI fails on drift between the schema
// and the example file.
//
// To add a variable:
//   1. Add a field to `envSchema` below.
//   2. Add a one-line description to `envDescriptions`.
//   3. Run `pnpm gen:env-example` and commit both.
//
// Variables marked `.optional()` are tolerated as missing in F01 but
// will be promoted to required as their consuming feature lands. The
// consuming feature ID is recorded in the description.

import { z } from "zod";

export const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(["development", "preview", "production", "test"]).default("development"),
  VERCEL_ENV: z.enum(["development", "preview", "production"]).optional(),

  // F03 — Database (Drizzle + Neon Postgres)
  DATABASE_URL: z.string().url().optional(),

  // F08 — Parley runner / Inngest
  INNGEST_SIGNING_KEY: z.string().min(1).optional(),
  INNGEST_EVENT_KEY: z.string().min(1).optional(),

  // F02 — Auth (Clerk)
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),

  // F12 — AI infrastructure (Vercel AI Gateway)
  AI_GATEWAY_API_KEY: z.string().min(1).optional(),

  // F24 — Incident response / monitoring
  SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Human-readable descriptions paired with each schema key.
 * Used by `scripts/gen-env-example.ts` to generate `.env.example`.
 */
export const envDescriptions: Record<keyof Env, string> = {
  NODE_ENV: "Node runtime mode (development | preview | production | test)",
  VERCEL_ENV: "Vercel deployment context (set automatically on Vercel)",
  DATABASE_URL: "Neon Postgres connection URL — required from F03 onward",
  INNGEST_SIGNING_KEY: "Inngest webhook signing key — required from F08",
  INNGEST_EVENT_KEY: "Inngest event publish key — required from F08",
  CLERK_SECRET_KEY: "Clerk server-side secret — required from F02",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "Clerk public key (browser-exposed) — required from F02",
  AI_GATEWAY_API_KEY: "Vercel AI Gateway API key — required from F12",
  SENTRY_DSN: "Sentry DSN — required from F24",
};

let cached: Env | undefined;

/**
 * Parse the given environment record (defaulting to `process.env`).
 * Tests pass an explicit record to avoid coupling to real env state.
 *
 * Throws on missing / invalid required values per Constitution §I.6.
 */
export function loadEnv(env: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Environment validation failed (Constitution §I.6 fail-safe defaults):\n${issues}`,
    );
  }
  return result.data;
}

/**
 * Singleton accessor. First call validates `process.env`; subsequent
 * calls return the cached result. Throws on the first call if env is
 * invalid.
 *
 * Production code paths use `getEnv()`. Tests use `loadEnv(...)` with
 * an explicit env record.
 */
export function getEnv(): Env {
  if (!cached) cached = loadEnv();
  return cached;
}

/**
 * Test-only: clear the cached parsed env so subsequent `getEnv()` calls
 * re-validate. Not exported from the package's public `exports` map.
 */
export function __resetEnvCache(): void {
  cached = undefined;
}
