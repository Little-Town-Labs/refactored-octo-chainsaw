// F02 T059b — Two-operator-gated revoke-all-sessions orchestrator
// (FR-35, EC-3, plan §12 Q2).
//
// Pure state machine over four injected dependencies:
//   - approvalRepo:   persists "first operator initiated" state
//   - principalLookup: resolves target kind/tier and external_id
//   - sessionRevoker: actually invokes the IdP (Clerk) revoke
//   - sink:           NFR-10 audit emit
//
// State machine:
//   1. Authorize the caller — must be human/operator. Other kinds /
//      tiers throw `RoleRequiredError` AND emit
//      `human_sessions.revoke_all_denied{reason: "caller_not_operator"}`
//      so privilege-escalation probes leave a forensic trail (NFR-10).
//   2. Resolve the target via `principalLookup`. Unknown target →
//      `TargetNotFoundError` (no audit). The orchestrator only
//      addresses human targets; agents/services have their own
//      revocation paths (see `revokeAgentCredential`).
//   3. Branch on target.tier:
//      - non-operator: execute immediately, audit `revoked_all`.
//      - operator + no `approval_id`: open a pending approval row
//        with a 15-minute TTL, audit `revoke_all_initiated`, return
//        `pending_approval` to the caller. The second operator
//        re-enters this orchestrator with the returned `approval_id`.
//      - operator + `approval_id`: validate (exists, not expired,
//        target matches, initiator distinct from caller, not yet
//        executed). On success mark approved+executed in the same
//        write and run the revoke. On failure throw a typed error
//        AND emit `revoke_all_denied` with a structured `reason` so
//        audit consumers can distinguish self-approval, expiry,
//        unknown id, and replay.
//
// The orchestrator never touches persistence or Clerk directly —
// those concerns live in apps/web Drizzle adapters (T060). This
// file is intentionally framework-free for unit testing.

import { isHumanPrincipal, type HumanPrincipal, type Principal } from "../principal.js";
import { RoleRequiredError } from "../authorize.js";
import type { AuditEventSink } from "../materialize/types.js";

const NOTES_MAX_LENGTH = 500;
const DEFAULT_APPROVAL_TTL_SECONDS = 15 * 60;
const DEFAULT_EFFECTIVE_WITHIN_SECONDS = 60; // FR-21 / M-5

export type RevokeAllReasonCode =
  | "session_compromise"
  | "operator_emergency"
  | "credential_rotation"
  | "compliance_action";

export interface RevokeAllInput {
  readonly target_principal_id: string;
  readonly reason_code: RevokeAllReasonCode;
  readonly notes?: string;
  /**
   * Present on the second-operator approval call. Absent on the
   * first call when the target is an operator (the orchestrator
   * opens a pending approval and returns the id).
   */
  readonly approval_id?: string;
}

export type RevokeAllResult =
  | {
      readonly status: "executed";
      /** Unix seconds. */
      readonly executed_at: number;
      /** Non-null when the two-operator gate fired. */
      readonly approval_id: string | null;
      /** FR-21 / M-5 target — defaults to 60. */
      readonly effective_within_seconds: number;
    }
  | {
      readonly status: "pending_approval";
      readonly approval_id: string;
      /** Unix seconds — when the approval expires if no second operator approves. */
      readonly expires_at: number;
    };

export interface ApprovalRecord {
  readonly approval_id: string;
  readonly target_principal_id: string;
  readonly initiated_by: string;
  readonly initiated_at: Date;
  readonly expires_at: Date;
  readonly executed_at: Date | null;
}

export interface RevokeAllApprovalRepo {
  insertApproval(input: {
    target_principal_id: string;
    initiated_by: string;
    reason_code: string;
    notes: string | null;
    initiated_at: Date;
    expires_at: Date;
  }): Promise<{ approval_id: string }>;

  /** Find by id; returns null when no row exists. */
  findApproval(approval_id: string): Promise<ApprovalRecord | null>;

  /**
   * Atomically transition a pending approval to executed. The
   * adapter MUST guard with `executed_at IS NULL` so a concurrent
   * approver loses the race deterministically. Returns true when
   * this caller wrote the row, false when the row was already
   * executed (or has since vanished).
   */
  markApproved(input: {
    approval_id: string;
    approved_by: string;
    approved_at: Date;
    executed_at: Date;
  }): Promise<boolean>;
}

export type PrincipalLookupResult =
  | { readonly kind: "human"; readonly tier: string; readonly external_id: string }
  | { readonly kind: "agent" | "service" };

export interface PrincipalKindLookup {
  /**
   * Resolve `principal_id` to its kind and (for humans) tier +
   * external IdP id. Returns null when the principal is unknown —
   * the orchestrator surfaces this as `TargetNotFoundError`. The
   * adapter is responsible for refusing to return a human row with
   * a missing external_id (which would silently bypass the IdP
   * revocation); the typed return below makes that boundary
   * explicit at the orchestrator side.
   */
  lookupTarget(principal_id: string): Promise<PrincipalLookupResult | null>;
}

