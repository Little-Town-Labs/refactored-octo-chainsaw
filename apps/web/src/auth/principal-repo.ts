// F02 B2 — Drizzle-backed PrincipalRepo adapter.
//
// Production wiring of the materializer's repository surface
// (`@spyglass/auth#PrincipalRepo`). Tests use in-memory fakes; the
// app uses this against the real Neon Postgres instance.
//
// All operations are idempotent on the natural keys:
//   - organizations: clerk_org_id (unique)
//   - principals (human): (external_idp, external_id) (unique)
//
// The DB schema enforces the same invariants via CHECK constraints
// (see `packages/db/src/schema/principals.ts`); this layer is thin.

import type { OrganizationLookup, PrincipalLookup, PrincipalRepo } from "@spyglass/auth";
import type { HumanTier } from "@spyglass/auth";
import { type Db, organizations, principals } from "@spyglass/db";
import { and, eq, isNull, sql } from "drizzle-orm";

export function createDrizzlePrincipalRepo(db: Db): PrincipalRepo {
  return {
    async findOrganizationByClerkId(clerkOrgId) {
      const rows = await db
        .select({
          org_id: organizations.org_id,
          clerk_org_id: organizations.clerk_org_id,
          kind: organizations.kind,
        })
        .from(organizations)
        .where(eq(organizations.clerk_org_id, clerkOrgId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        org_id: row.org_id,
        clerk_org_id: row.clerk_org_id,
        kind: row.kind as OrganizationLookup["kind"],
      };
    },

    async upsertOrganization(input) {
      const rows = await db
        .insert(organizations)
        .values({
          clerk_org_id: input.clerk_org_id,
          kind: input.kind,
          display_name: input.display_name,
        })
        .onConflictDoUpdate({
          target: organizations.clerk_org_id,
          set: { display_name: input.display_name },
        })
        .returning({
          org_id: organizations.org_id,
          clerk_org_id: organizations.clerk_org_id,
          kind: organizations.kind,
        });
      const row = rows[0];
      if (!row) {
        throw new Error("organizations upsert returned no rows");
      }
      return {
        org_id: row.org_id,
        clerk_org_id: row.clerk_org_id,
        kind: row.kind as OrganizationLookup["kind"],
      };
    },

    async findHumanPrincipal(input) {
      const orgPredicate =
        input.org_id === null ? isNull(principals.org_id) : eq(principals.org_id, input.org_id);
      const rows = await db
        .select({
          principal_id: principals.principal_id,
          external_id: principals.external_id,
          tier: principals.tier,
          org_id: principals.org_id,
          disabled_at: principals.disabled_at,
        })
        .from(principals)
        .where(
          and(
            eq(principals.kind, "human"),
            eq(principals.external_idp, "clerk"),
            eq(principals.external_id, input.external_id),
            orgPredicate,
          ),
        )
        .limit(1);
      const row = rows[0];
      if (!row || row.external_id === null || row.tier === null) return null;
      return {
        principal_id: row.principal_id,
        external_id: row.external_id,
        tier: row.tier as HumanTier,
        org_id: row.org_id,
        disabled_at: row.disabled_at,
      };
    },

    async upsertHumanPrincipal(input) {
      const rows = await db
        .insert(principals)
        .values({
          kind: "human",
          external_idp: "clerk",
          external_id: input.external_id,
          tier: input.tier,
          org_id: input.org_id,
          display_name: input.display_name,
        })
        .onConflictDoUpdate({
          target: [principals.external_idp, principals.external_id],
          set: {
            tier: input.tier,
            org_id: input.org_id,
            display_name: input.display_name,
            updated_at: sql`now()`,
          },
        })
        .returning({
          principal_id: principals.principal_id,
          external_id: principals.external_id,
          tier: principals.tier,
          org_id: principals.org_id,
          disabled_at: principals.disabled_at,
        });
      const row = rows[0];
      if (!row || row.external_id === null || row.tier === null) {
        throw new Error("principals upsert returned no rows");
      }
      return {
        principal_id: row.principal_id,
        external_id: row.external_id,
        tier: row.tier as HumanTier,
        org_id: row.org_id,
        disabled_at: row.disabled_at,
      } satisfies PrincipalLookup;
    },

    async disablePrincipal(input) {
      const orgPredicate =
        input.org_id === null ? isNull(principals.org_id) : eq(principals.org_id, input.org_id);
      const rows = await db
        .update(principals)
        .set({
          disabled_at: sql`now()`,
          disabled_reason: input.reason,
        })
        .where(
          and(
            eq(principals.kind, "human"),
            eq(principals.external_idp, "clerk"),
            eq(principals.external_id, input.external_id),
            orgPredicate,
            isNull(principals.disabled_at),
          ),
        )
        .returning({ principal_id: principals.principal_id });
      if (rows.length === 0) {
        // Already disabled or never materialized. The session
        // revocation upstream already succeeded, so this is not a
        // security concern, but the reconciliation job (T024)
        // should investigate sustained drift.
        console.warn(
          JSON.stringify({
            kind: "audit_warn",
            name: "principal.disable_noop",
            external_id_hint: input.external_id.slice(0, 6),
            org_id: input.org_id,
          }),
        );
      }
    },
  };
}
