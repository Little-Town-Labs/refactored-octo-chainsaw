# Feature Specification: Seeker Advocate Agent

**Feature Branch**: `013-seeker-advocate`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "Next roadmap item: Stage 5 advocate agents, F13/F14. Start with F13 Seeker Advocate Agent after F12 AI Infrastructure. The seeker advocate must act for the seeker inside Parley negotiation runs, consume signed prompt/model/runtime manifest refs, score fit from the seeker's perspective against a versioned rubric, preserve run-to-completion, privacy, isolation, auditability, and eval-harness credibility gates."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seeker-Side Negotiation Turn (Priority: P1)

As the Parley runner, I need a seeker advocate to produce a structured seeker-side turn from the seeker's principal view, the filtered employer view, and the frozen run configuration, so the negotiation can advance without human intervention or unmanaged model calls.

**Why this priority**: This is the minimum useful F13 slice. Without a governed seeker-side turn, F08 cannot exercise the seeker side of a real advocate run and F14 cannot be integrated against a symmetric counterpart.

**Independent Test**: Can be tested by providing a valid seeker-side run input with frozen contract, prompt, model, manifest, rubric, tool-surface, principal-view, and counterparty-projection refs, then confirming the advocate returns a valid turn result or a bounded refusal without mutating run configuration.

**Acceptance Scenarios**:

1. **Given** a valid seeker-side run input and an active runtime manifest, **When** the seeker advocate is asked for a negotiation turn, **Then** it returns a structured turn result with done-signal status, rationale summary, version refs, and audit-ready invocation evidence.
2. **Given** a seeker-side run input whose prompt, model, manifest, or contract refs are missing, inactive, unsigned, or not authorized for the run, **When** the seeker advocate is asked for a turn, **Then** it refuses the operation with a reason code and no model invocation.
3. **Given** a newer prompt, model, or manifest version is published after the run starts, **When** the seeker advocate continues the run, **Then** it keeps using the dispatch-time frozen refs and records those refs in the result.

---

### User Story 2 - Seeker-Side Rubric Scoring (Priority: P1)

As the dossier producer, I need the seeker advocate to produce per-dimension seeker-perspective scores and rationales, so the harness can compute deterministic weighted totals and decide whether the seeker-side threshold cleared.

**Why this priority**: The product promise depends on each side scoring fit from its own principal's perspective. F13 must provide seeker-side rubric evidence before the platform can produce credible match dossiers.

**Independent Test**: Can be tested by requesting final seeker-side scoring for a run with a resolved seeker rubric, then confirming every rubric dimension is represented exactly once with a score, rationale, and flag proposals, while weighted totals remain outside advocate control.

**Acceptance Scenarios**:

1. **Given** a resolved seeker rubric with a bias-test artifact and a completed negotiation context, **When** the seeker advocate is asked for final scoring, **Then** it returns one score and rationale per rubric dimension, plus a seeker-side headline rationale.
2. **Given** the advocate response includes a holistic score or omits a rubric dimension, **When** the scoring output is validated, **Then** the invalid or extra score is rejected or ignored according to the rubric-governance rules and the condition is auditable.
3. **Given** the available evidence is insufficient to score one or more dimensions, **When** the advocate completes scoring, **Then** it returns an inconclusive flag proposal describing what evidence would resolve the uncertainty rather than pausing for a human.

---

### User Story 3 - Seeker Privacy and Isolation Enforcement (Priority: P2)

As a compliance reviewer, I need the seeker advocate to consume only the seeker's principal view, allowed tools, and privacy-filtered counterparty projections, so employer-confidential material and cross-side context cannot leak or influence the wrong side.

**Why this priority**: Cross-side isolation is a constitutional and Parley invariant. The seeker advocate must be safe before employer-side symmetry and production eval gates can be trusted.

**Independent Test**: Can be tested by presenting the seeker advocate with disallowed counterparty fields, prior-run context, or unsupported tool results, then confirming those inputs are refused, ignored, or flagged before any turn or score is emitted.

**Acceptance Scenarios**:

1. **Given** employer-side confidential fields that have not passed through the privacy filter, **When** a seeker advocate turn is requested, **Then** the advocate refuses or ignores those fields and records the privacy-boundary condition.
2. **Given** context from a previous run or renegotiation attempt, **When** a new seeker advocate run starts, **Then** the advocate starts from fresh run context and does not inherit prior prompt history, tool-call log, or rubric scratch state.
3. **Given** a tool result not advertised by the seeker contract's tool surface, **When** the seeker advocate receives that result, **Then** it refuses to use the result and emits a bounded unsupported-tool condition.

