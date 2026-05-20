# Research — F06 Jurisdiction Policy Gates

## Decision 1: Use A Dedicated Policy-Gates Package

**Decision**: Create `@spyglass/policy-gates` for evaluator logic, kill-switch mutation, review reads, and Drizzle adapters.

**Rationale**: F06 is a cross-cutting compliance domain consumed by F04, F08, F10, and F24. A dedicated package keeps policy logic independently testable and avoids coupling jurisdiction decisions to ticket repositories or future Parley runner internals.

**Alternatives considered**:

- Put gate logic in `@spyglass/tickets`: rejected because F08 run dispatch and F10 dossier delivery also need the gate and should not depend on ticket mutation internals.
- Put gate logic in `apps/web`: rejected because the core behavior must be reusable by services, tests, and future agent/runtime packages.

## Decision 2: Store Policy Posture And Decisions In PostgreSQL

**Decision**: Add Drizzle tables for `jurisdiction_policies`, `jurisdiction_gate_decisions`, and `jurisdiction_kill_switch_events`.

**Rationale**: The system already uses PostgreSQL/Neon as the source of truth for tickets, principals, audit, and transcripts. F06 needs durable policy posture, immutable decision history, and no-deploy kill-switch changes; relational storage gives transactional writes and reviewable history without introducing a new service.

**Alternatives considered**:

- Static config file: rejected because kill switches must flip without deploy.
- Environment variables: rejected because changes are not sufficiently attributable, reviewable, or granular.
- External feature flag service: deferred; a DB-backed control plane is simpler and keeps audit/counsel evidence in the same system.

## Decision 3: Fail-Safe Deny Is The Evaluator Default

**Decision**: The gate evaluator returns `deny` for missing, unknown, inactive, unsupported, disabled, expired, conflicting, or policyless jurisdictions.

**Rationale**: Constitution §I.6 requires fail-safe defaults, and roadmap risk analysis identifies mis-tagged jurisdiction routing as critical. A positive allow requires every required jurisdiction to be covered by active posture.

**Alternatives considered**:

- Allow unknown jurisdictions in Phase 0 alpha: rejected because it violates the constitutional rule and would normalize unsafe launch posture.
- Soft warning plus continue: rejected because policy-gate failures must never be silent or soft-pass.

## Decision 4: Closed Reason-Code Enums For Decisions And Switches

**Decision**: Use closed-list reason codes for gate decisions and kill-switch changes.

**Rationale**: Stable codes are needed by F08, F10, F24, audit review, and quickstart tests. Free-text notes may exist later, but the decision machinery cannot depend on free text.

**Alternatives considered**:

- Free-text-only reasons: rejected because they are not testable or stable for downstream automation.
- Per-jurisdiction custom reason strings: rejected for the same reason; jurisdiction-specific details belong in policy metadata or counsel notes.

## Decision 5: Audit Every Decision And Kill-Switch Change Through F05

**Decision**: Gate decisions and kill-switch changes append canonical audit events through `@spyglass/audit-log`.

**Rationale**: F05 is the canonical evidence spine. F06 decisions affect whether hiring workflows proceed, so they must be attributable, hash-chained, and available for evidence exports.

**Alternatives considered**:

- Only persist decision rows: rejected because the constitution requires privileged and compliance-relevant actions to be audit-attributable.
- Console logging for denied gates: rejected because it is not durable or reviewable.

## Decision 6: Failure Artifacts Are Structured Denial Views

**Decision**: Represent failure artifacts as structured data derived from denied gate decisions, with non-PII subject references and audit evidence links.

**Rationale**: F06 does not build F10 dossiers, but downstream dossier/failure flows need stable denial facts. Keeping the artifact in F06 preserves a clean handoff without adding user-facing copy or dossier signing early.

**Alternatives considered**:

- Build full failure dossiers in F06: rejected because dossier construction/signing belongs to F10.
- Let each downstream feature invent its own denial shape: rejected because it would fragment audit evidence and reason-code semantics.

## Decision 7: Scope Names

**Decision**: Draft scope names are `policy.read`, `policy.decide`, and `policy.kill_switch.manage`.

**Rationale**: They match the existing additive scope registry shape and separate read, decision, and mutation authority. Human operator tier can be used by web surfaces, but package APIs should still support scope-based service principals.

**Alternatives considered**:

- Reuse `audit.read`/`audit.export`: rejected because policy posture and mutations are distinct capabilities.
- One broad `policy.admin` scope: rejected because it violates least privilege.
