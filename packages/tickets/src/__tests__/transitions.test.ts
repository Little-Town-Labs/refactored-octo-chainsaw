// F04 T010 — Transition-validator tests (RED phase).
//
// Tests the typed `assertTransition` validator that gates every
// state-machine transition for seeker / employer-req / match
// tickets (plan §3 R-1; data-model §2.1–§2.3).
//
// Coverage:
//   - Positive: one test per named transition (8 + 8 + 8 = 24).
//   - Negative: every illegal (from, to) pair within each kind.
//   - Scope rejection: operator-only transitions without
//     `tickets.transition.operator` scope → MissingScopeError.
//   - Invariant: match `delivered` without `dossier_id` →
//     InvariantViolationError.
//   - Reason-code: operator transitions without `reason_code` →
//     MissingReasonCodeError.
//
// These imports resolve to modules created in T011 (states.ts,
// transitions.ts, errors.ts). Until T011 lands the suite is RED.

import {
  SEEKER_STATES,
  EMPLOYER_REQ_STATES,
  MATCH_STATES,
  type SeekerTicketState,
  type EmployerReqTicketState,
  type MatchTicketState,
} from "@spyglass/db";

import {
  assertTransition,
  SEEKER_TRANSITIONS,
  EMPLOYER_REQ_TRANSITIONS,
  MATCH_TRANSITIONS,
  type TransitionInput,
} from "../transitions.js";

import {
  IllegalTransitionError,
  MissingScopeError,
  InvariantViolationError,
  MissingReasonCodeError,
} from "../errors.js";

// --------------------------------------------------------------------
// Test fixtures
// --------------------------------------------------------------------

const OPERATOR_SCOPE = "tickets.transition.operator";

/** Minimal stand-in for `Principal` — `assertTransition` only inspects scopes. */
function withScopes(scopes: ReadonlyArray<string>): {
  scopes: ReadonlyArray<string>;
} {
  return { scopes };
}

const noScopes = withScopes([]);
const operatorScopes = withScopes([OPERATOR_SCOPE]);

// --------------------------------------------------------------------
// Catalog declarations (mirrors data-model.md §2.1–§2.3)
// --------------------------------------------------------------------

const SEEKER_LEGAL: ReadonlyArray<{
  from: SeekerTicketState;
  to: SeekerTicketState;
  operator?: boolean;
}> = [
  { from: "draft", to: "submitted" },
  { from: "submitted", to: "screening" },
  { from: "submitted", to: "withdrawn" },
  { from: "screening", to: "matching" },
  { from: "screening", to: "closed", operator: true },
  { from: "matching", to: "matched" },
  { from: "matching", to: "withdrawn" },
  { from: "matching", to: "closed", operator: true },
];

const EMPLOYER_REQ_LEGAL: ReadonlyArray<{
  from: EmployerReqTicketState;
  to: EmployerReqTicketState;
  operator?: boolean;
}> = [
  { from: "draft", to: "submitted" },
  { from: "submitted", to: "open" },
  { from: "submitted", to: "withdrawn" },
  { from: "open", to: "matching" },
  { from: "open", to: "closed", operator: true },
  { from: "matching", to: "matching" },
  { from: "matching", to: "filled" },
  { from: "matching", to: "closed", operator: true },
];

const MATCH_LEGAL: ReadonlyArray<{
  from: MatchTicketState;
  to: MatchTicketState;
  needsDossier?: boolean;
}> = [
  { from: "created", to: "negotiating" },
  { from: "created", to: "rejected" },
  { from: "negotiating", to: "delivered", needsDossier: true },
  { from: "negotiating", to: "expired" },
  { from: "delivered", to: "accepted" },
  { from: "delivered", to: "rejected" },
  { from: "delivered", to: "negotiating" },
  { from: "expired", to: "negotiating" },
];

// --------------------------------------------------------------------
// 1. Catalog identity — the implementation's catalogs must match
//    the documented edges (data-model.md is the source of truth).
// --------------------------------------------------------------------

