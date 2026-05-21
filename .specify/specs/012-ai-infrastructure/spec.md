# Feature Specification: F12 AI Infrastructure

**Feature Branch**: `012-ai-infrastructure`

**Created**: 2026-05-21

**Status**: Draft

**Input**: User description: "F12 AI Infrastructure. First Stage 5 feature and dependency before F13/F14 advocate agents. Scope covers gateway client, prompt registry, signed model/prompt versioning, no hot-reload posture, manifests, auditability, and cost/supply-chain controls."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Invoke Approved AI Models Through a Governed Gateway (Priority: P1)

As the Parley harness and future advocate agents, I need all model invocations to pass through one governed AI infrastructure surface, so each invocation uses an approved model selection, prompt version, runtime budget, and audit envelope.

**Why this priority**: F13 and F14 cannot safely run advocate agents until model calls are centralized, version-pinned, budget-aware, and auditable. Unmediated model calls would bypass the platform's supply-chain and cost controls.

**Independent Test**: Given an approved model version, prompt version, caller identity, run ref, and cost budget, request a model invocation and verify it records the pinned refs, request envelope, response metadata, cost estimate, and audit refs without allowing direct untracked invocation.

**Acceptance Scenarios**:

1. **Given** an agent runtime has an approved prompt version, approved model version, caller identity, and active run ref, **When** it requests a model invocation, **Then** the system accepts the request, records the exact prompt/model refs, and returns structured invocation evidence.
2. **Given** a model invocation request lacks a prompt version, model version, caller identity, or run ref, **When** the request is evaluated, **Then** the system refuses the invocation with a stable reason code and records the refusal.
3. **Given** an agent attempts to invoke a model outside the governed gateway surface, **When** package verification runs, **Then** the bypass is detected and fails the verification gate.

---

### User Story 2 - Publish Immutable Prompt and Model Versions (Priority: P1)

As a platform operator or release process, I need prompt templates and model selections to be published as immutable signed versions, so every agent output can be reconstructed against the exact prompt and model posture that produced it.

**Why this priority**: Constitution supply-chain controls treat prompts and model configuration as release artifacts. Advocate agents must never depend on mutable prompt text, ad hoc model names, or admin-edited runtime state.

**Independent Test**: Publish a prompt version and a model profile version, sign their manifests, attempt to mutate them, and verify that dispatch uses the original immutable versions while mutations require a new version.

**Acceptance Scenarios**:

1. **Given** a prompt template is published, **When** the publish operation completes, **Then** it creates an immutable prompt version with content hash, variables, allowed use scope, signature evidence, release manifest ref, and audit ref.
2. **Given** a model profile is published, **When** the publish operation completes, **Then** it creates an immutable model version with provider/model identity, capability class, risk posture, cost metadata, signature evidence, release manifest ref, and audit ref.
3. **Given** a published prompt or model version is superseded, **When** existing runs are reviewed, **Then** those runs still point to their dispatch-time versions and are not silently moved to the newer versions.

---

### User Story 3 - Freeze AI Runtime Manifests Per Deployment (Priority: P1)

As compliance and operations staff, I need deployed AI runtime manifests to be frozen per release, so prompt, model, cost, and safety posture changes happen only through an explicit release path and never through hot reload.

**Why this priority**: Parley's no-hot-reload posture requires deployed policy and prompt configuration to be release events. This prevents invisible prompt drift during active negotiations and makes incident review possible.

**Independent Test**: Create a deployment manifest from approved prompt/model versions, dispatch a run, publish newer versions, and verify the active run continues under its frozen manifest until a new release or explicit dispatch-time selection is used.

**Acceptance Scenarios**:

1. **Given** approved prompt and model versions are available, **When** a deployment manifest is created, **Then** it pins the exact versions, allowed caller scopes, cost controls, and signature evidence for the release.
2. **Given** a manifest is active for a deployment, **When** a prompt or model registry entry changes, **Then** in-flight and newly dispatched runs do not observe the change unless a new manifest is released and selected.
3. **Given** no active manifest authorizes a requested prompt/model pair, **When** dispatch evaluates the AI runtime request, **Then** dispatch fails closed with a stable reason code.

