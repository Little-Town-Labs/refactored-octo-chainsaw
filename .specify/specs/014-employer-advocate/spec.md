# Feature Specification: Employer Advocate Agent

**Feature Branch**: `014-employer-advocate`

**Created**: 2026-05-22

**Status**: Draft

**Input**: User description: "Next roadmap item: F14 Employer Advocate Agent. Continue Stage 5 advocate agents after F13 Seeker Advocate Agent. The employer advocate must act for the employer inside Parley negotiation runs, consume signed prompt/model/runtime manifest refs from F12, score fit from the employer's perspective against a versioned regulated rubric, preserve run-to-completion, privacy, isolation, auditability, and eval-harness credibility gates."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employer-Side Negotiation Turn (Priority: P1)

As the Parley runner, I need an employer advocate to produce a structured employer-side turn from the employer principal view, the filtered seeker view, and the frozen run configuration, so the negotiation can advance with both sides represented by governed advocates.

**Why this priority**: This is the minimum useful F14 slice. F13 provides the seeker side; F14 completes the two-sided advocate baseline required before Parley can exercise real seeker/employer negotiation behavior.

**Independent Test**: Can be tested by providing a valid employer-side run input with frozen contract, prompt, model, manifest, rubric, tool-surface, principal-view, and counterparty-projection refs, then confirming the advocate returns a valid turn result or a bounded refusal without mutating run configuration.

**Acceptance Scenarios**:

1. **Given** a valid employer-side run input and an active runtime manifest, **When** the employer advocate is asked for a negotiation turn, **Then** it returns a structured turn result with done-signal status, rationale summary, version refs, and audit-ready invocation evidence.
2. **Given** an employer-side run input whose prompt, model, manifest, contract, rubric, privacy, or tool-surface refs are missing, inactive, unsigned, or not authorized for the run, **When** the employer advocate is asked for a turn, **Then** it refuses the operation with a reason code and no model invocation.
3. **Given** a newer prompt, model, or manifest version is published after the run starts, **When** the employer advocate continues the run, **Then** it keeps using the dispatch-time frozen refs and records those refs in the result.

---

### User Story 2 - Employer-Side Rubric Scoring (Priority: P1)

As the dossier producer, I need the employer advocate to produce per-dimension employer-perspective scores and rationales, so the harness can compute deterministic weighted totals and decide whether the employer-side threshold cleared.

**Why this priority**: Employer-side scoring is the regulated surface most likely to affect hiring outcomes. F14 must provide employer rubric evidence without letting the model control weights, totals, or policy.

**Independent Test**: Can be tested by requesting final employer-side scoring for a run with a resolved employer rubric and bias-test artifact, then confirming every rubric dimension is represented exactly once with a score, rationale, and flag proposals, while weighted totals remain outside advocate control.

**Acceptance Scenarios**:

1. **Given** a resolved employer rubric with required bias-test evidence and a completed negotiation context, **When** the employer advocate is asked for final scoring, **Then** it returns one score and rationale per employer-rubric dimension, plus an employer-side headline rationale.
2. **Given** the advocate response includes a holistic score, a recommendation to hire or reject, or omits a rubric dimension, **When** the scoring output is validated, **Then** the invalid or extra decision content is rejected or ignored according to rubric-governance rules and the condition is auditable.
3. **Given** the available evidence is insufficient to score one or more dimensions, **When** the advocate completes scoring, **Then** it returns an inconclusive flag proposal describing what evidence would resolve the uncertainty rather than pausing for a human.

---

### User Story 3 - Employer Confidentiality and Seeker Privacy Enforcement (Priority: P2)

As a compliance reviewer, I need the employer advocate to consume only the employer principal view, allowed tools, and privacy-filtered seeker projections, so seeker data minimization, employer confidentiality, and cross-side isolation remain enforceable.

**Why this priority**: F14 handles the side most tightly connected to hiring decisions. It must preserve seeker privacy and employer-confidential job requirements before the platform can rely on employer-side scoring evidence.

**Independent Test**: Can be tested by presenting the employer advocate with disallowed seeker fields, raw seeker data, prior-run context, employer-confidential fields outside the principal view, or unsupported tool results, then confirming those inputs are refused, ignored, or flagged before any turn or score is emitted.

**Acceptance Scenarios**:

1. **Given** seeker data that has not passed through the privacy filter, **When** an employer advocate turn is requested, **Then** the advocate refuses or ignores those fields and records the privacy-boundary condition.
2. **Given** context from a previous run or renegotiation attempt, **When** a new employer advocate run starts, **Then** the advocate starts from fresh run context and does not inherit prior prompt history, tool-call log, or rubric scratch state.
3. **Given** a tool result not advertised by the employer contract's tool surface, **When** the employer advocate receives that result, **Then** it refuses to use the result and emits a bounded unsupported-tool condition.

