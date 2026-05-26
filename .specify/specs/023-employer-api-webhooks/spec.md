# Feature Specification: Employer REST API + Signed Webhooks

**Feature Branch**: `023-employer-api-webhooks`

**Created**: 2026-05-25

**Status**: Draft

**Input**: User description: "F23 Employer REST API + signed-webhook delivery. Run the Spec Kit specify -> clarify/plan/tasks flow for `23-employer-api-webhooks`, first reading PRD employer API/webhook sections, Constitution Article II/III contract requirements, Parley dossier/publication notes, and F22 employer console boundaries."

## Clarifications

### Session 2026-05-25

- No blocking clarification questions were required after reading PRD §3.2, §5.2, §5.3, §6.1, §6.2, roadmap F23 notes, Constitution Article II/III contract requirements, Parley downstream delivery boundaries, and F22 console scope. F23 uses REST and signed webhooks as the v0 employer integration channel; ATS connectors, bidirectional sync, BYO employer agents, A2A runtime delivery, billing, and seeker-side APIs remain out of scope.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Publish Employer API Contract (Priority: P1)

An employer technical contact can read a versioned, machine-readable employer API contract and understand how to authenticate, create reqs, close reqs, subscribe to webhooks, verify signatures, interpret errors, and handle deprecations.

**Why this priority**: F23 is an agent-native integration feature. Before employers can wire their ATS or internal tools, the contract must be stable, documented, versioned, and compatible with the constitution's dual-audience surface requirements.

**Independent Test**: Review the published API contract and docs as an employer integrator, validate the contract syntax, confirm every exposed operation has request, response, error, auth, idempotency, and deprecation semantics, and verify no out-of-scope ATS or seeker API operation appears.

**Acceptance Scenarios**:

1. **Given** an employer integrator opens the API documentation, **When** they inspect req, webhook, error, and versioning sections, **Then** every operation has clear machine-readable schemas, examples, required scopes, idempotency behavior, and stable identifiers.
2. **Given** a deprecated operation or field exists in a prior supported version, **When** an employer calls it during the compatibility window, **Then** the response carries machine-readable deprecation and sunset signals without breaking the current call.
3. **Given** a proposed API contract change removes or changes an active supported contract without an allowed deprecation path, **When** contract validation runs, **Then** the change is rejected before release.

---

### User Story 2 - Manage Reqs Through REST (Priority: P1)

An employer integration can create, read, update allowed source fields, and close employer requisitions through the REST API using organization-scoped credentials and idempotent requests.

**Why this priority**: PRD §6.1 requires req creation through REST in addition to the console. This is the core API value and gives employers a no-connector path to push roles from their own systems into Spyglass.

**Independent Test**: Use employer-scoped credentials to create a req, repeat the create with the same idempotency key, read the req, update allowed fields, close it as filled or canceled, and verify authorization, validation, state, and audit outcomes.

**Acceptance Scenarios**:

1. **Given** an employer API credential with req-write scope for one organization, **When** it submits a valid req with role details, threshold, hiring jurisdiction, decision locus, and idempotency key, **Then** one employer req ticket is created under that organization and the response returns stable external and internal identifiers.
2. **Given** the same credential repeats the same req-create request with the same idempotency key, **When** the first request already succeeded, **Then** the API returns the original successful result without creating a duplicate req.
3. **Given** an employer integration updates allowed matching-relevant source fields, **When** the update is valid for the req's current state, **Then** the req is amended, existing ticket-source workflow rules are preserved, and the change is auditable.
4. **Given** an employer integration closes an active req as filled or canceled, **When** the close request succeeds, **Then** no further candidate deliveries are produced for that req and the terminal outcome is auditable.
5. **Given** a credential from another organization or without the required scope attempts any req operation, **When** authorization is evaluated, **Then** the request fails closed without revealing another organization's req data.

---

### User Story 3 - Receive Signed Candidate Webhooks (Priority: P1)

An employer integration can subscribe to candidate-match webhook events, receive signed delivery attempts for match notifications and employer-visible dossier projections, verify the signature, and acknowledge receipt idempotently.

**Why this priority**: PRD §6.1 requires match notifications and signed dossier delivery by webhook. The employer must not be left in an unknown state when a candidate is ready for human review.

**Independent Test**: Configure a webhook endpoint, trigger a delivered match with an employer-visible dossier projection, verify the outbound payload and signature using documented material, return success and failure responses, and confirm receipt/retry/audit state.

**Acceptance Scenarios**:

