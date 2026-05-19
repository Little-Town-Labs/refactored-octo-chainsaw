// F04 T011 — Typed error classes (plan §3 R-1).
//
// Every refusal path from `assertTransition` and the repos surfaces a
// named error so callers can branch on `error.name` (or via
// `instanceof`) without parsing strings. Each error is a distinct
// subclass of Error with a stable `.name` matching the class.

export class IllegalTransitionError extends Error {
  readonly kind: string;
  readonly from: string;
  readonly to: string;

  constructor(kind: string, from: string, to: string) {
    super(`Illegal ${kind} transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
    this.kind = kind;
    this.from = from;
    this.to = to;
  }
}

export class MissingScopeError extends Error {
  readonly required: string;

  constructor(required: string) {
    super(`Required scope "${required}" is not granted to the calling principal.`);
    this.name = "MissingScopeError";
    this.required = required;
  }
}

export class InvariantViolationError extends Error {
  readonly invariant: string;

  constructor(invariant: string, detail?: string) {
    super(detail ? `${invariant}: ${detail}` : invariant);
    this.name = "InvariantViolationError";
    this.invariant = invariant;
  }
}

export class MissingReasonCodeError extends Error {
  readonly kind: string;
  readonly from: string;
  readonly to: string;

  constructor(kind: string, from: string, to: string) {
    super(
      `Operator transition ${kind}: ${from} → ${to} requires a reason_code from the closed list.`,
    );
    this.name = "MissingReasonCodeError";
    this.kind = kind;
    this.from = from;
    this.to = to;
  }
}

export class IdempotencyConflictError extends Error {
  readonly seekerTicketId: string;
  readonly employerReqTicketId: string;
  readonly attempt: number;

  constructor(seekerTicketId: string, employerReqTicketId: string, attempt: number) {
    super(
      `Match ticket already exists for (seeker=${seekerTicketId}, ` +
        `employer_req=${employerReqTicketId}, attempt=${attempt}).`,
    );
    this.name = "IdempotencyConflictError";
    this.seekerTicketId = seekerTicketId;
    this.employerReqTicketId = employerReqTicketId;
    this.attempt = attempt;
  }
}
