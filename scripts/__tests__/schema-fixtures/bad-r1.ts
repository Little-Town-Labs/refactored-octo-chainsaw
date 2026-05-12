// Fixture: R1 fail — PK is serial integer, not uuidv7().
import { sql } from "drizzle-orm";
import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const bad_r1 = pgTable("bad_r1", {
  bad_r1_id: serial("bad_r1_id").primaryKey(),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
