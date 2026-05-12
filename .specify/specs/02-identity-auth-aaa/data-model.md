# F02 — Data Model

**Spec:** v1.2 · **Plan:** v1.0 · **Research:** v1.0
**Date:** 2026-05-07
**Owner:** Gary
**ORM:** Drizzle (PRD §7)
**Database:** Neon Postgres (PRD §7)

This document defines the auth-related tables F02 contributes to the
F03 schema. Migrations land alongside F02's implementation; F03 is the
broader schema umbrella (per Research Decision 7).

All tables use UUID v7 primary keys (time-ordered, indexable, no
collision risk). Timestamps are `timestamptz` with explicit UTC.

---

## Entities

### `principals`

The system-of-record table for every authenticated actor. Distinct from
any external IdP identifier (FR-2). Materialized lazily on first
authenticated request (EC-1) or eagerly via Clerk webhook (EC-2).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `principal_id` | `uuid` | PK, default `uuidv7()` | System-of-record key. Opaque to consumers. |
| `kind` | `text` | NOT NULL, CHECK `kind IN ('human','agent','service')` | Discriminator for the typed `Principal` model |
| `external_idp` | `text` | NULL | `'clerk'` for human; NULL for agent/service |
| `external_id` | `text` | NULL | Clerk user ID for human; NULL otherwise |
| `tier` | `text` | NULL, CHECK `tier IN ('seeker','employer_admin','employer_member','operator')` when `kind='human'` | Human only |
| `org_id` | `uuid` | NULL, FK → `organizations.org_id` | Employer / operator only |
| `service_name` | `text` | NULL | Service only (e.g., `'dossier-signer'`) |
| `service_version` | `text` | NULL | Deployed version that received the credential |
| `display_name` | `text` | NULL | For audit-log readability; never source-of-truth |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` | |
| `disabled_at` | `timestamptz` | NULL | Set on revocation; principal cannot authenticate after this |
| `disabled_reason` | `text` | NULL | Free-text audit record |

**Indexes.**
- `UNIQUE (external_idp, external_id) WHERE external_idp IS NOT NULL` — Clerk lookup.
- `INDEX (kind, tier)` — Operator-list and audience queries.
- `INDEX (org_id) WHERE org_id IS NOT NULL` — employer org membership lookups.
- `INDEX (created_at DESC)` — recent-activity queries.

**Invariants** (enforced by check constraints + repository layer).
- `kind='human'` ⇒ `external_idp='clerk'`, `external_id` NOT NULL, `tier` NOT NULL.
- `kind='agent'` ⇒ `external_idp` IS NULL (agents authenticate by JWT, no IdP row); `service_name` IS NULL.
- `kind='service'` ⇒ `service_name` NOT NULL, `service_version` NOT NULL.
- `tier='employer_admin'` or `'employer_member'` or `'operator'` ⇒ `org_id` NOT NULL.

---

### `organizations`

Mirror of Clerk Organizations (employer + operator). Operator org has
a special `kind='operator'` flag for routing and policy.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `org_id` | `uuid` | PK, default `uuidv7()` | |
| `clerk_org_id` | `text` | NOT NULL, UNIQUE | Clerk org ID |
| `kind` | `text` | NOT NULL, CHECK `kind IN ('employer','operator')` | |
| `display_name` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `disabled_at` | `timestamptz` | NULL | |

**Indexes.** `UNIQUE (clerk_org_id)`; `INDEX (kind)`.

---

### `agent_credentials`

Issued JWT records — for revocation, rate limiting, and forensic
attribution. The JWT itself is not stored (we only need the metadata
to revoke; the bearer holds the full token).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `credential_id` | `uuid` | PK, default `uuidv7()` | Equals JWT `jti` claim |
| `principal_id` | `uuid` | NOT NULL, FK → `principals.principal_id` | Which agent principal |
| `run_id` | `uuid` | NOT NULL | Parley run binding (FR-4) |
| `side` | `text` | NOT NULL, CHECK `side IN ('seeker','employer')` | |
| `contract_id` | `text` | NOT NULL | Agent contract (F07a) |
| `contract_version` | `text` | NOT NULL | Pinned per Parley §7.4 |
| `ticket_id` | `uuid` | NOT NULL | Match ticket binding |
| `scope_set` | `jsonb` | NOT NULL | Array of scope strings; copied into JWT |
| `kid` | `text` | NOT NULL | Signing-key ID; FK → `signing_keys.kid` (logical, no DB FK to allow archival) |
| `issued_at` | `timestamptz` | NOT NULL, default `now()` | |
| `expires_at` | `timestamptz` | NOT NULL | TTL ≤ 2h ceiling (FR-20) |
| `revoked_at` | `timestamptz` | NULL | NULL = active; non-NULL = on revocation list until `expires_at` |
| `revoked_by` | `uuid` | NULL, FK → `principals.principal_id` | Operator or system |
| `revocation_reason` | `text` | NULL | Free-text audit |

**Indexes.**
- `UNIQUE (run_id, side, contract_id, contract_version)` — idempotency (EC-8).
- `INDEX (expires_at) WHERE revoked_at IS NULL` — active-credential queries.
- `INDEX (revoked_at, expires_at) WHERE revoked_at IS NOT NULL AND expires_at > now()` — the "live revocation list" the verifier checks.
- `INDEX (ticket_id)` — for forensic queries.

**Retention** (Constitution §I.4.2). Records are retained for 90 days
past `expires_at` for forensic readiness, then purged. (To be confirmed
with counsel; tracked as a decision in F03's data-classification note.)

---

### `service_credentials`

Issued service-to-service JWTs. Same shape as `agent_credentials`
minus the run binding.

| Column | Type | Constraints |
|--------|------|-------------|
| `credential_id` | `uuid` | PK, equals JWT `jti` |
| `principal_id` | `uuid` | NOT NULL, FK → `principals.principal_id` (must be `kind='service'`) |
| `scope_set` | `jsonb` | NOT NULL |
| `kid` | `text` | NOT NULL |
| `issued_at` | `timestamptz` | NOT NULL, default `now()` |
| `expires_at` | `timestamptz` | NOT NULL |
| `revoked_at` | `timestamptz` | NULL |
| `revoked_by` | `uuid` | NULL, FK → `principals.principal_id` |
| `revocation_reason` | `text` | NULL — free-form forensic note (sanitized at issuance code) |
| `rotation_generation` | `int` | NOT NULL, default `1`, CHECK `>= 1`. Increments on rotation; old generations remain verifiable until `expires_at`. UNIQUE `(principal_id, rotation_generation)` — at most one credential per service per generation. |

**Indexes.**
- `INDEX (principal_id, expires_at DESC)` — latest live credential lookup.
- `INDEX (expires_at) WHERE revoked_at IS NULL` — active-credential hot path (parity with `agent_credentials`).
- `INDEX (revoked_at, expires_at) WHERE revoked_at IS NOT NULL AND expires_at > now()` — live revocation list (verifier cross-process refresh).
- `UNIQUE (principal_id, rotation_generation)` — see column.

**Principal-kind invariant.** `principal_id` must reference a row
with `kind = 'service'`. The plain FK cannot enforce this; F02
issuance code is the sole writer and rejects non-service callers.
Same invariant applies to `agent_credentials.principal_id`
(`kind = 'agent'`). Tracked as a defense-in-depth follow-up
(generated-column composite FK) for v1.

---

### `signing_keys`

EdDSA keypairs for credential signing. Public key is published via
JWKS; private key is read from environment scope at runtime (NEVER
stored in this table).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `kid` | `text` | PK | JWT key ID |
| `algorithm` | `text` | NOT NULL, default `'EdDSA'` | Per Constitution §I.C.1 crypto-agility |
| `public_key_jwk` | `jsonb` | NOT NULL | The public JWK; used to render `/.well-known/jwks.json` |
| `purpose` | `text` | NOT NULL, CHECK `purpose IN ('agent','service')` | Separates agent and service trust roots |
| `created_at` | `timestamptz` | NOT NULL, default `now()` | |
| `activated_at` | `timestamptz` | NULL | NULL = pre-activation; non-NULL = signing-active |
| `retired_at` | `timestamptz` | NULL | NULL = currently signing; non-NULL = verify-only |
| `verify_until` | `timestamptz` | NULL | After this time, key is removed from JWKS (set to last issued credential's `expires_at` + grace) |

**Constraint.** Exactly one row per `purpose` may have
`activated_at IS NOT NULL AND retired_at IS NULL` at any time
(enforced by partial unique index).

**Indexes.**
- `UNIQUE (purpose) WHERE activated_at IS NOT NULL AND retired_at IS NULL`.
- `INDEX (purpose, verify_until DESC) WHERE verify_until IS NULL OR verify_until > now()` — JWKS query.

---

### `audit_events_buffer`

Pre-F05 buffer for structured audit events. F05 later replaces this
with the hash-chained log; F02 emits unchanged.

| Column | Type | Constraints |
|--------|------|-------------|
| `event_id` | `uuid` | PK, default `uuidv7()` |
| `event_name` | `text` | NOT NULL |
| `principal_id` | `uuid` | NOT NULL, FK → `principals.principal_id` |
| `principal_kind` | `text` | NOT NULL |
| `role_or_scope` | `text` | NULL |
| `correlation_id` | `text` | NOT NULL |
| `payload` | `jsonb` | NOT NULL |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

**Indexes.**
- `INDEX (created_at DESC)`.
- `INDEX (principal_id, created_at DESC)`.
- `INDEX (event_name, created_at DESC)`.

**Retention.** Forensic-grade until F05 replaces; then migrated and
truncated. Volume cap: alert at 10M rows.

---

### `revocations` (denormalized live revocation list)

A small materialized view (or actual table refreshed on revoke) of
agent + service credentials currently revoked AND not yet expired.
The verifier consults this on mint and on cross-process refresh
(FR-21).

| Column | Type | Constraints |
|--------|------|-------------|
| `credential_id` | `uuid` | PK |
| `kind` | `text` | NOT NULL, CHECK `kind IN ('agent','service')` |
| `expires_at` | `timestamptz` | NOT NULL |

**Maintenance.** Populated on revoke event; rows older than
`expires_at` are pruned by a daily Inngest job. Target row count
< 10,000 (sized so it fits comfortably in memory if needed).

---

### `revoke_all_sessions_approvals`

Two-operator gate state for `revokeAllSessionsForPrincipal`
against an **operator target** (EC-3, FR-35). Non-operator targets
revoke immediately without writing here. Introduced in T059b (B6).

| Column | Type | Constraints |
|--------|------|-------------|
| `approval_id` | `uuid` | PK, DEFAULT `uuidv7()` |
| `target_principal_id` | `uuid` | NOT NULL, FK → `principals.principal_id` |
| `initiated_by` | `uuid` | NOT NULL, FK → `principals.principal_id` (first operator) |
| `reason_code` | `text` | NOT NULL, CHECK `IN ('session_compromise','operator_emergency','credential_rotation','compliance_action')` |
| `notes` | `text` | NULL allowed; ≤500 chars; control chars stripped at orchestrator boundary |
| `initiated_at` | `timestamptz` | NOT NULL, DEFAULT `now()` |
| `expires_at` | `timestamptz` | NOT NULL (initiated_at + 15 minutes by default) |
| `approved_by` | `uuid` | NULL until second operator approves; FK → `principals.principal_id` |
| `approved_at` | `timestamptz` | NULL until approved |
| `executed_at` | `timestamptz` | NULL until the IdP revoke runs; stamped in the same transaction as `approved_*` |

**Constraints**
- `CHECK approved_by IS NULL OR approved_by <> initiated_by`
  (two-operator rule at the DB layer; orchestrator + adapter SQL
  enforce defense-in-depth alongside this).
- `CHECK reason_code IN (...)` mirrors the typed `RevokeAllReasonCode`
  union so a future surface bypassing the orchestrator can't pollute
  audit/compliance reports with arbitrary strings.

**Lifecycle.** Row inserted by operator A (initiated_by = A,
expires_at = now + 15min). Operator B (≠ A) presents `approval_id`
within the TTL; markApproved UPDATE guards `executed_at IS NULL`
+ `approved_by IS NULL` + `initiated_by <> :approved_by`, stamps
all three timestamps atomically with the IdP revoke. Expired rows
remain for audit; a future pruner sweeps them (threat-model.md §6
residual #6).

**Audit events.** `human_sessions.revoke_all_initiated` (insert),
`human_sessions.revoked_all` (execute, `two_operator_gated: true`),
`human_sessions.revoke_all_denied` (any failure path, with
structured `reason` field).

---

## Relationships

```
principals ─┬─< organizations         (employer / operator membership)
            ├─< agent_credentials      (kind='agent' principals)
            ├─< service_credentials    (kind='service' principals)
            ├─< audit_events_buffer    (every privileged action)
            └─< revoke_all_sessions_approvals  (EC-3 two-operator gate;
                                                FKs on target + initiated_by + approved_by)

signing_keys (independent; referenced logically by `kid` in JWTs)
revocations  (denormalized projection of agent/service credentials)
```

---

## Migration Notes

1. F02's migration is the **first non-empty migration** in F03's
   schema. F03's foundation migration (the schema-baseline migration
   from F03's spec, when written) precedes it.
2. `principals` is a hot dependency for every later feature; backfilling
   it against pre-existing Clerk users is part of go-live for
   subsequent migrations.
3. `audit_events_buffer` is intentionally write-heavy and read-cold;
   keep its indexes minimal. F05 replaces this table; do not
   over-invest in optimizing it.

---

## Open Questions (tracked for /speckit-tasks)

- Retention durations per Constitution §I.4.2 are pending counsel
  review. F03 owns the broader retention policy; F02 marks 90-day
  default for credential records.
- Whether `revocations` should be a materialized view or a real table
  is a v0 perf decision. Default plan: real table, populated by trigger
  + Inngest cleanup job.
- Whether `signing_keys` includes a key-derivation reference for
  HSM/KMS migration (decision 4) — left as a future migration.
