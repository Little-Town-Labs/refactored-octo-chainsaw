# Data Model: Employer REST API + Signed Webhooks

## Employer API Credential

Organization-scoped service credential used by employer integrations.

Fields:

- `credential_id`: stable internal identifier.
- `organization_id`: owning employer organization.
- `principal_id`: service principal tied to the credential.
- `display_name`: employer-visible label.
- `secret_hash`: non-recoverable hash of secret material.
- `scopes`: allowed operations such as req read/write and webhook endpoint management.
- `status`: `active`, `rotating`, `revoked`, `expired`.
- `expires_at`: optional expiration timestamp.
- `last_used_at`: last successful authentication timestamp.
- `created_by_principal_id`: issuing employer admin or operator.
- `revoked_by_principal_id`: principal that revoked the credential, if any.
- `created_at`, `updated_at`, `revoked_at`.

Validation:

- Secret material is shown once at issue/rotation time and never stored in plaintext.
- Credential organization must match the requested resource organization.
- Revoked or expired credentials fail closed.

## Employer API Idempotency Record

Records mutating REST requests so duplicate retries return the original outcome.

Fields:

- `idempotency_record_id`: stable internal identifier.
- `organization_id`: owning organization.
- `credential_id`: credential used for the original request.
- `operation`: canonical operation name.
- `idempotency_key`: employer-provided key.
- `request_fingerprint`: canonical hash of method, target, and request body.
- `response_status`: original response status.
- `response_body_hash`: hash of the stored or reconstructable response body.
- `resource_type`, `resource_id`: resulting resource reference when applicable.
- `created_at`, `expires_at`.

Validation:

- `(organization_id, operation, idempotency_key)` is unique while retained.
- Reuse with the same fingerprint returns the original result.
- Reuse with a different fingerprint fails with an idempotency conflict.

## Employer Requisition API Resource

External representation of an employer req ticket.

Fields:

- `id`: stable API identifier.
- `employer_req_ticket_id`: internal ticket identifier.
- `organization_id`: owner.
- `external_ref`: optional employer-supplied reference.
- `role_title`, `role_level`, `work_mode`.
- `compensation_min`, `compensation_max`, `currency`.
- `headcount`.
- `matching_threshold`.
- `hiring_jurisdiction`, `decision_locus`.
- `state`: user-facing API state.
- `created_at`, `updated_at`, `closed_at`.

Relationships:

- Maps to one existing employer req ticket.
- May have many webhook events when matches clear delivery gates.

Validation:

- Required jurisdiction and decision-locus values must be present.
- Compensation range, headcount, and threshold bounds match ticket-source validation.
- State transitions use existing employer req ticket rules.

## Webhook Endpoint

Organization-owned target for signed event delivery.

Fields:

- `webhook_endpoint_id`: stable internal identifier.
- `organization_id`: owning employer organization.
- `url`: HTTPS endpoint URL.
- `description`: employer-visible label.
- `subscribed_events`: event types enabled for delivery.
- `status`: `active`, `disabled`, `deleted`.
- `current_secret_id`: active signing secret reference.
- `retry_policy`: selected bounded policy identifier.
- `created_by_principal_id`, `updated_by_principal_id`.
- `created_at`, `updated_at`, `disabled_at`, `deleted_at`.

Validation:

- URL must be HTTPS and must not target prohibited local/private destinations.
- Endpoint must have at least one subscribed event while active.
- Deleted endpoints receive no new deliveries.

## Webhook Signing Secret

Non-recoverable signing material for one endpoint.

Fields:

- `webhook_signing_secret_id`: stable internal identifier.
- `webhook_endpoint_id`: endpoint owner.
- `key_id`: public key identifier included with signatures.
- `secret_hash` or encrypted secret material needed only for outbound signing.
- `status`: `active`, `overlap`, `revoked`, `expired`.
- `active_from`, `active_until`.
- `created_by_principal_id`, `revoked_by_principal_id`.
- `created_at`, `revoked_at`.

Validation:

- At most one current active secret per endpoint outside rotation overlap.
- Rotation overlap must have a documented maximum duration.
- Revoked secrets cannot sign new deliveries.

## Webhook Event

Immutable employer event eligible for delivery.

Fields:

- `webhook_event_id`: stable event identifier exposed to employers.
- `organization_id`: recipient organization.
- `event_type`: `match.notification.created` or `dossier.delivery.created`.
- `schema_version`: payload schema version.
- `employer_req_ticket_id`: req reference.
- `match_ticket_id`: match reference.
- `dossier_id`: dossier reference when applicable.
- `payload_hash`: canonical hash of event payload.
- `delivery_eligible_at`: time event became deliverable.
- `created_at`.

Validation:

- Event is created only after match/jurisdiction delivery gates pass.
- Dossier events require an employer-approved projection and valid dossier signature metadata.

## Webhook Delivery Receipt

Per-endpoint delivery state for one webhook event.

Fields:

- `delivery_receipt_id`: stable internal identifier.
- `webhook_event_id`: event being delivered.
- `webhook_endpoint_id`: target endpoint.
- `attempt`: positive integer attempt number.
- `status`: `pending`, `delivered`, `retry_scheduled`, `terminal_failure`, `suppressed`.
- `request_signature_key_id`: key used for signing.
- `response_status`: HTTP response code when available.
- `response_class`: `success`, `client_error`, `server_error`, `timeout`, `network_error`, `suppressed`.
- `next_attempt_at`: timestamp for scheduled retry.
- `last_attempt_at`: timestamp of most recent attempt.
- `acknowledged_at`: timestamp when employer acknowledgement was accepted.
- `terminal_reason`: final failure/suppression reason.
- `created_at`, `updated_at`.

Validation:

- Delivery attempts are bounded by retry policy.
- Duplicate success for the same event/endpoint does not create duplicate employer state.
- Every terminal status has a reason.

## API Contract Version

Published contract and compatibility record.

Fields:

- `contract_id`: e.g. `employer-api`.
- `version`: semantic version or major-family identifier.
- `status`: `current`, `supported`, `deprecated`, `sunset`, `retired`.
- `published_at`, `deprecated_at`, `sunset_at`.
- `contract_hash`: canonical hash of the OpenAPI contract.
- `notes`: release/deprecation notes.

Validation:

- Current version plus previous two major versions remain supported unless emergency removal is documented.
- Deprecated versions expose deprecation and sunset metadata.
- The F23 implementation may represent this as contract-package metadata rather than a database table; it still requires tests for contract hash, status, and deprecation/sunset fields.
