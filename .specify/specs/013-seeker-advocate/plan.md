# Implementation Plan: F13 Seeker Advocate Agent

**Branch**: `013-seeker-advocate` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/013-seeker-advocate/spec.md`

## Summary

F13 turns the existing reserved `@spyglass/agents` package into the governed seeker-side advocate driver consumed by Parley side-runner execution. It produces seeker negotiation turns and final seeker-side rubric scores from frozen dispatch refs, F12-managed AI invocation, privacy-filtered counterparty projections, and a seeker-owned principal view.

The first implementation slice stays package-level and deterministic enough for CI. It defines the seeker advocate input/output contracts, validates scoring against the resolved seeker rubric, preserves run-to-completion and no-hot-reload posture, emits audit-ready version/ref evidence, and adds a credibility eval baseline covering normal, inconclusive, privacy, prompt-injection, unsupported-tool, and budget-limit cases.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing `@spyglass/agents`, `@spyglass/ai`, `@spyglass/parley`, `@spyglass/agent-contracts`, `@spyglass/rubrics`, `@spyglass/tool-dispatcher`, `@spyglass/privacy-filter`, `@spyglass/audit-log`, and `@spyglass/shared`. No direct provider SDK dependency is permitted in `@spyglass/agents`.

**Storage**: No new persistent tables in the first F13 slice. The seeker advocate records model invocation evidence through F12 and returns turn/scoring evidence to F08/F10. Package tests use in-memory fixtures.

**Testing**: Jest unit tests, JSON Schema contract validation tests, package type-check, ESLint, direct-provider import boundary tests, deterministic fixture tests, and an F13 staged dev-run/eval baseline.

**Target Platform**: Existing TypeScript monorepo, Vercel server-side runtime, Parley side-runner package integration, future Inngest-bound execution through `@spyglass/parley`.

**Project Type**: Backend agent domain package + machine-readable contracts + eval fixtures. No user-facing UI.

**Performance Goals**: Deterministic validation-only turn/scoring fixtures complete under 100ms p95 locally; fake-gateway seeker turn and scoring eval suite completes under 500ms p95 locally.

**Constraints**: Seeker side only; no direct model-provider imports; no prompt/model/manifest hot reload; no rubric weights or scoring policy in prompts; no human-input pause path; no unfiltered counterparty data; no prior-run context inheritance; deterministic score validation; failures stay local to the affected run/side.

**Scale/Scope**: Phase 0 seeker advocate baseline for one Parley side. F14 implements employer-side advocate behavior separately; F15 implements renegotiation orchestration; F20 implements interactive seeker conversational flows.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | F13 compliance plan |
| --- | --- | --- |
| §I.1 Confidentiality | Counterparty content must be filter-mediated | Seeker advocate accepts only seeker principal view and privacy-filtered employer projections |
| §I.2 Integrity | Prompt/rubric/model/score evidence must be reconstructable | Outputs carry frozen refs, invocation evidence, validated per-dimension scores, and rationale evidence |
| §I.3 Availability | Ticket lifecycle survives advocate outage | Failures return bounded refusals/inconclusive flags local to the affected run/side |
| §I.4.1 Privacy | Seeker data use is purpose-limited | Inputs are limited to match-ticket negotiation and seeker-side fit scoring |
| §I.5 AAA | Agents are authenticated and least-privileged | Seeker advocate operates under scoped agent principal evidence and declared contract/tool capabilities |
| §I.6 Secure by default | Missing policy/data defaults to refuse | Missing refs, invalid refs, unsupported tools, unfiltered data, and budget breaches refuse or flag inconclusive |
| §I.A.1 AI standards | Prompt injection and AEDT risks must be measured | Eval baseline covers injection, privacy bypass, scoring quality, and budget controls |
| §I.C.2 AI supply chain | Prompt/model changes are release events | F13 consumes F12 signed prompt/model/runtime manifest refs and never mutates them |
| §II Agent-Native | Advocate is a first-class agent principal | F13 declares machine-readable seeker advocate capabilities and reason codes |
| §III.2 Agent semantics | Agent surfaces need deterministic schemas | Contracts define seeker turn, scoring, refusal, and eval evidence shapes |
| §V.3 Conformance gates | Article I/II feature requires review | `/speckit-analyze`, `/code-review`, and `/security-review` are required before closure |

**Gate result**: Pass. F13 consumes completed governance layers and does not weaken foundational articles.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/013-seeker-advocate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── seeker-advocate-turn.schema.yaml
│   ├── seeker-advocate-scoring.schema.yaml
│   ├── seeker-advocate-refusal.schema.yaml
│   └── seeker-advocate-eval-case.schema.yaml
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
│   ├── eval.ts
│   ├── import-boundary.ts
│   ├── fixtures.ts
│   └── __tests__/
└── scripts/
    └── f13-staged-dev-run.ts
```

