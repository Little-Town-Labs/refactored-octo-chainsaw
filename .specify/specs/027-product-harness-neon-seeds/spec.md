# Feature Specification: Product Harness Neon Seeds

**Feature Branch**: `027-product-harness-neon-seeds`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "Proceed with PTH02 from the product harness roadmap: Neon branch + migration + seed lifecycle. Extend the product harness so product runs can create an isolated Neon branch, apply migrations, expose DATABASE_URL to scenario callbacks, seed deterministic lifecycle metadata, and clean up."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run in an Isolated Database Branch (Priority: P1)

An engineer can execute a product-readiness scenario inside a newly-created isolated database branch, receive a scoped database URL for the scenario, and see the branch identity recorded in the run metadata.

**Why this priority**: Alpha gate runs cannot be trusted unless they are isolated from production and from each other. Every later product gate depends on repeatable database lifecycle control.

**Independent Test**: Can be tested with a fake branch manager and migration runner that create a synthetic branch, expose a synthetic database URL to a callback, and assert that branch metadata is included in the completed run result.

**Acceptance Scenarios**:

1. **Given** valid Neon lifecycle configuration, **When** a product run starts, **Then** the harness creates a new branch from the configured parent branch and records the branch id, branch name, parent branch id, and database URL redaction status.
2. **Given** a scenario callback, **When** the branch is ready, **Then** the callback receives the branch-scoped database URL and branch metadata before it performs product workflow actions.
3. **Given** a completed scenario, **When** the run result is produced, **Then** the result includes lifecycle metadata linking the scenario id, run id, branch id, parent branch id, migration version, and seed version.

---

### User Story 2 - Apply Migrations Before Product Actions (Priority: P1)

An engineer can rely on the product harness to apply the current schema migrations to the isolated branch before any scenario action or seed action is allowed to run.

**Why this priority**: Product scenarios must exercise the same schema shape as the application. Running seeds or scenarios before migrations would create misleading failures or false passes.

**Independent Test**: Can be tested by injecting a migration runner spy and confirming that it runs after branch creation and before the scenario callback, while migration failures prevent scenario execution.

**Acceptance Scenarios**:

1. **Given** a newly-created branch, **When** migrations are configured, **Then** the harness applies migrations before invoking the scenario callback.
2. **Given** a migration failure, **When** the run lifecycle handles the error, **Then** the scenario callback is not invoked, the run is marked failed, and cleanup is still attempted.
3. **Given** a successful migration run, **When** lifecycle metadata is recorded, **Then** the migration folder or version identifier is included in safe run metadata.

---

### User Story 3 - Clean Up Reliably and Report Cleanup Status (Priority: P1)

An engineer or operator can see whether the isolated branch was deleted, retained for debugging, or failed cleanup, without leaking credentials into logs or reports.

**Why this priority**: Orphaned database branches create cost, privacy, and operational risk. Cleanup evidence is part of Alpha-readiness evidence.

**Independent Test**: Can be tested by injecting branch deletion success, retained-branch, and deletion-failure paths and asserting that the result records the correct cleanup status with no raw database URL.

**Acceptance Scenarios**:

1. **Given** a successful scenario, **When** the lifecycle finishes, **Then** the harness deletes the branch and records cleanup status as deleted.
2. **Given** a failed scenario, **When** cleanup policy is delete-on-failure, **Then** the harness still attempts deletion and records cleanup status independently from scenario status.
3. **Given** a retained debug run, **When** cleanup policy says retain, **Then** the branch is not deleted and the result clearly marks the branch as retained with a reason.
4. **Given** a cleanup failure, **When** the result is generated, **Then** the failure is visible as cleanup failure evidence and no raw credential-bearing database URL is emitted.

---

### User Story 4 - Seed Lifecycle Metadata for Later Factories (Priority: P2)

A maintainer can register a deterministic seed lifecycle step that records seed version and seed record references, while full product seed factories remain deferred to PTH04.

**Why this priority**: PTH02 should establish the lifecycle seam for seed execution without pulling in the larger seed factory scope too early.

**Independent Test**: Can be tested with a no-op seed callback that returns seed metadata and verifies that seed version and seed refs are preserved in lifecycle metadata.

**Acceptance Scenarios**:

1. **Given** a configured seed callback, **When** migrations complete, **Then** the seed callback runs before the scenario callback.
2. **Given** seed metadata, **When** the scenario result is generated, **Then** the result includes seed version and seed record references without embedding production data.
3. **Given** a seed failure, **When** the lifecycle handles the error, **Then** the scenario callback is not invoked, the run is marked failed, and cleanup is still attempted.

### Edge Cases

