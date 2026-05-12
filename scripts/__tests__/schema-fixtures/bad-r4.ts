// Fixture: R4 fail — text column named "kind" without a CHECK constraint.
import { sql } from "drizzle-orm";
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const bad_r4 = pgTable("bad_r4", {
  bad_r4_id: uuid("bad_r4_id")
    .primaryKey()
    .default(sql`uuidv7()`),
  kind: text("kind").notNull(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
