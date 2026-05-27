# API/Webhook Gate Contracts

PTH07 introduces typed library contracts for deterministic employer API and webhook gate execution.

## Credential Contract

- credential id
- employer ref
- allowed scopes
- issued and expires timestamps
- redacted secret ref

Raw credential material is never persisted in scenario results.

## Req Operation Contract

- operation id
- action: create, update, close
- req ref
- credential ref
- required scopes
- outcome: authorized or denied
- reason code when denied
- emitted webhook event refs

## Webhook Delivery Contract

- event id
- delivery id
- event type
- target URL ref
- signed headers
- JSON payload
- delivery timestamp
- expected receiver behavior

## Webhook Capture Contract

- capture id
- event id
- delivery id
- received timestamp
- signature verification result
- payload-boundary result
- idempotency result
- delivery status
- failure reason when applicable
- safe metadata for result-store persistence