**Structure Decision**: Extend the existing `@spyglass/agents` package reserved for F13/F14. Keep F13 seeker-side logic isolated behind exported seeker advocate driver functions so F14 can add employer-side symmetry without changing F13 contracts.

## Phase 0 Research

See [research.md](research.md). No unresolved clarification markers remain.

## Phase 1 Design

See:

- [data-model.md](data-model.md)
- [quickstart.md](quickstart.md)
- [contracts/seeker-advocate-turn.schema.yaml](contracts/seeker-advocate-turn.schema.yaml)
- [contracts/seeker-advocate-scoring.schema.yaml](contracts/seeker-advocate-scoring.schema.yaml)
- [contracts/seeker-advocate-refusal.schema.yaml](contracts/seeker-advocate-refusal.schema.yaml)
- [contracts/seeker-advocate-eval-case.schema.yaml](contracts/seeker-advocate-eval-case.schema.yaml)

## Implementation Phases

1. **Contracts and package wiring**: add F13 schemas, package dependencies, exports, reason-code types, and contract validation tests.
2. **Input boundary and refs**: implement seeker advocate input validation for frozen contract/prompt/model/manifest/rubric/privacy/tool refs.
3. **Turn driver**: assemble F12 invocation requests from seeker principal view, filtered counterparty projection, run context, and rubric dimension names while preserving sentinel boundaries.
4. **Scoring driver**: validate per-dimension seeker scores, reject missing/extra/out-of-range dimensions, ignore holistic scores, and emit inconclusive flag proposals.
5. **Safety and isolation guards**: block unfiltered employer data, unsupported tools, prior-run context inheritance, direct provider imports, and human-input pause semantics.
6. **Eval baseline and staged run**: add deterministic scenarios and fake-gateway quickstart evidence for strong match, weak match, insufficient evidence, privacy attack, prompt injection, unsupported tool, and budget refusal.
7. **Closure**: run package gates, `/speckit-analyze`, `/code-review`, `/security-review`, update roadmap, and prepare PR.

## Risks

- **Scope creep into F14**: mitigated by seeker-only exports and contracts.
- **Prompt/rubric boundary blur**: mitigated by F12 prompt checks and F13 tests that score validation uses rubric metadata, not prompt-embedded weights.
- **Cross-side leakage**: mitigated by accepting only privacy-filtered counterparty projections and adding rejection tests for raw employer fields.
- **Agent credibility below threshold**: mitigated by eval baseline before implementation closure.
- **Provider bypass**: mitigated by direct-provider import boundary tests in `@spyglass/agents`.
- **False conclusive scoring**: mitigated by dimension coverage validation and inconclusive flags for insufficient evidence.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.1 | Pass: input model permits only filtered counterparty projections |
| §I.2 | Pass: outputs carry frozen refs, invocation refs, and validated score evidence |
| §I.3 | Pass: bounded refusals/inconclusive flags preserve ticket lifecycle |
| §I.4.1 | Pass: feature is purpose-limited to seeker-side match negotiation |
| §I.5 | Pass: scoped agent principal and declared capabilities are required |
| §I.6 | Pass: missing policy/data/tools/defaults refuse or flag inconclusive |
| §I.A.1 | Pass: eval scenarios cover AI risk controls |
| §I.C.2 | Pass: F13 consumes signed F12 refs and does not hot reload |
| §II | Pass: seeker advocate is an explicit agent-native actor |
| §III.2 | Pass: schemas and reason codes define machine-readable outputs |
| §V.3 | Pass: analyze/code/security reviews remain required |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
