// F02 T026 — Webhook directive processor (FR-2, FR-34, EC-2).
//
// Pure orchestration that turns a `SnapshotResult` (the typed output
// of `eventToSnapshot`) into the side effects that satisfy each
// directive:
//
//   - "materialize" → call `materializePrincipal` (eager path, FR-2).
//   - "mirror_invitation" → store redacted invitation lifecycle state.
//   - "disable"     → revoke Clerk sessions + `disablePrincipal`
//                     within the FR-34 ≤60s SLA.
//   - "ignore"      → no-op (e.g., session.removed events).
//
// Production wiring injects a Drizzle-backed `PrincipalRepo`, a
// Clerk-backed `ClerkSessionRevoker`, and the audit sink. Tests
// inject in-memory fakes so the orchestration is verified without
// touching Clerk or Postgres.

import { materializePrincipal } from "../materialize/materialize.js";
import type { AuditEventSink, InvitationRepo, PrincipalRepo } from "../materialize/types.js";
import type { SnapshotResult } from "./snapshot.js";

/**
 * Revokes every active Clerk session for a user. Production
 * implementation calls `clerkClient.users.getUser` then
 * `clerkClient.sessions.revokeSession` for each active session.
 * Tests use in-memory fakes that record the revocation calls.
 */
export interface ClerkSessionRevoker {
  revokeAllSessionsForUser(input: { external_id: string; reason: string }): Promise<void>;
}

export interface ProcessDirectiveDeps {
  readonly repo: PrincipalRepo;
  readonly invitationRepo: InvitationRepo;
  readonly sink: AuditEventSink;
  readonly sessionRevoker: ClerkSessionRevoker;
  readonly now: () => number;
  readonly correlationId: () => string;
}

export async function processClerkDirective(
  directive: SnapshotResult,
  deps: ProcessDirectiveDeps,
): Promise<void> {
  if (directive.kind === "ignore") return;

  if (directive.kind === "materialize") {
    await materializePrincipal({
      repo: deps.repo,
      sink: deps.sink,
      snapshot: directive.snapshot,
      source: "eager",
      correlation_id: deps.correlationId(),
      now: deps.now,
    });
    return;
  }

  if (directive.kind === "mirror_invitation") {
    const correlation_id = deps.correlationId();
    await deps.invitationRepo.upsertInvitation(directive.invitation);
    await deps.sink.emit({
      name: "clerk_invitation.mirrored",
      correlation_id,
      payload: {
        clerk_invitation_id: directive.invitation.clerk_invitation_id,
        family: directive.invitation.family,
        status: directive.invitation.status,
        org_clerk_id: directive.invitation.org_clerk_id,
        role: directive.invitation.role,
        last_event_type: directive.invitation.last_event_type,
        email_hash: directive.invitation.email_hash,
      },
    });
    return;
  }

  // directive.kind === "disable" (TerminationDirective)
  // Revoke sessions FIRST so an in-flight request can't outlive the
  // disable — fail-safe deny per Constitution §I.6.
  await deps.sessionRevoker.revokeAllSessionsForUser({
    external_id: directive.external_id,
    reason: directive.reason,
  });

  const org =
    directive.org_clerk_id !== null
      ? await deps.repo.findOrganizationByClerkId(directive.org_clerk_id)
      : null;

  await deps.repo.disablePrincipal({
    external_id: directive.external_id,
    org_id: org?.org_id ?? null,
    reason: directive.reason,
  });

  await deps.sink.emit({
    name: "principal.disabled",
    correlation_id: deps.correlationId(),
    payload: {
      external_id: directive.external_id,
      org_clerk_id: directive.org_clerk_id,
      reason: directive.reason,
    },
  });
}