---

### User Story 4 - Eval-Gated Seeker Advocate Credibility (Priority: P2)

As an operator preparing Phase 0 alpha, I need seeker advocate behavior to pass a repeatable evaluation baseline, so early human review sees credible seeker-side rationales, bounded refusals, and stable scoring behavior before any production hiring use.

**Why this priority**: The PRD names agent quality as a high risk. F13 must ship with a measurable credibility gate rather than relying on ad hoc prompt review.

**Independent Test**: Can be tested by running representative seeker-side evaluation cases for strong match, weak match, insufficient evidence, privacy attack, prompt-injection attempt, and cost-limit refusal, then comparing outcomes against expected turn/scoring/refusal criteria.

**Acceptance Scenarios**:

1. **Given** the seeker advocate eval suite, **When** all required cases run, **Then** each case records pass/fail status, expected outcome category, frozen version refs, and reviewer-readable evidence.
2. **Given** an eval case includes prompt-injection or privacy-bypass content, **When** the seeker advocate processes it, **Then** the result preserves untrusted-input boundaries and does not follow instructions from untrusted content.
3. **Given** an eval case exceeds an approved cost, token, or timeout budget, **When** the seeker advocate is evaluated, **Then** the operation refuses or degrades to an inconclusive result with auditable reason codes.

### Edge Cases

- A seeker ticket has sparse profile data, incomplete preferences, or no threshold history.
- A filtered employer projection lacks enough information to score one or more seeker rubric dimensions.
- A rubric dimension appears in the response more than once, is missing, or uses an out-of-range score.
- A prompt, model, manifest, contract, rubric, or tool-surface version is deprecated after dispatch but before the advocate turn completes.
- A model response attempts to request human input, change the round cap, or bypass run-to-completion.
- A tool result is delayed, unsupported, malformed, or outside the contract's advertised tool surface.
- A prompt-injection payload appears in seeker-provided material, employer-provided material, or tool-returned content.
- A cost ceiling or invocation budget is reached before final scoring.
- A renegotiation starts after a prior dossier exists for the same match ticket.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose a seeker-side advocate capability that can produce negotiation-turn results for a Parley run from a resolved seeker contract, seeker principal view, filtered counterparty view, run context, and frozen runtime refs.
- **FR-002**: System MUST expose a seeker-side final-scoring capability that returns one score and rationale per seeker-rubric dimension, plus seeker-side headline rationale and flag proposals.
- **FR-003**: System MUST use only dispatch-time frozen prompt, model, runtime manifest, contract, rubric, privacy-ruleset, and tool-surface refs for a run; newer published versions MUST NOT affect an in-flight run.
- **FR-004**: System MUST refuse seeker advocate turns or scoring when required refs are missing, inactive, unsigned, unresolvable, unauthorized for the active runtime manifest, or outside the resolved seeker contract.
- **FR-005**: System MUST route all model invocation attempts through the governed AI infrastructure and MUST NOT allow direct provider calls from seeker advocate behavior.
- **FR-006**: System MUST preserve run-to-completion: the seeker advocate MUST NOT pause a negotiation to ask a human for input; insufficient evidence MUST become an inconclusive flag proposal or bounded refusal.
- **FR-007**: System MUST keep rubric weights and scoring policy outside prompt text and advocate-controlled output; deterministic weighted aggregation remains owned by the harness/rubric layer.
- **FR-008**: System MUST reject, ignore, or audit any holistic score emitted by the advocate and MUST rely only on validated per-dimension scores for downstream totals.
- **FR-009**: System MUST validate scoring output against the resolved seeker rubric, including dimension coverage, allowed score range, rationale presence, and duplicate/extra dimension handling.
- **FR-010**: System MUST ensure the seeker advocate only consumes the seeker principal view, its own run context, contract-allowed tools, and privacy-filtered counterparty projections.
- **FR-011**: System MUST refuse or ignore unfiltered employer-confidential data, opposite-side context, prior-run context inheritance, and unsupported tool results before producing a turn or score.
- **FR-012**: System MUST preserve untrusted-input boundaries for seeker-provided text, employer-provided text, tool-returned text, and counterparty projections.
- **FR-013**: System MUST emit audit-ready evidence for every accepted turn, scoring result, refusal, unsupported-tool condition, budget condition, and validation failure.
- **FR-014**: System MUST include prompt, model, manifest, contract, rubric, privacy-ruleset, tool-surface, run, side, and invocation refs in seeker advocate evidence whenever applicable.
- **FR-015**: System MUST enforce configured cost, token, timeout, and tool-call budgets for seeker advocate turns and scoring.
- **FR-016**: System MUST make seeker advocate failures local to the affected run or side; one advocate failure MUST NOT block unrelated runs.
- **FR-017**: System MUST provide reviewer-readable evidence for Phase 0 human-in-loop review, including accepted outputs, refusals, inconclusive flags, and version refs.
- **FR-018**: System MUST provide an evaluation baseline for seeker advocate credibility covering strong match, weak match, insufficient evidence, privacy attack, prompt-injection attempt, unsupported tool, and budget-limit scenarios.
- **FR-019**: System MUST define stable reason codes for seeker advocate refusals and validation failures so Parley, dossiers, notifications, and review tools can consume them consistently.
- **FR-020**: System MUST keep F13 scope limited to seeker-side advocate behavior; employer-side advocate behavior remains F14, renegotiation orchestration remains F15, and seeker conversational onboarding remains F20.

