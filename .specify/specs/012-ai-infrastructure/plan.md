# Implementation Plan: F12 AI Infrastructure

**Branch**: `012-ai-infrastructure` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/012-ai-infrastructure/spec.md`

## Summary

F12 turns the existing `@spyglass/ai` placeholder into the governed AI infrastructure layer required before F13/F14 advocate agents. It centralizes model invocation behind one gateway client surface, publishes immutable prompt and model profile versions, signs release manifests, enforces no-hot-reload runtime posture, records model/prompt/cost/supply-chain audit evidence, and provides scoped review reads for reconstruction.

The first implementation slice stays package-level and deterministic. It adds version registries, manifest validation, prompt rendering guards, invocation policy checks, a typed gateway adapter boundary, and staged quickstart fixtures without requiring live provider credentials in CI. Real advocate agents consume this surface later through F13/F14.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing `@spyglass/ai`, `@spyglass/db`, `@spyglass/auth`, `@spyglass/audit-log`, `@spyglass/agent-contracts`, `@spyglass/privacy-filter`, and `@spyglass/shared`. Add the Vercel AI SDK only behind `@spyglass/ai`; do not add provider SDKs directly to advocate packages.

**Storage**: PostgreSQL/Neon through Drizzle migrations. New F12 tables for prompt versions, model profile versions, AI runtime manifests, invocation records, cost policy events, and supply-chain evidence refs.

**Testing**: Jest unit/integration tests, contract schema validation tests, package type-check, ESLint, schema-lint, boundary tests for direct provider imports, and an F12 staged dev quickstart run with a fake gateway adapter.

**Target Platform**: Existing TypeScript monorepo, Vercel server-side runtime, Postgres-backed domain packages, future Vercel AI Gateway production binding.

**Project Type**: Backend domain package + database schema + agent-facing contracts. No user-facing UI.

**Performance Goals**: Prompt/model/manifest resolution should complete under 75ms p95 in seeded local package tests; prompt rendering and preflight policy checks should complete under 100ms p95; fake-adapter staged invocation should complete under 250ms p95.

**Constraints**: One governed invocation surface; immutable prompt/model versions; signed manifests; no hot reload; dispatch-time refs remain frozen; provider/model allowlists fail closed; cost ceilings enforced before and after invocation where evidence exists; prompt rendering remains separate from rubric scoring; no rubric weights in prompts; every privileged mutation and invocation decision is auditable.

**Scale/Scope**: Phase 0/Phase 1 launch AI posture for seeker and employer advocate agents, with reason codes and schemas stable enough for F08, F13, F14, and F10 review evidence.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F12 compliance plan |
| --- | --- | --- |
| §I.2 Integrity | Rubrics, prompts, and scores are versioned and reconstructable | Prompt/model/manifest refs are immutable, audit-linked, and emitted in invocation records |
| §I.5 AAA | Privileged actions attributable to identified principals | Publication and invocation require caller/principal context and scoped authorization |
| §I.6 Secure by default | Missing policy or auditability fails closed | Missing refs, invalid signatures, unallowlisted providers, and unavailable audit sinks refuse invocation |
| §I.A.1 AI standards | AI risks must be governed and measurable | STRIDE/LINDDUN threat model, prompt-injection boundaries, and supply-chain/cost controls are planned deliverables |
| §I.C.2 AI supply chain | Prompts/models are versioned, signed, SBOM-equivalent release artifacts | Signed AI runtime manifests pin prompt/model versions and no hot reload is permitted |
| §II Agent-Native | Agents consume explicit machine-readable capabilities | F12 exposes typed contracts and reviewable invocation records for F13/F14 agents |
| §III.2 Agent semantics | Agent surfaces need versioned schemas and deterministic errors | JSON Schema contracts and stable refusal reason codes are generated |
| §V.3 Conformance gates | Article I/II features require threat modeling and security review | `threat-model.md` is included; `/security-review` is mandatory before closure |

**Gate result**: Pass. F12 implements required AI supply-chain controls rather than weakening foundational articles.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/012-ai-infrastructure/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── threat-model.md
├── quickstart.md
├── contracts/
│   ├── prompt-version.schema.yaml
│   ├── model-profile-version.schema.yaml
│   ├── ai-runtime-manifest.schema.yaml
│   ├── model-invocation-record.schema.yaml
│   └── ai-operation-refusal.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/db/
├── src/schema/ai-infrastructure.ts
├── src/schema/index.ts
├── migrations/0014_f12_ai_infrastructure.sql
└── migrations/meta/_journal.json

packages/ai/
├── package.json
├── tsconfig.json
├── jest.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── prompt-registry.ts
│   ├── model-registry.ts
│   ├── manifest.ts
│   ├── prompt-renderer.ts
│   ├── invocation.ts
│   ├── gateway.ts
│   ├── cost-controls.ts
│   ├── review.ts
│   ├── import-boundary.ts
│   ├── repo.ts
│   └── __tests__/
└── scripts/
    └── f12-staged-dev-run.ts

docs/runbooks/
└── ai-infrastructure.md
```

