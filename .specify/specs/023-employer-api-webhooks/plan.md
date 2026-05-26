# Implementation Plan: Employer REST API + Signed Webhooks

**Branch**: `023-employer-api-webhooks` | **Date**: 2026-05-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `.specify/specs/023-employer-api-webhooks/spec.md`

## Summary

F23 turns the employer integration surface into a real contract: a versioned OpenAPI 3.1 employer REST API for req creation/read/amend/close, organization-scoped integration credentials, webhook endpoint/secret lifecycle, and signed candidate/dossier webhook delivery with auditable receipts and bounded retries. The implementation will populate `packages/api-contracts`, add the web app route handlers and integration modules under `apps/web`, reuse the existing employer req ticket and dossier projection primitives, and keep ATS connectors/A2A runtime delivery out of scope.

## Technical Context

**Language/Version**: TypeScript strict, React 19 where admin UI is touched, Next.js 16 App Router for route handlers.

**Primary Dependencies**: Existing `@spyglass/auth`, `@spyglass/db`, `@spyglass/tickets`, `@spyglass/dossiers`, `@spyglass/notifications`, `@spyglass/api-contracts`, OpenAPI 3.1 YAML, JSON Schema 2020-12-compatible schemas, Web Crypto / Node crypto signing primitives already permitted in the stack.

**Storage**: Neon Postgres via Drizzle. Add F23 integration tables for employer API credentials, idempotency records, webhook endpoints, webhook signing secrets, webhook events, and delivery receipts. Reuse existing organizations, principals, employer req tickets, match tickets, dossiers, and audit buffers.

**Testing**: Jest for package/unit/route tests; OpenAPI contract validation test in `packages/api-contracts`; workspace `pnpm` scripts; principal coverage shell gate; Next build. Add focused route-handler tests for REST auth/idempotency and webhook signing/retry behavior.

**Target Platform**: Vercel-hosted Next.js web app plus internal durable delivery worker primitives that can run in the existing app/runtime.

**Project Type**: Brownfield web service and contract package inside existing monorepo.

**Performance Goals**: REST list endpoints use bounded pagination; idempotency lookup and webhook receipt writes are single-organization scoped; webhook signing/verification remains sub-100 ms for normal payloads; first delivery attempt is enqueued or recorded within 10 seconds of delivery eligibility.

**Constraints**: No anonymous mutating handlers; every REST mutation must use typed principal/service verification and organization scoping; no seeker API; no ATS-specific connector; no bidirectional sync; no A2A runtime delivery; no delivery of unsigned or non-employer-approved dossier projections; N-2 API compatibility and deprecation/sunset headers required.

**Scale/Scope**: One external employer API version family (`v1`), req endpoints, credential/webhook endpoint lifecycle surfaces, signed candidate/dossier webhook delivery path, contract docs/types, tests and quickstart evidence.

## Constitution Check

| Article | Status | F23 posture |
| --- | --- | --- |
| I.1 Confidentiality | PASS | Webhooks deliver employer-approved dossier projections only; cross-organization API access fails closed. |
| I.2 Integrity | PASS | Req mutations reuse ticket state/audit paths; webhook receipts and signing-secret lifecycle are auditable; unsigned/invalid dossiers fail closed. |
| I.3 Availability | PASS | Delivery failures produce explicit receipt states with bounded retries, not unknown employer state. |
| I.4 Privacy | PASS | F23 adds no seeker collection surface and exposes only approved employer-side projections. |
| I.5 AAA | PASS | Employer API credentials are authenticated, scoped, revocable principals; no anonymous mutating actions. |
| I.6 Defense in Depth | PASS | Route handlers verify credentials, scopes, organization ownership, idempotency, and payload bounds per request. |
| II Agent-Native | PASS | The REST contract is the primary machine-readable employer surface; semantics are stable and versioned. |
| III Dual-Audience Surfaces | PASS | OpenAPI 3.1 + JSON Schema contracts serve agents/integrators; docs and examples serve humans. |
| III.3 Versioning | PASS | N-2 compatibility plus `Deprecation`/`Sunset` response signals are release requirements. |
| IV Separation of Concerns | PASS | F23 remains integration plumbing; ATS connectors, A2A runtime, and seeker surfaces are excluded. |

## Project Structure

### Documentation (this feature)

```text
.specify/specs/023-employer-api-webhooks/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── employer-api.openapi.yaml
│   ├── webhook-events.schema.yaml
│   └── webhook-signature.contract.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/api-contracts/
├── openapi/
│   └── employer-api.v1.yaml
├── src/
│   ├── employer-api.ts
│   ├── webhook-events.ts
│   └── index.ts
└── src/__tests__/
    └── employer-api-contract.test.ts

packages/db/src/schema/
├── employer-api-credentials.ts
├── employer-api-idempotency.ts
└── employer-webhooks.ts

apps/web/app/api/employer/v1/
├── reqs/route.ts
├── reqs/[id]/route.ts
├── reqs/[id]/close/route.ts
├── webhooks/route.ts
└── webhooks/[id]/route.ts

apps/web/src/employer-api/
├── __tests__/
├── auth.ts
├── errors.ts
├── idempotency.ts
├── req-handlers.ts
├── req-service.ts
├── schemas.ts
├── webhook-endpoints.ts
├── webhook-signing.ts
├── webhook-delivery.ts
└── webhook-repo.ts

apps/web/src/employer-console/
├── integration-credentials-action.ts
├── integration-credentials-view.tsx
└── webhook-endpoints-view.tsx
```

**Structure Decision**: F23 uses `packages/api-contracts` as the external semantic source of truth, `apps/web/app/api/employer/v1` for route handlers, `apps/web/src/employer-api` for service/auth/idempotency/delivery logic, and small F22 console extensions only for credential and webhook endpoint lifecycle management.

## Phase 0: Research

Completed in [research.md](./research.md).

## Phase 1: Design & Contracts

Completed artifacts:

- [data-model.md](./data-model.md)
- [contracts/employer-api.openapi.yaml](./contracts/employer-api.openapi.yaml)
- [contracts/webhook-events.schema.yaml](./contracts/webhook-events.schema.yaml)
- [contracts/webhook-signature.contract.md](./contracts/webhook-signature.contract.md)
- [quickstart.md](./quickstart.md)

## Constitution Check (Post-Design)

No constitutional or structural violations require complexity exceptions. F23 is a foundational Article I/II/III surface, so implementation closure requires security review, threat-model notes for credential/webhook replay risks, contract validation evidence, and principal-coverage evidence before PR publication.

## Complexity Tracking

No violations.
