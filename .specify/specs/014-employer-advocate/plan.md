# Implementation Plan: F14 Employer Advocate Agent

**Branch**: `014-employer-advocate` | **Date**: 2026-05-22 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/014-employer-advocate/spec.md`

## Summary

F14 completes the two-sided Stage 5 advocate baseline by adding the governed employer-side advocate driver consumed by Parley side-runner execution. It produces employer negotiation turns and final employer-side rubric scores from frozen dispatch refs, F12-managed AI invocation, privacy-filtered seeker projections, and an employer-owned principal view.

The first implementation slice stays package-level and deterministic enough for CI. It extends the existing `@spyglass/agents` F13 shape with employer-side input/output contracts, regulated-surface scoring validation, protected-class boundary handling, rubric bias-gate checks, no-hot-reload posture, audit-ready version/ref evidence, and a credibility eval baseline covering normal, inconclusive, privacy, prompt-injection, unsupported-tool, bias-gate, protected-class, and budget-limit cases.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing `@spyglass/agents`, `@spyglass/ai`, `@spyglass/parley`, `@spyglass/agent-contracts`, `@spyglass/rubrics`, `@spyglass/tool-dispatcher`, `@spyglass/privacy-filter`, `@spyglass/audit-log`, and `@spyglass/shared`. No direct provider SDK dependency is permitted in `@spyglass/agents`.

**Storage**: No new persistent tables in the first F14 slice. The employer advocate records model invocation evidence through F12 and returns turn/scoring evidence to F08/F10. Package tests use in-memory fixtures.

**Testing**: Jest unit tests, JSON Schema contract validation tests, package type-check, ESLint, direct-provider import boundary tests, deterministic fixture tests, and an F14 staged dev-run/eval baseline.

**Target Platform**: Existing TypeScript monorepo, Vercel server-side runtime, Parley side-runner package integration, future Inngest-bound execution through `@spyglass/parley`.

**Project Type**: Backend agent domain package + machine-readable contracts + eval fixtures. No user-facing UI.

**Performance Goals**: Deterministic validation-only turn/scoring fixtures complete under 100ms p95 locally; fake-gateway employer turn and scoring eval suite completes under 500ms p95 locally.

**Constraints**: Employer side only; no direct model-provider imports; no prompt/model/manifest hot reload; no rubric weights, threshold policy, or hiring-decision policy in prompts; no human-input pause path; no raw seeker data; no prior-run context inheritance; deterministic score validation; protected-class boundary handling; failures stay local to the affected run/side.

**Scale/Scope**: Phase 0 employer advocate baseline for one Parley side. F13 implements seeker-side advocate behavior; F15 implements renegotiation orchestration; F20 implements interactive seeker conversational flows; F22/F23 implement employer surfaces.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F14 compliance plan |
| --- | --- | --- |
| §I.1 Confidentiality | Counterparty content must be filter-mediated | Employer advocate accepts only employer principal view and privacy-filtered seeker projections |
| §I.2 Integrity | Prompt/rubric/model/score evidence must be reconstructable | Outputs carry frozen refs, invocation evidence, validated per-dimension scores, and rationale evidence |
| §I.3 Availability | Ticket lifecycle survives advocate outage | Failures return bounded refusals/inconclusive flags local to the affected run/side |
| §I.4.1 Privacy | Seeker data use is purpose-limited and minimized | Employer advocate sees only F09-approved seeker projections for match negotiation and scoring |
| §I.5 AAA | Agents are authenticated and least-privileged | Employer advocate operates under scoped agent principal evidence and declared contract/tool capabilities |
| §I.6 Secure by default | Missing policy/data defaults to refuse | Missing refs, invalid refs, unsupported tools, raw seeker data, missing bias evidence, and budget breaches refuse or flag inconclusive |
| §I.A Regulatory | Employer rubric is an AEDT regulated surface | Scoring validation rejects unsupported decision content and requires rubric bias-gate evidence |
| §I.A.1 AI standards | Prompt injection and AEDT risks must be measured | Eval baseline covers injection, privacy bypass, protected-class boundary, scoring quality, and budget controls |
| §I.C.2 AI supply chain | Prompt/model/rubric changes are release events | F14 consumes F12 signed prompt/model/runtime manifest refs and F07b rubric refs; no hot reload |
| §II Agent-Native | Advocate is a first-class agent principal | F14 declares machine-readable employer advocate capabilities and reason codes |
| §III.2 Agent semantics | Agent surfaces need deterministic schemas | Contracts define employer turn, scoring, refusal, and eval evidence shapes |
| §V.3 Conformance gates | Article I/II feature requires review and threat model | `/speckit-analyze`, `/code-review`, `/security-review`, and [threat-model.md](threat-model.md) are required before closure |

**Gate result**: Pass. F14 consumes completed governance layers and does not weaken foundational articles.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/014-employer-advocate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── threat-model.md
├── quickstart.md
├── contracts/
│   ├── employer-advocate-turn.schema.yaml
│   ├── employer-advocate-scoring.schema.yaml
│   ├── employer-advocate-refusal.schema.yaml
│   └── employer-advocate-eval-case.schema.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/agents/
├── README.md
├── package.json
├── tsconfig.json
├── jest.config.js
├── eslint.config.js
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── seeker-advocate.ts
│   ├── seeker-scoring.ts
│   ├── employer-advocate.ts
│   ├── employer-scoring.ts
│   ├── eval.ts
│   ├── import-boundary.ts
│   ├── fixtures.ts
│   └── __tests__/
└── scripts/
    ├── f13-staged-dev-run.ts
    └── f14-staged-dev-run.ts
```