describe("transition catalogs (data-model parity)", () => {
  test("SEEKER_TRANSITIONS exports all 8 documented edges", () => {
    const pairs = new Set(
      SEEKER_TRANSITIONS.map((t: { from: string; to: string }) => `${t.from}->${t.to}`),
    );
    for (const { from, to } of SEEKER_LEGAL) {
      expect(pairs.has(`${from}->${to}`)).toBe(true);
    }
    expect(SEEKER_TRANSITIONS.length).toBe(SEEKER_LEGAL.length);
  });

  test("EMPLOYER_REQ_TRANSITIONS exports all 8 documented edges", () => {
    const pairs = new Set(
      EMPLOYER_REQ_TRANSITIONS.map((t: { from: string; to: string }) => `${t.from}->${t.to}`),
    );
    for (const { from, to } of EMPLOYER_REQ_LEGAL) {
      expect(pairs.has(`${from}->${to}`)).toBe(true);
    }
    expect(EMPLOYER_REQ_TRANSITIONS.length).toBe(EMPLOYER_REQ_LEGAL.length);
  });

  test("MATCH_TRANSITIONS exports all 8 documented edges", () => {
    const pairs = new Set(
      MATCH_TRANSITIONS.map((t: { from: string; to: string }) => `${t.from}->${t.to}`),
    );
    for (const { from, to } of MATCH_LEGAL) {
      expect(pairs.has(`${from}->${to}`)).toBe(true);
    }
    expect(MATCH_TRANSITIONS.length).toBe(MATCH_LEGAL.length);
  });
});

// --------------------------------------------------------------------
// 2. Positive — every legal transition passes when context is valid.
// --------------------------------------------------------------------

describe("seeker positive transitions", () => {
  test.each(SEEKER_LEGAL)("$from → $to is accepted", ({ from, to, operator }) => {
    const ctx = operator ? { ...operatorScopes, reason_code: "intake_failed" } : noScopes;
    const input: TransitionInput = { kind: "seeker_ticket", from, to };
    expect(() => assertTransition(input, ctx)).not.toThrow();
  });
});

describe("employer_req positive transitions", () => {
  test.each(EMPLOYER_REQ_LEGAL)("$from → $to is accepted", ({ from, to, operator }) => {
    const ctx = operator ? { ...operatorScopes, reason_code: "intake_failed" } : noScopes;
    const input: TransitionInput = { kind: "employer_req_ticket", from, to };
    expect(() => assertTransition(input, ctx)).not.toThrow();
  });
});

describe("match positive transitions", () => {
  test.each(MATCH_LEGAL)("$from → $to is accepted", ({ from, to, needsDossier }) => {
    const ctx = needsDossier
      ? { ...noScopes, dossier_id: "00000000-0000-0000-0000-000000000001" }
      : noScopes;
    const input: TransitionInput = { kind: "match_ticket", from, to };
    expect(() => assertTransition(input, ctx)).not.toThrow();
  });
});

// --------------------------------------------------------------------
// 3. Negative — every (from, to) pair NOT in the legal catalog is
//    rejected with IllegalTransitionError. Table-driven over the
//    cartesian product minus legal pairs.
// --------------------------------------------------------------------

function illegalPairs<S extends string>(
  states: ReadonlyArray<S>,
  legal: ReadonlyArray<{ from: S; to: S }>,
): Array<readonly [S, S]> {
  const legalSet = new Set(legal.map(({ from, to }) => `${from}->${to}`));
  const out: Array<readonly [S, S]> = [];
  for (const from of states) {
    for (const to of states) {
      if (from === to) {
        // Self-loops are not implicitly illegal; only flag if absent.
        if (!legalSet.has(`${from}->${to}`)) out.push([from, to] as const);
        continue;
      }
      if (!legalSet.has(`${from}->${to}`)) out.push([from, to] as const);
    }
  }
  return out;
}

const SEEKER_ILLEGAL = illegalPairs(SEEKER_STATES, SEEKER_LEGAL);
const EMPLOYER_REQ_ILLEGAL = illegalPairs(EMPLOYER_REQ_STATES, EMPLOYER_REQ_LEGAL);
const MATCH_ILLEGAL = illegalPairs(MATCH_STATES, MATCH_LEGAL);