export interface SessionRevoker {
  revokeAllSessionsForExternalId(input: { external_id: string; reason: string }): Promise<void>;
}

// --- Errors ---------------------------------------------------------

export class TargetNotFoundError extends Error {
  constructor(public readonly target_principal_id: string) {
    super(`Target principal not found: ${target_principal_id}`);
    this.name = "TargetNotFoundError";
  }
}

export class TargetNotHumanError extends Error {
  constructor(
    public readonly target_principal_id: string,
    public readonly kind: "agent" | "service",
  ) {
    super(`Cannot revoke sessions for non-human principal (kind=${kind}).`);
    this.name = "TargetNotHumanError";
  }
}

export class ApprovalNotFoundError extends Error {
  constructor(
    public readonly approval_id: string,
    public readonly reason: "approval_not_found" | "approval_expired" | "approval_target_mismatch",
  ) {
    super(`Approval ${approval_id} cannot be used: ${reason}.`);
    this.name = "ApprovalNotFoundError";
  }
}

export class SelfApprovalError extends Error {
  constructor(public readonly approval_id: string) {
    super(`Approval ${approval_id} cannot be approved by the initiating operator.`);
    this.name = "SelfApprovalError";
  }
}

export class ApprovalAlreadyExecutedError extends Error {
  constructor(public readonly approval_id: string) {
    super(`Approval ${approval_id} has already been executed.`);
    this.name = "ApprovalAlreadyExecutedError";
  }
}

// --- Deps -----------------------------------------------------------

export interface RevokeAllSessionsDeps {
  readonly approvalRepo: RevokeAllApprovalRepo;
  readonly principalLookup: PrincipalKindLookup;
  readonly sessionRevoker: SessionRevoker;
  readonly sink: AuditEventSink;
  readonly now: () => number;
  readonly correlationId: () => string;
  /** Defaults to 900 (15 minutes). */
  readonly approvalTtlSeconds?: number;
  /** Defaults to 60 (FR-21). */
  readonly effectiveWithinSeconds?: number;
}

// --- Helpers --------------------------------------------------------

function sanitizeNotes(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  // Strip control chars + trim. Mirrors `sanitizeNotes` in revocation.ts.
  // eslint-disable-next-line no-control-regex
  const stripped = raw.replace(/[\x00-\x1f\x7f]/g, " ").trim();
  if (stripped.length === 0) return null;
  return stripped.slice(0, NOTES_MAX_LENGTH);
}

function authorizeOperator(caller: Principal): HumanPrincipal {
  if (!isHumanPrincipal(caller) || caller.tier !== "operator") {
    throw new RoleRequiredError(
      ["operator"],
      caller.kind,
      isHumanPrincipal(caller) ? caller.tier : undefined,
    );
  }
  return caller;
}