---

### User Story 4 - Eval-Gated Employer Advocate Credibility (Priority: P2)

As an operator preparing Phase 0 alpha, I need employer advocate behavior to pass a repeatable evaluation baseline, so early human review sees credible employer-side rationales, bounded refusals, protected privacy boundaries, and stable regulated-surface scoring behavior.

**Why this priority**: The PRD names agent quality and biased scoring as high risks. F14 must ship with measurable credibility and bias-surface gates rather than ad hoc prompt review.

**Independent Test**: Can be tested by running representative employer-side evaluation cases for strong match, weak match, insufficient evidence, privacy attack, prompt-injection attempt, unsupported tool, rubric-bias-gate failure, and cost-limit refusal, then comparing outcomes against expected turn/scoring/refusal criteria.

**Acceptance Scenarios**:

1. **Given** the employer advocate eval suite, **When** all required cases run, **Then** each case records pass/fail status, expected outcome category, frozen version refs, and reviewer-readable evidence.
2. **Given** an eval case includes prompt-injection, privacy-bypass, or protected-class inference content, **When** the employer advocate processes it, **Then** the result preserves untrusted-input boundaries and does not produce unsupported protected-class reasoning.
3. **Given** an eval case exceeds an approved cost, token, or timeout budget, **When** the employer advocate is evaluated, **Then** the operation refuses or degrades to an inconclusive result with auditable reason codes.

### Edge Cases

- An employer requisition has sparse role criteria, conflicting requirements, or no threshold history.
- A filtered seeker projection lacks enough information to score one or more employer rubric dimensions.
- A rubric dimension appears in the response more than once, is missing, or uses an out-of-range score.
- A prompt, model, manifest, contract, rubric, privacy-ruleset, or tool-surface version is deprecated after dispatch but before the advocate turn completes.
- A model response attempts to make a hiring decision, request human input, change the round cap, or bypass run-to-completion.
- A tool result is delayed, unsupported, malformed, or outside the contract's advertised tool surface.
- A prompt-injection payload appears in employer-provided material, seeker-provided material, or tool-returned content.
- The employer rubric lacks required bias-test evidence or contains a dimension that is not authorized for the regulated surface.
- A cost ceiling or invocation budget is reached before final scoring.
- A renegotiation starts after a prior dossier exists for the same match ticket.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose an employer-side advocate capability that can produce negotiation-turn results for a Parley run from a resolved employer contract, employer principal view, filtered counterparty view, run context, and frozen runtime refs.
- **FR-002**: System MUST expose an employer-side final-scoring capability that returns one score and rationale per employer-rubric dimension, plus employer-side headline rationale and flag proposals.
- **FR-003**: System MUST use only dispatch-time frozen prompt, model, runtime manifest, contract, rubric, privacy-ruleset, and tool-surface refs for a run; newer published versions MUST NOT affect an in-flight run.
- **FR-004**: System MUST refuse employer advocate turns or scoring when required refs are missing, inactive, unsigned, unresolvable, unauthorized for the active runtime manifest, outside the resolved employer contract, or missing required rubric bias-test evidence.
- **FR-005**: System MUST route all model invocation attempts through the governed AI infrastructure and MUST NOT allow direct provider calls from employer advocate behavior.
- **FR-006**: System MUST preserve run-to-completion: the employer advocate MUST NOT pause a negotiation to ask a human for input; insufficient evidence MUST become an inconclusive flag proposal or bounded refusal.
- **FR-007**: System MUST keep rubric weights, threshold policy, and hiring-decision policy outside prompt text and advocate-controlled output; deterministic weighted aggregation remains owned by the harness/rubric layer.
- **FR-008**: System MUST reject, ignore, or audit any holistic score, hire/no-hire recommendation, threshold decision, or unsupported protected-class reasoning emitted by the advocate.
- **FR-009**: System MUST validate scoring output against the resolved employer rubric, including dimension coverage, allowed score range, rationale presence, duplicate/extra dimension handling, and regulated-surface authorization.
- **FR-010**: System MUST ensure the employer advocate only consumes the employer principal view, its own run context, contract-allowed tools, and privacy-filtered counterparty projections.
- **FR-011**: System MUST refuse or ignore unfiltered seeker data, opposite-side context, prior-run context inheritance, employer data outside the principal view, and unsupported tool results before producing a turn or score.
- **FR-012**: System MUST preserve untrusted-input boundaries for employer-provided text, seeker-provided text, tool-returned text, and counterparty projections.
- **FR-013**: System MUST emit audit-ready evidence for every accepted turn, scoring result, refusal, unsupported-tool condition, budget condition, protected-class boundary condition, rubric-bias-gate condition, and validation failure.
- **FR-014**: System MUST include prompt, model, manifest, contract, rubric, privacy-ruleset, tool-surface, run, side, and invocation refs in employer advocate evidence whenever applicable.
- **FR-015**: System MUST enforce configured cost, token, timeout, and tool-call budgets for employer advocate turns and scoring.
- **FR-016**: System MUST make employer advocate failures local to the affected run or side; one advocate failure MUST NOT block unrelated runs.
- **FR-017**: System MUST provide reviewer-readable evidence for Phase 0 human-in-loop review, including accepted outputs, refusals, inconclusive flags, regulated-surface boundary handling, and version refs.
- **FR-018**: System MUST provide an evaluation baseline for employer advocate credibility covering strong match, weak match, insufficient evidence, privacy attack, prompt-injection attempt, unsupported tool, rubric-bias-gate failure, protected-class boundary handling, and budget-limit scenarios.
- **FR-019**: System MUST define stable reason codes for employer advocate refusals and validation failures so Parley, dossiers, notifications, and review tools can consume them consistently.
- **FR-020**: System MUST keep F14 scope limited to employer-side advocate behavior; seeker-side advocate behavior remains F13, renegotiation orchestration remains F15, employer admin/API surfaces remain F22/F23, and seeker conversational onboarding remains F20.

