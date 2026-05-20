# Feature Specification: F07a Agent Contract Registry

**Feature Branch**: `007-agent-contract-registry`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "Proceed with F07 after F06; start the F07a Agent Contract Registry from the roadmap."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolve Immutable Agent Contracts (Priority: P1)

As the Parley dispatcher, I need a `(contract_id, version)` reference to resolve to exactly one immutable contract definition, so each run starts from a durable, auditable policy artifact.

**Why this priority**: Contract resolution is the core F07a dependency for F08. Parley cannot safely dispatch runs if contract references are mutable, missing, or ambiguous.

**Independent Test**: Resolve an existing seeker or employer contract by id and version, verify the returned definition contains all required refs and runtime settings, and verify attempts to overwrite the same id/version are rejected.

**Acceptance Scenarios**:

1. **Given** a reviewed contract version exists, **When** the dispatcher resolves its `(contract_id, version)`, **Then** the registry returns the exact definition, provenance, and referenced prompt, rubric, tool surface, model, and runtime settings.
2. **Given** a contract version already exists, **When** an operator attempts to write a different definition to the same `(contract_id, version)`, **Then** the registry rejects the change as an immutable-version violation.
3. **Given** a missing contract reference, **When** the dispatcher resolves it, **Then** dispatch receives a structured `missing_contract` failure and does not continue.

---

### User Story 2 - Publish Reviewed Contract Versions (Priority: P1)

As a policy operator, I need to publish new contract versions with human review provenance and canonical audit evidence, so contract changes are accountable release events.

**Why this priority**: Constitution III.3 and Parley require contract changes to be versioned policy artifacts, not mutable runtime configuration.

**Independent Test**: Publish a new version with author and reviewer provenance, verify the version becomes resolvable, and verify the publication produces canonical audit evidence before dispatch can reference it.

**Acceptance Scenarios**:

1. **Given** an operator has the required scope and review metadata, **When** they publish a new contract version, **Then** the registry stores it with author, reviewer, review status, and canonical audit evidence.
2. **Given** required provenance is missing, **When** publication is attempted, **Then** the registry denies publication and leaves no active contract version behind.
3. **Given** a contract version is deprecated for new runs, **When** a dispatcher resolves it for a new dispatch, **Then** the registry returns a structured `contract_deprecated` dispatch denial while preserving historical resolution for evidence review.

---

### User Story 3 - Validate Dispatch References (Priority: P2)

As the Parley dispatcher, I need contract references checked against their dependent prompt, rubric, tool-surface, model, and runtime settings, so dispatch fails before a run starts when a pinned artifact is unavailable or invalid.

**Why this priority**: Contract immutability alone is not enough; dispatch must fail closed when referenced artifacts are not available for the active production posture.

**Independent Test**: Validate a contract with missing prompt, rubric, or tool-surface refs and verify each blocks dispatch with a stable reason code while unrelated valid contracts still resolve.

**Acceptance Scenarios**:

1. **Given** a contract pins an unavailable prompt template, **When** dispatch validation runs, **Then** the result is `prompt_template_unresolvable` and no run is dispatched.
2. **Given** a contract pins a rubric that lacks a completed bias-test artifact, **When** dispatch validation runs, **Then** the result is `rubric_missing_bias_test` and no run is dispatched.
3. **Given** a contract runtime setting exceeds platform ceilings, **When** dispatch validation runs, **Then** the effective setting is clamped and the clamping is recorded for audit.

---

### User Story 4 - Review Contract History (Priority: P2)

As compliance staff or counsel, I need scoped read access to contract versions and publication history, so I can reconstruct which policy artifacts governed a run without raw database access.

**Why this priority**: F07a is part of the compliance spine. Reviewers need durable provenance and historical reads before dossiers and incident packages depend on contract refs.

**Independent Test**: Query contract versions and publication history with and without review scope, verify unscoped access is denied, and verify scoped results include only policy metadata and evidence refs.

**Acceptance Scenarios**:

1. **Given** a scoped reviewer requests a contract version, **When** the registry returns it, **Then** the response includes version metadata, provenance, dependency refs, deprecation state, and audit event id.
2. **Given** an unscoped actor requests contract history, **When** authorization runs, **Then** access is denied by default.

### Edge Cases

- A run is in flight when a newer version is published.
- A contract references a rubric that later becomes unavailable for new production dispatch.
- A contract deprecation date is in the past but historical evidence needs the original definition.
- A contract has unknown extension fields introduced by a newer harness version.
- Runtime settings exceed current harness ceilings.
- A publish request has an empty description, missing reviewer, or missing audit principal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST maintain immutable agent contract versions addressed by `(contract_id, version)`.
- **FR-002**: System MUST reject attempts to mutate, rename, or overwrite an existing contract version.
- **FR-003**: System MUST store each contract version's side, prompt template ref, rubric ref, tool-surface ref, model selection, runtime settings, description, authorship, reviewer, and review status.
- **FR-004**: System MUST require scoped publication by an attributable principal before a contract version can be used for new dispatch.
- **FR-005**: System MUST emit canonical audit evidence for every successful contract publication and deprecation.
- **FR-006**: System MUST return stable structured failures for missing, deprecated, invalid, or dependency-unresolvable contracts.
- **FR-007**: System MUST validate contract dependencies at write time and dispatch time.
- **FR-008**: System MUST preserve historical contract resolution even after newer versions are published or a version is deprecated.
- **FR-009**: System MUST allow scoped reviewers to read bounded contract history and deny unscoped reads by default.
- **FR-010**: System MUST ignore unknown top-level extension fields during reads while preserving them for future-compatible audit reconstruction.
- **FR-011**: System MUST expose a dispatch-facing resolution result that includes effective runtime settings and any ceiling clamps.
- **FR-012**: System MUST keep F07a boundaries clear: rubric definitions and bias-test methodology belong to F07b, tool catalog enforcement belongs to F08.5, and run execution belongs to F08.

### Key Entities

- **Agent Contract Version**: Immutable policy artifact for one side of a Parley run, including versioned refs to prompt template, rubric, tool surface, model, runtime settings, and provenance.
- **Contract Publication Event**: Evidence row for publishing or deprecating a contract version, including actor, reviewer, reason, correlation id, and canonical audit event.
- **Contract Resolution Result**: Dispatch-facing outcome for a contract reference, including allow/deny status, reason code, resolved contract, effective runtime settings, clamps, and evidence refs.
- **Contract Dependency Ref**: Versioned pointer to prompt template, rubric, tool-surface, or model artifact consumed by the contract.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid contract reference resolves deterministically to one definition in every package-level test run.
- **SC-002**: Mutation attempts against an existing `(contract_id, version)` are rejected in tests with `contract_version_mutation_error`.
- **SC-003**: Missing or invalid contract dependencies block dispatch with stable reason codes in tests.
- **SC-004**: Every successful publish/deprecate operation has an associated canonical audit event id.
- **SC-005**: Scoped review reads can retrieve contract history by contract id, side, date range, and limit without raw database access.
- **SC-006**: Initial package verification passes unit tests, type-check, lint, schema-lint, and an F07a staged quickstart run.

## Assumptions

- F07a starts with the Agent Contract Registry only; F07b will implement full rubric registry and bias-test artifact storage.
- Prompt template and tool-surface registries may be represented as dependency refs and validation interfaces until their owning features land.
- Publication and review are operator-scoped actions using existing principal and scope conventions.
- The registry is backend/compliance infrastructure; no user-facing page is included in this feature.
- In-flight runs freeze resolved contract content at dispatch and are not invalidated by later registry changes.