1. **Given** an employer admin or integration registers a webhook endpoint with an active signing secret, **When** a candidate match clears delivery policy for that employer, **Then** Spyglass sends a signed webhook carrying the event type, event id, req reference, match reference, delivery timestamp, and employer-visible dossier projection reference or payload.
2. **Given** an employer endpoint receives a webhook, **When** it verifies the signature with the documented scheme and active secret, **Then** it can detect tampering, replay outside the allowed tolerance, and mismatched endpoints.
3. **Given** an employer endpoint returns a transient failure or times out, **When** delivery retry policy runs, **Then** retries use bounded exponential backoff and every attempt is recorded with outcome, next-attempt time, and final status.
4. **Given** an employer endpoint acknowledges the same event more than once, **When** the duplicate acknowledgement is processed, **Then** the delivery remains exactly-once from the employer's perspective and no duplicate candidate state is created.
5. **Given** a dossier is unsigned, has invalid signature metadata, or lacks an employer-approved projection, **When** webhook delivery is considered, **Then** delivery fails closed and emits an auditable failure instead of sending sensitive or unverifiable data.

---

### User Story 4 - Operate and Rotate Integration Credentials (Priority: P2)

An employer admin can issue, list, rotate, and revoke API credentials and webhook signing secrets with clear auditability and without exposing secret material after creation.

**Why this priority**: Long-lived integrations need lifecycle controls. Credential rotation and revocation are required for accountability and compromise response, but they can follow the initial contract, req, and delivery flows.

**Independent Test**: Issue an employer API credential and webhook signing secret, use them successfully, rotate each credential, verify old material is rejected after the allowed overlap, and inspect audit events for issue, use, rotation, and revocation.

**Acceptance Scenarios**:

1. **Given** an employer admin with AAL2 satisfied, **When** they issue an API credential, **Then** the secret is shown once, stored non-recoverably, scoped to that organization, and recorded in the audit trail.
2. **Given** an employer admin rotates a webhook signing secret, **When** both old and new secrets are in the documented overlap window, **Then** outbound webhooks include a key identifier so receivers can verify with the correct active secret.
3. **Given** a credential or signing secret is revoked, **When** it is used after revocation, **Then** the request or webhook verification path fails closed and the attempted use is auditable.

### Edge Cases

- Employer sends malformed JSON, unsupported content type, or payloads exceeding documented bounds.
- Required req fields are missing, threshold is outside bounds, compensation minimum exceeds maximum, headcount is below one, or jurisdiction values are unsupported.
- Idempotency key is reused with a different request body.
- Concurrent requests attempt conflicting req updates or closure.
- Employer credential is expired, revoked, wrong-organization, wrong-scope, or below required assurance for secret lifecycle operations.
- Webhook endpoint URL is invalid, changes ownership, returns 4xx/5xx, times out, or redirects unexpectedly.
- Webhook delivery succeeds but employer retries acknowledgement or receives a duplicate network delivery.
- Webhook signing secret is in rotation overlap, expired, revoked, or key identifier is unknown.
- Dossier exists but the employer projection is missing, unsigned, or fails verification.
- Deprecated contract versions are called after the sunset date.
- Existing F22 console flows and F23 REST flows mutate the same req close to the same time.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST publish an employer REST API contract using OpenAPI 3.1-compatible semantics and examples for every exposed operation.
- **FR-002**: System MUST version employer API contracts and support the current major version plus the prior two compatible major versions unless a documented emergency removal is approved.
- **FR-003**: System MUST emit machine-readable deprecation and sunset signals for deprecated operations, fields, and versions during the compatibility window.
- **FR-004**: System MUST authenticate every employer API request with an organization-scoped credential tied to a verifiable principal; anonymous mutating requests are prohibited.
- **FR-005**: System MUST authorize every employer API request by organization, scope, credential status, and operation before revealing or mutating data.
- **FR-006**: Employer integrations MUST be able to create employer req tickets with role title, level, compensation band, currency, work mode, headcount, matching threshold, hiring jurisdiction, and decision locus.
- **FR-007**: Req create and mutating endpoints MUST require idempotency keys and return the original result for exact duplicate requests.
- **FR-008**: System MUST reject idempotency-key reuse when the request body or target operation differs from the original request.
- **FR-009**: Employer integrations MUST be able to read organization-owned reqs and list organization-owned reqs without exposing other organizations' data.
- **FR-010**: Employer integrations MUST be able to amend allowed req source fields while preserving existing ticket-source workflow, jurisdiction-gate, and audit behavior.
- **FR-011**: Employer integrations MUST be able to close reqs as filled or canceled using the existing employer req ticket terminal outcomes.
- **FR-012**: All employer REST responses MUST use stable, documented error shapes that distinguish validation, authentication, authorization, conflict, idempotency, deprecation, rate-limit, and unavailable states without leaking cross-organization existence.
- **FR-013**: System MUST let employer admins register, list, disable, and delete webhook endpoints for their organization.
- **FR-014**: System MUST deliver match notification and signed employer-dossier webhook events only after the match and jurisdiction delivery gates allow employer notification.
- **FR-015**: Webhook event payloads MUST include stable event identifiers, event type, organization reference, req reference, match reference, delivery timestamp, schema version, and enough data or reference material for the employer to retrieve or review the employer-approved dossier projection.
- **FR-016**: Webhook deliveries MUST be signed with a documented scheme that supports key identifiers, timestamped messages, tamper detection, replay tolerance, and signing-secret rotation overlap.
- **FR-017**: System MUST record every webhook delivery attempt, acknowledgement, retry, terminal failure, and signing-secret lifecycle action in an auditable receipt trail.
- **FR-018**: Webhook retry behavior MUST be bounded, use exponential backoff, and stop at a documented terminal failure state.
- **FR-019**: System MUST fail closed instead of delivering a webhook when the dossier is unsigned, invalid, missing an employer projection, or not approved for employer delivery.
- **FR-020**: Employer admins MUST be able to issue, list metadata for, rotate, and revoke API credentials without displaying secret material after creation.
- **FR-021**: Credential and webhook signing secret creation, rotation, revocation, and attempted use after revocation MUST be attributable to a principal in the audit trail.
- **FR-022**: F23 MUST NOT introduce ATS-specific connectors, bidirectional ATS sync, seeker-side APIs, A2A runtime delivery, billing, native CRM/pipeline tools, or new seeker web product surfaces.

