// Fixture: R4 pass — enum-shaped text column "kind" with CHECK.
import { sql } from "drizzle-orm";
import { check, pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const good_r4 = pgTable(
  "good_r4",
  {
    good_r4_id: uuid("good_r4_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    kind: text("kind").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [check("good_r4_kind_check", sql`${t.kind} IN ('alpha', 'beta')`)],
);
