# Contract: Webhook Signature

## Purpose

Every F23 webhook delivery is signed so employer receivers can verify origin, integrity, timestamp freshness, endpoint binding, and key rotation state.

## Required Headers

- `Spyglass-Event-Id`: stable webhook event identifier.
- `Spyglass-Delivery-Id`: stable delivery attempt identifier.
- `Spyglass-Timestamp`: Unix timestamp in seconds when the message was signed.
- `Spyglass-Key-Id`: signing secret key identifier.
- `Spyglass-Signature`: versioned signature value.
- `Spyglass-Schema-Version`: payload schema version.

## Signature Base String

The signature base string is:

```text
v1.{timestamp}.{endpoint_id}.{event_id}.{raw_body}
```

Rules:

- `timestamp` MUST match `Spyglass-Timestamp`.
- `endpoint_id` is the registered webhook endpoint identifier.
- `event_id` MUST match `Spyglass-Event-Id`.
- `raw_body` is the exact UTF-8 request body bytes as delivered.

## Signature Algorithm

- Version `v1` uses HMAC-SHA256 over the signature base string.
- The secret is selected by `Spyglass-Key-Id`.
- Receivers MUST compare signatures with constant-time comparison where their platform supports it.

## Replay Tolerance

- Receivers SHOULD reject timestamps older than five minutes unless local clock skew policy allows a documented exception.
- Receivers SHOULD store processed `Spyglass-Event-Id` values to make webhook handling idempotent.

## Rotation

- During rotation overlap, outbound deliveries include the key id for either the old overlap secret or the new active secret.
- New deliveries MUST stop using the old key when overlap ends.
- Revoked keys MUST NOT sign new deliveries.

## Failure Semantics

Receivers should reject the delivery when:

- The key id is unknown.
- The timestamp is stale or malformed.
- The signature does not verify.
- The raw body was transformed before verification.
- The event id was already processed outside idempotent acknowledgement handling.
