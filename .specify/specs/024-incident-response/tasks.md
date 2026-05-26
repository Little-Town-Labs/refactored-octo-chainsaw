# Tasks: Incident Response + Breach Notification + Monitoring

**Input**: Design documents from `.specify/specs/024-incident-response/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. F24 is a foundational incident-response and breach-notification capability; classifier, lifecycle, deadline, evidence export, environment, and schema tests must be written before or alongside implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the package, contract, and documentation structure.

- [X] T001 Create `packages/incident-response/` package with `package.json`, `tsconfig.json`, `jest.config.js`, `eslint.config.js`, and `src/index.ts`
- [X] T002 [P] Copy `.specify/specs/024-incident-response/contracts/monitoring-signal.schema.yaml` to `packages/incident-response/contracts/monitoring-signal.v1.schema.yaml`
- [X] T003 [P] Create source skeleton files `packages/incident-response/src/types.ts`, `schemas.ts`, `classifier.ts`, `incident.ts`, `deadlines.ts`, `evidence.ts`, `export.ts`, and `tabletop.ts`
- [X] T004 [P] Create F24 docs placeholders `docs/runbooks/incident-response.md`, `docs/runbooks/incident-response-tabletop.md`, and `docs/architecture/monitoring-signals.md`
- [X] T005 Update `.specify/roadmap.md` current status and changelog to mark F24 active on branch `024-incident-response`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema, environment, and base types required by all user stories.

**CRITICAL**: No user story implementation should proceed until these foundations are complete.

- [X] T006 [P] Add F24 Drizzle schema tables in `packages/db/src/schema/incident-response.ts`
- [X] T007 Export F24 schema modules from `packages/db/src/schema/index.ts`
- [X] T008 Add schema convention coverage for F24 tables in `packages/db/src/__tests__/schema.test.ts`
- [X] T009 [P] Define F24 severity, signal, incident, evidence, notification, corrective-action, and tabletop Zod schemas in `packages/incident-response/src/schemas.ts`
- [X] T010 [P] Define exported F24 domain types in `packages/incident-response/src/types.ts`
- [X] T011 Add production-like `SENTRY_DSN` validation helper and tests in `packages/shared/src/env.ts` and `packages/shared/src/__tests__/env.test.ts`
- [X] T012 [P] Add monitoring-signal contract validation test in `packages/incident-response/src/__tests__/monitoring-signal-contract.test.ts`

**Checkpoint**: Foundation ready; package builds, schema exports exist, F24 env behavior is test-covered, and the monitoring-signal contract validates.

---

## Phase 3: User Story 1 - Detect Security-Relevant Signals (Priority: P1)

**Goal**: Normalize high-risk subsystem observations into classified monitoring signals.

**Independent Test**: Synthetic privacy-filter, cross-side leakage, audit-chain, auth, credential, webhook, and employer API anomaly inputs produce severity-classified monitoring signals with dedupe and evidence references.

### Tests for User Story 1

- [X] T013 [P] [US1] Add classifier tests for privacy-filter bypass, cross-side leakage, and audit-chain integrity failures in `packages/incident-response/src/__tests__/classifier.test.ts`
- [X] T014 [P] [US1] Add classifier tests for auth anomaly, credential misuse, webhook replay/signature abuse, employer API abuse, and monitoring sink failure in `packages/incident-response/src/__tests__/classifier.test.ts`
- [X] T015 [P] [US1] Add dedupe and minimal evidence reference tests in `packages/incident-response/src/__tests__/classifier.test.ts`

### Implementation for User Story 1

- [X] T016 [US1] Implement signal classification rules in `packages/incident-response/src/classifier.ts`
- [X] T017 [US1] Implement hard sev-1 enforcement for cross-side leakage and audit-chain integrity failures in `packages/incident-response/src/classifier.ts`
- [X] T018 [US1] Export monitoring signal helpers from `packages/incident-response/src/index.ts`
- [X] T019 [US1] Document monitoring signal categories and escalation behavior in `docs/architecture/monitoring-signals.md`

**Checkpoint**: Monitoring classification is functional and independently testable.

---

## Phase 4: User Story 2 - Open and Manage Incidents (Priority: P1)

**Goal**: Operators can open, update, assign, preserve evidence for, and close incidents under valid lifecycle rules.

**Independent Test**: Open incidents from signals/manual reports, add principal-attributed timeline entries and evidence references, exercise invalid transitions, and prove sev-1 closure requires postmortem and corrective-action tracking.

### Tests for User Story 2

- [X] T020 [P] [US2] Add incident opening and assignment tests in `packages/incident-response/src/__tests__/incident.test.ts`
- [X] T021 [P] [US2] Add incident transition validation and sev-1 closure guard tests in `packages/incident-response/src/__tests__/incident.test.ts`
- [X] T022 [P] [US2] Add timeline append and evidence preservation tests in `packages/incident-response/src/__tests__/evidence.test.ts`

### Implementation for User Story 2

- [X] T023 [US2] Implement incident creation, assignment, and transition logic in `packages/incident-response/src/incident.ts`
- [X] T024 [US2] Implement append-only timeline entry helpers in `packages/incident-response/src/incident.ts`
- [X] T025 [US2] Implement minimal evidence reference helpers in `packages/incident-response/src/evidence.ts`
- [X] T026 [US2] Emit incident lifecycle contract docs in `docs/runbooks/incident-response.md`

**Checkpoint**: Incident lifecycle is functional and independently testable.

---

## Phase 5: User Story 3 - Track Breach Notification Obligations (Priority: P1)

**Goal**: Track personal-data breach review, notification obligations, deadlines, alerts, and counsel/operator export packets.

**Independent Test**: Create incidents with awareness time, affected jurisdictions, personal-data involvement, and counterparties; verify GDPR 72-hour, data-subject, US state/counsel, and contractual obligations plus export packet contents.

### Tests for User Story 3

- [X] T027 [P] [US3] Add breach notification deadline tests in `packages/incident-response/src/__tests__/deadlines.test.ts`
- [X] T028 [P] [US3] Add approaching/overdue notification alert tests in `packages/incident-response/src/__tests__/deadlines.test.ts`
- [X] T029 [P] [US3] Add evidence and notification packet export tests in `packages/incident-response/src/__tests__/export.test.ts`

### Implementation for User Story 3

- [X] T030 [US3] Implement notification obligation computation in `packages/incident-response/src/deadlines.ts`
- [X] T031 [US3] Implement approaching and overdue deadline signal creation in `packages/incident-response/src/deadlines.ts`
- [X] T032 [US3] Implement counsel/operator evidence packet export in `packages/incident-response/src/export.ts`
- [X] T033 [US3] Document breach notification workflow in `docs/runbooks/incident-response.md`

**Checkpoint**: Breach-notification tracking and export are functional and independently testable.

---

## Phase 6: User Story 4 - Execute Runbooks and Tabletop Evidence (Priority: P2)

**Goal**: Operators have sev-1/2/3 runbooks and tabletop evidence for Stage 8 readiness.

**Independent Test**: Follow cross-side leakage, credential compromise, and monitoring/deadline failure tabletop scenarios and verify each produces expected incident/evidence/notification/postmortem artifacts and follow-ups.

### Tests for User Story 4

- [X] T034 [P] [US4] Add tabletop scenario validation tests in `packages/incident-response/src/__tests__/tabletop.test.ts`
- [X] T035 [P] [US4] Add runbook content coverage tests for sev-1/2/3 and required scenarios in `packages/incident-response/src/__tests__/runbook-docs.test.ts`

### Implementation for User Story 4

- [X] T036 [US4] Implement tabletop scenario definitions in `packages/incident-response/src/tabletop.ts`
- [X] T037 [US4] Finalize sev-1/2/3 runbooks in `docs/runbooks/incident-response.md`
- [X] T038 [US4] Finalize tabletop drill guide in `docs/runbooks/incident-response-tabletop.md`
- [X] T039 [US4] Record F24 tabletop and validation evidence in `.specify/specs/024-incident-response/quickstart-run-2026-05-26.md`

**Checkpoint**: Runbooks and tabletop evidence satisfy the Stage 8 F24 gate.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Security review, analysis, validation, and PR readiness.

- [X] T040 [P] Add F24 threat model covering missed sev-1 detection, alert fatigue/dedupe errors, breach-clock miscalculation, evidence overcollection, Sentry outage, and unauthorized incident mutation in `.specify/specs/024-incident-response/reviews/threat-model.md`
- [X] T041 [P] Add F24 security review artifact in `.specify/specs/024-incident-response/reviews/security-review.md`
- [X] T042 [P] Add F24 code review artifact in `.specify/specs/024-incident-response/reviews/code-review.md`
- [X] T043 Update `docs/DOCUMENTATION_OVERVIEW.md` with F24 incident-response and monitoring documentation references
- [X] T044 Run `/speckit-analyze` and resolve all F24 spec/plan/tasks consistency findings
- [X] T045 Run focused F24 tests and record output in `.specify/specs/024-incident-response/quickstart-run-2026-05-26.md`
- [X] T046 Run workspace verification: `pnpm --filter @spyglass/incident-response test`, `pnpm --filter @spyglass/incident-response type-check`, `pnpm --filter @spyglass/incident-response lint`, `pnpm type-check`, `pnpm lint`, `pnpm build`, and `bash scripts/check-principal-coverage.sh`
- [X] T047 Review final diff, update `.specify/roadmap.md` with implementation-ready status, commit, push, open PR, and verify checks/mergeability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **US1 Detection (Phase 3)**: Depends on Foundation; should complete before incident opening automation.
- **US2 Incident Lifecycle (Phase 4)**: Depends on Foundation and can use US1 signals.
- **US3 Breach Notification (Phase 5)**: Depends on US2 incident shape and awareness time.
- **US4 Runbooks/Tabletop (Phase 6)**: Depends on US1-US3 behavior so procedures reference real artifacts.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP detection foundation; no dependency on other stories after Phase 2.
- **User Story 2 (P1)**: Requires base incident types and benefits from US1 signal envelopes.
- **User Story 3 (P1)**: Requires incident awareness time and evidence references.
- **User Story 4 (P2)**: Requires implemented behavior from US1-US3 for credible tabletop evidence.

### Parallel Opportunities

- T002-T004 can run in parallel after T001.
- T006, T009-T010, and T012 can run in parallel during foundation work.
- US1 tests T013-T015 can run in parallel.
- US2 tests T020-T022 can run in parallel.
- US3 tests T027-T029 can run in parallel.
- Review artifacts T040-T042 can be drafted in parallel after behavior stabilizes.

---

## Parallel Example: User Story 3

```bash
Task: "Add breach notification deadline tests in packages/incident-response/src/__tests__/deadlines.test.ts"
Task: "Add approaching/overdue notification alert tests in packages/incident-response/src/__tests__/deadlines.test.ts"
Task: "Add evidence and notification packet export tests in packages/incident-response/src/__tests__/export.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 monitoring-signal classification.
3. Complete US2 incident lifecycle.
4. Validate a sev-1 cross-side leakage signal can become an incident with evidence and closure guards.

### Incremental Delivery

1. Package, schema, and contract foundations.
2. Detection classification.
3. Incident lifecycle and evidence references.
4. Breach-notification deadlines and export.
5. Runbooks/tabletop evidence.
6. Reviews, quickstart evidence, workspace validation, analyze remediation, PR.

### Quality Gates

- Cross-side leakage and audit-chain failures must be sev-1 in tests.
- GDPR 72-hour deadline computation must be deterministic and test-covered.
- Evidence export must avoid embedding unnecessary personal data.
- Production-like Sentry configuration must fail closed when missing.
- Stage 8 tabletop evidence must exist before F24 closure.
