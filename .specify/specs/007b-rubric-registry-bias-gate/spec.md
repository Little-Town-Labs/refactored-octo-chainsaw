# Feature Specification: F07b Rubric Registry + Bias-Test Dispatch Gate

**Feature Branch**: `007b-rubric-registry-bias-gate`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Next substantive feature is F07b: Rubric Registry + bias-test dispatch gate. Add immutable rubric versions, bias_test_ref enforcement, deterministic weighted scoring, and dispatch refusal when a rubric lacks required bias-test evidence."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Immutable Rubrics for Dispatch (Priority: P1)

As the Parley dispatcher, I need a `(rubric_id, version)` reference to resolve to exactly one immutable rubric definition, so every scored run uses a durable, auditable scoring policy.

**Why this priority**: Rubric resolution is the remaining Stage 3 P0 blocker. Parley cannot safely dispatch scored runs if rubric versions are mutable, ambiguous, unpublished, or missing required evidence.

**Independent Test**: Resolve an existing published rubric by id and version, verify its dimensions, weights, provenance, and `bias_test_ref`, and verify attempts to overwrite the same id/version are rejected.

**Acceptance Scenarios**:

1. **Given** a published rubric version exists, **When** dispatch resolves its `(rubric_id, version)`, **Then** the registry returns the exact immutable definition, provenance, normalized weights, bias-test reference, and audit evidence.
2. **Given** a rubric version already exists, **When** an operator attempts to write a different definition to the same `(rubric_id, version)`, **Then** the registry rejects the change as an immutable-version violation.
3. **Given** a missing or unpublished rubric reference, **When** dispatch resolution runs, **Then** dispatch receives a structured denial and does not continue.

---

### User Story 2 - Gate Dispatch on Bias-Test Evidence (Priority: P1)

As compliance policy, I need production dispatch to refuse any rubric version without completed bias-test evidence, so AEDT scoring cannot run outside the bias-audit-ready posture required by the constitution.

**Why this priority**: Constitution I.A primitive 3 and I.A.2 make bias-audit-ready dossier shape and material-change audit cadence mandatory before Parley runtime work.

**Independent Test**: Attempt dispatch with rubrics whose bias-test references are missing, incomplete, expired, superseded, or mismatched to the rubric content hash, and verify each refuses dispatch with stable reason codes.

**Acceptance Scenarios**:

1. **Given** a rubric version has no `bias_test_ref`, **When** production dispatch validates it, **Then** dispatch is refused with `rubric_missing_bias_test`.
2. **Given** a rubric has a `bias_test_ref` whose artifact is incomplete or rejected, **When** dispatch validates it, **Then** dispatch is refused with `rubric_bias_test_incomplete`.
3. **Given** a rubric has a completed bias-test artifact bound to the rubric content hash, **When** dispatch validates it, **Then** dispatch may proceed to later gates.

---

### User Story 3 - Compute Weighted Scores Deterministically (Priority: P1)

As the harness, I need weighted totals computed from rubric dimensions outside the model, so scoring is reproducible and model-produced holistic scores cannot override policy.

**Why this priority**: The roadmap and Parley notes require deterministic harness scoring and CI-gated auditing when a model emits its own holistic score.

**Independent Test**: Submit per-dimension scores for a rubric, verify the weighted total is deterministic and rounded consistently, and verify model-produced holistic totals are ignored while creating a regression audit signal.

**Acceptance Scenarios**:

1. **Given** a rubric with normalized dimension weights, **When** per-dimension scores are submitted, **Then** the harness computes the same weighted total on every run.
2. **Given** a model output includes a holistic score, **When** score aggregation runs, **Then** the holistic score is ignored and an audit/regression signal is emitted.
3. **Given** a required dimension score is missing or out of range, **When** aggregation runs, **Then** scoring fails closed with a structured reason code.

---

### User Story 4 - Review Rubric and Bias-Test History (Priority: P2)

As compliance staff or counsel, I need scoped read access to rubric versions, bias-test artifacts, and dispatch denials, so I can reconstruct which scoring policy and evidence governed a run.

**Why this priority**: Rubric and bias-test records are compliance evidence; reviewers need bounded history without raw database access.

**Independent Test**: Query rubric versions, bias-test artifacts, and dispatch denials with and without review scope, verify unscoped access is denied, and verify scoped reads include only policy/evidence metadata.

**Acceptance Scenarios**:

1. **Given** a scoped reviewer requests a rubric version, **When** the registry returns it, **Then** the response includes version metadata, dimensions, weights, evidence refs, publication state, and audit event ids.
2. **Given** a scoped reviewer requests dispatch denials for a rubric, **When** the review read runs, **Then** the response includes stable reason codes and evidence refs without exposing raw applicant content.
3. **Given** an unscoped actor requests rubric history, **When** authorization runs, **Then** access is denied by default.

