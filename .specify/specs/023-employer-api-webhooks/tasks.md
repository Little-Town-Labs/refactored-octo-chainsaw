# Tasks: Employer REST API + Signed Webhooks

**Input**: Design documents from `.specify/specs/023-employer-api-webhooks/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Required. F23 exposes authenticated external contracts and signed delivery; contract, auth, idempotency, signature, retry, and fail-closed tests must be written before implementation where feasible.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish F23 contract and integration module structure.

- [X] T001 Create `packages/api-contracts/openapi/` and copy initial employer API contract from `.specify/specs/023-employer-api-webhooks/contracts/employer-api.openapi.yaml` to `packages/api-contracts/openapi/employer-api.v1.yaml`
- [X] T002 [P] Add webhook event schema fixture from `.specify/specs/023-employer-api-webhooks/contracts/webhook-events.schema.yaml` to `packages/api-contracts/openapi/webhook-events.v1.yaml`
- [X] T003 [P] Create `apps/web/src/employer-api/` module skeleton with `auth.ts`, `errors.ts`, `schemas.ts`, `idempotency.ts`, `req-service.ts`, `req-handlers.ts`, `webhook-endpoints.ts`, `webhook-signing.ts`, `webhook-delivery.ts`, and `webhook-repo.ts`
- [X] T004 [P] Create route directory skeleton under `apps/web/app/api/employer/v1/reqs/`, `apps/web/app/api/employer/v1/reqs/[id]/`, `apps/web/app/api/employer/v1/reqs/[id]/close/`, `apps/web/app/api/employer/v1/webhooks/`, and `apps/web/app/api/employer/v1/webhooks/[id]/`
- [X] T005 Update `packages/api-contracts/src/index.ts` exports for employer API and webhook event contract modules
- [X] T006 Update `.specify/roadmap.md` current status and changelog to mark F23 active on branch `023-employer-api-webhooks`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data, auth, error, and contract foundations that block all user stories.

**CRITICAL**: No user story implementation should proceed until these foundations are complete.

- [X] T007 [P] Add F23 schema tables in `packages/db/src/schema/employer-api-credentials.ts` for employer API credentials and credential audit metadata
- [X] T008 [P] Add F23 schema tables in `packages/db/src/schema/employer-api-idempotency.ts` for idempotency records and request fingerprints
- [X] T009 [P] Add F23 schema tables in `packages/db/src/schema/employer-webhooks.ts` for webhook endpoints, signing secrets, events, and delivery receipts
- [X] T010 Export F23 schema modules from `packages/db/src/schema/index.ts`
- [X] T011 Add schema convention coverage for F23 tables in `packages/db/src/__tests__/schema.test.ts`
- [X] T012 [P] Define shared API error shape and response helpers in `apps/web/src/employer-api/errors.ts`
- [X] T013 [P] Define req, credential, webhook endpoint, webhook event, and delivery validation schemas in `apps/web/src/employer-api/schemas.ts`
- [X] T014 Implement employer service credential authentication and scope checks in `apps/web/src/employer-api/auth.ts`
- [X] T015 Implement idempotency request fingerprinting and replay/conflict helpers in `apps/web/src/employer-api/idempotency.ts`
- [X] T016 [P] Add contract validation tests in `packages/api-contracts/src/__tests__/employer-api-contract.test.ts`
- [X] T017 [P] Add auth/error/idempotency unit tests in `apps/web/src/employer-api/__tests__/auth-errors-idempotency.test.ts`
- [X] T018 [P] Add webhook endpoint URL validation tests for HTTPS-only, localhost, private IPv4/IPv6, link-local, and redirect rejection in `apps/web/src/employer-api/__tests__/webhook-url-validation.test.ts`

**Checkpoint**: Foundation ready; OpenAPI contract validates, schemas exist, auth/error/idempotency helpers are tested.

---

## Phase 3: User Story 1 - Publish Employer API Contract (Priority: P1)

**Goal**: Publish a versioned, machine-readable employer API contract with docs, errors, idempotency, and deprecation semantics.

**Independent Test**: Validate the contract and confirm every exposed operation has auth, request, response, error, idempotency, and deprecation semantics without ATS, seeker API, or A2A runtime operations.

### Tests for User Story 1

- [X] T019 [P] [US1] Add contract test for required auth/error/idempotency/deprecation metadata in `packages/api-contracts/src/__tests__/employer-api-contract.test.ts`
- [X] T020 [P] [US1] Add N-2 compatibility regression test for prior supported major versions and deprecated operations in `packages/api-contracts/src/__tests__/employer-api-contract.test.ts`
- [X] T021 [P] [US1] Add prohibited-surface contract test rejecting ATS, seeker API, bidirectional sync, billing, and A2A runtime paths in `packages/api-contracts/src/__tests__/employer-api-contract.test.ts`

### Implementation for User Story 1

- [X] T022 [US1] Finalize req and webhook endpoint operations in `packages/api-contracts/openapi/employer-api.v1.yaml`
- [X] T023 [US1] Add common error, pagination, idempotency, deprecation, and sunset schema components in `packages/api-contracts/openapi/employer-api.v1.yaml`
- [X] T024 [US1] Add contract version metadata/hash/status/deprecation exports in `packages/api-contracts/src/employer-api.ts`
- [X] T025 [US1] Add generated or hand-maintained TypeScript contract exports in `packages/api-contracts/src/employer-api.ts`
- [X] T026 [US1] Add webhook event contract exports in `packages/api-contracts/src/webhook-events.ts`
- [X] T027 [US1] Update `packages/api-contracts/README.md` with F23 public API, versioning, compatibility, and validation guidance

**Checkpoint**: Employer API contract is complete and independently testable.

---

## Phase 4: User Story 2 - Manage Reqs Through REST (Priority: P1)

**Goal**: Employer integrations can create, read, amend, and close org-scoped reqs through REST with idempotency and audit behavior.

**Independent Test**: Use a scoped employer credential to create a req, replay the create, read it, update allowed fields, close it, and verify validation/auth failures.

### Tests for User Story 2

- [X] T028 [P] [US2] Add req service tests for create/read/update/close success in `apps/web/src/employer-api/__tests__/req-service.test.ts`
- [X] T029 [P] [US2] Add REST route handler tests for `POST /reqs`, `GET /reqs`, `GET/PATCH /reqs/{id}`, and `POST /reqs/{id}/close` in `apps/web/src/employer-api/__tests__/req-routes.test.ts`
- [X] T030 [P] [US2] Add req idempotency tests for exact replay and mismatched body conflict in `apps/web/src/employer-api/__tests__/req-idempotency.test.ts`
- [X] T031 [P] [US2] Add cross-organization, wrong-scope, expired, revoked, and anonymous request tests in `apps/web/src/employer-api/__tests__/req-authz.test.ts`

### Implementation for User Story 2

- [X] T032 [US2] Implement employer req API service over existing ticket workflows in `apps/web/src/employer-api/req-service.ts`
- [X] T033 [US2] Implement request parsing and response mapping for req resources in `apps/web/src/employer-api/req-handlers.ts`
- [X] T034 [US2] Implement list/create route handlers in `apps/web/app/api/employer/v1/reqs/route.ts`
- [X] T035 [US2] Implement read/update route handlers in `apps/web/app/api/employer/v1/reqs/[id]/route.ts`
- [X] T036 [US2] Implement close route handler in `apps/web/app/api/employer/v1/reqs/[id]/close/route.ts`
- [X] T037 [US2] Wire req mutations to idempotency helpers in `apps/web/src/employer-api/idempotency.ts`
- [X] T038 [US2] Emit canonical audit events for API req create/update/close outcomes in `apps/web/src/employer-api/req-service.ts`
- [X] T039 [US2] Ensure all F23 REST route handlers satisfy principal coverage in `scripts/check-principal-coverage.sh`

**Checkpoint**: REST req management is functional and independently testable.

---

## Phase 5: User Story 3 - Receive Signed Candidate Webhooks (Priority: P1)

**Goal**: Employer integrations can register endpoints and receive signed match notification and dossier delivery webhooks with retry receipts.

**Independent Test**: Register endpoint, trigger signed delivery, verify signature, simulate transient failures, and confirm retry/terminal receipts.

### Tests for User Story 3

- [X] T040 [P] [US3] Add webhook endpoint repository tests in `apps/web/src/employer-api/__tests__/webhook-endpoints.test.ts`
- [X] T041 [P] [US3] Add webhook signature tests for valid, tampered, stale, unknown-key, and replay inputs in `apps/web/src/employer-api/__tests__/webhook-signing.test.ts`
- [X] T042 [P] [US3] Add webhook delivery tests for success, transient retry, bounded backoff, terminal failure, and duplicate acknowledgement in `apps/web/src/employer-api/__tests__/webhook-delivery.test.ts`
- [X] T043 [P] [US3] Add fail-closed dossier projection/signature tests in `apps/web/src/employer-api/__tests__/webhook-dossier-gate.test.ts`
- [X] T044 [P] [US3] Add route handler tests for webhook endpoint list/create/disable/delete in `apps/web/src/employer-api/__tests__/webhook-routes.test.ts`

### Implementation for User Story 3

- [X] T045 [US3] Implement webhook endpoint create/list/disable/delete repository helpers in `apps/web/src/employer-api/webhook-repo.ts`
- [X] T046 [US3] Implement webhook endpoint lifecycle service with SSRF-safe URL validation in `apps/web/src/employer-api/webhook-endpoints.ts`
- [X] T047 [US3] Implement webhook endpoint list/create route handlers in `apps/web/app/api/employer/v1/webhooks/route.ts`
- [X] T048 [US3] Implement webhook endpoint disable/delete route handlers in `apps/web/app/api/employer/v1/webhooks/[id]/route.ts`
- [X] T049 [US3] Implement HMAC signing, header creation, timestamp tolerance, and verification helpers in `apps/web/src/employer-api/webhook-signing.ts`
- [X] T050 [US3] Implement webhook event creation and dossier projection eligibility checks in `apps/web/src/employer-api/webhook-delivery.ts`
- [X] T051 [US3] Implement delivery attempt recording, response classification, bounded retry scheduling, and terminal failure handling in `apps/web/src/employer-api/webhook-delivery.ts`
- [X] T052 [US3] Emit audit events for webhook endpoint lifecycle, delivery attempts, acknowledgements, retries, suppressions, and terminal failures in `apps/web/src/employer-api/webhook-delivery.ts`

**Checkpoint**: Signed webhook delivery is functional and independently testable.

---

## Phase 6: User Story 4 - Operate and Rotate Integration Credentials (Priority: P2)

**Goal**: Employer admins can issue, list, rotate, and revoke API credentials and webhook signing secrets safely.

**Independent Test**: Issue credentials/secrets, use them, rotate them, reject old material after overlap, and verify audit records.

### Tests for User Story 4

- [X] T053 [P] [US4] Add API credential lifecycle tests in `apps/web/src/employer-api/__tests__/credential-lifecycle.test.ts`
- [X] T054 [P] [US4] Add signing secret rotation tests in `apps/web/src/employer-api/__tests__/signing-secret-rotation.test.ts`
- [X] T055 [P] [US4] Add employer console integration credential action/view tests in `apps/web/src/employer-console/__tests__/integration-credentials.test.tsx`

### Implementation for User Story 4

- [X] T056 [US4] Implement API credential issue/list/rotate/revoke repository helpers in `apps/web/src/employer-api/auth.ts`
- [X] T057 [US4] Implement webhook signing secret rotation and revocation helpers in `apps/web/src/employer-api/webhook-signing.ts`
- [X] T058 [US4] Add employer console integration credential actions in `apps/web/src/employer-console/integration-credentials-action.ts`
- [X] T059 [US4] Add employer console integration credential view in `apps/web/src/employer-console/integration-credentials-view.tsx`
- [X] T060 [US4] Add employer console webhook endpoint management view in `apps/web/src/employer-console/webhook-endpoints-view.tsx`
- [X] T061 [US4] Wire integration views into employer console navigation in `apps/web/app/(employer)/employer/console/layout.tsx`
- [X] T062 [US4] Ensure credential and secret material is displayed once and never returned by list/read paths in `apps/web/src/employer-api/auth.ts`

**Checkpoint**: Integration credential lifecycle is functional and independently testable.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Security review, documentation, validation, and roadmap closure.

- [X] T063 [P] Add F23 threat model covering service credential theft, webhook replay, signing-secret rotation, SSRF endpoint registration, cross-org access, idempotency abuse, and dossier projection leakage in `.specify/specs/023-employer-api-webhooks/reviews/threat-model.md`
- [X] T064 [P] Add F23 security review artifact in `.specify/specs/023-employer-api-webhooks/reviews/security-review.md`
- [X] T065 [P] Add F23 code review artifact in `.specify/specs/023-employer-api-webhooks/reviews/code-review.md`
- [X] T066 Update `docs/DOCUMENTATION_OVERVIEW.md` with F23 API contract and webhook delivery documentation references
- [X] T067 Run quickstart Scenario 1 and record contract validation evidence in `.specify/specs/023-employer-api-webhooks/quickstart-run-2026-05-25.md`
- [X] T068 Run focused F23 tests and record REST/webhook evidence in `.specify/specs/023-employer-api-webhooks/quickstart-run-2026-05-25.md`
- [X] T069 Run workspace verification: `pnpm format:check`, `pnpm type-check`, `pnpm lint`, focused tests, `pnpm build`, and `bash scripts/check-principal-coverage.sh`
- [X] T070 Run `/speckit-analyze` and resolve all F23 spec/plan/tasks consistency findings
- [X] T071 Review final diff, update `.specify/roadmap.md` with implementation-ready status, commit, push, open PR, and verify checks/mergeability

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup completion; blocks all user stories.
- **US1 Contract (Phase 3)**: Depends on Foundation; should complete before REST/webhook implementation is considered stable.
- **US2 REST Reqs (Phase 4)**: Depends on Foundation and US1 contract skeleton.
- **US3 Webhooks (Phase 5)**: Depends on Foundation and US1 contract skeleton; can proceed in parallel with US2 after shared schemas are stable.
- **US4 Credential Lifecycle (Phase 6)**: Depends on Foundation; can overlap with US2/US3 after auth and schema foundations exist.
- **Polish (Phase 7)**: Depends on desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: MVP contract foundation; no dependency on other stories after Phase 2.
- **User Story 2 (P1)**: Requires credential auth, idempotency, and req contract definitions.
- **User Story 3 (P1)**: Requires webhook endpoint schema, signing helpers, and dossier projection eligibility.
- **User Story 4 (P2)**: Requires credential and webhook secret tables; enhances operation of US2 and US3.

### Parallel Opportunities

- T002-T004 can run in parallel after T001.
- T007-T009, T012-T013, and T016-T018 can run in parallel after setup.
- US2 tests T028-T031 can run in parallel before US2 implementation.
- US3 tests T040-T044 can run in parallel before US3 implementation.
- US4 tests T053-T055 can run in parallel before US4 implementation.
- Review artifacts T063-T065 can be drafted in parallel once implementation behavior is known.

---

## Parallel Example: User Story 3

```bash
Task: "Add webhook signature tests for valid, tampered, stale, unknown-key, and replay inputs in apps/web/src/employer-api/__tests__/webhook-signing.test.ts"
Task: "Add webhook delivery tests for success, transient retry, bounded backoff, terminal failure, and duplicate acknowledgement in apps/web/src/employer-api/__tests__/webhook-delivery.test.ts"
Task: "Add fail-closed dossier projection/signature tests in apps/web/src/employer-api/__tests__/webhook-dossier-gate.test.ts"
```

---

## Implementation Strategy

### MVP First

1. Complete Phase 1 and Phase 2.
2. Complete US1 contract publication.
3. Complete US2 REST req management.
4. Validate that an employer can create and close a req using only the published contract.

### Incremental Delivery

1. Contract and shared foundations.
2. REST req API.
3. Signed webhook endpoint and delivery path.
4. Credential and signing-secret lifecycle UI/actions.
5. Reviews, quickstart evidence, workspace validation, analyze remediation, PR.

### Quality Gates

- Contract validation must pass before PR publication.
- Principal coverage must include all mutating route handlers/actions.
- Security review must explicitly cover webhook replay, SSRF endpoint registration, credential compromise, and cross-organization leakage.
- Unsigned or invalid dossier projections must fail closed in tests.