**Structure Decision**: Extend the existing `@spyglass/agents` package reserved for F13/F14. Keep F14 employer-side logic isolated behind exported employer advocate driver functions so F13 remains stable and F15 can consume both sides symmetrically.

## Phase 0 Research

See [research.md](research.md). No unresolved clarification markers remain.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [threat-model.md](threat-model.md)
- [quickstart.md](quickstart.md)
- [contracts/employer-advocate-turn.schema.yaml](contracts/employer-advocate-turn.schema.yaml)
- [contracts/employer-advocate-scoring.schema.yaml](contracts/employer-advocate-scoring.schema.yaml)
- [contracts/employer-advocate-refusal.schema.yaml](contracts/employer-advocate-refusal.schema.yaml)
- [contracts/employer-advocate-eval-case.schema.yaml](contracts/employer-advocate-eval-case.schema.yaml)

## Implementation Phases

1. **Contracts and package wiring**: add F14 schemas, package exports, employer reason-code types, dev-run script, and contract validation tests.
2. **Input boundary and refs**: implement employer advocate input validation for frozen contract/prompt/model/manifest/rubric/privacy/tool refs, employer-side context, bias-gate evidence, and filtered seeker projections.
3. **Turn driver**: assemble F12 invocation requests from employer principal view, filtered seeker projection, run context, and rubric dimension names while preserving sentinel boundaries and no-hot-reload refs.
4. **Scoring driver**: validate per-dimension employer scores, reject missing/extra/out-of-range dimensions, reject unsupported decision content, ignore holistic scores, and emit inconclusive flag proposals.
5. **Safety and isolation guards**: block raw seeker data, protected-class inference content, unsupported tools, prior-run context inheritance, direct provider imports, and human-input pause semantics.
6. **Eval baseline and staged run**: add deterministic scenarios and fake-gateway quickstart evidence for strong match, weak match, insufficient evidence, privacy attack, prompt injection, unsupported tool, rubric-bias-gate failure, protected-class boundary, and budget refusal.
7. **Closure**: run package gates, `/speckit-analyze`, `/code-review`, `/security-review`, update roadmap, and prepare PR.

## Risks

- **Scope creep into employer surfaces**: mitigated by employer-advocate-only exports and keeping F22/F23 admin/API work out of scope.
- **Prompt/rubric boundary blur**: mitigated by F12 prompt checks and F14 tests proving score validation uses rubric metadata, not prompt-embedded weights or thresholds.
- **Regulated-surface decision leakage**: mitigated by rejecting hire/no-hire recommendations, threshold decisions, holistic scores, and unsupported protected-class reasoning.
- **Cross-side leakage**: mitigated by accepting only privacy-filtered seeker projections and adding rejection tests for raw seeker fields.
- **Agent credibility below threshold**: mitigated by eval baseline before implementation closure.
- **Provider bypass**: mitigated by direct-provider import boundary tests in `@spyglass/agents`.
- **False conclusive scoring**: mitigated by dimension coverage validation, bias-gate checks, and inconclusive flags for insufficient evidence.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.1 | Pass: input model permits only filtered seeker projections |
| §I.2 | Pass: outputs carry frozen refs, invocation refs, and validated score evidence |
| §I.3 | Pass: bounded refusals/inconclusive flags preserve ticket lifecycle |
| §I.4.1 | Pass: feature is purpose-limited to employer-side match negotiation |
| §I.5 | Pass: scoped agent principal and declared capabilities are required |
| §I.6 | Pass: missing policy/data/tools/defaults refuse or flag inconclusive |
| §I.A | Pass: regulated employer rubric scoring remains outside model-controlled policy |
| §I.A.1 | Pass: eval scenarios cover AI and AEDT risk controls |
| §I.C.2 | Pass: F14 consumes signed F12/F07b refs and does not hot reload |
| §II | Pass: employer advocate is an explicit agent-native actor |
| §III.2 | Pass: schemas and reason codes define machine-readable outputs |
| §V.3 | Pass: threat model plus analyze/code/security reviews remain required |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
