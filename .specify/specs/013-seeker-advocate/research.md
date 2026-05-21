# F13 Research: Seeker Advocate Agent

## Decision: Implement F13 as a seeker-only driver in `@spyglass/agents`

**Rationale**: The package was reserved for F13/F14 agent logic, and the existing Parley side-runner already defines generic side-agent driver shapes. Keeping F13 seeker-only avoids coupling it to F14 while giving F08 a concrete seeker-side driver.

**Alternatives considered**:

- Add seeker behavior inside `@spyglass/parley`: rejected because Parley owns orchestration, not advocate behavior.
- Create a new package: rejected because `@spyglass/agents` already exists for this domain and avoids package sprawl.

## Decision: Consume F12 for every model operation

**Rationale**: F12 is the Stage 5 dependency that centralizes prompt/model/runtime manifest refs, cost controls, and invocation audit evidence. F13 must not import provider SDKs or create unmanaged model calls.

**Alternatives considered**:

- Let F13 call a provider directly for faster prototyping: rejected as an AI supply-chain and auditability violation.
- Use F12 only for production mode: rejected because test/dev behavior would diverge from the governed path.

## Decision: Validate seeker scores outside the model response

**Rationale**: F07b and Parley require deterministic aggregation and rejection/ignore behavior for holistic model scores. F13 may request per-dimension reasoning, but score coverage, ranges, duplicate dimensions, and holistic-score handling must be validated by code.

**Alternatives considered**:

- Trust the model to self-score correctly: rejected because audit and eval evidence need deterministic validation.
- Put rubric weights in the prompt: rejected because rubric weights and scoring policy must stay out of prompt text.

## Decision: Treat insufficient evidence as inconclusive flags

**Rationale**: Parley run-to-completion prohibits pausing to ask the seeker for input mid-negotiation. If the seeker advocate cannot score, it must explain what would resolve the uncertainty through flags consumed by dossier production.

**Alternatives considered**:

- Pause the run and ask the seeker: rejected because conversational seeker flows are F20 and not part of autonomous negotiation.
- Emit a default low score for missing evidence: rejected because it obscures evidence quality and can create misleading dossiers.

## Decision: Add an eval baseline before implementation closure

**Rationale**: The PRD identifies agent quality below threshold as a high risk. A repeatable baseline for strong match, weak match, insufficient evidence, privacy attack, prompt injection, unsupported tool, and budget refusal gives reviewers concrete evidence before F14 symmetry and Phase 0 use.

**Alternatives considered**:

- Rely only on unit tests: rejected because unit tests prove mechanics but not advocate credibility.
- Defer evals to F14: rejected because F13 needs its own side-specific baseline before it becomes a dependency.
