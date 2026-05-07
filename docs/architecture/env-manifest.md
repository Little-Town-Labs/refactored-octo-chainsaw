# Environment Manifest

**Source of truth:** `packages/shared/src/env.ts`
**Generated artifact:** `.env.example`
**Drift gate:** `pnpm gen:env-example && git diff --exit-code .env.example` (CI)
**Constitution:** v2.0.0 §I.6 (Secure-by-Default), §III.2 (typed semantics), §I.4.1 (no PII surfaces)

## Why a typed schema

A plain `.env.example` file is documentation; nothing fails when it
drifts from what the code actually reads. Spyglass uses a typed Zod
schema as the *primary* artifact — `.env.example` is generated from
it. Three guarantees follow:

1. **Boot-time validation.** First call to `getEnv()` parses
   `process.env` against the schema and throws on missing or invalid
   required values. No silent fallback to `undefined`. (Constitution
   §I.6 fail-safe defaults.)
2. **Single declaration site.** Adding a new env var means editing
   one file (`packages/shared/src/env.ts`). The example file
   regenerates; the type is inferred; consumers get autocomplete.
3. **Drift detection.** CI regenerates `.env.example` and fails the
   build on diff. A var added to the schema without regenerating —
   or vice versa — never reaches `main`.

## Lifecycle: optional → required

Many vars start as `.optional()` in F01 because their consuming
feature hasn't shipped yet. The lifecycle is:

| Phase | Schema declaration | Behavior |
|---|---|---|
| Variable doesn't exist yet | (no field) | nothing reads it |
| Consumer feature is being scoped | `.optional()` | `getEnv().X` is `string \| undefined` |
| Consumer feature lands | required (no `.optional()`) | `getEnv()` throws if missing |

Each optional field carries a comment naming the feature ID that
will promote it to required (e.g., `// F03 (db schema)`).
Promotion-to-required is part of the consuming feature's
implementation, not a separate task.

## Adding a variable

1. Open `packages/shared/src/env.ts`.
2. Add the field to `envSchema` with appropriate validators
   (`.url()`, `.email()`, `.min(N)`, etc.).
3. Add a one-line description to `envDescriptions`.
4. Run `pnpm gen:env-example` from the repo root.
5. Add the value to Vercel: `vercel env add <NAME>` (asks for value
   per environment scope: development, preview, production).
6. Commit the schema change AND the regenerated `.env.example` in
   the same commit. CI will fail on drift.

## Reading a variable

```ts
import { getEnv } from "@spyglass/shared/env";

const env = getEnv();
// env.NODE_ENV is typed
// env.DATABASE_URL is `string | undefined` until F03 promotes it
```

In tests, use `loadEnv()` with an explicit env record to avoid
coupling to the test runner's env state:

```ts
import { loadEnv } from "@spyglass/shared/env";

it("does the thing", () => {
  const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: "..." });
  // ...
});
```

## What the schema does NOT validate

- **Cross-field consistency.** If `CLERK_SECRET_KEY` is set,
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` should also be set, but the
  schema doesn't enforce that today. Add a `.refine()` if/when this
  becomes a real bug source.
- **Secret strength.** The schema validates *shape*, not *strength*
  — a 1-character `CLERK_SECRET_KEY` passes the `.min(1)` check.
  Trust the upstream service to issue correctly-sized credentials.
- **Connectivity.** A valid `DATABASE_URL` does not mean the
  database is reachable. Connectivity probes belong in F24
  (incident response / monitoring).

## CI drift gate

The intended CI step (lands in T030 / Phase A6):

```yaml
- name: env-manifest drift
  run: |
    pnpm gen:env-example
    git diff --exit-code .env.example \
      || (echo "::error::env-example out of sync with packages/shared/src/env.ts. Run pnpm gen:env-example."; exit 1)
```

Locally, run `pnpm gen:env-example` after editing the schema; if
git status shows a change, commit both files.

## Related

- Constitution v2.0.0 §I.4 (Privacy / data minimization) — env var
  values are sensitive; never log them, never expose them via the
  API surface.
- Constitution v2.0.0 §I.5 (AAA / scoped credentials) — service
  credentials referenced here (Clerk, Inngest, AI Gateway) should
  be scoped per Vercel environment (production / preview /
  development), not shared.