async function safeDenyAudit(
  sink: AuditEventSink,
  principal_id: string | undefined,
  input: RevokeAllInput,
  reason: string,
  correlation_id: string,
): Promise<void> {
  try {
    await sink.emit({
      name: "human_sessions.revoke_all_denied",
      ...(principal_id !== undefined ? { principal_id } : {}),
      correlation_id,
      payload: {
        target_principal_id: input.target_principal_id,
        reason_code: input.reason_code,
        approval_id: input.approval_id ?? null,
        reason,
      },
    });
  } catch (err) {
    // Audit-sink failure must not mask the typed deny error, but
    // silently dropping the only forensic record of a denial would
    // defeat NFR-10. Log to stderr so operators still see it.
    console.error(
      JSON.stringify({
        kind: "revoke_all_audit_sink_failure",
        reason,
        correlation_id,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
  }
}

// --- Orchestrator ---------------------------------------------------

export async function revokeAllSessionsForPrincipal(
  caller: Principal,
  input: RevokeAllInput,
  deps: RevokeAllSessionsDeps,
): Promise<RevokeAllResult> {
  const correlation_id = deps.correlationId();
  // Authorize FIRST, but route caller-not-operator failures through
  // a denied-audit too — a non-operator probing the surface is a
  // privilege-escalation signal that NFR-10 wants in the audit trail.
  let operator: HumanPrincipal;
  try {
    operator = authorizeOperator(caller);
  } catch (err) {
    await safeDenyAudit(deps.sink, undefined, input, "caller_not_operator", correlation_id);
    throw err;
  }

  const nowSec = deps.now();
  const nowDate = new Date(nowSec * 1000);

  const target = await deps.principalLookup.lookupTarget(input.target_principal_id);
  if (target === null) throw new TargetNotFoundError(input.target_principal_id);
  if (target.kind !== "human") {
    throw new TargetNotHumanError(input.target_principal_id, target.kind);
  }

  const targetIsOperator = target.tier === "operator";
  const ttl = deps.approvalTtlSeconds ?? DEFAULT_APPROVAL_TTL_SECONDS;
  const effectiveWithin = deps.effectiveWithinSeconds ?? DEFAULT_EFFECTIVE_WITHIN_SECONDS;
  const sanitizedNotes = sanitizeNotes(input.notes);
  // Only the typed reason_code is sent to the IdP — notes are
  // operator commentary and stay in our own audit + approvals
  // tables. Avoids leaking operator-supplied text to Clerk session
  // logs / customer-facing surfaces.
  const idpReason = input.reason_code;
  const expiresAtSec = nowSec + ttl;

  // ---- Non-operator target: fast path. -------------------------
  if (!targetIsOperator) {
    await deps.sessionRevoker.revokeAllSessionsForExternalId({
      external_id: target.external_id,
      reason: idpReason,
    });
    // Audit emitted AFTER the IdP revoke succeeds: an audit event
    // that says "revoked_all" must reflect an action that actually
    // executed. If sink.emit then throws, operator logs will surface
    // the discrepancy via the Clerk session log; F05's hash-chained
    // log will close this gap with a durable write-ahead pattern.
    await deps.sink.emit({
      name: "human_sessions.revoked_all",
      principal_id: operator.principal_id,
      correlation_id,
      payload: {
        target_principal_id: input.target_principal_id,
        target_tier: target.tier,
        reason_code: input.reason_code,
        two_operator_gated: false,
        approval_id: null,
      },
    });
    return {
      status: "executed",
      executed_at: nowSec,
      approval_id: null,
      effective_within_seconds: effectiveWithin,
    };
  }

  // ---- Operator target: two-operator gate. ---------------------

  // First call — open a pending approval.
  if (input.approval_id === undefined) {
    const { approval_id } = await deps.approvalRepo.insertApproval({
      target_principal_id: input.target_principal_id,
      initiated_by: operator.principal_id,
      reason_code: input.reason_code,
      notes: sanitizedNotes,
      initiated_at: nowDate,
      expires_at: new Date(expiresAtSec * 1000),
    });
    await deps.sink.emit({
      name: "human_sessions.revoke_all_initiated",
      principal_id: operator.principal_id,
      correlation_id,
      payload: {
        target_principal_id: input.target_principal_id,
        reason_code: input.reason_code,
        approval_id,
        expires_at: expiresAtSec,
      },
    });
    return {
      status: "pending_approval",
      approval_id,
      expires_at: expiresAtSec,
    };
  }

  // Second call — validate the approval and execute.
  const approval = await deps.approvalRepo.findApproval(input.approval_id);
  if (approval === null) {
    await safeDenyAudit(
      deps.sink,
      operator.principal_id,
      input,
      "approval_not_found",
      correlation_id,
    );
    throw new ApprovalNotFoundError(input.approval_id, "approval_not_found");
  }
  if (approval.target_principal_id !== input.target_principal_id) {
    // Cross-target replay guard: the URL/form may have been tampered
    // with. Treat as not-found (NFR-13 non-enumerating semantics).
    await safeDenyAudit(
      deps.sink,
      operator.principal_id,
      input,
      "approval_target_mismatch",
      correlation_id,
    );
    throw new ApprovalNotFoundError(input.approval_id, "approval_target_mismatch");
  }
  if (approval.expires_at.valueOf() <= nowDate.valueOf()) {
    await safeDenyAudit(
      deps.sink,
      operator.principal_id,
      input,
      "approval_expired",
      correlation_id,
    );
    throw new ApprovalNotFoundError(input.approval_id, "approval_expired");
  }
  if (approval.executed_at !== null) {
    await safeDenyAudit(
      deps.sink,
      operator.principal_id,
      input,
      "approval_already_executed",
      correlation_id,
    );
    throw new ApprovalAlreadyExecutedError(input.approval_id);
  }
  if (approval.initiated_by === operator.principal_id) {
    await safeDenyAudit(deps.sink, operator.principal_id, input, "self_approval", correlation_id);
    throw new SelfApprovalError(input.approval_id);
  }

  const marked = await deps.approvalRepo.markApproved({
    approval_id: input.approval_id,
    approved_by: operator.principal_id,
    approved_at: nowDate,
    executed_at: nowDate,
  });
  if (!marked) {
    // Lost a concurrent approval race — another second-operator
    // already executed this approval id.
    await safeDenyAudit(
      deps.sink,
      operator.principal_id,
      input,
      "approval_already_executed",
      correlation_id,
    );
    throw new ApprovalAlreadyExecutedError(input.approval_id);
  }

  await deps.sessionRevoker.revokeAllSessionsForExternalId({
    external_id: target.external_id,
    reason: idpReason,
  });
  await deps.sink.emit({
    name: "human_sessions.revoked_all",
    principal_id: operator.principal_id,
    correlation_id,
    payload: {
      target_principal_id: input.target_principal_id,
      target_tier: target.tier,
      reason_code: input.reason_code,
      two_operator_gated: true,
      approval_id: input.approval_id,
      approved_by: operator.principal_id,
      initiated_by: approval.initiated_by,
    },
  });
  return {
    status: "executed",
    executed_at: nowSec,
    approval_id: input.approval_id,
    effective_within_seconds: effectiveWithin,
  };
}
