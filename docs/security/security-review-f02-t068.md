# F02 Security Review — T068

**Reviewer:** security-reviewer agent (Claude Opus 4.7)
**Reviewed:** 2026-05-11
**Branch:** `02-identity-auth-aaa`
**HEAD at review:** `ad9b528`
**Scope:** `packages/auth/src` + `apps/web/{src/auth,src/console,app/(operator|seeker|employer)}` + `packages/db/src/schema` + `docs/security` + threat-model.md
**Method:** Static analysis, code-path tracing against threat-model.md §1–10, cross-reference with test surfaces
**Outcome:** **APPROVE WITH CHANGES.** No exploitable defects; three MEDIUM hardening items for T069.

---

## Executive summary

| Severity | CRITICAL | HIGH | MEDIUM | LOW | INFO |
|---|---|---|---|---|---|
| Count | 0 | 0 | 3 | 4 | 5 |

**Risk level: GREEN.** Defense-in-depth posture (proxy → action →
orchestrator → adapter SQL → schema CHECK) is intact across the
privileged surfaces traced (issuance, revoke-single, revoke-all-
sessions, service rotation). Two-operator gate triple-guard,
Vercel-OIDC structured deny, EdDSA algorithm pinning, and NFR-13
banner copy all hold up under attacker scenarios attempted.
Findings are hardening opportunities, not exploits.

---

## Findings

### MEDIUM-1 — Audit-sink failure can mask typed deny on `issueAgentCredential`

- **File:line:** `packages/auth/src/issuer/issuance.ts:150-165`
- **Threat:** `issueAgentCredential` (the service-driven path,
  FR-17) calls raw `deps.sink.emit(...)` inside `denyAndThrow`. If
  the sink throws (DB outage, F05 ingress failure), `await emit(...)`
  rejects and the caller sees the sink error instead of the typed
  `RoleRequiredError` / `ScopeRequiredError` / `IssuanceConflictError`.
  `operator-issuance.ts:69-80` and `service-issuance.ts:456-466` both
  wrap `emit` in `safeEmit`.
- **Impact:** Inconsistent fail-mode across the three issuance
  paths. Violates Constitution §I.6 fail-safe deny consistency.
- **Cross-reference:** Contradicts threat-model.md §3 row R.
- **Fix:** Wrap `emit` in `safeEmit` (same pattern as
  `service-issuance.ts:491-506`) for both the denial path and the
  success-event path in `issueAgentCredential`.

### MEDIUM-2 — `audit-sink-db.ts` silent fallback on FK miss

- **File:line:** `apps/web/src/auth/audit-sink-db.ts:83-94`
- **Threat:** When the DB sink can't resolve `principal_id` in the
  `principals` table (race or hard-delete edge case), the event
  silently routes to the redacted console fallback. The audit
  viewer (which reads `audit_events_buffer` only) would not show
  the denial.
- **Impact:** NFR-10 forensic trail incomplete in the audit-viewer
  surface. Threat model §7 row I claims "all operators see all
  events" — this fallback breaks that assumption.
- **Fix:** At minimum, log `kind: "audit_db_fallback_to_console"`
  with event name and correlation_id at WARN level. Longer-term:
  write to `audit_events_buffer` with a sentinel principal_kind/role.

### MEDIUM-3 — Approval `notes` flow into stdout via console-fallback path

- **File:line:** `apps/web/src/auth/audit-sink.ts:17-25` (redaction)
  + `packages/auth/src/issuer/revoke-all-sessions.ts:330` (insertion)
- **Threat:** Operator-supplied `notes` flow through the audit
  pipeline payloads. `redactPayload` only redacts `external_id`,
  not `notes`. On fallback to `createConsoleAuditSink`, the notes
  field — operator-supplied free text potentially containing PII
  or incident details — lands in Vercel observability logs.
- **Impact:** NFR-6 forbids credentials in logs; notes aren't
  credentials but runbook §3 treats compromise-incident notes as
  sensitive operational data. Vercel observability is a wider
  audience than the audit table.
- **Cross-reference:** Threat-model.md §6 STRIDE-I row claims
  notes don't leak to Clerk (true), but doesn't cover the
  console-sink fallback path.
- **Fix:** In `redactPayload`, also redact `notes` and any payload
  key matching `/notes$/i`. Replace with `notes_present: true`.

### LOW-1 — Cursor not HMAC-signed (acknowledged design choice)

- **File:line:** `packages/auth/src/issuer/listing.ts:119-146`,
  `apps/web/app/(operator)/console/audit/page.tsx:49-64`
- **Threat:** Base64URL-JSON cursors, opaque-by-convention only.
  Operator could craft a cursor with arbitrary `iat` to skip
  results.
- **Impact:** Not exploitable beyond the operator audience.
  Operators mutually trusted (threat-model §7 row I).
- **Fix:** None required for v0. Switch to HMAC-signed cursors
  if row-level audit filtering is introduced.

### LOW-2 — Webhook handler lacks failure telemetry

