// Fixture: R2 fail — missing created_at + updated_at timestamps.
import { sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";

export const bad_r2 = pgTable("bad_r2", {
  bad_r2_id: uuid("bad_r2_id")
    .primaryKey()
    .default(sql`uuidv7()`),
});
