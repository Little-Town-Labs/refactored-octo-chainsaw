// F02 contributes the `principals` and `organizations` tables to the
// `@spyglass/db` schema; F03 will own the broader umbrella. Drizzle
// Kit reads this file via `schema: "./src/schema.ts"` (see
// `drizzle.config.ts`); the re-export below keeps `./src/schema.ts`
// minimal while the per-table modules stay focused.

export { organizations, type NewOrganization, type Organization } from "./organizations.js";
export { principals, type NewPrincipal, type Principal } from "./principals.js";
