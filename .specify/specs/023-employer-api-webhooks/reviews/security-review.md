# F23 Security Review

## Reviewed Areas

- Employer API bearer credential authentication and scope checks.
- Idempotent mutating req operations.
- Webhook endpoint URL validation and lifecycle state.
- Webhook HMAC signing, timestamp tolerance, replay claim hook, and secret rotation.
- Dossier delivery fail-closed behavior.
- Principal coverage for Next route handlers.

## Findings

- No blocking findings in the implemented slice.
- Route handlers explicitly use `withAnonymous` because authentication is service bearer credential based, not Clerk principal resolution based.
- Raw API credential material is returned only from issue/rotate helpers and is not rendered in list views.

## Evidence

- `pnpm --filter @spyglass/web test -- employer-api employer-console`
- `pnpm --filter @spyglass/web type-check`
- `pnpm --filter @spyglass/db build`
- `bash scripts/check-principal-coverage.sh`
