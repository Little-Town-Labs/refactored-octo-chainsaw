// Clerk invitation mirror state.
//
// Stores invitation lifecycle state from Clerk webhooks without
// storing invitee email addresses directly. Email addresses are
// normalized and hashed by the webhook processor before insertion.

import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { organizations } from "./organizations.js";

export const CLERK_INVITATION_FAMILIES = ["application", "organization"] as const;
export type ClerkInvitationFamily = (typeof CLERK_INVITATION_FAMILIES)[number];

export const CLERK_INVITATION_STATUSES = ["pending", "accepted", "revoked", "expired"] as const;
export type ClerkInvitationStatus = (typeof CLERK_INVITATION_STATUSES)[number];

export const clerkInvitations = pgTable(
  "clerk_invitations",
  {
    invitation_id: uuid("invitation_id")
      .primaryKey()
      .default(sql`uuidv7()`),
    clerk_invitation_id: text("clerk_invitation_id").notNull(),
    family: text("family").notNull(),
    status: text("status").notNull(),
    email_hash: text("email_hash"),
    org_clerk_id: text("org_clerk_id"),
    org_id: uuid("org_id").references(() => organizations.org_id, {
      onDelete: "no action",
      onUpdate: "no action",
    }),
    role: text("role"),
    last_event_type: text("last_event_type").notNull(),
    clerk_created_at: timestamp("clerk_created_at", { withTimezone: true }),
    clerk_updated_at: timestamp("clerk_updated_at", { withTimezone: true }),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    check("clerk_invitations_family_check", sql`${t.family} IN ('application','organization')`),
    check(
      "clerk_invitations_status_check",
      sql`${t.status} IN ('pending','accepted','revoked','expired')`,
    ),
    check("clerk_invitations_clerk_id_check", sql`${t.clerk_invitation_id} <> ''`),
    check("clerk_invitations_event_type_check", sql`${t.last_event_type} <> ''`),
    uniqueIndex("clerk_invitations_clerk_id_idx").on(t.clerk_invitation_id),
    index("clerk_invitations_family_status_idx").on(t.family, t.status, t.updated_at.desc()),
    index("clerk_invitations_org_idx")
      .on(t.org_id, t.updated_at.desc())
      .where(sql`${t.org_id} IS NOT NULL`),
    index("clerk_invitations_org_clerk_idx")
      .on(t.org_clerk_id, t.updated_at.desc())
      .where(sql`${t.org_clerk_id} IS NOT NULL`),
  ],
);

export type ClerkInvitationRow = typeof clerkInvitations.$inferSelect;
export type NewClerkInvitationRow = typeof clerkInvitations.$inferInsert;
