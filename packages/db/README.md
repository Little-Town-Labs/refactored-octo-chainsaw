# @spyglass/db

**Status:** alpha — F01 placeholder; Drizzle config in F01 (T029);
schema + migrations in F03.

Drizzle ORM configuration, schema, and migrations against Neon
Postgres. F01 ships configuration only — schema definitions are F03's
deliverable.

## Public API

- `migrations/` — Drizzle migrations directory (empty in F01).
- Schema exports added in F03.

## Dependencies

`drizzle-orm`, `drizzle-kit`, `pg`. Will depend on `@spyglass/shared`
for env access.

## Stability tier

Alpha; schema migrations are append-only after Phase 0 launch
(Constitution §I.2 integrity).
