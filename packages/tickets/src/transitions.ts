// F04 T011 — Transition catalogs + assertTransition (plan §3 R-1).
//
// Single validator gating every state-machine transition for the three
// ticket kinds. Catalogs mirror data-model.md §2.1–§2.3 exactly; T013
// will assert this parity automatically.
//
// Authorization model:
//   - Most transitions are owner/system-initiated and require no scope.
//   - Operator-initiated transitions (marked `operator: true`) require
//     the `tickets.transition.operator` scope AND a `reason_code`
//     drawn from a closed list (FR-3, EC-4).
//
// Invariants enforced here (defense-in-depth alongside DB CHECKs):
//   - match: `negotiating → delivered` requires non-null `dossier_id`
//     (CL-2; data-model §3).

import type { SeekerTicketState, EmployerReqTicketState, MatchTicketState } from "@spyglass/db";

import {
  IllegalTransitionError,
  InvariantViolationError,
  MissingReasonCodeError,
  MissingScopeError,
} from "./errors.js";

export const OPERATOR_TRANSITION_SCOPE = "tickets.transition.operator" as const;

/**
 * Closed list of reason codes accepted on operator transitions. Kept
 * small; new entries land via PR + governance review.
 */
export const OPERATOR_REASON_CODES = [
  "intake_failed",
  "policy",
  "stale",
  "duplicate",
  "source_withdrawn",
  "jurisdiction_changed",
  "compliance_hold",
] as const;
export type OperatorReasonCode = (typeof OPERATOR_REASON_CODES)[number];

interface SeekerTransition {
  readonly from: SeekerTicketState;
  readonly to: SeekerTicketState;
  readonly operator?: boolean;
}
interface EmployerReqTransition {
  readonly from: EmployerReqTicketState;
  readonly to: EmployerReqTicketState;
  readonly operator?: boolean;
}
interface MatchTransition {
  readonly from: MatchTicketState;
  readonly to: MatchTicketState;
  /** Defense-in-depth: dossier_id must be set before entering this state. */
  readonly requiresDossier?: boolean;
}

export const SEEKER_TRANSITIONS: ReadonlyArray<SeekerTransition> = [
  { from: "draft", to: "submitted" },
  { from: "submitted", to: "screening" },
  { from: "submitted", to: "withdrawn" },
  { from: "screening", to: "matching" },
  { from: "screening", to: "closed", operator: true },
  { from: "matching", to: "matched" },
  { from: "matching", to: "withdrawn" },
  { from: "matching", to: "closed", operator: true },
];

export const EMPLOYER_REQ_TRANSITIONS: ReadonlyArray<EmployerReqTransition> = [
  { from: "draft", to: "submitted" },
  { from: "submitted", to: "open" },
  { from: "submitted", to: "withdrawn" },
  { from: "open", to: "matching" },
  { from: "open", to: "closed", operator: true },
  { from: "matching", to: "matching" },
  { from: "matching", to: "filled" },
  { from: "matching", to: "closed", operator: true },
];

export const MATCH_TRANSITIONS: ReadonlyArray<MatchTransition> = [
  { from: "created", to: "negotiating" },
  { from: "created", to: "rejected" },
  { from: "negotiating", to: "delivered", requiresDossier: true },
  { from: "negotiating", to: "expired" },
  { from: "delivered", to: "accepted" },
  { from: "delivered", to: "rejected" },
  { from: "delivered", to: "negotiating" },
  { from: "expired", to: "negotiating" },
];

export type TransitionInput =
  | { kind: "seeker_ticket"; from: SeekerTicketState; to: SeekerTicketState }
  | {
      kind: "employer_req_ticket";
      from: EmployerReqTicketState;
      to: EmployerReqTicketState;
    }
  | { kind: "match_ticket"; from: MatchTicketState; to: MatchTicketState };

export interface TransitionContext {
  readonly scopes: ReadonlyArray<string>;
  readonly reason_code?: string;
  /** Required when entering match `delivered` (CL-2 invariant). */
  readonly dossier_id?: string | null;
}

function findSeeker(from: SeekerTicketState, to: SeekerTicketState): SeekerTransition | undefined {
  return SEEKER_TRANSITIONS.find((t) => t.from === from && t.to === to);
}
function findEmployerReq(
  from: EmployerReqTicketState,
  to: EmployerReqTicketState,
): EmployerReqTransition | undefined {
  return EMPLOYER_REQ_TRANSITIONS.find((t) => t.from === from && t.to === to);
}
function findMatch(from: MatchTicketState, to: MatchTicketState): MatchTransition | undefined {
  return MATCH_TRANSITIONS.find((t) => t.from === from && t.to === to);
}

function enforceOperator(kind: string, from: string, to: string, ctx: TransitionContext): void {
  if (!ctx.scopes.includes(OPERATOR_TRANSITION_SCOPE)) {
    throw new MissingScopeError(OPERATOR_TRANSITION_SCOPE);
  }
  if (!ctx.reason_code) {
    throw new MissingReasonCodeError(kind, from, to);
  }
  if (!(OPERATOR_REASON_CODES as ReadonlyArray<string>).includes(ctx.reason_code)) {
    throw new MissingReasonCodeError(kind, from, to);
  }
}

/**
 * Validate a state transition. Throws a typed error on refusal; returns
 * void on acceptance. Callers MUST invoke this inside the same DB
 * transaction that performs the state mutation (plan §3 R-2).
 */
export function assertTransition(input: TransitionInput, ctx: TransitionContext): void {
  switch (input.kind) {
    case "seeker_ticket": {
      const edge = findSeeker(input.from, input.to);
      if (!edge) throw new IllegalTransitionError("seeker_ticket", input.from, input.to);
      if (edge.operator) enforceOperator("seeker_ticket", input.from, input.to, ctx);
      return;
    }
    case "employer_req_ticket": {
      const edge = findEmployerReq(input.from, input.to);
      if (!edge) throw new IllegalTransitionError("employer_req_ticket", input.from, input.to);
      if (edge.operator) enforceOperator("employer_req_ticket", input.from, input.to, ctx);
      return;
    }
    case "match_ticket": {
      const edge = findMatch(input.from, input.to);
      if (!edge) throw new IllegalTransitionError("match_ticket", input.from, input.to);
      if (edge.requiresDossier && !ctx.dossier_id) {
        throw new InvariantViolationError(
          "match_ticket.dossier_id_required",
          `Transition ${input.from} → ${input.to} requires a non-null dossier_id.`,
        );
      }
      return;
    }
  }
}
