# Quickstart: Employer Admin Console

## Scope

F22 validates the employer admin console for organization profile, req management, candidate inbox, access control, and accessibility smoke coverage.

## Expected Validation Commands

```bash
pnpm --filter @spyglass/web test -- --runInBand src/employer-console/__tests__
pnpm --filter @spyglass/web type-check
pnpm --filter @spyglass/web lint
pnpm --filter @spyglass/web build
bash scripts/check-principal-coverage.sh
pnpm type-check
pnpm lint
pnpm test
/security-review
```

## Manual / Browser Validation

1. Start the web app locally with Clerk employer configuration available.
2. Sign in as an employer admin with an active Clerk organization and AAL2.
3. Open `/employer/console`.
4. Verify skip link, navigation, active organization context, and main landmark.
5. Open profile, save valid company profile fields, and verify success state.
6. Create a req with role, compensation, work mode, headcount, threshold, hiring jurisdiction, and decision locus.
7. Confirm the req appears in the req list for that organization only.
8. Open the candidate inbox with delivered match/dossier fixtures and verify no raw transcript or hidden run state is visible.
9. Close a req as filled or canceled and confirm terminal state plus audit behavior.
10. Attempt access as seeker, employer member, unauthenticated user, and below-AAL2 employer admin where test fixtures support it.

## Evidence Log

- 2026-05-25: `pnpm --filter @spyglass/web test -- --runInBand src/employer-console/__tests__` passed. Evidence: 9 suites / 24 tests passed for F22 employer-console parsers, session guards, profile actions/views, req actions/views, candidate views, feedback states, and prohibited surfaces.
- 2026-05-25: `pnpm --filter @spyglass/db build` passed.
- 2026-05-25: `pnpm --filter @spyglass/db test` passed. Evidence: 1 suite / 10 tests passed, including employer organization profile table and F22 employer req fields.
- 2026-05-25: `pnpm --filter @spyglass/tickets test -- --runInBand` passed. Evidence: 13 suites / 233 tests passed, including employer req lifecycle updates for F22 fields.
- 2026-05-25: `pnpm --filter @spyglass/tickets type-check` passed.
- 2026-05-25: `pnpm --filter @spyglass/web type-check` passed.
- 2026-05-25: `pnpm --filter @spyglass/web lint` passed.
- 2026-05-25: `pnpm --filter @spyglass/web build` passed. Evidence: Next build emitted `/employer/console`, `/employer/console/profile`, `/employer/console/reqs`, `/employer/console/reqs/new`, `/employer/console/reqs/[id]`, `/employer/console/reqs/[id]/close`, `/employer/console/candidates`, and `/employer/console/candidates/[id]`.
- 2026-05-25: `bash scripts/check-principal-coverage.sh` passed. Evidence: 20 handler(s) checked, all green.
- 2026-05-25: `pnpm type-check` passed. Evidence: Turbo reported 41 successful / 41 total.
- 2026-05-25: `pnpm lint` passed. Evidence: Turbo reported 24 successful / 24 total.
- 2026-05-25: `pnpm test` passed. Evidence: Turbo reported 41 successful / 41 total; `@spyglass/web` reported 36 suites / 206 tests passed and included the F22 employer-console suites.
- 2026-05-25: Manual/browser validation not run in this local environment because no interactive Clerk employer admin session and seeded employer organization/candidate fixtures are configured for browser login. Automated render/action coverage verifies the required landmarks, forms, tables, auth denials, non-enumerating feedback, and privacy projections.
