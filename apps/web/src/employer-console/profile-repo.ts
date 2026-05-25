import type { HumanPrincipal } from "@spyglass/auth";
import { auditEventsBuffer, employerOrganizationProfiles, type Db } from "@spyglass/db";
import { eq } from "drizzle-orm";

import type { EmployerProfileInput } from "./types";

export interface EmployerProfileRepo {
  getByOrg(orgId: string): Promise<typeof employerOrganizationProfiles.$inferSelect | null>;
  upsert(
    orgId: string,
    principal: HumanPrincipal,
    input: EmployerProfileInput,
  ): Promise<typeof employerOrganizationProfiles.$inferSelect>;
}

export function createDrizzleEmployerProfileRepo(db: Db): EmployerProfileRepo {
  return {
    async getByOrg(orgId) {
      const rows = await db
        .select()
        .from(employerOrganizationProfiles)
        .where(eq(employerOrganizationProfiles.org_id, orgId))
        .limit(1);
      return rows[0] ?? null;
    },
    async upsert(orgId, principal, input) {
      const now = new Date();
      return db.transaction(async (tx) => {
        const [row] = await tx
          .insert(employerOrganizationProfiles)
          .values({
            org_id: orgId,
            updated_by: principal.principal_id,
            ...input,
            updated_at: now,
          })
          .onConflictDoUpdate({
            target: employerOrganizationProfiles.org_id,
            set: {
              ...input,
              updated_by: principal.principal_id,
              updated_at: now,
            },
          })
          .returning();
        if (!row) throw new Error("failed to save employer profile");
        await tx.insert(auditEventsBuffer).values({
          event_name: "employer_organization_profile.saved",
          principal_id: principal.principal_id,
          principal_kind: principal.kind,
          role_or_scope: principal.tier,
          correlation_id: principal.correlation_id,
          payload: {
            org_id: orgId,
            profile_id: row.profile_id,
            changed_fields: Object.keys(input).sort(),
          },
        });
        return row;
      });
    },
  };
}
