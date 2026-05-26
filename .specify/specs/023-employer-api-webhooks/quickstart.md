# Quickstart: Employer REST API + Signed Webhooks

## Prerequisites

- Local dependencies installed.
- Test database or in-memory test harness available.
- Employer organization with an employer admin principal.
- At least one signed dossier fixture with an employer-approved projection.

## Scenario 1: Validate the API contract

1. Validate `packages/api-contracts/openapi/employer-api.v1.yaml`.
2. Confirm all operations include auth, errors, request/response schemas, idempotency where mutating, and deprecation metadata support.
3. Confirm generated types export from `@spyglass/api-contracts`.

Expected result: contract validation and type generation pass.

## Scenario 2: Create and close a req through REST

1. Issue an employer API credential for one organization.
2. Send `POST /api/employer/v1/reqs` with a valid req payload and `Idempotency-Key`.
3. Repeat the same request and key.
4. Read the req with `GET /api/employer/v1/reqs/{id}`.
5. Close the req with `POST /api/employer/v1/reqs/{id}/close`.

Expected result: one req is created, duplicate create returns the original result, read is org-scoped, close uses the existing ticket terminal outcome, and audit evidence exists.

## Scenario 3: Reject invalid or unauthorized req access

1. Send a req create without an idempotency key.
2. Reuse an idempotency key with a different body.
3. Use a revoked or wrong-organization credential against an existing req.

Expected result: validation, idempotency conflict, and authorization failures use documented error shapes and do not reveal cross-organization data.

## Scenario 4: Register a webhook endpoint and verify signature

1. Register an HTTPS webhook endpoint for `match.notification.created` and `dossier.delivery.created`.
2. Capture the one-time signing secret.
3. Trigger a fixture webhook event.
4. Verify `Spyglass-Signature` using `Spyglass-Key-Id`, `Spyglass-Timestamp`, `Spyglass-Event-Id`, endpoint id, and raw body.
5. Modify the body and verify the signature fails.

Expected result: unmodified delivery verifies; tampered delivery, stale timestamp, and unknown key id fail verification.

## Scenario 5: Retry and terminal delivery state

1. Configure a test endpoint to return a transient failure.
2. Trigger a webhook event.
3. Confirm the first attempt is recorded and a retry is scheduled.
4. Continue failures until the retry policy reaches terminal failure.

Expected result: every attempt is recorded, retry schedule is bounded, and terminal failure is visible/auditable.

## Scenario 6: Fail closed on invalid dossier delivery

1. Seed a match with a dossier missing an employer projection.
2. Seed another match with invalid dossier signature metadata.
3. Attempt webhook delivery for both.

Expected result: no webhook is sent; auditable failure records explain the suppression reason.

## Validation Commands

```bash
pnpm --filter @spyglass/api-contracts test
pnpm --filter @spyglass/web test -- --runInBand src/employer-api
pnpm type-check
pnpm lint
pnpm build
bash scripts/check-principal-coverage.sh
```
