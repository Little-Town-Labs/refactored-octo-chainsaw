// Drizzle-Kit entry point — re-exports the modular schema files
// under `src/schema/`. Adding a new table means creating a module
// under `src/schema/` and re-exporting it from `src/schema/index.ts`;
// no changes are needed here.

export * from "./schema/index.js";
