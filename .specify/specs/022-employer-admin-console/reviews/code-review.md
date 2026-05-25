# F22 Code Review Notes

## Review Summary

Reviewed the implementation against `.specify/specs/022-employer-admin-console/spec.md`, `plan.md`, and `tasks.md`.

## Findings

- No blocking findings.
- Route implementation intentionally lives under `apps/web/app/(employer)/employer/console/*` so the public App Router URL is `/employer/console/*`.
- F22 profile data uses a dedicated `employer_organization_profiles` table, avoids mutating Clerk-mirror `organizations` rows, and emits a buffered audit event on profile save.
- Employer req create/amend paths carry `decision_locus_jurisdiction` and `threshold` through form parsing, server actions, ticket repositories, DB schema, and tests.
- Candidate detail rendering uses an explicit allowlist for employer dossier projection fields and does not expose raw transcript, hidden run state, private notes, or unapproved score internals.
- Server actions use typed principal entry points and the principal coverage gate passes.

## Residual Risk

- Manual browser validation with a live Clerk employer admin and seeded delivered candidate fixtures was not run locally; the blocker and automated substitute evidence are recorded in quickstart.
- Future F23 API/webhook work must not reuse F22 UI-only assumptions as external contracts.
