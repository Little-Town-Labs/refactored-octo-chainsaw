// Fixture: R1 pass — UUIDv7 PK present.
import { sql } from "drizzle-orm";
import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";

export const good_r1 = pgTable("good_r1", {
  good_r1_id: uuid("good_r1_id")
    .primaryKey()
    .default(sql`uuidv7()`),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