---

### User Story 4 - Control AI Cost, Abuse, and Supply-Chain Risk (Priority: P2)

As operations and security staff, I need model usage to enforce budgets, provider allowlists, and manifest integrity, so agent rollouts remain cost-bounded and resistant to unauthorized model or prompt changes.

**Why this priority**: Advocate agents will create recurring model traffic. The platform needs cost ceilings, provider posture evidence, and tamper checks before agents become product-critical.

**Independent Test**: Seed approved and unapproved model versions, configure budget ceilings, simulate invocations, and verify allowed traffic records spend evidence while over-budget or unapproved traffic is refused and audited.

**Acceptance Scenarios**:

1. **Given** a caller has a per-run or per-match cost ceiling, **When** the projected invocation would exceed that ceiling, **Then** the request is refused or downgraded according to the manifest policy and the decision is audited.
2. **Given** a model provider or model version is not on the active allowlist, **When** an invocation is requested, **Then** the system refuses the request with a supply-chain reason code.
3. **Given** a manifest signature or content hash cannot be verified, **When** dispatch or invocation attempts to use that manifest, **Then** the system refuses all affected invocations until valid release evidence is present.

### Edge Cases

- A prompt version references a required variable that is missing at render time.
- A prompt render includes untrusted text that must preserve sentinel boundaries from the privacy-filter posture.
- A model provider is temporarily unavailable after dispatch has frozen the selected model version.
- A model version is deprecated while runs that reference it are still in progress.
- A deployment manifest is signed but references a retired prompt or model version.
- A cost estimate is unavailable before invocation.
- A model response lacks expected usage metadata.
- A caller requests a prompt version outside its allowed agent contract or runtime scope.
- Two releases publish prompt versions with identical content but different metadata.
- Audit storage is unavailable during an attempted invocation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST expose one governed model invocation surface for agent and Parley runtime code.
- **FR-002**: System MUST require every model invocation request to include caller identity, run or dispatch ref, prompt version ref, model version ref, purpose, and budget context.
- **FR-003**: System MUST refuse model invocation requests that lack required refs, use unauthorized refs, exceed policy, or cannot be audited.
- **FR-004**: System MUST publish immutable prompt versions with prompt id, version, content hash, variable contract, allowed use scope, status, release manifest ref, signature evidence, and audit ref.
- **FR-005**: System MUST publish immutable model profile versions with provider/model identity, capability class, allowed use scope, risk posture, cost metadata, status, release manifest ref, signature evidence, and audit ref.
- **FR-006**: System MUST treat prompt and model version changes as release events that create new immutable versions rather than mutating existing versions.
- **FR-007**: System MUST create signed AI runtime manifests that pin approved prompt versions, model versions, allowed caller scopes, budget controls, and supply-chain evidence for a deployment or release.
- **FR-008**: System MUST enforce a no-hot-reload posture where active runs and dispatch decisions use the prompt/model/manifest refs selected at dispatch time or release time, not mutable registry state.
- **FR-009**: System MUST record canonical audit evidence for prompt publication, model publication, manifest publication, invocation acceptance, invocation refusal, response receipt, usage metadata capture, and cost-control decisions.
- **FR-010**: System MUST produce stable reason codes for refused AI infrastructure operations.
- **FR-011**: System MUST support scoped review reads that reconstruct prompt refs, model refs, manifest refs, invocation metadata, cost evidence, refusal reason codes, and audit refs without exposing unauthorized prompt content or private run data.
- **FR-012**: System MUST enforce provider and model allowlists from signed manifest evidence before invocation.
- **FR-013**: System MUST enforce per-run, per-match, and per-caller cost ceilings before and after invocation when cost evidence is available.
- **FR-014**: System MUST record missing or incomplete usage metadata as auditable risk evidence.
- **FR-015**: System MUST keep prompt rendering separate from rubric scoring and MUST NOT embed rubric weights or scoring policy in prompt template versions.
- **FR-016**: System MUST verify prompt variable contracts before invocation and refuse renders with missing, extra, or unsafe variables according to the prompt version contract.
- **FR-017**: System MUST preserve untrusted-input boundary markers supplied by upstream privacy-filter and prompt-construction controls.
- **FR-018**: System MUST provide verification gates that detect direct model-provider usage outside the governed invocation surface.
- **FR-019**: System MUST make model/prompt refs available to F13 and F14 advocate agents without granting those agents permission to publish or mutate prompt, model, or manifest versions.
- **FR-020**: System MUST keep F12 boundaries clear: F07a owns agent contract publication, F07b owns rubric versions and deterministic scoring, F08 owns Parley orchestration, F09 owns privacy filtering, F10 owns dossier signing, and F13/F14 own advocate behavior.