### Key Entities *(include if feature involves data)*

- **Employer Advocate Run Input**: The frozen run-side request containing run identity, employer side, resolved contract refs, runtime refs, principal view, filtered counterparty view, allowed tool surface, and current run context.
- **Employer Principal View**: The employer-owned role requirements, constraints, threshold posture, company-side context, and match-relevant information available to the employer advocate for one run.
- **Filtered Counterparty Projection**: The privacy-filter-approved seeker-side information visible to the employer advocate for a specific round or scoring phase.
- **Employer Turn Result**: The advocate's structured negotiation-turn output, including done-signal status, rationale summary, allowed tool-call requests or outputs, version refs, and audit evidence.
- **Employer Dimension Score**: A single employer-rubric dimension result with dimension identity, score, rationale, evidence references, and any uncertainty or flag proposal.
- **Employer Advocate Refusal**: A bounded non-success result with reason code, affected refs, operation, and audit context.
- **Employer Advocate Eval Case**: A repeatable scenario with inputs, expected outcome category, pass/fail criteria, regulated-surface expectations, version refs, and reviewer evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of accepted employer advocate turns and scoring results include run, side, prompt, model, manifest, contract, rubric, privacy-ruleset, and tool-surface refs where those refs apply.
- **SC-002**: 100% of scoring results either include exactly one valid entry per employer-rubric dimension or produce an auditable validation failure/inconclusive flag.
- **SC-003**: 0 accepted employer advocate operations use direct provider access or mutable runtime configuration outside the governed AI infrastructure path.
- **SC-004**: 100% of required eval cases record expected outcome category, actual outcome, pass/fail status, regulated-surface expectation, and reviewer-readable evidence.
- **SC-005**: The required employer advocate eval baseline passes every privacy-boundary, prompt-injection, unsupported-tool, protected-class-boundary, rubric-bias-gate, and budget-limit case before the feature is considered ready for implementation closure.
- **SC-006**: Cost, token, timeout, and tool-call budget breaches produce bounded refusal or inconclusive outcomes with reason codes in every tested case.
- **SC-007**: Re-running the same deterministic fixture inputs produces identical validation decisions, reason codes, score coverage, regulated-surface boundary handling, and version-ref evidence.
- **SC-008**: No employer advocate failure blocks unrelated runs or unrelated side executions in the documented failure scenarios.

## Assumptions

- F14 starts with the Spyglass-hosted employer advocate for Parley negotiation runs; external BYO employer agents remain out of scope for v0.
- F14 covers autonomous negotiation-run behavior, not employer admin setup, requisition authoring, REST API, or webhook surfaces.
- F12 provides the governed AI invocation, prompt/model version, manifest, cost-control, and audit envelope consumed by the employer advocate.
- F07a provides the resolved employer agent contract; F07b provides the employer rubric, regulated-surface authorization, and deterministic scoring governance; F08 provides orchestration; F09 provides filtered counterparty projections; F10 consumes scoring and rationale evidence for dossiers.
- The employer advocate may propose flags and rationales, but the harness remains responsible for run state transitions, deterministic weighted totals, threshold decisions, dossier production, and downstream notifications.
- F13 already provides the seeker-side advocate with parallel invariants; F15 will provide fresh-run renegotiation orchestration after both advocates are available.
