// `@spyglass/tickets` — Ticket store + state-machine primitives for
// Spyglass. Owned by feature F04; consumed by every later feature
// that creates, advances, or completes a seeker / employer-req /
// match ticket.
//
// F04 currently provides:
//   - Package skeleton (T001)
//   - State enums + transition catalogs + assertTransition (B3 / T011)
//   - Typed error classes (B3 / T011)
//
// Coming in later F04 tasks:
//   - Identifier allocator (B4)
//   - Repositories per kind (B5)
//   - Read primitives + cross-side isolation (B6)
//
// Constitutional refs: §I.2 (integrity), §I.5.1–§I.5.3 (AAA),
// §I.6 (defense in depth), §I.A.1 (jurisdiction tagging),
// §II (agent-native).

export const __pkg = "@spyglass/tickets" as const;

// F04 B3 — State machines + transition validator.
export {
  SEEKER_STATES,
  EMPLOYER_REQ_STATES,
  MATCH_STATES,
  type SeekerTicketState,
  type EmployerReqTicketState,
  type MatchTicketState,
  type TicketKind,
} from "./states.js";

export {
  assertTransition,
  SEEKER_TRANSITIONS,
  EMPLOYER_REQ_TRANSITIONS,
  MATCH_TRANSITIONS,
  OPERATOR_TRANSITION_SCOPE,
  OPERATOR_REASON_CODES,
  type OperatorReasonCode,
  type TransitionInput,
  type TransitionContext,
} from "./transitions.js";

export {
  IllegalTransitionError,
  MissingScopeError,
  InvariantViolationError,
  MissingReasonCodeError,
  IdempotencyConflictError,
} from "./errors.js";

// F04 B4 — Identifier allocator.
export {
  nextIdentifier,
  sequenceNameFor,
  drizzleSequenceExecutor,
  SequenceNotFoundError,
  type TicketIdentifierKind,
  type SequenceExecutor,
  type NextIdentifierArgs,
} from "./identifiers.js";

export {
  bootstrapYearSequences,
  drizzleBootstrapExecutor,
  type SequenceBootstrapExecutor,
  type BootstrappedSequenceEvent,
  type BootstrapResult,
} from "./rollover.js";

// F04 B5 — Repositories + audit emission helpers.
export {
  buildTransitionAuditEvent,
  emitTransitionAuditEvent,
  principalRoleOrScope,
  principalScopes,
  type BuildTransitionEventArgs,
  type InsertAuditEvent,
  type TicketAuditWriter,
  type TicketTransitionAuditEvent,
  type TicketTransitionAuditPayload,
} from "./audit.js";

export {
  createDrizzleTicketStore,
  type TicketStore,
  type TicketTransactionStore,
} from "./repo/store.js";
export {
  createSeekerRepo,
  type SeekerDraftFields,
  type SeekerRepoOptions,
  type SeekerTransitionArgs,
} from "./repo/seeker.js";
export {
  createEmployerReqRepo,
  type EmployerReqDraftFields,
  type EmployerReqRepoOptions,
  type EmployerReqTransitionArgs,
} from "./repo/employer-req.js";
export {
  createMatchRepo,
  MATCH_ADVANCE_SCOPE,
  type AdvanceMatchArgs,
  type CreateMatchFields,
  type MatchRepoOptions,
} from "./repo/match.js";
