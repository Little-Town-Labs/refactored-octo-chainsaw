// F02 T009/T010 — `organizations` table (data-model §organizations).
//
// Mirror of Clerk Organizations for the employer side and the
// restricted operator Org. The `kind` discriminator distinguishes
// the two so policy gates and route guards can branch on it without
// re-querying Clerk.
//
// Constitutional refs: §I.5.2 (least privilege; separate trust
// boundary for operators).

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const organizations = pgTable(
  "organizations",
  {
    org_id: uuid("org_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    clerk_org_id: text("clerk_org_id").notNull(),
    kind: text("kind").notNull(),
    display_name: text("display_name").notNull(),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    disabled_at: timestamp("disabled_at", { withTimezone: true }),
  },
  (t) => [
    check("organizations_kind_check", sql`${t.kind} IN ('employer', 'operator')`),
    uniqueIndex("organizations_clerk_org_idx").on(t.clerk_org_id),
    index("organizations_kind_idx").on(t.kind),
  ],
);

export type OrganizationRow = typeof organizations.$inferSelect;
export type NewOrganizationRow = typeof organizations.$inferInsert;