describe("seeker illegal transitions (exhaustive)", () => {
  test.each(SEEKER_ILLEGAL)("rejects %s → %s", (from, to) => {
    const input: TransitionInput = { kind: "seeker_ticket", from, to };
    expect(() => assertTransition(input, operatorScopes)).toThrow(IllegalTransitionError);
  });
});

describe("employer_req illegal transitions (exhaustive)", () => {
  test.each(EMPLOYER_REQ_ILLEGAL)("rejects %s → %s", (from, to) => {
    const input: TransitionInput = { kind: "employer_req_ticket", from, to };
    expect(() => assertTransition(input, operatorScopes)).toThrow(IllegalTransitionError);
  });
});

describe("match illegal transitions (exhaustive)", () => {
  test.each(MATCH_ILLEGAL)("rejects %s → %s", (from, to) => {
    const input: TransitionInput = { kind: "match_ticket", from, to };
    expect(() =>
      assertTransition(input, {
        ...operatorScopes,
        dossier_id: "00000000-0000-0000-0000-000000000001",
      }),
    ).toThrow(IllegalTransitionError);
  });
});

// --------------------------------------------------------------------
// 4. Scope rejection — operator-only transitions without
//    `tickets.transition.operator` scope → MissingScopeError.
// --------------------------------------------------------------------

describe("operator-scope enforcement", () => {
  const seekerOperatorEdges = SEEKER_LEGAL.filter((t) => t.operator);
  const employerOperatorEdges = EMPLOYER_REQ_LEGAL.filter((t) => t.operator);

  test.each(seekerOperatorEdges)(
    "seeker $from → $to requires tickets.transition.operator",
    ({ from, to }) => {
      const input: TransitionInput = { kind: "seeker_ticket", from, to };
      expect(() => assertTransition(input, { ...noScopes, reason_code: "policy" })).toThrow(
        MissingScopeError,
      );
    },
  );

  test.each(employerOperatorEdges)(
    "employer_req $from → $to requires tickets.transition.operator",
    ({ from, to }) => {
      const input: TransitionInput = { kind: "employer_req_ticket", from, to };
      expect(() => assertTransition(input, { ...noScopes, reason_code: "policy" })).toThrow(
        MissingScopeError,
      );
    },
  );
});

// --------------------------------------------------------------------
// 5. Reason-code enforcement — operator transitions require a
//    `reason_code` from the closed list.
// --------------------------------------------------------------------

describe("operator reason_code enforcement", () => {
  test("seeker matching → closed without reason_code throws MissingReasonCodeError", () => {
    const input: TransitionInput = { kind: "seeker_ticket", from: "matching", to: "closed" };
    expect(() => assertTransition(input, operatorScopes)).toThrow(MissingReasonCodeError);
  });

  test("employer_req matching → closed without reason_code throws MissingReasonCodeError", () => {
    const input: TransitionInput = {
      kind: "employer_req_ticket",
      from: "matching",
      to: "closed",
    };
    expect(() => assertTransition(input, operatorScopes)).toThrow(MissingReasonCodeError);
  });
});

// --------------------------------------------------------------------
// 6. Invariant — match `negotiating → delivered` requires non-null
//    dossier_id (CL-2; data-model §3 invariant).
// --------------------------------------------------------------------

describe("match dossier_id invariant (CL-2)", () => {
  test("negotiating → delivered without dossier_id throws InvariantViolationError", () => {
    const input: TransitionInput = {
      kind: "match_ticket",
      from: "negotiating",
      to: "delivered",
    };
    expect(() => assertTransition(input, noScopes)).toThrow(InvariantViolationError);
  });

  test("negotiating → delivered with dossier_id is accepted", () => {
    const input: TransitionInput = {
      kind: "match_ticket",
      from: "negotiating",
      to: "delivered",
    };
    expect(() =>
      assertTransition(input, {
        ...noScopes,
        dossier_id: "00000000-0000-0000-0000-000000000001",
      }),
    ).not.toThrow();
  });
});