### Edge Cases

- A rubric version is published while dispatch is resolving a different version.
- A completed bias-test artifact references a prior rubric content hash.
- A bias-test artifact is complete but no longer valid for the active jurisdiction posture.
- Rubric dimension weights do not sum to the expected total before normalization.
- A model emits a holistic score, rank, or recommendation that conflicts with deterministic dimension scoring.
- A deprecated rubric remains needed for historical dossier reconstruction.
- A rubric references prompt scoring guidance, which is prohibited by F07b boundaries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain immutable rubric versions addressed by `(rubric_id, version)`.
- **FR-002**: System MUST reject attempts to mutate, rename, or overwrite an existing rubric version.
- **FR-003**: System MUST store each rubric version's side/scope, dimensions, per-dimension allowed score range, dimension weights, scoring aggregation policy, description, author, reviewer, publication status, content hash, and audit evidence.
- **FR-004**: System MUST require every dispatch-eligible rubric version to carry a `bias_test_ref`.
- **FR-005**: System MUST store bias-test artifact metadata, including artifact id, rubric id/version, rubric content hash, methodology ref, status, reviewer, completed timestamp, jurisdiction posture coverage, and audit evidence.
- **FR-006**: System MUST refuse production dispatch when a rubric has no bias-test reference, an incomplete/rejected artifact, an artifact bound to a different rubric hash, or insufficient jurisdiction coverage.
- **FR-007**: System MUST return stable structured failures for missing, unpublished, deprecated, invalid, or bias-test-unverified rubric references.
- **FR-008**: System MUST compute weighted totals deterministically from per-dimension scores using registry weights and a documented rounding policy.
- **FR-009**: System MUST ignore model-produced holistic scores for final scoring and emit an auditable regression signal when such scores appear.
- **FR-010**: System MUST keep prompt templates free of dimension weights and scoring guidance; rubric resolution and prompt rendering remain separate paths.
- **FR-011**: System MUST preserve historical rubric and bias-test resolution for already-dispatched runs after newer versions are published or older versions are deprecated.
- **FR-012**: System MUST emit canonical audit evidence for rubric publication, deprecation, bias-test artifact registration, and dispatch refusal.
- **FR-013**: System MUST allow scoped reviewers to read bounded rubric, bias-test, and dispatch-denial history and deny unscoped reads by default.
- **FR-014**: System MUST keep F07b boundaries clear: contract pinning belongs to F07a, full runner orchestration belongs to F08, tool catalog enforcement belongs to F08.5, and privacy filtering belongs to F09.

### Key Entities

- **Rubric Version**: Immutable scoring policy artifact containing dimension definitions, score ranges, weights, aggregation policy, publication state, provenance, content hash, and bias-test reference.
- **Rubric Dimension**: A named scoring dimension with description, allowed score range, weight, and evidence expectations.
- **Bias-Test Artifact**: Compliance evidence proving a rubric version has completed the required bias-test process for a declared methodology and jurisdiction posture.
- **Rubric Dispatch Gate Result**: Dispatch-facing allow/deny outcome for a rubric reference, including stable reason code, resolved rubric metadata, bias-test evidence refs, and audit refs.
- **Weighted Score Result**: Deterministic score aggregation output including per-dimension scores, normalized weights, total score, rounding metadata, and model-holistic-score regression signal when present.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid published rubric reference resolves deterministically to one definition in every package-level test run.
- **SC-002**: Mutation attempts against an existing `(rubric_id, version)` are rejected in tests with `rubric_version_mutation_error`.
- **SC-003**: Production dispatch refuses rubrics with missing, incomplete, rejected, stale, or mismatched bias-test evidence using stable reason codes.
- **SC-004**: Weighted score totals are reproducible across repeated test runs from the same per-dimension inputs.
- **SC-005**: Model-produced holistic scores are ignored for final totals and produce an auditable regression signal in tests.
- **SC-006**: Scoped review reads can retrieve rubric history, bias-test artifacts, and dispatch denials by rubric id, version, status, date range, and limit without raw database access.
- **SC-007**: Initial package verification passes unit tests, type-check, lint, schema-lint, contract schema validation, and an F07b staged quickstart run.

## Assumptions

- F07a is already merged and stores rubric refs in agent contracts; F07b owns rubric definitions, bias-test artifacts, and rubric dispatch gating.
- Bias-test methodology is a policy artifact referenced by F07b, not hard-coded in the harness.
- Production dispatch means the posture where AEDT scoring could influence hiring outcomes; non-production tests may seed draft or incomplete evidence only when the test asserts refusal.
- Publication and review are operator-scoped actions using existing principal and scope conventions.
- The registry is backend/compliance infrastructure; no user-facing page is included in this feature.
