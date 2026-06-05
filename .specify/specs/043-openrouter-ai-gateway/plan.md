# Implementation Plan: F12 Follow-up OpenRouter AI Gateway

**Branch**: `043-openrouter-ai-gateway` | **Date**: 2026-05-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `.specify/specs/043-openrouter-ai-gateway/spec.md`

## Summary

Add OpenRouter as the real production provider behind the existing F12 `@spyglass/ai` gateway boundary. The implementation keeps fake gateway tests and staged CI deterministic, adds a raw-fetch OpenRouter adapter, updates shared environment configuration, and updates runbooks so operators know which Vercel secrets to set.

## Technical Context

**Language/Version**: TypeScript, Node 24, ESM.

**Primary Dependencies**: Existing `@spyglass/ai` package and Node runtime `fetch`; no OpenRouter SDK dependency.

**Storage**: No new storage. Existing F12 invocation records, manifests, model profiles, and audit evidence continue to apply.

**Testing**: Jest unit tests for adapter behavior, package type-check, ESLint, `.env.example` drift regeneration, and the existing F12 staged dev run.

**Target Platform**: Existing TypeScript monorepo, Vercel server-side runtime, Postgres-backed domain packages.

**Project Type**: Backend domain package and operations documentation. No user-facing UI.

**Performance Goals**: Adapter normalization overhead under 25ms excluding provider network time; no live network calls in CI.

**Constraints**: One governed invocation surface; no direct provider SDK imports in agent packages; no live credentials required in tests; provider/model allowlists must fail closed; OpenRouter credentials must stay server-only.

**Scale/Scope**: Phase 0/Phase 1 AI provider path for seeker and employer advocate testing, with live provider smoke testing deferred until credentials are supplied.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Article | Requirement | Compliance plan |
| --- | --- | --- |
| §I.2 Integrity | AI outputs must remain reconstructable | Adapter returns normalized content, usage metadata, and response hash through F12 records |
| §I.5 AAA | Privileged actions attributable to principals | Existing invocation caller/run refs remain unchanged |
| §I.6 Secure by default | Missing config and provider failures fail closed | Adapter throws non-secret errors for missing key, HTTP failures, malformed payloads, and empty content |
| §I.C.2 AI supply chain | Prompts/models/configs are release artifacts | Model provider remains governed by signed model profiles and manifests |
| §II Agent-Native | Agent capabilities remain explicit and typed | Agents consume the existing `GatewayAdapter` contract only |
| §V.3 Conformance gates | Foundational AI work requires review and tests | Unit tests, env drift check, type-check, lint, staged runbook validation |

**Gate result**: Pass. This keeps the existing F12 boundary and changes only the provider adapter behind it.

## Project Structure

### Documentation (this feature)

```text
.specify/specs/043-openrouter-ai-gateway/
├── spec.md
├── plan.md
├── research.md
├── quickstart.md
├── tasks.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
packages/ai/src/
├── gateway.ts
├── index.ts
└── __tests__/gateway.test.ts

packages/shared/src/env.ts
.env.example
docs/runbooks/ai-infrastructure.md
AGENTS.md
.specify/feature.json
```

**Structure Decision**: Extend `packages/ai/src/gateway.ts` because F12 already established the gateway adapter as the only provider boundary. Keep OpenRouter configuration in `packages/shared/src/env.ts` because `.env.example` is generated from that schema.

## Phase 0 Research

See [research.md](research.md).

## Phase 1 Design

See [quickstart.md](quickstart.md). No new data model or external Spyglass API contract is required because OpenRouter remains internal behind `GatewayAdapter`.

## Post-Design Constitution Re-check

| Article | Result |
| --- | --- |
| §I.2 | Pass: response content, usage, and hash continue through F12 records |
| §I.5 | Pass: no invocation principal model changes |
| §I.6 | Pass: missing or invalid OpenRouter config fails closed |
| §I.C.2 | Pass: provider/model identity remains manifest-governed |
| §II | Pass: no direct agent provider surface |
| §V.3 | Pass: tests and docs are planned |

**Gate result**: Pass. No complexity exceptions required.

## Complexity Tracking

No constitution violations or complexity exceptions.
