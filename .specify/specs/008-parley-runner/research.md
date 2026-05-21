# Research: F08 Parley Runner

## Decision 1: Initial Inngest Surface Without SDK Dependency

**Decision**: Implement SDK-agnostic Parley function definitions and event handlers in `@spyglass/parley`; bind them to real Inngest functions later in the application/runtime layer.

**Rationale**: The roadmap requires six Inngest functions and no polling, but the current monorepo has no Inngest SDK dependency or app-level handler surface. A typed function-definition layer lets F08 validate event topology, concurrency metadata, idempotency keys, and function responsibilities without introducing deployment wiring prematurely.

**Alternatives considered**:

- Add `inngest` directly to `@spyglass/parley`: rejected for this slice because package-level domain tests should not require network/runtime wiring.
- Leave F08 as docs only: rejected because Stage 4 needs executable harness behavior and quickstart evidence.

## Decision 2: Use Existing Package Boundaries

**Decision**: F08 consumes existing package APIs instead of duplicating logic:

- F07a contract resolution via `@spyglass/agent-contracts`
- F07b rubric dispatch gate and scoring via `@spyglass/rubrics`
- F08.5 tool dispatcher and tool descriptor types via `@spyglass/tool-dispatcher`
- F09 privacy filtering via `@spyglass/privacy-filter`
- F10 dossier build/sign/verify via `@spyglass/dossiers`

**Rationale**: Each dependency is already a merged Stage 3/4 package with tests and data contracts. F08's job is orchestration, not reimplementing those controls.

**Alternatives considered**:

- Add Parley-local copies of scoring/filtering/dossier logic: rejected due to drift and audit risk.
- Wait for full app integration before implementing package-level flow: rejected because the synthetic Stage 4 gate can be proven in package fixtures.

## Decision 3: No New Parley Database Tables in First Slice

**Decision**: Use a `ParleyRunRepository` interface and in-memory implementation for F08 tests/dev-run. Production durability remains existing match-ticket `run_id`, audit log events, transcript/dossier stores, and downstream package repositories.

**Rationale**: Parley §9 says no filesystem workspaces and durability comes from audit log and dossier persistence. The existing match ticket schema already carries run id, attempt, round, round cap, contract refs, privacy refs, state, and dossier id.

**Alternatives considered**:

- Add a `parley_runs` table: deferred until app/runtime integration proves a separate query surface is needed.
- Store context snapshots: rejected because context must be ephemeral; only audit/dossier evidence persists.

## Decision 4: Deterministic Fixture Side Agents for F08

**Decision**: Initial side runners use an injectable `SideAgentDriver` interface and deterministic fixture drivers for tests and staged dev-run.

**Rationale**: Real model execution through AI Gateway belongs to later AI infrastructure work. F08 can still enforce the side-runner protocol, tool dispatch loop boundaries, structured outputs, scoring completeness, and run-to-completion contract.

**Alternatives considered**:

- Call AI Gateway now: rejected because F12 owns AI infrastructure and external credentials are not required for F08 conformance tests.
- Hard-code scoring in the coordinator: rejected because side-runner behavior must remain replaceable by real model drivers.

## Decision 5: Human-Input Tool Semantics Scan

**Decision**: Implement a conservative descriptor scan over tool name, description, adapter ref, and schema descriptions for phrases like "ask principal", "wait for human confirmation", "human approval", and "manual confirmation".

**Rationale**: Parley §17.5 requires the harness not advertise tools with human-input pause semantics. Current tool descriptors include free-text descriptions and schema content, so a deterministic textual scan is the safest first gate.

**Alternatives considered**:

- Rely on tool-dispatcher publication review only: rejected because F08 must enforce dispatch-time refusal.
- Add a boolean descriptor field: deferred to a future tool-catalog schema evolution; the scan works with current descriptors.

## Decision 6: Inconclusive Dossier as Failure Surface

**Decision**: Coordinator failure paths request dossier production with `status=inconclusive`, stable reason codes, and resolution hints when scoring, privacy, timeout, or tool failures leave enough evidence to persist.

**Rationale**: Parley's run-to-completion contract forbids mid-negotiation human waits. F10 already validates that inconclusive dossiers carry at least one flag.

**Alternatives considered**:

- Terminal failure without a dossier for all failures: rejected because Parley requires best-effort inconclusive dossiers for timeout/tool failure when possible.
- Pause and request operator input: rejected by F08 scope.
