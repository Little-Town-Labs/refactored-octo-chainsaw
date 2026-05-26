# Research: Employer REST API + Signed Webhooks

## Decision: OpenAPI 3.1 is the source of truth for employer REST contracts

**Rationale**: The roadmap and Constitution Article III require OpenAPI 3.1 / JSON Schema 2020-12 semantics for agent-facing surfaces. The existing `packages/api-contracts` package is a placeholder for this exact work and already documents F23 as the population point.

**Alternatives considered**:

- Ad hoc Markdown endpoint docs: rejected because they are not machine-readable enough for agent/integrator semantics.
- tRPC as the external contract: rejected because F23 is explicitly REST/webhook, not app-internal RPC.

## Decision: Service credentials authenticate employer integrations

**Rationale**: Existing F02 service-credential primitives already model scoped, short-lived/verifiable service principals. F23 needs organization-scoped integration credentials that can be revoked, audited, and authorized independently of human sessions.

**Alternatives considered**:

- Reuse Clerk user sessions for API calls: rejected because employer ATS/internal systems need service-style integration credentials.
- Static shared organization secrets: rejected because rotation, attribution, and scope control are weaker.

## Decision: REST req mutations reuse existing employer req ticket workflows

**Rationale**: F22 and F04 already established employer req ticket creation, source amendment, state transitions, jurisdiction handling, and audit expectations. The API must be another entry point to that spine, not a parallel req model.

**Alternatives considered**:

- Separate API-only requisition table: rejected because it would split state and audit behavior.
- Direct mutation of raw ticket rows from route handlers: rejected because it bypasses ticket workflow guarantees.

## Decision: Idempotency is mandatory for every mutating REST operation

**Rationale**: Employers may retry API calls from ATS/internal systems after network failures. Idempotency keys plus request fingerprints prevent duplicate req creation and catch accidental key reuse with different payloads.

**Alternatives considered**:

- Optional idempotency: rejected because duplicate reqs are high-impact and difficult to reconcile.
- Deduplication by role title or external id alone: rejected because it is ambiguous and not safe across real employer workflows.

## Decision: Webhook signing uses timestamped HMAC with key identifiers

**Rationale**: HMAC signatures are simple for employers to verify across stacks, support secret rotation through key IDs, and can include timestamp tolerance for replay resistance. This matches common webhook verification patterns while keeping the first F23 implementation practical.

**Alternatives considered**:

- Asymmetric per-employer public keys: deferred because it increases integration burden and key distribution complexity for v0.
- Unsigned HTTPS-only webhooks: rejected by Constitution I.C.1 and F23 roadmap scope.

## Decision: Webhook delivery state is persisted as receipts

**Rationale**: The roadmap calls out the risk that webhook delivery failure leaves employers in an unknown state. Persisting attempts, response classes, retry schedule, acknowledgement, and terminal failure creates operational clarity and audit evidence.

**Alternatives considered**:

- Fire-and-forget delivery: rejected because it cannot prove receipt or terminal failure.
- Only logging delivery attempts: rejected because logs are not enough for idempotency, retry scheduling, or employer-visible status.

## Decision: F23 extends F22 console only for integration lifecycle controls

**Rationale**: Employer admins need a safe way to issue/revoke API credentials and manage webhook endpoints. The rest of F23 is machine-facing; the console remains thin and does not become an ATS administration surface.

**Alternatives considered**:

- API-only credential management: rejected because initial employers may not have an integration bootstrap path without a first credential.
- Large integration dashboard: rejected because it violates the thin-console posture and adds nonessential CRM/ATS management.
