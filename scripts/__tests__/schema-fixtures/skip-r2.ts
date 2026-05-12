// Fixture: skip-r2 — lookup table opts out of the timestamp triple.
// schema-lint: skip-r2-timestamps
import { sql } from "drizzle-orm";
import { pgTable, uuid } from "drizzle-orm/pg-core";

export const skip_r2 = pgTable("skip_r2", {
  skip_r2_id: uuid("skip_r2_id")
    .primaryKey()
    .default(sql`uuidv7()`),
});
