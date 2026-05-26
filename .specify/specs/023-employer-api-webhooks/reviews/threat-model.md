# F23 Threat Model: Employer REST API + Signed Webhooks

## Scope

F23 exposes organization-scoped employer REST endpoints, service credentials, webhook endpoint registration, signed delivery helpers, and employer console integration controls.

## Threats and Controls

- Service credential theft: secrets are generated once, stored as hashes, scoped to organization and operation scopes, and revocable.
- Cross-organization access: REST handlers authenticate credentials and repositories filter by `org_id`; missing rows are returned as not found.
- Idempotency abuse: mutating req operations fingerprint method, path, and body; mismatched replay returns conflict.
- Webhook replay: signatures include delivery id and timestamp; replay stores can reject repeated delivery identifiers.
- Webhook tampering: HMAC covers endpoint id, event id, delivery id, schema version, timestamp, and raw body.
- SSRF endpoint registration: webhook endpoint validation requires HTTPS and rejects localhost, private IPv4, private IPv6, link-local, and credential-bearing URLs.
- Dossier projection leakage: dossier delivery fails closed unless signature metadata is valid and an employer projection exists.
- Retry amplification: retry scheduling is bounded and terminal failures stop delivery attempts.

## Residual Risk

F23 includes typed repository seams and route wiring, but production delivery workers and migrations still need deployment-time review before enabling external traffic.