- Branch creation fails before a database URL exists: the run should fail with safe error metadata and should not attempt migration or scenario execution.
- Migration succeeds but seed fails: the run should fail, scenario execution should be skipped, and cleanup should still run.
- Scenario throws after using the database URL: the run should fail and cleanup should still run according to policy.
- Cleanup deletion fails: the run should expose cleanup failure separately from scenario status and mark the branch as potentially orphaned.
- Debug retention is requested: the run should mark retention explicitly and require a reason.
- A raw credential-bearing database URL appears in a step, assertion, artifact, or summary: validation should reject or redact it before report generation.
- Required Neon configuration is missing: local tests should fail fast with a typed configuration error; offline unit tests should remain able to run through fakes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a product database lifecycle runner that creates an isolated branch for a product harness run before migration, seed, or scenario callbacks execute.
- **FR-002**: System MUST accept lifecycle configuration for project identity, parent branch identity, branch naming prefix, migration source, cleanup policy, and optional seed version.
- **FR-003**: System MUST expose the branch-scoped database URL only to explicit migration, seed, and scenario callbacks that need it.
- **FR-004**: System MUST prevent raw credential-bearing database URLs from appearing in run summaries, report output, assertion text, artifact labels, or general metadata.
- **FR-005**: System MUST apply configured migrations after branch creation and before seed or scenario callbacks.
- **FR-006**: System MUST skip seed and scenario callbacks when migration fails.
- **FR-007**: System MUST support an optional seed callback that runs after migrations and before scenario execution.
- **FR-008**: System MUST skip scenario callbacks when seed execution fails.
- **FR-009**: System MUST pass safe branch metadata, migration metadata, and seed metadata to the scenario callback.
- **FR-010**: System MUST record lifecycle metadata in the run result, including branch id, branch name, parent branch id, migration source/version, seed version, cleanup policy, cleanup status, and redaction status.
- **FR-011**: System MUST attempt cleanup after branch creation whenever migration, seed, or scenario execution fails unless cleanup policy explicitly retains the branch.
- **FR-012**: System MUST record cleanup status independently from scenario status.
- **FR-013**: System MUST support cleanup statuses for deleted, retained, failed, and not-created lifecycle outcomes.
- **FR-014**: System MUST require an explicit retain reason when a run keeps a branch for debugging.
- **FR-015**: System MUST provide typed errors for branch creation, migration, seed, scenario, configuration, and cleanup failures.
- **FR-016**: System MUST include offline tests using fake lifecycle dependencies so developers can validate lifecycle ordering without Neon credentials.
- **FR-017**: System MUST include documentation that explains required environment variables, safe local usage, debug-retention policy, and cleanup behavior.
- **FR-018**: System MUST keep full deterministic product seed factories out of scope except for the lifecycle callback and seed metadata contract.
- **FR-019**: System MUST integrate with the PTH01 scenario/result contracts without changing their required top-level fields.
- **FR-020**: System MUST expose package-level entry points or commands that allow maintainers to type-check, test, and run a no-external-service lifecycle sample.

### Key Entities *(include if feature involves data)*

- **Product Database Lifecycle Config**: Run configuration for branch parent, branch naming, migration source, cleanup policy, and seed version.
- **Product Database Branch Context**: Branch-scoped execution context containing the credential-bearing database URL for callbacks and safe branch metadata for results.
- **Migration Execution**: The ordered application of current schema migrations to the isolated branch.
- **Seed Execution**: Optional deterministic setup step that returns seed version and seed record references for later result persistence.
- **Cleanup Result**: Evidence of whether the branch was deleted, retained, failed deletion, or never created.
- **Lifecycle Metadata**: Safe result metadata describing branch, migration, seed, cleanup, and redaction state without exposing secrets.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Offline unit tests prove lifecycle order as branch creation -> migration -> seed -> scenario -> cleanup for successful runs.
- **SC-002**: Offline unit tests prove migration, seed, and scenario failures still attempt cleanup when a branch was created.
- **SC-003**: Offline unit tests prove raw database URLs are absent from JSON and Markdown report output for lifecycle sample runs.
- **SC-004**: A maintainer can run a no-external-service lifecycle sample from a warm checkout in under 30 seconds and receive a pass/fail run result with lifecycle metadata.
- **SC-005**: The lifecycle runner records cleanup status for 100% of branch-created runs, including success and failure paths.
- **SC-006**: The lifecycle runner integrates with existing scenario/result top-level fields without changing the required PTH01 result schema fields.

## Assumptions

- This feature is PTH02 from `docs/testing/product-harness/roadmap.md`.
- `@spyglass/test-harness` remains the lower-level utility package for Neon branch creation and Drizzle migration execution.
- Product-level lifecycle orchestration belongs in `@spyglass/product-test-harness`.
- Real Neon API integration tests may be skipped without credentials; core lifecycle behavior must be validated offline through fakes.
- Full deterministic product seed factories are deferred to PTH04; PTH02 only defines and invokes the seed lifecycle callback.
- Persistent database-backed result storage is deferred to PTH03; PTH02 can preserve lifecycle metadata in the existing run result metadata/report path.
