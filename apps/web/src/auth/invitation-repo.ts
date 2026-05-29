// Drizzle-backed Clerk invitation mirror.

import type { InvitationRepo } from "@spyglass/auth";
import { clerkInvitations, organizations, type Db } from "@spyglass/db";
import { eq, sql } from "drizzle-orm";

export function createDrizzleInvitationRepo(db: Db): InvitationRepo {
  return {
    async upsertInvitation(input) {
      const org =
        input.org_clerk_id === null
          ? null
          : ((
              await db
                .select({ org_id: organizations.org_id })
                .from(organizations)
                .where(eq(organizations.clerk_org_id, input.org_clerk_id))
                .limit(1)
            )?.[0] ?? null);

      await db
        .insert(clerkInvitations)
        .values({
          clerk_invitation_id: input.clerk_invitation_id,
          family: input.family,
          status: input.status,
          email_hash: input.email_hash,
          org_clerk_id: input.org_clerk_id,
          org_id: org?.org_id ?? null,
          role: input.role,
          last_event_type: input.last_event_type,
          clerk_created_at: input.clerk_created_at,
          clerk_updated_at: input.clerk_updated_at,
          expires_at: input.expires_at,
        })
        .onConflictDoUpdate({
          target: clerkInvitations.clerk_invitation_id,
          set: {
            family: input.family,
            status: input.status,
            email_hash: input.email_hash,
            org_clerk_id: input.org_clerk_id,
            org_id: org?.org_id ?? null,
            role: input.role,
            last_event_type: input.last_event_type,
            clerk_created_at: input.clerk_created_at,
            clerk_updated_at: input.clerk_updated_at,
            expires_at: input.expires_at,
            updated_at: sql`now()`,
          },
        });
    },
  };
}
