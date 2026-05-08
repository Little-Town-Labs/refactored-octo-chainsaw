// F02 T020 — Pure session→principal resolver.
//
// Extracted from `get-principal.ts` so it can be unit-tested without
// the `server-only` / `next/server` import chain pulling in the
// Next.js runtime. The production accessor wires Clerk + DB + audit
// here; tests inject in-memory fakes via `ResolveDeps`.

import {
  clerkSessionToTier,
  materializePrincipal,
  PrincipalSnapshotInvariantError,
  type AuditEventSink,
  type HumanPrincipal,
  type HumanTier,
  type PrincipalRepo,
  type PrincipalSnapshot,
} from "@spyglass/auth";

export interface ResolveDeps {
  readonly repo: PrincipalRepo;
  readonly sink: AuditEventSink;
  readonly operatorClerkOrgIds: ReadonlySet<string>;
  readonly now: () => number;
  readonly correlationId: () => string;
}

export interface ClerkSessionLike {
  readonly userId: string | null;
  readonly orgId: string | null | undefined;
  readonly orgRole: string | null | undefined;
}

export async function resolvePrincipalFromSession(
  session: ClerkSessionLike,
  deps: ResolveDeps,
): Promise<HumanPrincipal | null> {
  const tier = clerkSessionToTier({
    userId: session.userId,
    orgId: session.orgId ?? null,
    orgRole: session.orgRole ?? null,
    operatorClerkOrgIds: deps.operatorClerkOrgIds,
  });
  if (tier === null || session.userId === null) return null;

  const snapshot = buildSnapshot(tier, session.userId, session.orgId ?? null);
  return materializePrincipal({
    repo: deps.repo,
    sink: deps.sink,
    snapshot,
    source: "lazy",
    correlation_id: deps.correlationId(),
    now: deps.now,
  });
}

function buildSnapshot(tier: HumanTier, userId: string, orgId: string | null): PrincipalSnapshot {
  if (tier === "seeker") return { external_id: userId, tier };
  if (orgId === null) {
    throw new PrincipalSnapshotInvariantError(`tier='${tier}' requires orgId from Clerk session.`);
  }
  return {
    external_id: userId,
    tier,
    org_clerk_id: orgId,
    org_kind: tier === "operator" ? "operator" : "employer",
  };
}