### Key Entities *(include if feature involves data)*

- **Employer API Credential**: Organization-scoped credential with scopes, status, expiration, one-time secret material, rotation metadata, and audit attribution.
- **Employer API Request**: Authenticated request carrying operation, principal, organization, idempotency key, request fingerprint, and outcome.
- **Employer Requisition API Resource**: External representation of an employer req ticket with stable identifiers, source fields, state, threshold, jurisdictions, and timestamps.
- **Webhook Endpoint**: Organization-owned delivery target with URL, subscribed event types, status, signing secret reference, rotation state, and retry policy.
- **Webhook Event**: Immutable notification event for candidate match or dossier delivery, with event type, schema version, references, payload/projection material, and delivery eligibility.
- **Webhook Delivery Receipt**: Per-attempt record of delivery status, response classification, retry schedule, acknowledgement, terminal failure, and audit references.
- **Webhook Signing Secret**: Non-recoverable secret material with key identifier, active/overlap/revoked lifecycle, creation and rotation attribution, and allowed verification window.
- **API Contract Version**: Published employer API contract with version, compatibility status, deprecation metadata, and schema validation evidence.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An employer integrator can create a req through the REST API, repeat the same request idempotently, and close the req using only the published contract and generated examples.
- **SC-002**: Contract validation proves every F23 operation has documented auth, scope, request, response, error, idempotency, and deprecation semantics.
- **SC-003**: Authorization tests prove wrong-organization, wrong-scope, revoked, expired, and anonymous API requests cannot read or mutate employer API data.
- **SC-004**: Webhook verification tests prove tampered payloads, stale timestamps, wrong key identifiers, and replayed messages are rejected.
- **SC-005**: Delivery tests prove transient webhook failures retry with bounded backoff and terminal failures leave employer-visible/auditable status instead of unknown state.
- **SC-006**: Dossier delivery tests prove unsigned, invalid, or non-employer-approved projections are never delivered by webhook.
- **SC-007**: API and webhook lifecycle tests produce audit evidence for credential issue, use, rotation, revocation, req mutation, webhook attempt, acknowledgement, retry, and terminal failure.
- **SC-008**: Quickstart evidence records passing contract validation, focused REST/webhook tests, type-check, lint, build, principal-coverage, and full or documented scoped test runs.

## Assumptions

- F23 reuses the existing Clerk organization/principal model for employer admins and organization ownership.
- F23 reuses the existing employer req ticket state machine, audit log, dossier signing, dossier projection, and jurisdiction gate primitives.
- REST API credentials are scoped service credentials for employer integrations, not user session cookies and not seeker credentials.
- Webhook delivery is one-way push for v0; employers wire the webhook into their ATS or internal tools themselves.
- Employer admin UI for integration credential lifecycle may be minimal but must be available to issue, rotate, and revoke material safely.
- Webhook payloads may carry either embedded employer-approved dossier projection data or a reference retrievable through the employer API, as long as the contract documents the behavior and the delivery remains signed and auditable.
- A2A receiver projection rules remain deferred; F23 does not implement A2A runtime delivery.
