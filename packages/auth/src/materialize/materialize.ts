// F02 T019 — `materializePrincipal` (FR-2, EC-1, EC-2, FR-34).
//
// Idempotent upsert of a `principals` row from a normalized
// `PrincipalSnapshot`. Returns a typed runtime `HumanPrincipal` that
// downstream consumers (`getPrincipal()`, route guards) treat as the
// system-of-record principal for the request. Per Constitution
// §I.5.3, every materialization emits a structured audit event.
//
// Two paths converge here:
//
//   - **eager** — Clerk webhook delivery materializes the principal
//     before any request from that user reaches Spyglass.
//   - **lazy**  — first authenticated request from a user whose
//     webhook is delayed (EC-1) materializes on demand.
//
// Both paths are idempotent on `(external_id, org_id)`; the audit
// event carries the source so anomaly detection can distinguish.

import type { HumanPrincipal, HumanTier } from "../principal.js";
import type {
  AuditEventSink,
  MaterializationSource,
  OrganizationLookup,
  PrincipalRepo,
  PrincipalSnapshot,
} from "./types.js";

export class PrincipalSnapshotInvariantError extends Error {
  constructor(reason: string) {
    super(`PrincipalSnapshot invariant violated: ${reason}`);
    this.name = "PrincipalSnapshotInvariantError";
  }
}

export class PrincipalDisabledError extends Error {
  constructor(externalId: string) {
    super(`Principal for external_id="${externalId}" is disabled.`);
    this.name = "PrincipalDisabledError";
  }
}

interface MaterializeArgs {
  readonly repo: PrincipalRepo;
  readonly sink: AuditEventSink;
  readonly snapshot: PrincipalSnapshot;
  readonly source: MaterializationSource;
  readonly correlation_id: string;
  /** Injectable clock for deterministic tests. Returns unix seconds. */
  readonly now: () => number;
}

/** Validate the snapshot's data-model invariants before any DB work. */
function assertSnapshotInvariants(snap: PrincipalSnapshot): void {
  const tier: HumanTier = snap.tier;

  if (tier === "seeker") {
    if (snap.org_clerk_id !== undefined) {
      throw new PrincipalSnapshotInvariantError(
        "tier='seeker' must not carry an org_clerk_id (single-user account).",
      );
    }
    return;
  }

  // Non-seeker tiers must have an org context.
  if (snap.org_clerk_id === undefined || snap.org_kind === undefined) {
    throw new PrincipalSnapshotInvariantError(`tier='${tier}' requires org_clerk_id and org_kind.`);
  }

  if (tier === "operator" && snap.org_kind !== "operator") {
    throw new PrincipalSnapshotInvariantError("tier='operator' requires org_kind='operator'.");
  }
  if ((tier === "employer_admin" || tier === "employer_member") && snap.org_kind !== "employer") {
    throw new PrincipalSnapshotInvariantError(`tier='${tier}' requires org_kind='employer'.`);
  }
}

async function ensureOrganization(
  repo: PrincipalRepo,
  sink: AuditEventSink,
  snap: PrincipalSnapshot,
  correlation_id: string,
): Promise<OrganizationLookup | null> {
  if (snap.org_clerk_id === undefined || snap.org_kind === undefined) return null;

  const existing = await repo.findOrganizationByClerkId(snap.org_clerk_id);
  if (existing) return existing;

  const created = await repo.upsertOrganization({
    clerk_org_id: snap.org_clerk_id,
    kind: snap.org_kind,
    display_name: snap.org_display_name ?? snap.org_clerk_id,
  });
  await sink.emit({
    name: "organization.materialized",
    correlation_id,
    payload: {
      org_id: created.org_id,
      clerk_org_id: created.clerk_org_id,
      kind: created.kind,
    },
  });
  return created;
}

export async function materializePrincipal(args: MaterializeArgs): Promise<HumanPrincipal> {
  const { repo, sink, snapshot, source, correlation_id, now } = args;
  assertSnapshotInvariants(snapshot);

  const org = await ensureOrganization(repo, sink, snapshot, correlation_id);
  const orgId = org?.org_id ?? null;

  // Idempotent: find first; only upsert on miss. Already-existing
  // rows still emit an audit event so anomaly detection can see the
  // request shape (e.g., a sudden spike of "lazy" emissions from a
  // user previously eagerly materialized = webhook drift).
  const existing = await repo.findHumanPrincipal({
    external_id: snapshot.external_id,
    org_id: orgId,
  });

  if (existing?.disabled_at !== null && existing?.disabled_at !== undefined) {
    throw new PrincipalDisabledError(snapshot.external_id);
  }

  const row =
    existing ??
    (await repo.upsertHumanPrincipal({
      external_id: snapshot.external_id,
      tier: snapshot.tier,
      org_id: orgId,
      display_name: snapshot.display_name ?? null,
    }));

  await sink.emit({
    name: "principal.materialized",
    principal_id: row.principal_id,
    correlation_id,
    payload: {
      materialization: source,
      tier: row.tier,
      external_id: snapshot.external_id,
      org_id: orgId,
      first_seen: existing === null,
    },
  });

  // Construct the typed runtime Principal. The `org_id` field is
  // omitted (not set to undefined) when null so it matches the
  // `exactOptionalPropertyTypes` strictness in tsconfig.base.
  const principal: HumanPrincipal = {
    principal_id: row.principal_id,
    issued_at: now(),
    correlation_id,
    kind: "human",
    tier: row.tier,
    external_idp: "clerk",
    external_id: row.external_id,
    ...(orgId !== null ? { org_id: orgId } : {}),
  };
  return principal;
}
