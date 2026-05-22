# Implementation Plan: Re-negotiation Loop

**Branch**: `015-renegotiation-loop` | **Date**: 2026-05-22 | **Spec**: `.specify/specs/015-renegotiation-loop/spec.md`

**Input**: Feature specification from `.specify/specs/015-renegotiation-loop/spec.md`

## Summary

F15 adds a controlled re-negotiation loop for asymmetric Parley outcomes. A cleared side can request pushback through the explicit `match_ticket.renegotiation_requested` event, after which the platform validates requester authority, prior outcome eligibility, round-cap headroom, cost ceiling, idempotency, legal/tombstone posture, and silence requirements before allocating a fresh Parley run.

Accepted requests keep the same match ticket but create a distinct `run_id`, increment attempt metadata, and start with no inherited prompt history, tool-call log, side scratch state, or prior negotiation context. Prior run and dossier identifiers are immutable references only. Refused requests fail closed with auditable reason codes and no counterparty notification by default.

## Technical Context

**Language/Version**: TypeScript on Node.js 24, ESM packages.

**Primary Dependencies**: Existing `@spyglass/parley` dispatch/run repository, `@spyglass/agent-contracts`, `@spyglass/rubrics`, `@spyglass/tool-dispatcher`, `@spyglass/privacy-filter`, dossier/audit concepts from the current workspace, and match-ticket semantics from `@spyglass/tickets`.

**Storage**: First implementation remains package-local and in-memory for test fixtures, matching current Parley repository patterns. Contracts and audit records must be shaped so a later durable store can persist attempt, decision, alarm, and evidence records without changing feature semantics.

**Testing**: Jest package tests, JSON/YAML contract validation by schema review, TypeScript type checks, linting, and a staged `dev-run:f15` command once implementation tasks are generated.

**Target Platform**: Spyglass monorepo packages running in the Parley harness on Linux/Node.

**Project Type**: Package-level orchestration feature centered in `packages/parley`.

**Performance Goals**: Re-negotiation eligibility and duplicate-event handling must be deterministic and side-effect bounded. Duplicate requests for the same match ticket and attempt create no more than one fresh run.

**Constraints**: Fail closed on missing eligibility data, legal holds, tombstones, unauthorized requesters, unavailable privacy/tool/dossier dependencies, exhausted round caps, or exceeded cost ceilings. No hot continuation of prior runs. No non-cleared-side notification by default.

**Scale/Scope**: One re-negotiation orchestration slice for Stage 5. This feature does not change seeker advocate logic from F13, employer advocate logic from F14, UI/channel surfaces, live paging, or durable database migrations.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | F15 Handling |
|------|--------|--------------|
| I.1 Confidentiality | PASS | Re-negotiation routes added disclosure through existing privacy/tool boundaries and preserves non-cleared-side silence. |
| I.2 Integrity | PASS | Accepted, refused, cap, cost, alarm, termination, and fresh-run allocation outcomes require audit evidence and immutable prior references. |
| I.3 Availability | PASS | Policy failures produce structured refusals or bounded terminations instead of orphaning match tickets. |
| I.4 Privacy | PASS | No speculative new data collection; prior run state is not inherited, replayed, or rehydrated. |
| I.5 AAA | PASS | Requests require authenticated principals, scoped authorization, and attribution in audit records. |
| I.6 Fail-safe Defaults | PASS | Missing or uncertain eligibility defaults to refusal; cost and cap breaches halt before further dispatch. |
| I.A Parley Regulatory Primitives | PASS | Re-negotiation stays inside Parley harness policy and respects jurisdiction/legal/tombstone gates. |
| I.A.1 AI Risk and Cost Controls | PASS | Round caps, cost ceilings, alarms, and no state inheritance directly address runaway AI and abuse risk. |
| I.C.2 AI Supply Chain References | PASS | Fresh runs reference signed prompt/model/runtime versions from F12 without weakening those controls. |
| II Agent-Native Architecture | PASS | Feature exposes machine-readable request, decision, attempt, and alarm contracts for agent and service consumers. |
| III.2 Typed Semantics | PASS | Contract schemas define request/decision/attempt/alarm envelopes and reason codes. |
| V.3 Review Process | PASS | Tasks must include analyze, code review, security review, staged verification, roadmap update, and PR follow-through. |