- **File:line:** `apps/web/app/api/webhooks/clerk/route.ts:113-119`
- **Threat:** If `processClerkDirective` throws, route returns 500.
  Clerk retries. No explicit telemetry distinguishing "verified
  signature but processing failed" from generic 500s.
- **Impact:** Outage spanning Clerk's retry budget could leave
  drift undetected until the T024 reconciliation job runs.
- **Fix:** Wrap `processClerkDirective` in try/catch; emit
  `webhook.processing_failed` with `event.type` + correlation_id
  before re-throwing.

### LOW-3 — `disablePrincipal` no-op logs an unhashed external_id prefix

- **File:line:** `apps/web/src/auth/principal-repo.ts:164-171`
- **Threat:** `external_id_hint: input.external_id.slice(0, 6)`
  leaks the first 8 bits of the Clerk userId. Combined with the
  audit log timestamp it's an enumeration sidechannel.
- **Impact:** Low signal (one byte per disabled-noop).
  Inconsistent with `audit-sink.ts` sha256-hash convention.
- **Fix:** Use `sha256(external_id).slice(0, 16)` like the audit
  sink.

### LOW-4 — `parseOperatorClerkOrgIds` lacks shape validation

- **File:line:** `packages/auth/src/proxy/clerk-session.ts:40-48`
- **Threat:** Misconfigured `SPYGLASS_OPERATOR_CLERK_ORG_IDS` env
  (typo, blank, accidental userId) still parses. Misconfigs
  surface only at first sign-in.
- **Impact:** Not exploitable (attacker would need env config).
  Defense-in-depth gap.
- **Fix:** Add `/^org_[a-zA-Z0-9]+$/` validation; throw at module
  load on malformed entries.

---

## Acceptable findings (INFO — no action required)

### INFO-1 — `BootstrapSecretChecker` production wiring deferred
Contract documented as "MUST use constant-time comparison ...
Use crypto.timingSafeEqual." Implementation not yet wired in
`apps/web/src/auth`. When wired, ensure `timingSafeEqual` over
fixed-length digest.

### INFO-2 — Service-credential revoke operator UI deferred
Threat-model §10 row #3 / §4 residual #3. Backend-only today.

### INFO-3 — Deployment-binding (EC-7) deferred to v1
Threat-model §10 row #4 / §4 residual #4. v0 mitigates via
rotation.

### INFO-4 — Signing-key rotation audit events not yet emitted
Threat-model §10 row #5 / §5 residual #5.

### INFO-5 — Query-string flash banner forgeable inside operator audience
Threat-model §10 row #7 / §8 residual #7. Banner decorative;
orchestrator guards hold.

---

## Positive notes (defense-in-depth working as designed)

1. **Vercel-OIDC structured deny is robust.**
   `vercel-oidc-rejection.ts:62-84` canonicalizes hostname so
   substring tricks and trailing-dot variants all map to the same
   canonical host.
2. **Two-operator gate triple-guard is intact.** Orchestrator
   `SelfApprovalError` (`revoke-all-sessions.ts:396-398`) + adapter
   SQL triple-`WHERE` (`revoke-all-sessions-repos.ts:91-97`) +
   schema CHECK (`revoke-all-sessions-approvals.ts:53-56`).
3. **EdDSA algorithm pinning** prevents `alg:none` and confusion
   (`verify.ts:78`, `service-verify.ts:43`).
4. **NFR-13 forbidden-vocabulary enforcement** in `auth-banner.tsx`
   audited by `__tests__/auth-banner.test.tsx`.
5. **JWKS endpoint exposes only public material**
   (`jwks-repo.ts`).
6. **Idempotency races deterministically resolved** via SQLSTATE
   23505 → typed `UniqueViolationError` → re-read → typed
   `IssuanceConflictError`.
7. **No raw SQL or template-string SQL** — Drizzle builder only.
8. **`'use server'` action surface is minimal** — three files, each
   re-checks operator tier.
9. **JWT never persisted** — `agent-credentials` schema excludes
   the JWT body; UI explicitly states "never written to logs".
10. **No JWT in URLs, logs, or error messages** found.

---

## Remediation tracking (T069)

| Finding | Action | Target |
|---|---|---|
| MEDIUM-1 | Wrap `emit` in `safeEmit` in `issueAgentCredential` | T069 |
| MEDIUM-2 | WARN log on console-sink fallback | T069 |
| MEDIUM-3 | Redact `notes` keys in `redactPayload` | T069 |
| LOW-1 | None (v0 acceptable) | — |
| LOW-2 | Webhook failure telemetry | T069 (low-cost) |
| LOW-3 | Use sha256 hash in disablePrincipal no-op log | T069 (low-cost) |
| LOW-4 | Shape-validate org IDs at parse | T069 (low-cost) |

After T069 remediation, T070 re-runs `/security-review` and
records a clean output.

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | security-reviewer agent | Initial review for B8 (T068). Outcome: APPROVE WITH CHANGES. |
