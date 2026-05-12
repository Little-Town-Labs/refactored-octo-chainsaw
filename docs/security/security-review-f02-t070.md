# F02 Security Review — T070 Re-Verification

**Reviewer:** security-reviewer agent (Claude Opus 4.7)
**Reviewed:** 2026-05-11
**Branch:** `02-identity-auth-aaa`
**HEAD at review:** `c39440e` (T069 patches)
**Scope:** Targeted re-review of the six T069 patch files + two new test files.
**Outcome:** **APPROVE WITH MINOR ITEMS.** All seven T068 actionable findings verified clean; no regressions; three non-blocking follow-ups noted (two applied in this commit).

---

## Verification matrix

| T068 finding | T069 patch | T070 verdict |
|---|---|---|
| MEDIUM-1 — issuance.ts safeEmit | issuance.ts:150-170 `emit` lambda wraps `sink.emit` in try/catch | ✅ verified clean |
| MEDIUM-2 — audit-sink-db WARN on fallback | audit-sink-db.ts:80-105 structured WARN | ✅ verified clean |
| MEDIUM-3 — notes redaction | audit-sink.ts redactPayload `notes` / `*_notes` → boolean | ✅ verified clean |
| LOW-2 — webhook telemetry | route.ts:110-140 webhook_processing_failed log | ✅ verified clean |
| LOW-3 — sha256 hash | principal-repo.ts:164-178 sha256 hash convention | ✅ verified clean |
| LOW-4 — Clerk org-id shape | clerk-session.ts:40-72 regex + throwing parser | ✅ verified clean |

---

## New findings (none exploitable)

### LOW (new) — `redactPayload` is shallow
F02 audit payloads are flat at every current call site, so no exploit
path today. Documented inline at `audit-sink.ts` with a comment +
contract reminder for future call sites. Recursive walk deferred until
a flat-payload contract violation appears.

### LOW (new) — Other free-text fields not in the redaction list
`disabled_reason` is composed server-side from Clerk event type
enums (not operator free text), so acceptable as-is. Future operator-
supplied free-text fields should extend the redaction list at the
same time they land.

### INFO — Noise budget acceptable
`issuance.ts` console.error fires once per failed emit (deny path
+ success-event path = at most 2 lines per credential operation).
No retry loop.

### INFO — Webhook error.message safety
`cause.message` (not `.stack`) used in the webhook telemetry log;
no Clerk credentials or PII observed in upstream error messages.

### Regex DoS check (CLERK_ORG_ID_RE)
`/^org_[A-Za-z0-9]+$/` — single character class, anchored, no
nested quantifier. Linear-time, no catastrophic backtracking. Input
comes from env at module-load, not per-request.

---

## Test coverage

| Patch | Coverage source | Lock quality |
|---|---|---|
| MEDIUM-1 | `issuance.test.ts` — new regression test "audit-sink failure does not mask the typed deny" | Locks the contract: sink throws → typed deny still propagates |
| MEDIUM-2 | Exercised by existing `audit-sink-db.test.ts` paths; the WARN is observable in stderr | Acceptable (log-only change) |
| MEDIUM-3 | `audit-sink.test.ts` — 5 new tests including substring-absence assertion on the rendered line | Strong |
| LOW-2 | Log-only change; not unit-tested (integration harness would be high-cost) | Acceptable |
| LOW-3 | Log-only change; same as LOW-2 | Acceptable |
| LOW-4 | `clerk-session.test.ts` — 5 new tests covering well-formed, comma-separated, whitespace, and four malformed-throw cases | Strong |

Tests: **242 auth + 142 web = 384 green** at HEAD post-T070
(was 373 at start of B8 remediation).

---

## Final verdict

**APPROVE.** T068 → T069 → T070 close cleanly. F02 B8 sub-phase
implementation closes with this review record.

Outstanding non-blocking items:
1. ✅ Applied: shallow-redact comment in `audit-sink.ts`.
2. ✅ Applied: regression test for issuance.ts safeEmit pattern.
3. Deferred (no action needed at v0): nested-payload recursion in
   `redactPayload`; redact-allowlist for new free-text fields.

---

## Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-11 | security-reviewer agent | T070 verification pass. APPROVE. |
