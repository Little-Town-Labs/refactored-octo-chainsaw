# F03 back-check findings (T020/T021/T023)

**Date:** 2026-05-12 · **Owner:** Gary · **Lint version:** scripts/check-schema-conventions.sh v1.0

Pre-resolution lint output (T020) found **11 violations** across 6
schema modules. All resolved via path (b) of EC-5 (skip-comments with
documented justification in the convention doc). Final state: **0
violations, 7 honored skips.**

---

## Findings

| # | File | Rule | Disposition | Justification (path b) |
|---|---|---|---|---|
| 1 | `agent-credentials.ts` | r2-timestamps (no `created_at`) | skip-r2 added | Append-only issuance record; `issued_at` is the domain creation timestamp. |
| 2 | `agent-credentials.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | `revoked_at` is the only permitted state change. |
| 3 | `service-credentials.ts` | r2-timestamps (no `created_at`) | skip-r2 added | Parity with agent_credentials. |
| 4 | `service-credentials.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | Parity with agent_credentials. |
| 5 | `organizations.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | Clerk-mirror state; mutations flow through webhook reconciliation, not Spyglass code. |
| 6 | `revocations.ts` | r1-uuidv7-pk (no `uuidv7()` default) | skip-r1 added | `credential_id` is COPIED from parent credentials row; this table generates no ids. |
| 7 | `revocations.ts` | r2-timestamps (no `created_at`) | skip-r2 added | Denormalized lookup; parent row owns timestamps. |
| 8 | `revocations.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | Same as #7. |
| 9 | `revoke-all-sessions-approvals.ts` | r2-timestamps (no `created_at`) | skip-r2 added | Workflow row; `initiated_at` is the creation timestamp. |
| 10 | `revoke-all-sessions-approvals.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | State advances through `approved_at`/`executed_at` columns. |
| 11 | `signing-keys.ts` | r2-timestamps (no `updated_at`) | skip-r2 added | Lifecycle uses `activated_at`/`retired_at`/`verify_until` phase timestamps. |

---

## Resolution summary

- **Path (a) — migration:** 0 findings required new SQL. F02's
  decisions are domain-appropriate and well-tested; the lint's
  default rule does not apply to these tables.
- **Path (b) — skip with justification:** 11 findings, all resolved
  by adding `// schema-lint: skip-<rule>` adjacent to the import
  block of the affected schema module, with a Reason comment pointing
  back to `docs/data-governance/schema-conventions.md §2`.
- **Path (c) — constitutional escalation:** 0 findings.

## Final state

```
$ bash scripts/check-schema-conventions.sh
tables checked: 8
violations: 0
skips honored: 7
  packages/db/src/schema/agent-credentials.ts: skip-r2-timestamps
  packages/db/src/schema/organizations.ts: skip-r2-timestamps
  packages/db/src/schema/revocations.ts: skip-r1-uuidv7-pk
  packages/db/src/schema/revocations.ts: skip-r2-timestamps
  packages/db/src/schema/revoke-all-sessions-approvals.ts: skip-r2-timestamps
  packages/db/src/schema/service-credentials.ts: skip-r2-timestamps
  packages/db/src/schema/signing-keys.ts: skip-r2-timestamps
$ echo $?
0
```

**M-5 ✅: zero unresolved findings.**
**M-1 ✅: lint runs in 0.7s on the F02 schema (NFR-2 budget: 15s).**
**M-6 ✅: `pnpm -r run test` green (242 auth + 142 web = 384 tests passing).**

## Reviewer audit

Six of seven skips are `skip-r2-timestamps` — F02's column-naming
choices follow domain semantics (`issued_at`, `initiated_at`) rather
than the generic `created_at`/`updated_at` convention. A future
hardening could add an alias mechanism to the lint
(`accept-as-created-at: issued_at`); deferred for now to keep the
lint simple. The seventh skip (`skip-r1-uuidv7-pk` on `revocations`)
is a structurally-correct denormalization carve-out that no future
change should reintroduce as a `uuidv7()` default — doing so would
break the parent-row-id invariant.
