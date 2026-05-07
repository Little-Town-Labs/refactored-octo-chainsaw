// `@spyglass/db` — schema, migrations, and connection helpers for
// Spyglass's Neon Postgres instance. F01 ships the configuration
// substrate; F02 contributes the first auth tables; F03 owns the
// broader schema umbrella.

export const __pkg = "@spyglass/db" as const;

export * from "./schema/index.js";
