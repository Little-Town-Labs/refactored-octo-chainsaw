# Feature Specification: Employer API and Webhook Gate Scenarios

**Feature Branch**: `032-product-api-webhook-gates`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "PTH07: Employer API + webhook receiver scenarios"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Verify Employer API Credential Scope (Priority: P1)

An engineer can run deterministic gate scenarios that prove employer API requests only succeed with a scoped synthetic service credential and fail closed for missing, expired, or insufficient scopes.

**Why this priority**: Alpha promotion cannot trust employer API automation unless credential scope, issuer, and failure behavior are deterministic and reviewable.

**Independent Test**: Run the PTH07 API gate suite and verify authorized requests pass while missing-scope and invalid-credential requests fail with stable reason codes and audit evidence.

**Acceptance Scenarios**:

1. **Given** a synthetic employer service credential with `req:write` and `webhook:manage` scopes, **When** the gate creates and updates a req, **Then** the operation succeeds and records the credential ref without exposing the raw secret.
2. **Given** a credential without the required scope, **When** the same req operation is attempted, **Then** the operation is denied with a stable reason code and no webhook is delivered.

---

### User Story 2 - Prove Signed Webhook Delivery (Priority: P1)

An engineer can run a signed webhook delivery scenario and inspect captured payloads, headers, signature verification results, delivery timing, and payload-boundary assertions.

**Why this priority**: Employer integrations need durable evidence that Spyglass can deliver signed events without leaking forbidden fields.

**Independent Test**: Run the PTH07 webhook sample and verify a req lifecycle event is captured by the synthetic receiver with a valid signature, expected event id, delivery timing, and no forbidden payload fields.

**Acceptance Scenarios**:

1. **Given** a req lifecycle event is emitted, **When** the synthetic receiver captures it, **Then** the webhook signature verifies and the capture is persisted with headers, payload metadata, and timing.
2. **Given** the webhook payload is inspected, **When** forbidden fields are checked, **Then** secrets, protected-class data, private seeker content, and raw credentials are absent.

---

### User Story 3 - Preserve Idempotency and Failure Evidence (Priority: P2)

An engineer can simulate duplicate webhook delivery and retry/failure behavior without live external services.

**Why this priority**: Integration failures must produce reviewable evidence without double-processing events or hiding delivery problems.

**Independent Test**: Run duplicate and failing synthetic deliveries and verify duplicate event ids are idempotent while failed deliveries produce failure captures and retry metadata.

**Acceptance Scenarios**:

1. **Given** the same event id is delivered twice, **When** the receiver processes both deliveries, **Then** the second delivery is marked duplicate and does not create a second accepted capture.
2. **Given** a receiver failure is requested by the scenario, **When** delivery is attempted, **Then** the result records failure status, retry eligibility, and reviewable evidence.

### Edge Cases

- Missing `Authorization` headers must fail before any req mutation is recorded.
- Credentials with expired timestamps or missing scopes must fail closed with stable reason codes.
- Webhook signatures must fail verification when payload bytes, timestamp, or signing secret do not match.
- Duplicate event ids must be idempotent across receiver captures.
- Payload-boundary checks must reject forbidden fields even when they are nested.
- Failure-mode deliveries must preserve safe evidence without exposing raw webhook secrets or credential material.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define typed employer API request, credential, req operation, webhook delivery, webhook capture, and webhook receiver contracts.
- **FR-002**: System MUST include deterministic PTH07 scenarios for authorized req creation/update/close, missing-scope denial, signed webhook delivery, duplicate delivery idempotency, and webhook failure evidence.
- **FR-003**: System MUST verify employer API auth using scoped synthetic service credentials and stable denial reason codes.
- **FR-004**: System MUST model req lifecycle operations without live external services while preserving deterministic ids and event refs.
- **FR-005**: System MUST sign webhook deliveries and verify signatures in the synthetic receiver.
- **FR-006**: System MUST persist webhook capture evidence including event id, delivery id, headers metadata, signature result, payload metadata, timing, idempotency result, status, and failure reason when applicable.
- **FR-007**: System MUST assert webhook payload boundaries and reject forbidden fields such as secrets, raw credentials, protected-class data, and private seeker content.
- **FR-008**: System MUST expose PTH07 runner helpers and a sample runner through the product harness public API.
- **FR-009**: System MUST include tests covering scoped auth, req lifecycle outcomes, signature verification, idempotency, failure evidence, payload-boundary validation, and result-store persistence.
- **FR-010**: System MUST not require live employer credentials, network listeners, Vercel URLs, Neon branches, or external webhook services for package unit tests.

### Key Entities

- **Employer API Credential**: A synthetic service credential with id, employer ref, scopes, issued/expiry timestamps, and redacted secret metadata.
- **Employer Req Operation**: A deterministic req create, update, or close action with outcome, reason code, and emitted event refs.
- **Webhook Delivery**: A signed synthetic event delivery with event id, delivery id, headers, payload, timing, and expected receiver behavior.
- **Webhook Capture**: Receiver evidence containing signature verification result, payload boundary result, idempotency result, delivery status, and safe metadata.

## Success Criteria *(mandatory)*

- **SC-001**: The PTH07 gate suite covers authorized req creation/update/close, missing-scope denial, signed webhook delivery, duplicate idempotency, and webhook failure evidence.
- **SC-002**: Every persisted webhook capture includes signature, timing, idempotency, payload-boundary, and status evidence without raw secrets.
- **SC-003**: Invalid credentials, invalid signatures, duplicate events, and forbidden payload fields produce deterministic failure or duplicate outcomes.
- **SC-004**: Package tests and the local sample prove PTH07 behavior without live network services or external credentials.

## Assumptions

- PTH07 establishes deterministic API/webhook gate contracts and offline receiver behavior before live employer API endpoints are wired into CI or Vercel preview checks.
- Synthetic credentials, reqs, webhook signing keys, and employer records reuse existing product harness seed patterns where practical.
- Live network listener support can be layered later behind the same receiver contract if Alpha canaries require it.
