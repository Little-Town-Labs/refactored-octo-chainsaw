# @spyglass/tickets

**Status:** alpha — F04 implementation in progress. B1–B6 are landed
on branch `04-ticket-store-state-machines`; web wiring and staged
dev-run gates remain.

The ticket spine. Three ticket types — `seeker_ticket`,
`employer_req_ticket`, `match_ticket` — each with its own state
machine and transition guards (PRD §5.1).

## Public API

- Package marker: `__pkg`.
- State-machine definitions: `SEEKER_STATES`,
  `EMPLOYER_REQ_STATES`, `MATCH_STATES`, `SeekerTicketState`,
  `EmployerReqTicketState`, `MatchTicketState`, and `TicketKind`.
- Transition validation: `assertTransition`, the three transition
  catalogs, `OPERATOR_TRANSITION_SCOPE`, `OPERATOR_REASON_CODES`,
  `OperatorReasonCode`, `TransitionInput`, and `TransitionContext`.
- Typed errors: `IllegalTransitionError`, `MissingScopeError`,
  `InvariantViolationError`, `MissingReasonCodeError`, and
  `IdempotencyConflictError`.
- Identifier allocation and rollover: `nextIdentifier`,
  `sequenceNameFor`, `drizzleSequenceExecutor`,
  `SequenceNotFoundError`, `bootstrapYearSequences`,
  `drizzleBootstrapExecutor`, and their executor/result types.
- Audit helpers: `buildTransitionAuditEvent`,
  `emitTransitionAuditEvent`, `principalRoleOrScope`,
  `principalScopes`, and transition-audit payload/writer types.
- Store adapter: `createDrizzleTicketStore`, `TicketStore`, and
  `TicketTransactionStore`.
- Mutation repositories: `createSeekerRepo`, `createEmployerReqRepo`,
  `createMatchRepo`, `MATCH_ADVANCE_SCOPE`, and their argument/option
  types.
- Read primitives: `createReadRepo`, `TICKET_READ_ALL_SCOPE`,
  `defaultTicketProjection`, `TicketProjection`,
  `TicketProjectionMap`, `TicketRowFor`, `TicketReadRepo`,
  `TicketReadRepoOptions`, `ReadTicketKind`, `TicketRow`,
  `ReducedTicketProjection`, `MatchJoinGraph`, `Page`, and
  `PageOptions`.

## Projection seam

`createReadRepo` accepts an optional `projection` map. F04 ships
`defaultTicketProjection`, which exposes all owned rows and reduced
cross-side rows by default. F09 can replace the map with a
filter-rule-driven implementation without changing the read-repo call
surface.

## Contracts and diagrams

- State-machine diagrams live in
  `.specify/specs/04-ticket-store-state-machines/data-model.md`.
- Transition audit payloads are validated against
  `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`.
- Identifier sequence operations are covered in
  `docs/runbooks/identifier-sequences.md`.

## Dependencies

Depends on `@spyglass/auth`, `@spyglass/db`, and `drizzle-orm`.

## Stability tier

Alpha until F04 ships. Public-API breaking changes follow
Constitution §III.3.
