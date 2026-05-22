# F14 Research: Employer Advocate Agent

## Decision: Implement F14 as an employer-only driver in `@spyglass/agents`

**Rationale**: The package already contains the F13 seeker advocate and was reserved for F13/F14 agent logic. Keeping F14 employer-only avoids coupling it to F15 renegotiation and F22/F23 employer surfaces while giving F08 a concrete employer-side driver.

**Alternatives considered**:

- Add employer behavior inside `@spyglass/parley`: rejected because Parley owns orchestration, not advocate behavior.
- Create a new employer-agent package: rejected because `@spyglass/agents` already owns advocate behavior and a new package would duplicate F13 infrastructure.
- Merge seeker and employer implementations into one generic function immediately: rejected for the first F14 slice because employer regulated-surface checks need side-specific reason codes and tests before abstraction is justified.

## Decision: Consume F12 for every model operation

**Rationale**: F12 centralizes prompt/model/runtime manifest refs, no-hot-reload behavior, cost controls, and invocation audit evidence. F14 must not import provider SDKs or create unmanaged model calls.

**Alternatives considered**:

- Let F14 call a provider directly for faster prototyping: rejected as an AI supply-chain, cost-control, and auditability violation.
- Use F12 only for production mode: rejected because test/dev behavior would diverge from the governed path.

## Decision: Validate employer scores outside the model response

**Rationale**: F07b and Parley require deterministic aggregation and rejection/ignore behavior for holistic model scores. F14 may request per-dimension reasoning, but score coverage, score ranges, duplicate dimensions, regulated-surface authorization, and holistic-score handling must be validated by code.

**Alternatives considered**:

- Trust the model to self-score correctly: rejected because audit and eval evidence need deterministic validation.
- Put rubric weights, thresholds, or hiring policy in the prompt: rejected because rubric weights, threshold policy, and final decisions must stay outside model-controlled output.

## Decision: Treat insufficient evidence as inconclusive flags

**Rationale**: Parley run-to-completion prohibits pausing to ask the employer or seeker for input mid-negotiation. If the employer advocate cannot score, it must explain what would resolve the uncertainty through flags consumed by dossier production.

**Alternatives considered**:

- Pause the run and ask an employer admin: rejected because employer surfaces are F22/F23 and not part of autonomous negotiation.
- Emit a default low or high score for missing evidence: rejected because it obscures evidence quality and can create misleading dossiers.

## Decision: Add protected-class and bias-gate checks to F14 evals

**Rationale**: Employer-side scoring is closest to the AEDT decision surface. The eval baseline must include privacy attacks, prompt injection, protected-class boundary handling, missing rubric bias evidence, and budget refusal before the feature can close.

**Alternatives considered**:

- Reuse only F13 eval categories: rejected because seeker-side quality checks do not fully cover employer-side regulated scoring risk.
- Defer protected-class checks to Phase 1 compliance work: rejected because F14 directly produces employer-side scoring evidence that dossiers consume.

## Decision: Keep F14 free of durable storage changes

**Rationale**: The first employer advocate slice returns evidence to existing Parley/dossier paths and records invocation evidence through F12. Durable schema changes would duplicate existing F08/F10/F12 responsibilities.

**Alternatives considered**:

- Add employer advocate event tables now: rejected because no current requirement needs separate persistence outside the audit/invocation/dossier pipeline.
- Persist eval results in database tables: rejected for the package-level baseline; committed quickstart evidence is sufficient until a broader eval service exists.