### Key Entities *(include if feature involves data)*

- **Prompt Version**: Immutable prompt-template release with content hash, variable contract, allowed use scope, status, signature evidence, manifest refs, and audit refs.
- **Model Profile Version**: Immutable approved model selection with provider/model identity, capability class, risk posture, cost metadata, allowed use scope, status, signature evidence, manifest refs, and audit refs.
- **AI Runtime Manifest**: Signed release artifact that pins approved prompt/model versions, caller scopes, cost controls, provider allowlists, no-hot-reload posture, and supply-chain evidence.
- **Model Invocation Record**: Auditable record of an accepted or refused invocation request, including caller, run/dispatch ref, prompt/model/manifest refs, reason code, response metadata, usage metadata, cost evidence, and audit refs.
- **Cost Control Policy**: Budget envelope for per-run, per-match, per-caller, and release-level usage with refusal or downgrade behavior.
- **Supply-Chain Evidence**: Signature, hash, manifest, and status evidence used to prove prompt/model/runtime posture at dispatch and review time.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of accepted model invocations record prompt version, model version, manifest ref, caller identity, run or dispatch ref, and audit ref.
- **SC-002**: 100% of invocation attempts missing required refs or auditability are refused with stable reason codes.
- **SC-003**: Publishing a prompt or model change creates a new immutable version and leaves prior version records unchanged.
- **SC-004**: Runs dispatched under a manifest continue to report the same prompt/model/manifest refs after newer prompt or model versions are published.
- **SC-005**: Over-budget or unallowlisted model requests are refused before invocation and produce reviewable cost or supply-chain evidence.
- **SC-006**: Scoped review reads can reconstruct the AI runtime posture for a sampled run without exposing unauthorized prompt content or private run data.
- **SC-007**: Verification gates detect direct model invocation paths outside the governed AI infrastructure surface.
- **SC-008**: Initial package verification passes unit tests, contract tests, type-check, lint, schema-lint, and an F12 staged quickstart run.

## Assumptions

- F12 creates the shared AI infrastructure foundation; F13 and F14 consume it but do not own prompt/model publication.
- F07a agent contracts will reference F12 prompt/model/manifest refs once F12 is available.
- F07b remains the source of rubric weights and scoring policy; prompts may ask for structured observations but not embed scoring weights.
- F08 dispatch remains responsible for freezing run-time refs and passing the selected AI runtime posture into advocate execution.
- F09 remains responsible for privacy filtering and untrusted-input sentinel policy; F12 preserves those boundaries during prompt rendering.
- Prompt/model publishing is release-controlled for the initial scope; there is no admin UI path for editing live prompts.
- Provider outage handling may refuse or return a manifest-authorized fallback only when the signed manifest explicitly permits that behavior.
- Exact provider pricing may change over time, so cost controls store the pricing evidence used at the time of estimate and review.