No constitutional violations are planned.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/015-renegotiation-loop/
├── plan.md
├── research.md
├── data-model.md
├── threat-model.md
├── quickstart.md
├── contracts/
│   ├── renegotiation-request.schema.yaml
│   ├── renegotiation-decision.schema.yaml
│   ├── renegotiation-attempt.schema.yaml
│   └── renegotiation-alarm.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/parley/
├── package.json
├── src/
│   ├── dispatcher.ts
│   ├── events.ts
│   ├── index.ts
│   ├── renegotiation.ts
│   ├── repo.ts
│   ├── types.ts
│   └── __tests__/
│       ├── dispatcher.test.ts
│       └── renegotiation.test.ts
└── scripts/
    └── f15-staged-dev-run.ts

packages/tickets/
└── src/repo/match.ts
```

**Structure Decision**: Implement F15 primarily in `@spyglass/parley` as orchestration/policy over existing dispatcher and run repository semantics. Touch `packages/tickets/src/repo/match.ts` only if tasks prove the existing re-negotiation hook cannot expose the required attempt or audit shape.

## Phase 0: Research Output

Research decisions are captured in `.specify/specs/015-renegotiation-loop/research.md`.

## Phase 1: Design Output

Design artifacts are captured in:

- `.specify/specs/015-renegotiation-loop/data-model.md`
- `.specify/specs/015-renegotiation-loop/threat-model.md`
- `.specify/specs/015-renegotiation-loop/quickstart.md`
- `.specify/specs/015-renegotiation-loop/contracts/renegotiation-request.schema.yaml`
- `.specify/specs/015-renegotiation-loop/contracts/renegotiation-decision.schema.yaml`
- `.specify/specs/015-renegotiation-loop/contracts/renegotiation-attempt.schema.yaml`
- `.specify/specs/015-renegotiation-loop/contracts/renegotiation-alarm.schema.yaml`

## Phase 2: Implementation Approach

1. Add typed re-negotiation request, decision, attempt, cap, cost, alarm, and reason-code models in `packages/parley`.
2. Add a policy evaluator that validates requester authority, cleared-side posture, prior asymmetric outcome, match-ticket lifecycle gates, legal/tombstone gates, effective round cap, cost preflight, and duplicate idempotency.
3. Add fresh-run allocation that creates a new `run_id` and dispatch request for `match_ticket.renegotiation_requested` with empty inherited context counters.
4. Add runtime cost observation and bounded termination semantics for active re-negotiation runs.
5. Emit audit-ready evidence for accepted, refused, idempotent replay, allocation, cap/cost decision, alarm, and termination events.
6. Preserve non-cleared-side silence in refused and pending states unless later channel features opt in.
7. Cover successful fresh-run, duplicate replay, cap exhaustion, unauthorized requester, legal/tombstone, privacy/tool failure, and cost breach scenarios with package tests and a staged dev run.

## Risk Controls

- Transparent retry risk: enforced by fresh `run_id`, empty isolation counters, and immutable-reference-only prior context.
- Runaway loop risk: enforced by effective cap as min(seeker cap, employer cap, platform default 3).
- Cost drain risk: enforced by preflight ceiling, runtime ceiling, and alarm records.
- Duplicate event risk: enforced by request/attempt idempotency and active-run checks.
- Counterparty pressure leak risk: refused and pending requests do not notify the non-cleared side by default.
- Audit gap risk: every decision path emits machine-readable evidence before side effects are considered complete.

## Complexity Tracking

No constitutional or structural violations require complexity exceptions.
