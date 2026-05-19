# F04 Requirements Quality Checklist

**Spec:** `.specify/specs/04-ticket-store-state-machines/spec.md`
**Version:** spec v1.1 (2026-05-12 — clarifications resolved)
**Owner:** Gary

This checklist tests the **specification itself**, not the eventual
implementation. Every box should check before `/speckit-clarify` runs.

## Content quality

- [x] No implementation details in the specification (transition
      validators are described as a *requirement* (FR-3, NFR-5), not
      a specific technology; "TypeScript discriminated unions"
      appears only in CL-1 as the recommended *option*, properly
      scoped).
- [x] Requirements written from stakeholder perspective (seeker,
      employer-admin, operator, Parley harness, auditor).
- [x] Technology-agnostic in the FR/NFR body; Parley SPEC references
      are cited inputs, not embedded implementation.
- [x] No premature optimization or speculative scope (deferred items
      explicitly listed in §1.2 "Out of scope").

## Completeness

- [x] All 7 user stories have ≥3 acceptance criteria each (US-1..US-7).
- [x] 14 FRs cover schema, state machines, transitions, audit, jurisdiction,
      identifiers, idempotency, read primitives, re-negotiation, round
      bookkeeping, soft-delete, F03 conformance, transition graph artifact.
- [x] 10 NFRs cover transition correctness, perf (read + write), audit no-loss,
      type-system enforcement, jurisdiction, retention, schema-lint,
      cross-side leakage prevention, documentation discipline.
- [x] 9 edge cases documented (withdrawal under negotiation, partial fill,
      concurrent match creation, missing reason_code, audit-emission failure,
      round ceiling, re-negotiation, jurisdiction amendment, identifier
      collision).
- [x] Dependencies & assumptions section (§7) names every upstream + downstream.
- [x] Constitutional alignment section (§9) maps every load-bearing article.

## Testability

- [x] Every FR is measurable (state-graph completeness, audit-event
      shape, identifier regex, scope checks, etc.).
- [x] Every acceptance criterion is verifiable.
- [x] Success metrics (M-1..M-6) carry mechanical-check methodology.
- [x] NFR-2 / NFR-3 quantify latency targets (50ms / 200ms / 500ms p90).

## Clarifications

- [x] ≤3 markers in the spec (0 unresolved at v1.1).
- [x] Each carries options + recommendation.
- [x] None gates a downstream phase from starting (all 3 were
      implementation-pattern choices, not requirement forks).
- [x] All clarifications resolved (CL-1, CL-2, CL-3 closed 2026-05-12).

## Scope discipline

- [x] In-scope items explicitly listed (§1.2).
- [x] Out-of-scope items explicitly listed and reasoned (UI, matching
      algorithm, harness, dossier, audit log, notifications, re-negotiation
      policy).
- [x] No scope creep into adjacent features (F08, F09, F10, F11, F13/F14
      all named with clear hand-off points).

## Constitutional alignment

- [x] Every load-bearing article mapped to an F04 contribution (§9).
- [x] No constitutional exceptions requested.
- [x] Privacy filter (§I.1) and least privilege (§I.5.2) honored by
      design — F04's read primitives enforce cross-side isolation
      (NFR-9).

## Relationship to F02 + F03

- [x] F02 reuse made explicit (Principal, audit sink, redaction pattern,
      withPrincipal).
- [x] F03 conformance is an FR (FR-13) + an NFR (NFR-8), not optional.
- [x] No F02 / F03 artifact is renamed or replaced — F04 extends, does
      not fork.

## Parley alignment

- [x] Parley SPEC referenced as input (§4.1.1 match-ticket, §7
      state machine).
- [x] No restatement of Parley contracts in the spec body — references only.
- [x] F04 owns persistence + state transitions; harness wiring is F08.

## Open items for /speckit-clarify

None. CL-1, CL-2, CL-3 all resolved on 2026-05-12 (recommended option
accepted in each case). Spec is ready for `/speckit-plan`.