### Key Entities *(include if feature involves data)*

- **Seeker Advocate Run Input**: The frozen run-side request containing run identity, seeker side, resolved contract refs, runtime refs, principal view, filtered counterparty view, allowed tool surface, and current run context.
- **Seeker Principal View**: The seeker-owned profile, preferences, threshold posture, constraints, and match-relevant information available to the seeker advocate for one run.
- **Filtered Counterparty Projection**: The privacy-filter-approved employer-side information visible to the seeker advocate for a specific round or scoring phase.
- **Seeker Turn Result**: The advocate's structured negotiation-turn output, including done-signal status, rationale summary, allowed tool-call requests or outputs, version refs, and audit evidence.
- **Seeker Dimension Score**: A single seeker-rubric dimension result with dimension identity, score, rationale, evidence references, and any uncertainty or flag proposal.
- **Seeker Advocate Refusal**: A bounded non-success result with reason code, affected refs, operation, and audit context.
- **Seeker Advocate Eval Case**: A repeatable scenario with inputs, expected outcome category, pass/fail criteria, version refs, and reviewer evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of accepted seeker advocate turns and scoring results include run, side, prompt, model, manifest, contract, rubric, privacy-ruleset, and tool-surface refs where those refs apply.
- **SC-002**: 100% of scoring results either include exactly one valid entry per seeker-rubric dimension or produce an auditable validation failure/inconclusive flag.
- **SC-003**: 0 accepted seeker advocate operations use direct provider access or mutable runtime configuration outside the governed AI infrastructure path.
- **SC-004**: 100% of required eval cases record expected outcome category, actual outcome, pass/fail status, and reviewer-readable evidence.
- **SC-005**: The required seeker advocate eval baseline passes every privacy-boundary, prompt-injection, unsupported-tool, and budget-limit case before the feature is considered ready for implementation closure.
- **SC-006**: Cost, token, timeout, and tool-call budget breaches produce bounded refusal or inconclusive outcomes with reason codes in every tested case.
- **SC-007**: Re-running the same deterministic fixture inputs produces identical validation decisions, reason codes, score coverage, and version-ref evidence.
- **SC-008**: No seeker advocate failure blocks unrelated runs or unrelated side executions in the documented failure scenarios.

## Assumptions

- F13 starts with the Spyglass-hosted seeker advocate for Parley negotiation runs; external BYO seeker agents remain out of scope for v0.
- F13 covers autonomous negotiation-run behavior, not the interactive seeker conversational product surface.
- F12 provides the governed AI invocation, prompt/model version, manifest, cost-control, and audit envelope consumed by the seeker advocate.
- F07a provides the resolved seeker agent contract; F07b provides the seeker rubric and deterministic scoring governance; F08 provides orchestration; F09 provides filtered counterparty projections; F10 consumes scoring and rationale evidence for dossiers.
- The seeker advocate may propose flags and rationales, but the harness remains responsible for run state transitions, deterministic weighted totals, dossier production, and downstream notifications.
- F14 will provide the employer-side advocate with parallel invariants and its own regulated employer-side rubric posture.
