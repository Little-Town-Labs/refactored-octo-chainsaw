# Spyglass integrity-invariant catalog

**Version:** 1.0 (2026-05-12)
**Last reviewed:** 2026-05-12
**Owner:** Gary

Every CHECK constraint, unique index, partial index, and foreign-key
relationship shipped by Spyglass migrations is listed here with: the
rule it enforces, the failure mode it prevents, and a pointer to the
test that exercises it (or the orchestration code that depends on it
when no direct unit test exists).

Constitutional anchor: §I.2 (integrity invariants are versioned).
F03 spec FR-3.

---

## Format

Each table has one section. PostgreSQL is **authoritative**; Drizzle
TypeScript types are documentation of the rule, not the rule itself.

Invariant **kind** legend:
- `CHECK` — table-level CHECK constraint
- `UNIQUE` — unique index covering all rows
- `PARTIAL_UNIQUE` — unique index with a WHERE clause
- `PARTIAL` — non-unique index with a WHERE clause
- `INDEX` — plain b-tree index
- `FK` — foreign-key reference
- `PK` — primary key

Total: **47 invariants across 8 tables.**

---

## organizations
File: [`packages/db/src/schema/organizations.ts`](../../packages/db/src/schema/organizations.ts) ·
Migration: [`0000_f02_auth_principals_organizations.sql`](../../packages/db/migrations/0000_f02_auth_principals_organizations.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `organizations_pkey` | PK | `org_id uuid` | Duplicate / missing PK | `packages/auth/src/__tests__/reconciliation.test.ts` |
| `organizations_kind_check` | CHECK | `kind IN ('employer','operator')` | Invalid org kind drift | `packages/auth/src/__tests__/clerk-session.test.ts` |
| `organizations_clerk_org_idx` | UNIQUE | `UNIQUE (clerk_org_id)` | Double-mirroring of a single Clerk org | `packages/auth/src/__tests__/reconciliation.test.ts` |
| `organizations_kind_idx` | INDEX | `(kind)` | (perf) policy-gate kind lookups | — (perf, not correctness) |

---

## principals
File: [`packages/db/src/schema/principals.ts`](../../packages/db/src/schema/principals.ts) ·
Migration: [`0000_f02_auth_principals_organizations.sql`](../../packages/db/migrations/0000_f02_auth_principals_organizations.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `principals_pkey` | PK | `principal_id uuid` | Duplicate / missing PK | `packages/auth/src/__tests__/principal.test.ts` |
| `principals_kind_check` | CHECK | `kind IN ('human','agent','service')` | Invalid principal kinds | `packages/auth/src/__tests__/principal.test.ts` |
| `principals_tier_check` | CHECK | `tier IS NULL OR tier IN ('seeker','employer_admin','employer_member','operator')` | Invalid tier drift | `packages/auth/src/__tests__/materialize.test.ts` |
| `principals_human_invariant` | CHECK | `kind <> 'human' OR (external_idp='clerk' AND external_id IS NOT NULL AND tier IS NOT NULL)` | Humans without Clerk linkage / tier (FR-1 invariant) | `packages/auth/src/__tests__/materialize.test.ts` |
| `principals_agent_invariant` | CHECK | `kind <> 'agent' OR (external_idp IS NULL AND service_name IS NULL)` | Agents with stray IdP / service-name (FR-1) | `packages/auth/src/__tests__/issuance.test.ts` |
| `principals_service_invariant` | CHECK | `kind <> 'service' OR (service_name IS NOT NULL AND service_version IS NOT NULL)` | Services without name/version (FR-1) | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `principals_tier_org_invariant` | CHECK | `tier IS NULL OR tier = 'seeker' OR org_id IS NOT NULL` | Tiered humans without org linkage | `packages/auth/src/__tests__/materialize.test.ts` |
| `principals_external_idx` | PARTIAL_UNIQUE | `UNIQUE (external_idp, external_id) WHERE external_idp IS NOT NULL` | Duplicate IdP linkage | `packages/auth/src/__tests__/reconciliation.test.ts` |
| `principals_kind_tier_idx` | INDEX | `(kind, tier)` | (perf) tier-segmented listings | — |
| `principals_org_idx` | PARTIAL | `(org_id) WHERE org_id IS NOT NULL` | (perf) org-member listings | — |
| `principals_created_at_idx` | INDEX | `(created_at DESC)` | (perf) newest-first listings | — |
| `principals_org_fk` | FK | `org_id → organizations.org_id` | Orphan org references | `packages/auth/src/__tests__/reconciliation.test.ts` |

---

## agent_credentials
File: [`packages/db/src/schema/agent-credentials.ts`](../../packages/db/src/schema/agent-credentials.ts) ·
Migration: [`0001_f02_b4_agent_credentials_signing_keys_revocations.sql`](../../packages/db/migrations/0001_f02_b4_agent_credentials_signing_keys_revocations.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `agent_credentials_pkey` | PK | `credential_id uuid` | Duplicate / missing PK | `packages/auth/src/__tests__/issuance.test.ts` |
| `agent_credentials_side_check` | CHECK | `side IN ('seeker','employer')` | Invalid side drift | `packages/auth/src/__tests__/issuance.test.ts` |
| `agent_credentials_scope_set_nonempty` | CHECK | `jsonb_typeof(scope_set) = 'array' AND jsonb_array_length(scope_set) >= 1` | Empty / non-array scopes (FR-19 defense-in-depth) | `packages/auth/src/__tests__/mint-verify.test.ts` |
| `agent_credentials_ttl_ceiling` | CHECK | `expires_at <= issued_at + interval '7200 seconds'` | TTL exceeding 2h ceiling (FR-20 defense-in-depth) | `packages/auth/src/__tests__/mint-verify.test.ts` |
| `agent_credentials_idempotency_idx` | UNIQUE | `UNIQUE (run_id, side, contract_id, contract_version)` | Double-issuance for the same negotiation seat (EC-8) | `packages/auth/src/__tests__/issuance.test.ts` |
| `agent_credentials_active_idx` | PARTIAL | `(expires_at) WHERE revoked_at IS NULL` | (perf) active-credential lookups | — |
| `agent_credentials_revoked_live_idx` | PARTIAL | `(revoked_at, expires_at) WHERE revoked_at IS NOT NULL AND expires_at > now()` | (perf) live revocation list refresh (FR-21) | `packages/auth/src/__tests__/revocation.test.ts` |
| `agent_credentials_ticket_idx` | INDEX | `(ticket_id)` | (perf) ticket-scoped credential listings | — |
| `agent_credentials_principal_fk` | FK | `principal_id → principals.principal_id` | Orphan principal reference | `packages/auth/src/__tests__/issuance.test.ts` |
| `agent_credentials_revoked_by_fk` | FK | `revoked_by → principals.principal_id` | Orphan revoker reference | `packages/auth/src/__tests__/revocation.test.ts` |

---

## service_credentials
File: [`packages/db/src/schema/service-credentials.ts`](../../packages/db/src/schema/service-credentials.ts) ·
Migration: [`0002_f02_b5_service_credentials.sql`](../../packages/db/migrations/0002_f02_b5_service_credentials.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `service_credentials_pkey` | PK | `credential_id uuid` | Duplicate / missing PK | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_scope_set_nonempty` | CHECK | `jsonb_typeof(scope_set) = 'array' AND jsonb_array_length(scope_set) >= 1` | Empty / non-array scopes | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_ttl_ceiling` | CHECK | `expires_at <= issued_at + interval '7200 seconds'` | TTL exceeding 2h ceiling | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_rotation_generation_positive` | CHECK | `rotation_generation >= 1` | Pre-rotation invalid generations | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_principal_generation_idx` | UNIQUE | `UNIQUE (principal_id, rotation_generation)` | Double-issuance during rotation (FR-25) | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_principal_idx` | INDEX | `(principal_id, expires_at DESC)` | (perf) latest-live-token-for-service lookup | — |
| `service_credentials_active_idx` | PARTIAL | `(expires_at) WHERE revoked_at IS NULL` | (perf) active-credential queries | — |
| `service_credentials_revoked_live_idx` | PARTIAL | `(revoked_at, expires_at) WHERE revoked_at IS NOT NULL AND expires_at > now()` | (perf) live revocation list refresh | `packages/auth/src/__tests__/revocation.test.ts` |
| `service_credentials_principal_fk` | FK | `principal_id → principals.principal_id` | Orphan principal reference | `packages/auth/src/__tests__/service-issuance.test.ts` |
| `service_credentials_revoked_by_fk` | FK | `revoked_by → principals.principal_id` | Orphan revoker reference | `packages/auth/src/__tests__/revocation.test.ts` |

---

## revocations
File: [`packages/db/src/schema/revocations.ts`](../../packages/db/src/schema/revocations.ts) ·
Migration: [`0001_f02_b4_agent_credentials_signing_keys_revocations.sql`](../../packages/db/migrations/0001_f02_b4_agent_credentials_signing_keys_revocations.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `revocations_pkey` | PK | `credential_id uuid` | Duplicate live-revocation rows | `packages/auth/src/__tests__/revocation.test.ts` |
| `revocations_kind_check` | CHECK | `kind IN ('agent','service')` | Invalid revocation source | `packages/auth/src/__tests__/revocation.test.ts` |
| `revocations_expires_at_idx` | INDEX | `(expires_at)` | (perf) pruner range scan (F02 T048) | `packages/auth/src/__tests__/revocation.test.ts` |

---

## signing_keys
File: [`packages/db/src/schema/signing-keys.ts`](../../packages/db/src/schema/signing-keys.ts) ·
Migration: [`0001_f02_b4_agent_credentials_signing_keys_revocations.sql`](../../packages/db/migrations/0001_f02_b4_agent_credentials_signing_keys_revocations.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `signing_keys_pkey` | PK | `kid text` (text PK is the documented carve-out per schema-conventions §3) | Duplicate kid drift | `packages/auth/src/__tests__/jwks.test.ts` |
| `signing_keys_purpose_check` | CHECK | `purpose IN ('agent','service')` | Mixing agent vs service signing roots | `packages/auth/src/__tests__/jwks.test.ts` |
| `signing_keys_algorithm_check` | CHECK | `algorithm IN ('EdDSA')` | Algorithm drift outside the F02 commitment | `packages/auth/src/__tests__/mint-verify.test.ts` |
| `signing_keys_active_per_purpose_idx` | PARTIAL_UNIQUE | `UNIQUE (purpose) WHERE activated_at IS NOT NULL AND retired_at IS NULL` | Two active signers per purpose | `packages/auth/src/__tests__/jwks.test.ts` |
| `signing_keys_jwks_idx` | PARTIAL | `(purpose, verify_until DESC) WHERE verify_until IS NULL OR verify_until > now()` | (perf) JWKS fetch path | `packages/auth/src/__tests__/jwks.test.ts` |

---

## audit_events_buffer
File: [`packages/db/src/schema/audit-events-buffer.ts`](../../packages/db/src/schema/audit-events-buffer.ts) ·
Migration: [`0003_f02_b6_audit_events_buffer.sql`](../../packages/db/migrations/0003_f02_b6_audit_events_buffer.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `audit_events_buffer_pkey` | PK | `event_id uuid` | Duplicate event rows | — (covered by sink-level idempotency) |
| `audit_events_buffer_principal_kind_check` | CHECK | `principal_kind IN ('human','agent','service')` | Invalid principal-kind drift | — (covered by sink-level type checks) |
| `audit_events_buffer_created_at_idx` | INDEX | `(created_at DESC)` | (perf) audit-viewer newest-first | — |
| `audit_events_buffer_principal_idx` | INDEX | `(principal_id, created_at DESC)` | (perf) per-principal audit listings | — |
| `audit_events_buffer_principal_fk` | FK | `principal_id → principals.principal_id` (NOT NULL) | Orphaned audit attribution (T059a guarantees post-auth principal) | — (covered by upstream `withPrincipal` enforcement) |

**Note.** `audit_events_buffer` is transitional (F05 replaces). Direct
unit tests of these invariants are deferred to F05's hash-chained log;
F02's protection comes from the sink-layer type system enforcing
`principal_id` is always present.

---

## revoke_all_sessions_approvals
File: [`packages/db/src/schema/revoke-all-sessions-approvals.ts`](../../packages/db/src/schema/revoke-all-sessions-approvals.ts) ·
Migration: [`0004_f02_b6_revoke_all_sessions_approvals.sql`](../../packages/db/migrations/0004_f02_b6_revoke_all_sessions_approvals.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `revoke_all_sessions_approvals_pkey` | PK | `approval_id uuid` | Duplicate approval rows | — |
| `revoke_all_sessions_approvals_distinct_operators_check` | CHECK | `approved_by IS NULL OR approved_by <> initiated_by` | Single-operator approval (two-operator gate — EC-3 / plan §12 Q2) | `apps/web/src/auth/__tests__/revoke-all-sessions-repos.test.ts` (F02 B6) |
| `revoke_all_sessions_approvals_reason_code_check` | CHECK | `reason_code IN ('session_compromise','operator_emergency','credential_rotation','compliance_action')` | Reason-code drift polluting audit reports | `apps/web/src/auth/__tests__/revoke-all-sessions-repos.test.ts` |
| `revoke_all_sessions_approvals_target_fk` | FK | `target_principal_id → principals.principal_id` | Orphan target reference | — |
| `revoke_all_sessions_approvals_initiated_by_fk` | FK | `initiated_by → principals.principal_id` | Orphan initiator reference | — |
| `revoke_all_sessions_approvals_approved_by_fk` | FK | `approved_by → principals.principal_id` (nullable) | Orphan approver reference | — |

---

---

## seeker_tickets
File: [`packages/db/src/schema/seeker-tickets.ts`](../../packages/db/src/schema/seeker-tickets.ts) ·
Migration: [`0005_f04_ticket_store.sql`](../../packages/db/migrations/0005_f04_ticket_store.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `seeker_tickets_pkey` | PK | `seeker_ticket_id uuid` default `uuidv7()` | Duplicate / missing PK | `packages/tickets/src/__tests__/repo/seeker.test.ts` |
| `seeker_tickets_state_check` | CHECK | `state IN ('draft','submitted','screening','matching','matched','closed','withdrawn')` | Invalid seeker-state drift | `packages/tickets/src/__tests__/transitions.test.ts` |
| `seeker_tickets_work_mode_check` | CHECK | `work_mode IN ('remote','hybrid','onsite')` | Invalid work-mode | `packages/tickets/src/__tests__/repo/seeker.test.ts` |
| `seeker_tickets_comp_band_order_check` | CHECK | `comp_band_min <= comp_band_max` | Inverted comp bands | `packages/tickets/src/__tests__/repo/seeker.test.ts` |
| `seeker_tickets_jurisdictions_nonempty` | CHECK | `jsonb_typeof(jurisdictions) = 'array' AND jsonb_array_length(jurisdictions) >= 1` | Untagged ticket (Constitution §I.A.1) | `packages/tickets/src/__tests__/repo/seeker.test.ts` |
| `seeker_tickets_identifier_shape_check` | CHECK | `identifier ~ '^ST-[0-9]{4}-[0-9]{5}$'` | Identifier drift (FR-7) | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `seeker_tickets_identifier_idx` | UNIQUE | `UNIQUE (identifier)` | Identifier collision (EC-9) | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `seeker_tickets_state_hot_idx` | PARTIAL | `(state) WHERE state IN ('matching','screening')` | (perf) hot-state listings | — |
| `seeker_tickets_principal_idx` | INDEX | `(principal_id, created_at DESC)` | (perf) seeker self-service listings | — |
| `seeker_tickets_principal_fk` | FK | `principal_id → principals.principal_id` | Orphan principal reference | `packages/tickets/src/__tests__/repo/seeker.test.ts` |

---

## employer_req_tickets
File: [`packages/db/src/schema/employer-req-tickets.ts`](../../packages/db/src/schema/employer-req-tickets.ts) ·
Migration: [`0005_f04_ticket_store.sql`](../../packages/db/migrations/0005_f04_ticket_store.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `employer_req_tickets_pkey` | PK | `employer_req_ticket_id uuid` default `uuidv7()` | Duplicate / missing PK | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_state_check` | CHECK | `state IN ('draft','submitted','open','matching','filled','closed','withdrawn')` | Invalid employer-req state drift | `packages/tickets/src/__tests__/transitions.test.ts` |
| `employer_req_tickets_role_level_check` | CHECK | role_level in closed enum | Invalid level drift | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_work_mode_check` | CHECK | `work_mode IN ('remote','hybrid','onsite')` | Invalid work-mode | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_comp_band_order_check` | CHECK | `comp_band_min <= comp_band_max` | Inverted comp bands | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_headcount_check` | CHECK | `headcount_total >= 1 AND 0 <= headcount_filled <= headcount_total` | Negative or overfilled headcounts (EC-2) | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_jurisdictions_nonempty` | CHECK | non-empty array | Untagged ticket | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_identifier_shape_check` | CHECK | `identifier ~ '^ER-[0-9]{4}-[0-9]{5}$'` | Identifier drift | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `employer_req_tickets_identifier_idx` | UNIQUE | `UNIQUE (identifier)` | Identifier collision | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `employer_req_tickets_state_hot_idx` | PARTIAL | `(state) WHERE state IN ('matching','open')` | (perf) hot-state listings | — |
| `employer_req_tickets_org_idx` | INDEX | `(org_id, created_at DESC)` | (perf) org-side listings | — |
| `employer_req_tickets_principal_fk` | FK | `principal_id → principals.principal_id` | Orphan principal | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |
| `employer_req_tickets_org_fk` | FK | `org_id → organizations.org_id` | Orphan org | `packages/tickets/src/__tests__/repo/employer-req.test.ts` |

---

## match_tickets
File: [`packages/db/src/schema/match-tickets.ts`](../../packages/db/src/schema/match-tickets.ts) ·
Migration: [`0005_f04_ticket_store.sql`](../../packages/db/migrations/0005_f04_ticket_store.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `match_tickets_pkey` | PK | `match_ticket_id uuid` default `uuidv7()` | Duplicate / missing PK | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_state_check` | CHECK | `state IN ('created','negotiating','delivered','accepted','rejected','expired')` | Invalid match-state drift | `packages/tickets/src/__tests__/transitions.test.ts` |
| `match_tickets_round_bounds_check` | CHECK | `0 <= round AND round <= round_cap` | Round counter overflow (FR-11 / EC-6) | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_round_cap_check` | CHECK | `round_cap >= 1` | Invalid cap | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_attempt_check` | CHECK | `attempt >= 1` | Pre-issuance attempts (FR-10) | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_identifier_shape_check` | CHECK | `identifier ~ '^MT-[0-9]{4}-[0-9]{5}$'` | Identifier drift | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `match_tickets_identifier_idx` | UNIQUE | `UNIQUE (identifier)` | Identifier collision | `packages/tickets/src/__tests__/identifiers.test.ts` |
| `match_tickets_idempotency_idx` | UNIQUE | `UNIQUE (seeker_ticket_id, employer_req_ticket_id, attempt)` | Double-match for the same pair on the same attempt (FR-8 / EC-3) | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_state_hot_idx` | PARTIAL | `(state) WHERE state IN ('negotiating','created')` | (perf) hot-state listings | — |
| `match_tickets_seeker_fk_idx` | INDEX | `(seeker_ticket_id)` | (perf) seeker-side join | — |
| `match_tickets_employer_fk_idx` | INDEX | `(employer_req_ticket_id)` | (perf) employer-side join | — |
| `match_tickets_run_id_idx` | PARTIAL | `(run_id) WHERE run_id IS NOT NULL` | (perf) Parley run-side join | — |
| `match_tickets_jurisdiction_idx` | INDEX | `(decision_locus_jurisdiction)` | (perf) F06 policy-gate join | — |
| `match_tickets_seeker_fk` | FK | `seeker_ticket_id → seeker_tickets.seeker_ticket_id` | Orphan seeker reference | `packages/tickets/src/__tests__/repo/match.test.ts` |
| `match_tickets_employer_fk` | FK | `employer_req_ticket_id → employer_req_tickets.employer_req_ticket_id` | Orphan employer reference | `packages/tickets/src/__tests__/repo/match.test.ts` |

**Note.** `dossier_id` carries no FK constraint until F10 lands the
`dossiers` table (per CL-2). Application-level invariant in
`assertTransition`: `delivered → accepted/rejected` requires
`dossier_id IS NOT NULL`.

---

## Changelog

- **v1.0 (2026-05-12)** — Authored under F03 T010–T013. 47 invariants
  catalogued across 8 F02 tables. Test cross-references point at F02
  unit-test files; where no direct unit test exists (perf indexes,
  audit-buffer invariants), the protection rationale is named instead.
- **v1.1 (2026-05-12)** — F04 T003 amendment. Added 3 new table
  sections (seeker_tickets / employer_req_tickets / match_tickets)
  with 38 new invariants. Test refs point at `packages/tickets/`
  test files (RED until F04 B3/B5 land). Total invariants:
  47 + 38 = 85.
