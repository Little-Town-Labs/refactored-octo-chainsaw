# Research: F12 AI Infrastructure

## Decision 1: Extend `@spyglass/ai`

**Decision**: Build F12 inside the existing `@spyglass/ai` package, expanding it from the F01 placeholder into the governed AI access layer.

**Rationale**: The package already declares the intended ownership for gateway access, prompt registry, model/prompt versioning, and embeddings. Reusing it keeps model invocation authority in one domain package and prevents F13/F14 advocate packages from owning provider wiring.

**Alternatives considered**:

- Create `@spyglass/ai-infrastructure`: rejected because it would duplicate the reserved package boundary and increase import confusion.
- Put model clients in `@spyglass/agents`: rejected because advocate behavior should consume governed AI refs, not publish or mutate AI infrastructure.

## Decision 2: Package-Level Gateway Adapter First

**Decision**: Define a gateway adapter interface in `@spyglass/ai` and use a fake deterministic adapter for tests and the F12 staged dev-run. Production Vercel AI Gateway binding is added behind that interface.

**Rationale**: F12 must prove governance, versioning, auditability, prompt rendering, and cost behavior without requiring live provider credentials in CI. A package-level adapter lets tests verify the single invocation path while keeping external network behavior out of deterministic gates.

**Alternatives considered**:

- Call live AI Gateway in package tests: rejected because CI should not depend on credentials, network, or variable pricing.
- Wire provider SDKs directly: rejected because the F01/F12 posture centralizes on a gateway and prohibits ungoverned provider access.

## Decision 3: Immutable Prompt and Model Registries

**Decision**: Model prompt templates and model profiles as immutable `(id, version)` records with status transitions and audit-linked publication events.

**Rationale**: Constitution §I.2 and §I.C.2 require prompt/model versioning and release-style supply-chain evidence. Immutable records let F08/F13/F14 freeze exact refs at dispatch time and let reviewers reconstruct prior output even after later releases.

**Alternatives considered**:

- Mutable "active prompt" rows: rejected because they create invisible drift and break dossier reconstruction.
- Store prompt text only in code: rejected because runtime review needs structured metadata, variable contracts, and publication evidence.

## Decision 4: Signed Runtime Manifests as Release Boundary

**Decision**: Create AI runtime manifests that pin approved prompt versions, model profile versions, caller scopes, provider allowlists, cost ceilings, and signature/hash evidence.

**Rationale**: Parley's no-hot-reload posture makes prompt/model changes release events. A signed manifest is the concrete artifact that both dispatch and review can use to prove which AI posture was active for a run.

**Alternatives considered**:

- Resolve "latest published" at invocation time: rejected because it hot-loads registry state into in-flight behavior.
- Store allowlists only in environment variables: rejected because review and incident response need durable release evidence.

## Decision 5: Prompt Rendering Contract Preserves F09 Boundaries

**Decision**: Prompt rendering validates required/allowed variables and preserves upstream untrusted-input sentinel boundaries; it does not own privacy filtering.

**Rationale**: F09 already owns privacy rules and sentinel policy. F12 must not re-filter content or strip markers, but it must prevent missing, extra, or unsafe variables from entering model prompts.

**Alternatives considered**:

- Re-run privacy filtering during prompt rendering: rejected because it duplicates F09 and risks divergent policy.
- Treat prompt templates as raw string interpolation: rejected because variable contracts and sentinel preservation are core prompt-injection controls.

## Decision 6: Cost Controls Are Policy Evidence, Not Billing Truth

**Decision**: F12 stores the pricing and usage evidence used for preflight estimates and post-response accounting, and it treats missing usage metadata as an auditable risk condition.

**Rationale**: Provider prices and usage metadata can change. The platform needs the evidence used at the time of decision, not a later recalculation from current price tables.

**Alternatives considered**:

- Recompute cost from current pricing during review: rejected because it obscures historical decision inputs.
- Ignore missing usage metadata: rejected because absent cost evidence weakens abuse monitoring.

## Decision 7: Boundary Tests for Direct Provider Use

**Decision**: Add verification that agent and Parley packages do not import provider SDKs or direct gateway bindings outside `@spyglass/ai`.

**Rationale**: A governed gateway is only meaningful if other packages cannot bypass it. The repo already uses boundary tests for privacy/tool dispatch surfaces, so F12 should follow the same pattern.

**Alternatives considered**:

- Rely on code review to catch bypasses: rejected because direct model use is a high-risk supply-chain and cost-control bypass.
- Allow direct use in tests: rejected unless explicitly isolated behind `@spyglass/ai` fake adapters.
