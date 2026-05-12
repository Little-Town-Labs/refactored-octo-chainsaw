// F02 T024 — Reconciliation job (pure logic) (EC-2, plan §12 Q1).
//
// Periodically compares the Clerk-side roster to the Spyglass-side
// `principals` table to detect drift caused by missed webhooks.
// EC-2 contract: alert if `drift > 0` is sustained for > 15 min.
//
// The Inngest wiring (5-min cron, alerting hook) lands when F08
// brings in the Inngest runtime; F02 ships the pure diff function
// and the typed report so the schedule wrapper is mechanical.

export interface ClerkRosterEntry {
  /** Clerk user ID (`user_xxx`). */
  readonly userId: string;
  /** Active Clerk org IDs the user belongs to (empty for seekers). */
  readonly orgIds: ReadonlyArray<string>;
}

export interface DbPrincipalEntry {
  /** Clerk user ID stored in `principals.external_id`. */
  readonly external_id: string;
  /** `principals.org_id` (internal UUID) if the row is org-scoped. */
  readonly org_id: string | null;
  readonly disabled_at: Date | null;
}

/**
 * Maps Clerk org IDs (`org_xxx`) to internal Spyglass org IDs (UUID).
 * Built from `organizations.clerk_org_id` lookups.
 */
export type ClerkOrgIndex = ReadonlyMap<string, string>;

export interface ReconciliationReport {
  /** Active in Clerk but not in `principals` (or disabled there). */
  readonly missingInDb: ReadonlyArray<{ userId: string; orgClerkId: string | null }>;
  /** Active in `principals` but not in Clerk's roster. */
  readonly missingInClerk: ReadonlyArray<{ external_id: string; org_id: string | null }>;
  /** Total drift count — the EC-2 alert metric. */
  readonly drift: number;
}

/**
 * Diff the Clerk roster against the Spyglass DB. Pure function:
 * production wiring fetches both sides, calls this, and forwards
 * `drift` to the alerting pipeline.
 */
export function reconcilePrincipals(args: {
  clerkRoster: ReadonlyArray<ClerkRosterEntry>;
  dbPrincipals: ReadonlyArray<DbPrincipalEntry>;
  clerkOrgIndex: ClerkOrgIndex;
}): ReconciliationReport {
  const { clerkRoster, dbPrincipals, clerkOrgIndex } = args;

  // Build the set of (external_id, internal_org_id|null) pairs that
  // SHOULD exist according to Clerk.
  const expected = new Set<string>();
  const expectedDescriptors: Array<{ userId: string; orgClerkId: string | null }> = [];
  for (const entry of clerkRoster) {
    if (entry.orgIds.length === 0) {
      expected.add(`${entry.userId}|`);
      expectedDescriptors.push({ userId: entry.userId, orgClerkId: null });
      continue;
    }
    for (const clerkOrgId of entry.orgIds) {
      const orgId = clerkOrgIndex.get(clerkOrgId);
      // Org not yet materialized — counts as drift on the DB side.
      const key = `${entry.userId}|${orgId ?? `?${clerkOrgId}`}`;
      expected.add(key);
      expectedDescriptors.push({ userId: entry.userId, orgClerkId: clerkOrgId });
    }
  }

  // Set of (external_id, org_id|null) pairs ACTUALLY active in DB.
  const actual = new Set<string>();
  for (const row of dbPrincipals) {
    if (row.disabled_at !== null) continue;
    actual.add(`${row.external_id}|${row.org_id ?? ""}`);
  }

  const missingInDb = expectedDescriptors.filter((d) => {
    const orgKey =
      d.orgClerkId === null ? "" : (clerkOrgIndex.get(d.orgClerkId) ?? `?${d.orgClerkId}`);
    return !actual.has(`${d.userId}|${orgKey}`);
  });

  const missingInClerk = dbPrincipals
    .filter((row) => row.disabled_at === null)
    .filter((row) => !expected.has(`${row.external_id}|${row.org_id ?? ""}`))
    .map((row) => ({ external_id: row.external_id, org_id: row.org_id }));

  return {
    missingInDb,
    missingInClerk,
    drift: missingInDb.length + missingInClerk.length,
  };
}
