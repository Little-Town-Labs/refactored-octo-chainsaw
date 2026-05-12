# F03 Requirements Quality Checklist

**Spec:** `.specify/specs/03-db-schema-migrations/spec.md`
**Version:** spec v1.1 (2026-05-12 — clarifications resolved)
**Owner:** Gary

This checklist tests the **specification itself**, not the eventual
implementation. Treat it as a unit test for English: every box should
check before `/speckit-clarify` runs.

## Content quality

- [x] No implementation details in the specification (no "Drizzle table",
      "SQL CHECK", "pg_constraint" in the user-visible requirements — these
      appear only in §5 Edge cases and §6 Success metrics where the
      mechanical-check framing is unavoidable, and only as the
      *measurement medium*, not the requirement).
- [x] Requirements written from a stakeholder perspective (engineer,
      operator, auditor, reviewer).
- [x] Technology-agnostic where it matters (the register, retention
      policy, conventions document are platform-neutral artifacts;
      Drizzle/PostgreSQL appear only where the spec is documenting the
      shipped state F03 is governing).
- [x] No premature optimization or speculative scope (deferred items
      are explicitly listed in §1.2 "Out of scope").

## Completeness

- [x] All user stories have acceptance criteria (5 stories, each with
      3 criteria).
- [x] Edge cases documented (7 cases covering classification overlap,
      legal holds, no-personal-data tables, future violations, shipped
      violations, mid-flight reclassification, Drizzle/Postgres
      divergence).
- [x] Error handling and failure modes specified (back-check resolution
      paths in EC-5; lint exit-non-zero requirement in FR-6).
- [x] Dependencies & assumptions section present (§7).
- [x] Constitutional alignment section present (§9).

## Testability

- [x] All functional requirements are measurable (FR-1..FR-12 each have
      an inspectable artifact or behavior).
- [x] Acceptance criteria are verifiable (every checkbox is a concrete
      observation: register exists, lint runs, horizon declared).
- [x] Success metrics defined with mechanical-check methodology (M-1..M-6).
- [x] No vague language ("system should be fast", "good security") —
      where performance is required, it's quantified (NFR-2: <15s).

## Clarifications

- [x] ≤3 clarification markers in the spec (0 unresolved at v1.1).
- [x] Each clarification has options and a recommendation.
- [x] No clarification gates a downstream phase from starting (all 3
      were policy/discoverability choices, not architecture forks).
- [x] All clarifications resolved (CL-1, CL-2, CL-3 closed 2026-05-12).

## Scope discipline

- [x] In-scope items are listed (§1.2).
- [x] Out-of-scope items are explicitly listed and reasoned (§1.2).
- [x] No scope creep into adjacent features (retention enforcement is
      F05's; backup rotation is F-TBD; demographic schema is F-TBD).

## Constitutional alignment

- [x] Every load-bearing constitution article is mapped to an F03
      contribution (§9 table).
- [x] No constitutional exceptions requested.
- [x] Governance work does not weaken any existing protection.

## Relationship to shipped state

- [x] The spec is explicit that F02 migrations and schema modules are
      *input*, not *output* (§1.3).
- [x] The back-check path is named (FR-11) and the resolution paths
      enumerated (EC-5).
- [x] No code relocation is implied (§1.2 closes this door explicitly).

## Open items for /speckit-clarify

None. CL-1, CL-2, CL-3 all resolved on 2026-05-12 (recommended option
accepted in each case). Spec is ready for `/speckit-plan`.
