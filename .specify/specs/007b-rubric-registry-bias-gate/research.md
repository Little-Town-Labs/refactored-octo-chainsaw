# Research: F07b Rubric Registry + Bias-Test Dispatch Gate

## Decision: Implement F07b as a dedicated `@spyglass/rubrics` package

**Rationale**: Rubrics are independent policy artifacts, not agent contracts and not runner internals. A dedicated package keeps rubric publication, bias-test evidence, dispatch gate evaluation, deterministic scoring, and review reads in one domain boundary while allowing F07a contracts to pin only `(rubric_id, version)`.

**Alternatives considered**:

- Add rubric bodies to `@spyglass/agent-contracts`: rejected because F07a intentionally owns refs only and contract updates should not imply rubric-body ownership.
- Add scoring directly to `@spyglass/parley`: rejected because F08 runner work should consume already-reviewed policy artifacts rather than define them.

## Decision: Store immutable rubric versions and separate bias-test artifacts

**Rationale**: A rubric version is the scoring policy; a bias-test artifact is evidence about that policy under a declared methodology and jurisdiction posture. Keeping them separate supports artifact replacement, rejection, or supersession without mutating the rubric version itself.

**Alternatives considered**:

- Inline the bias-test object inside the rubric version row: rejected because artifact lifecycle and audit evidence differ from rubric publication lifecycle.
- Treat `bias_test_ref` as a string only: rejected because dispatch must verify artifact status, rubric hash binding, and coverage.

## Decision: Bind bias-test artifacts to rubric content hashes

**Rationale**: Constitution I.A.2 requires a new bias-audit pass on material rubric change. Binding each artifact to the immutable rubric `content_hash` prevents a completed artifact for an older rubric body from unlocking a newer version.

**Alternatives considered**:

- Bind by `(rubric_id, version)` only: rejected because it misses accidental or malicious body drift where ids remain stable.
- Bind by publication timestamp: rejected because ordering does not prove content identity.

## Decision: Production dispatch fails closed on bias-test gaps

**Rationale**: The roadmap calls F07b the Stage 3 P0 gate before Parley runtime work. Missing, incomplete, rejected, stale, mismatched, or insufficiently covered bias-test evidence must return stable deny reason codes and prevent run dispatch.

**Alternatives considered**:

- Allow dispatch with warning-level evidence gaps: rejected because it weakens Constitution I.A primitive 3.
- Restrict refusal to NYC-only posture: rejected because Phase 1+ AEDT posture must not preclude broader jurisdictional conformity.

## Decision: Compute weighted totals in pure harness code

**Rationale**: Per Parley and the roadmap, the harness owns deterministic weighted totals. Model-generated holistic scores are ignored for final scoring and emitted as audit/regression signals so prompts and model outputs cannot silently redefine scoring policy.

**Alternatives considered**:

- Ask the model to produce final totals: rejected because it is nondeterministic and bypasses rubric policy.
- Accept model holistic scores when they match the deterministic total: rejected because allowing them conditionally creates an unnecessary second scoring authority.

## Decision: Normalize weights and use a documented rounding policy

**Rationale**: Weight inputs may be human-entered and need deterministic behavior. F07b should validate non-negative weights, reject zero-total weight sets, normalize to a fixed total internally, and round final totals using a single documented policy.

**Alternatives considered**:

- Require weights to sum to exactly one at write time: rejected because decimal representation and authoring ergonomics create avoidable friction.
- Store only integer percentages: rejected because some rubrics need finer weighting.

## Decision: Use scoped review reads without raw applicant content

**Rationale**: Compliance staff need to reconstruct rubric/bias evidence and dispatch refusals, but F07b should expose policy metadata and reason codes, not transcript or applicant content. Raw dossier and transcript details remain owned by F05/F10 surfaces.

**Alternatives considered**:

- Let reviewers inspect tables directly: rejected because it bypasses scoped access and stable review contracts.
- Include raw scored content in dispatch-denial records: rejected because refusals should be non-PII evidence.
