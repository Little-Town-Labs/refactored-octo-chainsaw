# F02 Final Code Review — T073

**Reviewer:** code-reviewer agent (Claude Opus 4.7)
**Reviewed:** 2026-05-11
**Branch:** `02-identity-auth-aaa`
**HEAD at review:** `e8743d9` (roadmap v1.2.5)
**Scope:** Full F02 diff vs `main` — 38 commits, 203 files, ~27k LOC
**Focus:** Cross-cutting consistency, surface coherence, doc-code
drift (the per-slice and B8 security reviews already covered
per-file concerns).
**Outcome:** **APPROVE WITH MINOR CHANGES** — one HIGH + two
MEDIUM doc-drift fixes addressed in T074 (commit follows).

---

## Cross-cutting findings

| # | Severity | Title | Action |
|---|---|---|---|
| 1 | HIGH | Service-credential public API surface missing from `packages/auth/src/index.ts` | ✅ Fixed in T074 |
| 2 | MEDIUM | `credential-lifecycle.md` §4.1 SQL references non-existent `public_key_pem` column | ✅ Fixed in T074 |
| 3 | MEDIUM | `credential-lifecycle.md` §3.3 imports phantom `revokeServiceCredential` | ✅ Fixed in T074 — rewritten to reference signing-key force-retire |
| 4 | MEDIUM | Drizzle null-handling has two styles in `revoke-all-sessions-repos.ts` | Deferred (cosmetic) |
| 5 | MEDIUM | `service_credentials` lacks idempotency-by-bootstrap-attempt index | Deferred (document the asymmetry — orchestrator catches the race) |
| 6 | LOW | `revocation_reason` unconstrained `text` despite typed unions | Deferred (CHECK constraint follow-up) |
| 7 | LOW | (False alarm) Untracked B5.3 files — reviewer was looking at session-start git status; files are committed in `3aa4479` | Resolved — git status clean |
| 8 | LOW | Stray `TODO(T062)` in `issue-credential-form.tsx` | Deferred |

---

## HIGH-1 detail (fixed in T074)

**Files:** `packages/auth/src/index.ts`, `packages/auth/src/issuer/service-issuance.ts`

B5.2 shipped a complete service-credential orchestrator with seven
typed errors and a scope constant. None were re-exported from
`index.ts`. Per-slice reviewers couldn't catch this because each
slice landed before its consumer existed.

**Fix:** Added a "B5.2" section block to `index.ts` mirroring the
agent-credential block: `bootstrapServiceCredential`,
`rotateServiceCredential`, `SERVICE_CREDENTIAL_ROTATION_SCOPE`,
`DEFAULT_SERVICE_TTL_SECONDS`, the input/output/repo types, and
the seven typed errors (`InvalidBootstrapSecretError`,
`ServiceIssuanceConflictError`, `ServiceUniqueViolationError`,
`EmptyServiceScopeSetError`, `NoPriorCredentialError`,
`PrincipalMismatchError`).

The verifier surface stays deliberately constrained to
`verifyServiceCredentialAtSurface` (Vercel-OIDC rejection forced
at all in-app surfaces) — that choice is preserved.

---

## MEDIUM doc-drift detail (fixed in T074)

**§4.1 SQL column name (MEDIUM-1):** Replaced `public_key_pem` with
`public_key_jwk`. Added `::jsonb` cast and a one-line note that the
column expects a JWK object (e.g. `exportJWK()` from jose). The
operator following the runbook verbatim now hits a working schema
rather than a column-not-found error.

**§3.3 phantom orchestrator (MEDIUM-2):** Rewrote the section to
reflect the actual emergency path — service-credential revocation
flows through signing-key force-retire (§4.3) which transitively
invalidates every credential signed under that `kid`. Removed the
broken `import { revokeServiceCredential }` example. When a future
B6+ slice adds a per-credential service revoke surface, the section
will be replaced with that path.

---

## Surface review

`packages/auth/src/index.ts` is deliberate and section-organized
(B1 / B2 / B3 / B4 / B5 / reconciliation). Post-T074, the service-
credential surface is symmetric with the agent-credential surface.
The Vercel-OIDC guard sits between verifier and JWKS sections
without a dedicated "B5.3" comment — acceptable; the file header
comment in `vercel-oidc-rejection.ts` provides the orientation.

---

## Test surface review

Tests are organized:
- Unit + property → `packages/auth/src/__tests__/*.test.ts`
- Integration → `packages/auth/tests/integration/scenario-5.integration.test.ts`
- UI / RSC → `apps/web/src/console/__tests__/*.test.tsx`

`packages/test-harness/` builds and exports `FakeClock` +
`InMemoryAuditSink` (used by scenario-5) and a `NeonBranchManager`
that is built+tested but has no consumer in this branch. Add a
one-line README under `packages/test-harness/` indicating
NeonBranchManager is pending T066-and-later integration tests —
deferred follow-up.

---

## Doc–code drift (spot-checks at HEAD `e8743d9`)

| Spot check | Result |
|---|---|
| `/operator/console/credentials*` URLs map to real `(operator)/console/credentials/*/page.tsx` | ✅ match |
| `signing_keys.public_key_pem` SQL | ❌ DRIFT — fixed in T074 |
| `import { revokeServiceCredential }` in §3.3 | ❌ DRIFT — fixed in T074 |
| Audit-event names §6 vs `AuditEventName` union | ✅ match |
| Operator surfaces table §5 vs exported orchestrators | ✅ match |

---

## Commit messages

Clean overall. One historical wrinkle: `3aa4479` (B5.3) had stale
"untracked" status at the session-start snapshot, which led the
reviewer to flag LOW-2 — verified at T073 review time the files
are properly tracked. No action needed.

---

## Final B9 recommendation

**APPROVE.** T074 applies HIGH-1 + MEDIUM-1 + MEDIUM-2 in the
follow-up commit. T075 (simplify) → T076 (PR + CI green) → T077
(`/speckit-analyze`) → T078 (squash-merge) proceed.

Deferred to post-merge follow-ups (none blocking):
- MEDIUM-3: Drizzle null-handling normalization in `revoke-all-sessions-repos.ts`.
- MEDIUM-4: `service_credentials` idempotency-asymmetry doc note.
- LOW-1: `revocation_reason` CHECK constraint.
- LOW-3: Resolve `TODO(T062)` in `issue-credential-form.tsx`.
- README under `packages/test-harness/` documenting NeonBranchManager status.

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | code-reviewer agent | T073 final cross-cutting review of F02 (38 commits, ~27k LOC). APPROVE WITH MINOR CHANGES. |