**Structure Decision**: Extend the existing `@spyglass/ai` package instead of creating a new package. F01 reserved this package for the AI access layer, and keeping the governed gateway, prompt registry, model registry, manifests, and cost controls together avoids scattering model-invocation authority across future agent packages.

## Phase 0 Research

See [research.md](research.md). No unresolved clarification markers remain.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [threat-model.md](threat-model.md)
- [quickstart.md](quickstart.md)
- [contracts/prompt-version.schema.yaml](contracts/prompt-version.schema.yaml)
- [contracts/model-profile-version.schema.yaml](contracts/model-profile-version.schema.yaml)
- [contracts/ai-runtime-manifest.schema.yaml](contracts/ai-runtime-manifest.schema.yaml)
- [contracts/model-invocation-record.schema.yaml](contracts/model-invocation-record.schema.yaml)
- [contracts/ai-operation-refusal.schema.yaml](contracts/ai-operation-refusal.schema.yaml)

## Implementation Phases

1. **Governance and contracts**: add schemas, reason-code registry, threat-model notes, data-classification/retention/invariant updates, and schema contract tests.
2. **Schema and package expansion**: add F12 DB schema/migration and expand `@spyglass/ai` package exports.
3. **Prompt and model registries**: implement immutable publication, status transitions, signatures, audit evidence, and scoped review reads.
4. **Runtime manifests**: implement signed manifest creation, verification, no-hot-reload selection, and dispatch-time freeze helpers.
5. **Prompt rendering and gateway boundary**: validate variable contracts, preserve untrusted-input sentinels, separate prompts from rubric scoring, and expose one gateway adapter interface.
6. **Invocation and cost controls**: enforce required refs, allowlists, budget ceilings, usage metadata capture, refusal reason codes, and invocation audit records.
7. **Verification gates and runbook**: add direct-provider import boundary tests, staged dev-run, runbook, `/speckit-analyze`, `/code-review`, `/security-review`, final package gates.

## Risks

- **Direct model-provider bypass**: mitigated by one exported invocation surface and import-boundary tests.
- **Prompt drift after dispatch**: mitigated by immutable prompt/model versions and signed runtime manifests.
- **Cost blowout under agent loops**: mitigated by preflight budget checks, post-response usage capture, and stable refusal/downgrade evidence.
- **Prompt injection via untrusted text**: mitigated by variable contracts and preserving F09 sentinel boundaries during rendering.
- **Rubric/prompt boundary blur**: mitigated by explicit tests that prompt versions do not carry rubric weights or scoring policy.
- **Provider outage ambiguity**: mitigated by manifest-authorized fallback only; otherwise fail closed with auditable reason codes.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.2 | Pass: prompt/model/manifest refs and invocation records are immutable and reviewable |
| §I.5 | Pass: publication and invocation require scoped principals |
| §I.6 | Pass: missing refs, invalid signatures, policy gaps, budget gaps, and audit gaps refuse by default |
| §I.A.1 | Pass: threat model and AI-specific risk controls are included |
| §I.C.2 | Pass: AI supply-chain artifacts are signed, manifest-pinned, and release-controlled |
| §II | Pass: agent-facing AI capabilities are explicit and typed |
| §III.2 | Pass: schemas and reason codes define deterministic machine-readable surfaces |
| §V.3 | Pass: threat-model deliverable is present and `/security-review` remains mandatory |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
