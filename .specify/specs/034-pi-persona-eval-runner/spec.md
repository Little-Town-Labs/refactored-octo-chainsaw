# Feature Specification: Pi Persona Eval Adapter

**Feature Branch**: `034-pi-persona-eval-runner`

**Created**: 2026-05-28

**Status**: Draft

**Input**: User description: "PTH09: Pi persona eval adapter"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Run a Persona Encounter Matrix (Priority: P1)

An engineer can run a deterministic Pi-compatible persona eval matrix that pairs seeker and employer personas, captures prompts and transcripts, and records outcome evidence without making the eval a blocking Alpha gate.

**Why this priority**: Persona evals are the roadmap path for measuring product behavior, drift, failure modes, and encounter quality beyond deterministic gate coverage.

**Independent Test**: Run the PTH09 persona eval suite and verify at least one seeker/employer encounter persists persona ids, prompt refs, transcript refs, tool traces, outcome, and evaluator summary.

**Acceptance Scenarios**:

1. **Given** a seeker persona and employer persona are selected, **When** the eval runner executes the encounter, **Then** the result records both persona ids, encounter category, prompt refs, transcript ref, outcome, and evaluator summary.
2. **Given** the eval suite completes, **When** persisted evidence is inspected, **Then** every encounter has model/provider metadata, latency, cost, tool traces, and result-store-compatible invocation records.

---

### User Story 2 - Preserve Eval Safety Boundaries (Priority: P1)

An engineer can simulate privacy-sensitive and prompt-injection encounters and verify the adapter records refusals, boundary outcomes, and safe transcripts without exposing secrets or private payloads.

**Why this priority**: Persona evals intentionally explore risky behavior and must preserve reviewable evidence without becoming a leakage channel.

**Independent Test**: Run PTH09 safety-focused encounters and verify prompt-injection and privacy-boundary attempts produce deterministic evaluator summaries, safe transcript artifacts, and no raw credentials or private seeker content.

**Acceptance Scenarios**:

1. **Given** a prompt-injection attacker persona requests an unsafe tool action, **When** the encounter runs, **Then** the outcome records an unsafe-tool refusal and safe transcript evidence.
2. **Given** a privacy-sensitive seeker encounter is evaluated, **When** transcript and metadata are persisted, **Then** private seeker content, secrets, raw credentials, and protected-class payloads are absent.

---

### User Story 3 - Support Driver Swapping for Later Pi Integration (Priority: P2)

An engineer can run the same encounter contract through a deterministic synthetic driver now and a live Pi-backed driver later without changing result-store or evaluator contracts.

**Why this priority**: PTH09 should establish stable contracts before live model credentials, provider costs, or nondeterministic sessions are introduced.

**Independent Test**: Run a deterministic synthetic Pi-compatible driver and verify the runner accepts it through the same driver interface used by future live Pi adapters.

**Acceptance Scenarios**:

1. **Given** a driver implements the persona encounter contract, **When** the runner invokes it, **Then** the runner persists normalized transcript, tool-call, model, latency, cost, and outcome records.
2. **Given** live Pi credentials are unavailable, **When** package tests run, **Then** tests still pass using only the deterministic synthetic driver.

### Edge Cases

- Missing seeker or employer persona ids must fail closed with a stable reason code.
- Driver failures must persist safe failure evidence without raw prompts or credentials.
- Prompt-injection encounters must record refusal outcomes and must not mark unsafe tool use as successful.
- Transcript artifacts must not contain secrets, raw credentials, database URLs, protected-class data, or private seeker content.
- Cost and latency metadata must be present even for synthetic runs.
- Package tests must not require live Pi credentials, model provider credentials, network sessions, external browser services, or production data.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define typed persona, encounter, prompt, transcript, tool-call, model metadata, usage, outcome, evaluator summary, and driver contracts.
- **FR-002**: System MUST include deterministic PTH09 scenarios for at least one seeker/employer encounter matrix.
- **FR-003**: System MUST include safety-focused encounters for prompt injection and privacy-boundary behavior.
- **FR-004**: System MUST run encounters through a Pi-compatible driver interface that can be backed by deterministic synthetic execution for tests.
- **FR-005**: System MUST persist persona ids, prompt refs, transcript refs, tool traces, model/provider metadata, cost, latency, outcome, and evaluator summary.
- **FR-006**: System MUST persist result-store-compatible agent invocation records for persona eval runs.
- **FR-007**: System MUST provide deterministic evaluator summaries and reason codes for successful matches, weak matches, privacy refusals, unsafe-tool refusals, and driver failures.
- **FR-008**: System MUST reject unsafe transcript or metadata content containing raw secrets, tokens, passwords, database URLs, raw credentials, protected-class data, or private seeker content.
- **FR-009**: System MUST expose PTH09 runner helpers and a sample runner through the product harness public API.
- **FR-010**: System MUST include tests covering encounter matrix execution, synthetic driver behavior, safety refusals, transcript safety, result-store persistence, and sample output.
- **FR-011**: System MUST not require live Pi credentials, model provider credentials, network sessions, external browser services, or production data for package unit tests.

### Key Entities

- **Persona**: A synthetic seeker or employer actor with id, role, profile traits, risk tags, and prompt seed refs.
- **Persona Encounter**: A seeker/employer pairing with category, scenario id, prompt refs, expected boundaries, and evaluation target.
- **Pi Agent Driver**: Adapter interface that runs an encounter and returns transcript, tool calls, model metadata, usage, latency, cost, and outcome evidence.
- **Transcript Artifact**: Safe reference and excerpt metadata for an encounter transcript.
- **Tool Trace**: Safe record of tool names, intents, decisions, and refusal reasons.
- **Evaluator Summary**: Deterministic assessment of outcome, boundary behavior, reason code, and evidence refs.

## Success Criteria *(mandatory)*

- **SC-001**: The PTH09 suite runs at least one seeker/employer encounter matrix and persists all required persona, transcript, tool, model, usage, cost, latency, outcome, and evaluator fields.
- **SC-002**: Prompt-injection and privacy-boundary encounters produce deterministic refusal or boundary outcomes without unsafe transcript persistence.
- **SC-003**: Result-store snapshots include agent invocation records for every encounter.
- **SC-004**: Package tests and the local sample prove PTH09 behavior without live Pi credentials, provider credentials, network sessions, or production data.

## Assumptions

- PTH09 establishes a Pi-compatible adapter contract and deterministic synthetic implementation before live Pi sessions are wired into scheduled eval workflows.
- Persona evals are informational by default and do not block Alpha promotion until later governance explicitly changes that policy.
- Transcript content in PTH09 is synthetic, safe, and represented by local artifact refs rather than production conversation data.
