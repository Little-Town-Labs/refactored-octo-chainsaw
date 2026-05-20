# Spyglass integrity-invariant catalog

**Version:** 1.3 (2026-05-20)
**Last reviewed:** 2026-05-20
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

Total: **178 invariants across 20 tables.**

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

## audit_log_events
File: [`packages/db/src/schema/audit-log.ts`](../../packages/db/src/schema/audit-log.ts) ·
Migration: [`0006_f05_audit_log_tombstone.sql`](../../packages/db/migrations/0006_f05_audit_log_tombstone.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `audit_log_events_pkey` | PK | `audit_event_id uuid` default `uuidv7()` | Duplicate / missing canonical audit row | `packages/audit-log/src/__tests__/hash-chain.test.ts` (F05 T005/T007) |
| `audit_log_events_principal_kind_check` | CHECK | `principal_kind IN ('human','agent','service')` | Invalid actor kind drift | `packages/audit-log/src/__tests__/writer.test.ts` (F05 T008) |
| `audit_log_events_source_pair_check` | CHECK | `(source_table IS NULL) = (source_event_id IS NULL)` | Half-linked replay source references | `packages/audit-log/src/__tests__/replay.test.ts` (F05 T010/T011) |
| `audit_log_events_hash_algorithm_check` | CHECK | `hash_algorithm IN ('sha256')` | Mixed hash algorithm drift before a versioned migration | `packages/audit-log/src/__tests__/hash-chain.test.ts` |
| `audit_log_events_canonicalization_version_check` | CHECK | `canonicalization_version <> ''` | Unversioned canonical serializer rows | `packages/audit-log/src/__tests__/hash-chain.test.ts` |
| `audit_log_events_tombstone_payload_check` | CHECK | `tombstoned_at IS NULL OR payload ? 'tombstone'` | Marking a row tombstoned without a tombstone envelope | `packages/audit-log/src/__tests__/tombstone.test.ts` (F05 T017/T019) |
| `audit_log_events_hash_idx` | UNIQUE | `UNIQUE (event_hash)` | Duplicate event digest / chain collision acceptance | `packages/audit-log/src/__tests__/hash-chain.test.ts` |
| `audit_log_events_source_replay_idx` | PARTIAL_UNIQUE | `UNIQUE (source_table, source_event_id) WHERE source_table IS NOT NULL` | Duplicate replay from `audit_events_buffer` or later source tables | `packages/audit-log/src/__tests__/replay.test.ts` |
| `audit_log_events_chain_order_idx` | INDEX | `(chain_namespace, created_at, audit_event_id)` | (perf) deterministic chain verification scan | `packages/audit-log/src/__tests__/hash-chain.test.ts` |
| `audit_log_events_principal_idx` | INDEX | `(principal_id, created_at DESC)` | (perf) principal-scoped evidence review | — |
| `audit_log_events_correlation_idx` | PARTIAL | `(correlation_id, created_at DESC) WHERE correlation_id IS NOT NULL` | (perf) request/workflow evidence reconstruction | — |
| `audit_log_events_principal_fk` | FK | `principal_id → principals.principal_id` | Orphaned canonical audit attribution | `packages/audit-log/src/__tests__/writer.test.ts` |

---

## transcript_turns
File: [`packages/db/src/schema/transcript-store.ts`](../../packages/db/src/schema/transcript-store.ts) ·
Migration: [`0006_f05_audit_log_tombstone.sql`](../../packages/db/migrations/0006_f05_audit_log_tombstone.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `transcript_turns_pkey` | PK | `transcript_turn_id uuid` default `uuidv7()` | Duplicate / missing transcript row | `packages/audit-log/src/__tests__/transcripts.test.ts` (F05 T013/T015) |
| `transcript_turns_side_check` | CHECK | `side IN ('seeker','employer')` | Cross-side label drift | `packages/audit-log/src/__tests__/transcripts.test.ts` |
| `transcript_turns_tombstone_content_check` | CHECK | `tombstoned_at IS NULL OR content IS NULL` | Retaining raw transcript content after tombstone | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `transcript_turns_idempotency_idx` | UNIQUE | `UNIQUE (run_id, side, turn_index)` | Duplicate turn append for the same negotiation side/order | `packages/audit-log/src/__tests__/transcripts.test.ts` |
| `transcript_turns_match_idx` | INDEX | `(match_ticket_id, created_at)` | (perf) match-scoped transcript read path | — |
| `transcript_turns_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Multiple transcript rows claiming one append audit event | `packages/audit-log/src/__tests__/transcripts.test.ts` |
| `transcript_turns_match_fk` | FK | `match_ticket_id → match_tickets.match_ticket_id` | Orphan transcript without a match ticket | `packages/audit-log/src/__tests__/transcripts.test.ts` |
| `transcript_turns_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` | Transcript append without canonical audit event | `packages/audit-log/src/__tests__/transcripts.test.ts` |

---

## tombstone_records
File: [`packages/db/src/schema/audit-log.ts`](../../packages/db/src/schema/audit-log.ts) ·
Migration: [`0006_f05_audit_log_tombstone.sql`](../../packages/db/migrations/0006_f05_audit_log_tombstone.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `tombstone_records_pkey` | PK | `tombstone_id uuid` default `uuidv7()` | Duplicate / missing tombstone evidence row | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_target_kind_check` | CHECK | `target_kind IN ('audit_event','transcript_turn')` | Tombstone rows targeting unsupported stores | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_hashes_differ_check` | CHECK | `original_hash <> replacement_hash` | No-op tombstone evidence | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_target_idx` | UNIQUE | `UNIQUE (target_kind, target_id)` | Double tombstone of the same canonical record | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Reusing one audit event for multiple tombstone actions | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_operator_idx` | INDEX | `(operator_principal_id, created_at DESC)` | (perf) operator-action evidence review | — |
| `tombstone_records_operator_fk` | FK | `operator_principal_id → principals.principal_id` | Tombstone without attributable operator | `packages/audit-log/src/__tests__/tombstone.test.ts` |
| `tombstone_records_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` | Tombstone evidence without linked audit event | `packages/audit-log/src/__tests__/tombstone.test.ts` |

---

## evidence_exports
File: [`packages/db/src/schema/audit-log.ts`](../../packages/db/src/schema/audit-log.ts) ·
Migration: [`0006_f05_audit_log_tombstone.sql`](../../packages/db/migrations/0006_f05_audit_log_tombstone.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `evidence_exports_pkey` | PK | `export_id uuid` default `uuidv7()` | Duplicate / missing export manifest row | `packages/audit-log/src/__tests__/export.test.ts` (F05 T021/T022) |
| `evidence_exports_purpose_check` | CHECK | `purpose IN ('incident','counsel','audit','operator_review')` | Ambiguous export purpose drift | `packages/audit-log/src/__tests__/export.test.ts` |
| `evidence_exports_chain_status_check` | CHECK | `chain_verification_status IN ('valid','invalid') OR chain_verification_status LIKE 'invalid:%'` | Export manifest without machine-readable chain result | `packages/audit-log/src/__tests__/export.test.ts` |
| `evidence_exports_manifest_hash_idx` | UNIQUE | `UNIQUE (manifest_hash)` | Duplicate deterministic export manifest rows | `packages/audit-log/src/__tests__/export.test.ts` |
| `evidence_exports_requested_by_idx` | INDEX | `(requested_by_principal_id, created_at DESC)` | (perf) operator/counsel export review | — |
| `evidence_exports_requested_by_fk` | FK | `requested_by_principal_id → principals.principal_id` | Export without attributable requester | `packages/audit-log/src/__tests__/export.test.ts` |

---

## jurisdiction_policies
File: [`packages/db/src/schema/jurisdiction-policy.ts`](../../packages/db/src/schema/jurisdiction-policy.ts) ·
Migration: [`0007_f06_jurisdiction_policy_gates.sql`](../../packages/db/migrations/0007_f06_jurisdiction_policy_gates.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `jurisdiction_policies_pkey` | PK | `jurisdiction_policy_id uuid` default `uuidv7()` | Duplicate / missing policy revision | `packages/policy-gates/src/__tests__/kill-switch.test.ts` (F06 T020/T023) |
| `jurisdiction_policies_status_check` | CHECK | `status IN ('allowed','unsupported','disabled','review_required','retired')` | Unsupported posture drift | `packages/policy-gates/src/__tests__/evaluator.test.ts` (F06 T012/T015) |
| `jurisdiction_policies_jurisdiction_code_check` | CHECK | `jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'` | Ambiguous or free-form jurisdiction codes | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_policies_policy_version_check` | CHECK | `policy_version <> ''` | Unversioned policy posture | `packages/policy-gates/src/__tests__/review.test.ts` (F06 T033/T035) |
| `jurisdiction_policies_effective_window_check` | CHECK | `effective_until IS NULL OR effective_until > effective_from` | Empty / inverted policy windows | `packages/policy-gates/src/__tests__/review.test.ts` |
| `jurisdiction_policies_operational_reason_check` | CHECK | `operational_reason <> ''` | Posture changes without operator rationale | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_policies_active_unique_idx` | PARTIAL_UNIQUE | `UNIQUE (jurisdiction_code) WHERE effective_until IS NULL` | Multiple active posture rows for one jurisdiction | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_policies_effective_idx` | INDEX | `(jurisdiction_code, effective_from DESC)` | (perf) active posture lookup | — |
| `jurisdiction_policies_created_by_fk` | FK | `created_by_principal_id → principals.principal_id` | Policy rows without attributable creator | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_policies_reviewer_fk` | FK | `reviewer_principal_id → principals.principal_id` (nullable) | Review metadata pointing at missing principals | `packages/policy-gates/src/__tests__/review.test.ts` |

---

## jurisdiction_gate_decisions
File: [`packages/db/src/schema/jurisdiction-policy.ts`](../../packages/db/src/schema/jurisdiction-policy.ts) ·
Migration: [`0007_f06_jurisdiction_policy_gates.sql`](../../packages/db/migrations/0007_f06_jurisdiction_policy_gates.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `jurisdiction_gate_decisions_pkey` | PK | `gate_decision_id uuid` default `uuidv7()` | Duplicate / missing gate decision | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_subject_kind_check` | CHECK | `subject_kind IN ('seeker_ticket','employer_req_ticket','match_ticket','run_dispatch')` | Gate evidence for unsupported subjects | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_decision_check` | CHECK | `decision IN ('allow','deny')` | Ambiguous gate outcomes | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_reason_code_check` | CHECK | `reason_code IN ('all_allowed','missing_jurisdiction','unknown_jurisdiction','unsupported_jurisdiction','disabled_jurisdiction','review_required','expired_policy','conflicting_jurisdictions','unauthorized')` | Non-machine-readable gate denial reasons | `packages/policy-gates/src/__tests__/failure-artifact.test.ts` (F06 T027/T029) |
| `jurisdiction_gate_decisions_allow_reason_check` | CHECK | `decision <> 'allow' OR reason_code = 'all_allowed'` | Allowed decisions carrying denial reasons | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_deny_reason_check` | CHECK | `decision <> 'deny' OR reason_code <> 'all_allowed'` | Denied decisions marked allowed | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_jurisdictions_nonempty` | CHECK | `jsonb_typeof(jurisdiction_codes) = 'array' AND jsonb_array_length(jurisdiction_codes) >= 1` | Decisions with no jurisdiction evidence | `packages/policy-gates/src/__tests__/evaluator.test.ts` |
| `jurisdiction_gate_decisions_policy_revision_ids_array` | CHECK | `jsonb_typeof(policy_revision_ids) = 'array'` | Non-array policy-revision evidence | `packages/policy-gates/src/__tests__/decision-audit.test.ts` (F06 T013/T016) |
| `jurisdiction_gate_decisions_correlation_idx` | INDEX | `(correlation_id, created_at DESC)` | (perf) workflow evidence reconstruction | — |
| `jurisdiction_gate_decisions_subject_idx` | INDEX | `(subject_kind, subject_id, created_at DESC)` | (perf) subject decision history | `packages/policy-gates/src/__tests__/review.test.ts` |
| `jurisdiction_gate_decisions_jurisdictions_idx` | INDEX | `USING GIN (jurisdiction_codes)` | (perf) jurisdiction-scoped history review | — |
| `jurisdiction_gate_decisions_principal_idx` | PARTIAL | `(principal_id, created_at DESC) WHERE principal_id IS NOT NULL` | (perf) scoped principal review | — |
| `jurisdiction_gate_decisions_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Reusing one audit event for multiple gate decisions | `packages/policy-gates/src/__tests__/decision-audit.test.ts` |
| `jurisdiction_gate_decisions_principal_fk` | FK | `principal_id → principals.principal_id` (nullable) | Decision attribution pointing at missing principals | `packages/policy-gates/src/__tests__/decision-audit.test.ts` |
| `jurisdiction_gate_decisions_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` | Gate decision without canonical audit evidence | `packages/policy-gates/src/__tests__/decision-audit.test.ts` |

---

## jurisdiction_kill_switch_events
File: [`packages/db/src/schema/jurisdiction-policy.ts`](../../packages/db/src/schema/jurisdiction-policy.ts) ·
Migration: [`0007_f06_jurisdiction_policy_gates.sql`](../../packages/db/migrations/0007_f06_jurisdiction_policy_gates.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `jurisdiction_kill_switch_events_pkey` | PK | `kill_switch_event_id uuid` default `uuidv7()` | Duplicate / missing kill-switch evidence row | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_jurisdiction_code_check` | CHECK | `jurisdiction_code ~ '^[A-Z]{2}(-[A-Z0-9]{1,3})?$'` | Ambiguous or free-form switch targets | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_from_status_check` | CHECK | `from_status IN ('allowed','unsupported','disabled','review_required','retired')` | Invalid previous posture evidence | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_to_status_check` | CHECK | `to_status IN ('allowed','unsupported','disabled','review_required','retired')` | Invalid new posture evidence | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_status_changed_check` | CHECK | `from_status <> to_status` | No-op switch events polluting audit history | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_reason_code_check` | CHECK | `reason_code IN ('new_regulation','counsel_directive','incident_response','bias_audit_gap','launch_posture','manual_reenable')` | Non-machine-readable switch reasons | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_jurisdiction_idx` | INDEX | `(jurisdiction_code, created_at DESC)` | (perf) jurisdiction switch history | `packages/policy-gates/src/__tests__/review.test.ts` |
| `jurisdiction_kill_switch_events_operator_idx` | INDEX | `(operator_principal_id, created_at DESC)` | (perf) operator action review | — |
| `jurisdiction_kill_switch_events_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Reusing one audit event for multiple switch actions | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_operator_fk` | FK | `operator_principal_id → principals.principal_id` | Switch events without attributable operator | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |
| `jurisdiction_kill_switch_events_reviewer_fk` | FK | `reviewer_principal_id → principals.principal_id` (nullable) | Review metadata pointing at missing principals | `packages/policy-gates/src/__tests__/review.test.ts` |
| `jurisdiction_kill_switch_events_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` | Switch event without canonical audit evidence | `packages/policy-gates/src/__tests__/kill-switch.test.ts` |

---

## agent_contract_versions
File: [`packages/db/src/schema/agent-contracts.ts`](../../packages/db/src/schema/agent-contracts.ts) ·
Migration: [`0008_f07a_agent_contract_registry.sql`](../../packages/db/migrations/0008_f07a_agent_contract_registry.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `agent_contract_versions_pkey` | PK | `agent_contract_version_id uuid` default `uuidv7()` | Duplicate / missing contract version | `packages/agent-contracts/src/__tests__/publish.test.ts` (F07a T012/T014) |
| `agent_contract_versions_contract_id_check` | CHECK | `contract_id <> ''` | Empty contract ids | `packages/agent-contracts/src/__tests__/publish.test.ts` |
| `agent_contract_versions_version_check` | CHECK | `version <> ''` | Empty contract versions | `packages/agent-contracts/src/__tests__/publish.test.ts` |
| `agent_contract_versions_side_check` | CHECK | `side IN ('seeker','employer')` | Invalid agent side drift | `packages/agent-contracts/src/__tests__/resolver.test.ts` |
| `agent_contract_versions_status_check` | CHECK | `status IN ('draft','published','deprecated','retired')` | Invalid publication status drift | `packages/agent-contracts/src/__tests__/review.test.ts` |
| `agent_contract_versions_content_hash_check` | CHECK | `content_hash <> ''` | Contract rows without immutable material hash | `packages/agent-contracts/src/__tests__/publish.test.ts` |
| `agent_contract_versions_description_check` | CHECK | `description <> ''` | Unexplained contract release | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_versions_published_shape_check` | CHECK | `published` rows require reviewer, published_at, and audit_event_id | Published contracts without provenance/evidence | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_versions_deprecated_shape_check` | CHECK | `deprecated` rows require deprecated_after | Deprecated contracts without dispatch cutoff | `packages/agent-contracts/src/__tests__/resolver.test.ts` |
| `agent_contract_versions_ref_unique_idx` | UNIQUE | `UNIQUE (contract_id, version)` | Mutable or ambiguous contract refs | `packages/agent-contracts/src/__tests__/publish.test.ts` |
| `agent_contract_versions_audit_event_idx` | PARTIAL_UNIQUE | `UNIQUE (audit_event_id) WHERE audit_event_id IS NOT NULL` | Reusing publication audit events | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_versions_side_status_idx` | INDEX | `(side, status, created_at DESC)` | (perf) review listing by side/status | — |
| `agent_contract_versions_author_fk` | FK | `author_principal_id → principals.principal_id` | Contract rows without attributable author | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_versions_reviewer_fk` | FK | `reviewer_principal_id → principals.principal_id` (nullable) | Review metadata pointing at missing principals | `packages/agent-contracts/src/__tests__/review.test.ts` |
| `agent_contract_versions_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` (nullable) | Published/deprecated versions without canonical audit evidence | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |

---

## agent_contract_events
File: [`packages/db/src/schema/agent-contracts.ts`](../../packages/db/src/schema/agent-contracts.ts) ·
Migration: [`0008_f07a_agent_contract_registry.sql`](../../packages/db/migrations/0008_f07a_agent_contract_registry.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `agent_contract_events_pkey` | PK | `agent_contract_event_id uuid` default `uuidv7()` | Duplicate / missing contract event | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_event_type_check` | CHECK | `event_type IN ('published','deprecated')` | Ambiguous contract event kind | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_reason_code_check` | CHECK | closed-list publication/deprecation reasons | Non-machine-readable contract release reasons | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_correlation_id_check` | CHECK | `correlation_id <> ''` | Events without workflow correlation | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_contract_idx` | INDEX | `(agent_contract_version_id, created_at DESC)` | (perf) contract event history review | `packages/agent-contracts/src/__tests__/review.test.ts` |
| `agent_contract_events_actor_idx` | INDEX | `(principal_id, created_at DESC)` | (perf) actor-scoped review | — |
| `agent_contract_events_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Reusing one audit event for multiple contract events | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_contract_fk` | FK | `agent_contract_version_id → agent_contract_versions.agent_contract_version_id` | Events pointing at missing contract versions | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_principal_fk` | FK | `principal_id → principals.principal_id` | Contract events without attributable actor | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |
| `agent_contract_events_reviewer_fk` | FK | `reviewer_principal_id → principals.principal_id` (nullable) | Reviewer metadata pointing at missing principals | `packages/agent-contracts/src/__tests__/review.test.ts` |
| `agent_contract_events_audit_event_fk` | FK | `audit_event_id → audit_log_events.audit_event_id` | Contract event without canonical audit evidence | `packages/agent-contracts/src/__tests__/publication-audit.test.ts` |

---

## rubric_versions
File: [`packages/db/src/schema/rubrics.ts`](../../packages/db/src/schema/rubrics.ts) ·
Migration: [`0009_f07b_rubric_registry_bias_gate.sql`](../../packages/db/migrations/0009_f07b_rubric_registry_bias_gate.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `rubric_versions_pkey` | PK | `rubric_version_id uuid` default `uuidv7()` | Duplicate / missing rubric version | `packages/rubrics/src/__tests__/publish.test.ts` |
| `rubric_versions_rubric_id_check` | CHECK | `rubric_id <> ''` | Empty rubric ids | `packages/rubrics/src/__tests__/publish.test.ts` |
| `rubric_versions_version_check` | CHECK | `version <> ''` | Empty rubric versions | `packages/rubrics/src/__tests__/publish.test.ts` |
| `rubric_versions_side_check` | CHECK | `side IN ('seeker','employer','both')` | Invalid rubric side drift | `packages/rubrics/src/__tests__/resolver.test.ts` |
| `rubric_versions_status_check` | CHECK | `status IN ('draft','published','deprecated','retired')` | Invalid publication status drift | `packages/rubrics/src/__tests__/resolver.test.ts` |
| `rubric_versions_dimensions_check` | CHECK | dimensions array is non-empty | Rubrics without scored dimensions | `packages/rubrics/src/__tests__/scoring.test.ts` |
| `rubric_versions_published_shape_check` | CHECK | `published` rows require reviewer, published_at, audit_event_id, and bias_test_ref | Production rubric without provenance or bias evidence | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |
| `rubric_versions_ref_unique_idx` | UNIQUE | `UNIQUE (rubric_id, version)` | Mutable or ambiguous rubric refs | `packages/rubrics/src/__tests__/publish.test.ts` |

## bias_test_artifacts
File: [`packages/db/src/schema/rubrics.ts`](../../packages/db/src/schema/rubrics.ts) ·
Migration: [`0009_f07b_rubric_registry_bias_gate.sql`](../../packages/db/migrations/0009_f07b_rubric_registry_bias_gate.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `bias_test_artifacts_pkey` | PK | `bias_test_artifact_id uuid` default `uuidv7()` | Duplicate / missing bias artifact | `packages/rubrics/src/__tests__/bias-test.test.ts` |
| `bias_test_artifacts_status_check` | CHECK | closed-list artifact statuses | Non-machine-readable artifact state | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |
| `bias_test_artifacts_completed_shape_check` | CHECK | completed artifacts require reviewer, completed_at, artifact_uri, and audit_event_id | Completed artifact without evidence | `packages/rubrics/src/__tests__/bias-test.test.ts` |
| `bias_test_artifacts_rubric_idx` | INDEX | `(rubric_id, rubric_version)` | (perf) artifact lookup by rubric ref | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |

## rubric_events
File: [`packages/db/src/schema/rubrics.ts`](../../packages/db/src/schema/rubrics.ts) ·
Migration: [`0009_f07b_rubric_registry_bias_gate.sql`](../../packages/db/migrations/0009_f07b_rubric_registry_bias_gate.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `rubric_events_pkey` | PK | `rubric_event_id uuid` default `uuidv7()` | Duplicate / missing rubric event | `packages/rubrics/src/__tests__/publish.test.ts` |
| `rubric_events_reason_code_check` | CHECK | closed-list publication/deprecation reasons | Non-machine-readable rubric release reason | `packages/rubrics/src/__tests__/publish.test.ts` |
| `rubric_events_audit_event_idx` | UNIQUE | `UNIQUE (audit_event_id)` | Reusing one audit event for multiple rubric events | `packages/rubrics/src/__tests__/publish.test.ts` |

## rubric_dispatch_gate_events
File: [`packages/db/src/schema/rubrics.ts`](../../packages/db/src/schema/rubrics.ts) ·
Migration: [`0009_f07b_rubric_registry_bias_gate.sql`](../../packages/db/migrations/0009_f07b_rubric_registry_bias_gate.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `rubric_dispatch_gate_events_pkey` | PK | `gate_event_id uuid` default `uuidv7()` | Duplicate / missing gate event | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |
| `rubric_dispatch_gate_events_decision_check` | CHECK | `decision IN ('allow','deny')` | Ambiguous dispatch gate state | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |
| `rubric_dispatch_gate_events_reason_code_check` | CHECK | closed-list gate reason codes | Non-machine-readable dispatch refusal | `packages/rubrics/src/__tests__/dispatch-gate.test.ts` |
| `rubric_dispatch_gate_events_ref_idx` | INDEX | `(rubric_id, rubric_version, created_at DESC)` | (perf) review listing by rubric ref | `packages/rubrics/src/__tests__/review.test.ts` |

## tool_descriptor_versions
File: [`packages/db/src/schema/tool-surfaces.ts`](../../packages/db/src/schema/tool-surfaces.ts) ·
Migration: [`0010_f08_5_tool_surface_dispatcher.sql`](../../packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `tool_descriptor_versions_pkey` | PK | `tool_descriptor_id uuid` default `uuidv7()` | Duplicate / missing descriptor version | `packages/tool-dispatcher/src/__tests__/publish.test.ts` |
| `tool_descriptor_versions_ref_unique_idx` | UNIQUE | `UNIQUE (name, version)` | Mutable or ambiguous descriptor refs | `packages/tool-dispatcher/src/__tests__/publish.test.ts` |
| `tool_descriptor_versions_disclosure_check` | CHECK | closed-list disclosure classes | Unroutable tool outputs | `packages/tool-dispatcher/src/__tests__/disclosure.test.ts` |

## tool_surface_versions
File: [`packages/db/src/schema/tool-surfaces.ts`](../../packages/db/src/schema/tool-surfaces.ts) ·
Migration: [`0010_f08_5_tool_surface_dispatcher.sql`](../../packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `tool_surface_versions_pkey` | PK | `tool_surface_version_id uuid` default `uuidv7()` | Duplicate / missing surface version | `packages/tool-dispatcher/src/__tests__/resolver.test.ts` |
| `tool_surface_versions_ref_unique_idx` | UNIQUE | `UNIQUE (surface_id, version)` | Catalog drift for pinned contracts | `packages/tool-dispatcher/src/__tests__/publish.test.ts` |
| `tool_surface_versions_descriptors_check` | CHECK | descriptor refs array is non-empty | Empty advertised tool surface | `packages/tool-dispatcher/src/__tests__/resolver.test.ts` |

## tool_dispatch_events
File: [`packages/db/src/schema/tool-surfaces.ts`](../../packages/db/src/schema/tool-surfaces.ts) ·
Migration: [`0010_f08_5_tool_surface_dispatcher.sql`](../../packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `tool_dispatch_events_pkey` | PK | `tool_dispatch_event_id uuid` default `uuidv7()` | Duplicate / missing dispatch event | `packages/tool-dispatcher/src/__tests__/dispatcher.test.ts` |
| `tool_dispatch_events_status_check` | CHECK | closed-list dispatch statuses | Ambiguous tool outcome state | `packages/tool-dispatcher/src/__tests__/unsupported-tool.test.ts` |
| `tool_dispatch_events_run_idx` | INDEX | `(run_id, created_at DESC)` | (perf) review listing by run | `packages/tool-dispatcher/src/__tests__/review.test.ts` |

## disclosure_routing_evidence
File: [`packages/db/src/schema/tool-surfaces.ts`](../../packages/db/src/schema/tool-surfaces.ts) ·
Migration: [`0010_f08_5_tool_surface_dispatcher.sql`](../../packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `disclosure_routing_evidence_pkey` | PK | `routing_id uuid` default `uuidv7()` | Duplicate / missing routing evidence | `packages/tool-dispatcher/src/__tests__/privacy-boundary.test.ts` |
| `disclosure_routing_evidence_dispatch_event_id_fk` | FK | dispatch event must exist | Orphaned disclosure routing evidence | `packages/tool-dispatcher/src/__tests__/disclosure.test.ts` |

## dispatcher_bypass_findings
File: [`packages/db/src/schema/tool-surfaces.ts`](../../packages/db/src/schema/tool-surfaces.ts) ·
Migration: [`0010_f08_5_tool_surface_dispatcher.sql`](../../packages/db/migrations/0010_f08_5_tool_surface_dispatcher.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `dispatcher_bypass_findings_pkey` | PK | `finding_id uuid` default `uuidv7()` | Duplicate / missing bypass finding | `packages/tool-dispatcher/src/__tests__/import-boundary.test.ts` |
| `dispatcher_bypass_findings_audit_event_id_fk` | FK | audit ref, when present, must exist | Unattributable bypass evidence | `packages/tool-dispatcher/src/__tests__/review-auth.test.ts` |

## privacy_ruleset_versions
File: [`packages/db/src/schema/privacy-filter.ts`](../../packages/db/src/schema/privacy-filter.ts) ·
Migration: [`0011_f09_privacy_filter.sql`](../../packages/db/migrations/0011_f09_privacy_filter.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `privacy_ruleset_versions_pkey` | PK | `privacy_ruleset_version_id uuid` default `uuidv7()` | Duplicate / missing privacy ruleset version | `packages/privacy-filter/src/__tests__/publish.test.ts` |
| `privacy_ruleset_versions_ref_unique_idx` | UNIQUE | `UNIQUE (ruleset_id, version)` | Mutable or ambiguous privacy ruleset refs | `packages/privacy-filter/src/__tests__/publish.test.ts` |
| `privacy_ruleset_versions_audience_check` | CHECK | `audience IN ('seeker','employer','platform')` | Invalid audience drift | `packages/privacy-filter/src/__tests__/filter.test.ts` |
| `privacy_ruleset_versions_status_check` | CHECK | `status IN ('draft','published','deprecated')` | Invalid publication status drift | `packages/privacy-filter/src/__tests__/publish.test.ts` |
| `privacy_ruleset_versions_stages_check` | CHECK | disclosure stages array is non-empty | Rulesets without active disclosure stages | `packages/privacy-filter/src/__tests__/publish.test.ts` |

## privacy_filter_decisions
File: [`packages/db/src/schema/privacy-filter.ts`](../../packages/db/src/schema/privacy-filter.ts) ·
Migration: [`0011_f09_privacy_filter.sql`](../../packages/db/migrations/0011_f09_privacy_filter.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `privacy_filter_decisions_pkey` | PK | `filter_decision_id uuid` default `uuidv7()` | Duplicate / missing filter decision | `packages/privacy-filter/src/__tests__/filter.test.ts` |
| `privacy_filter_decisions_decision_check` | CHECK | `decision IN ('allow','redact','refuse')` | Ambiguous privacy filter outcome | `packages/privacy-filter/src/__tests__/filter.test.ts` |
| `privacy_filter_decisions_run_idx` | INDEX | `(run_id, created_at DESC)` | (perf) review listing by run | `packages/privacy-filter/src/__tests__/review.test.ts` |
| `privacy_filter_decisions_reason_idx` | INDEX | `(reason_code, created_at DESC)` | (perf) reason-code review | — |

## sentinel_failures
File: [`packages/db/src/schema/privacy-filter.ts`](../../packages/db/src/schema/privacy-filter.ts) ·
Migration: [`0011_f09_privacy_filter.sql`](../../packages/db/migrations/0011_f09_privacy_filter.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `sentinel_failures_pkey` | PK | `sentinel_failure_id uuid` default `uuidv7()` | Duplicate / missing sentinel failure evidence | `packages/privacy-filter/src/__tests__/sentinel.test.ts` |
| `sentinel_failures_input_class_check` | CHECK | closed-list untrusted input classes | Unsupported prompt-construction input class | `packages/privacy-filter/src/__tests__/sentinel.test.ts` |
| `sentinel_failures_run_idx` | INDEX | `(run_id, created_at DESC)` | (perf) review listing by run | `packages/privacy-filter/src/__tests__/review.test.ts` |

## counterparty_access_findings
File: [`packages/db/src/schema/privacy-filter.ts`](../../packages/db/src/schema/privacy-filter.ts) ·
Migration: [`0011_f09_privacy_filter.sql`](../../packages/db/migrations/0011_f09_privacy_filter.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `counterparty_access_findings_pkey` | PK | `finding_id uuid` default `uuidv7()` | Duplicate / missing access-boundary finding | `packages/privacy-filter/src/__tests__/access-boundary.test.ts` |
| `counterparty_access_findings_status_check` | CHECK | `status IN ('open','resolved','expected_fixture')` | Ambiguous access-boundary finding state | `packages/privacy-filter/src/__tests__/access-boundary.test.ts` |
| `counterparty_access_findings_status_idx` | INDEX | `(status, created_at DESC)` | (perf) finding review by status | `packages/privacy-filter/src/__tests__/review.test.ts` |

## dossier_artifacts
File: [`packages/db/src/schema/dossiers.ts`](../../packages/db/src/schema/dossiers.ts) ·
Migration: [`0012_f10_dossier_builder_signer.sql`](../../packages/db/migrations/0012_f10_dossier_builder_signer.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `dossier_artifacts_pkey` | PK | `dossier_id uuid` default `uuidv7()` | Duplicate / missing dossier artifact | `packages/dossiers/src/__tests__/build.test.ts` |
| `dossier_artifacts_run_unique_idx` | UNIQUE | `UNIQUE (run_id)` | Multiple terminal dossiers for one run | `packages/dossiers/src/__tests__/build.test.ts` |
| `dossier_artifacts_status_check` | CHECK | `status IN ('conclusive','inconclusive')` | Ambiguous dossier terminal state | `packages/dossiers/src/__tests__/projection-gate.test.ts` |
| `dossier_artifacts_hash_check` | CHECK | `content_hash <> ''` | Dossier without canonical content hash | `packages/dossiers/src/__tests__/canonicalize.test.ts` |

## dossier_projections
File: [`packages/db/src/schema/dossiers.ts`](../../packages/db/src/schema/dossiers.ts) ·
Migration: [`0012_f10_dossier_builder_signer.sql`](../../packages/db/migrations/0012_f10_dossier_builder_signer.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `dossier_projections_pkey` | PK | `projection_id uuid` default `uuidv7()` | Duplicate / missing projection | `packages/dossiers/src/__tests__/projections.test.ts` |
| `dossier_projections_dossier_audience_idx` | UNIQUE | `UNIQUE (dossier_id, audience)` | Multiple conflicting projections for one audience | `packages/dossiers/src/__tests__/projections.test.ts` |
| `dossier_projections_audience_check` | CHECK | closed-list dossier audiences | Delivery-time audience drift | `packages/dossiers/src/__tests__/projection-gate.test.ts` |

## dossier_signatures
File: [`packages/db/src/schema/dossiers.ts`](../../packages/db/src/schema/dossiers.ts) ·
Migration: [`0012_f10_dossier_builder_signer.sql`](../../packages/db/migrations/0012_f10_dossier_builder_signer.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `dossier_signatures_pkey` | PK | `signature_id uuid` default `uuidv7()` | Duplicate / missing signature | `packages/dossiers/src/__tests__/signing.test.ts` |
| `dossier_signatures_dossier_idx` | UNIQUE | `UNIQUE (dossier_id)` | Multiple active signatures for one dossier | `packages/dossiers/src/__tests__/signing.test.ts` |
| `dossier_signatures_algorithm_check` | CHECK | `algorithm IN ('Ed25519')` | Unsupported signature algorithm drift | `packages/dossiers/src/__tests__/verify.test.ts` |

## dossier_verification_events
File: [`packages/db/src/schema/dossiers.ts`](../../packages/db/src/schema/dossiers.ts) ·
Migration: [`0012_f10_dossier_builder_signer.sql`](../../packages/db/migrations/0012_f10_dossier_builder_signer.sql)

| Invariant | Kind | Rule | Prevents | Test |
|---|---|---|---|---|
| `dossier_verification_events_pkey` | PK | `verification_id uuid` default `uuidv7()` | Duplicate / missing verification evidence | `packages/dossiers/src/__tests__/verify.test.ts` |
| `dossier_verification_events_decision_check` | CHECK | `decision IN ('valid','invalid')` | Ambiguous verification outcome | `packages/dossiers/src/__tests__/verify.test.ts` |
| `dossier_verification_events_reason_code_check` | CHECK | closed-list verification reasons | Non-machine-readable verification failure | `packages/dossiers/src/__tests__/verify.test.ts` |

---

## Changelog

- **v1.7 (2026-05-20)** — F09 T008 amendment. Added invariants
  for privacy ruleset versions, privacy filter decisions, sentinel
  failures, and counterparty access findings.
- **v1.8 (2026-05-20)** — F10 T008 amendment. Added invariants
  for dossier artifacts, projections, signatures, and verification
  events.
- **v1.6 (2026-05-20)** — F08.5 T008 amendment. Added invariants
  for tool descriptor versions, tool surface versions, dispatch events,
  disclosure routing evidence, and dispatcher bypass findings.
- **v1.5 (2026-05-20)** — F07b T008 amendment. Added invariants
  for rubric versions, bias-test artifacts, rubric events, and dispatch
  gate events.
- **v1.4 (2026-05-20)** — F07a T005 amendment. Added 22 invariants
  for `agent_contract_versions` and `agent_contract_events`.
- **v1.0 (2026-05-12)** — Authored under F03 T010–T013. 47 invariants
  catalogued across 8 F02 tables. Test cross-references point at F02
  unit-test files; where no direct unit test exists (perf indexes,
  audit-buffer invariants), the protection rationale is named instead.
- **v1.1 (2026-05-12)** — F04 T003 amendment. Added 3 new table
  sections (seeker_tickets / employer_req_tickets / match_tickets)
  with 38 new invariants. Test refs point at `packages/tickets/`
  test files (RED until F04 B3/B5 land). Total invariants:
  47 + 38 = 85.
- **v1.2 (2026-05-19)** — F05 T003 amendment. Added planned
  invariant sections for `audit_log_events`, `transcript_turns`,
  `tombstone_records`, and `evidence_exports`: 34 new CHECK/UNIQUE/FK
  and index rules covering hash-chain uniqueness, source replay
  uniqueness, transcript idempotency, tombstone uniqueness, and
  evidence-export attribution. Total invariants: 85 + 34 = 119.
- **v1.3 (2026-05-20)** — F06 T005 amendment. Added planned
  invariant sections for `jurisdiction_policies`,
  `jurisdiction_gate_decisions`, and `jurisdiction_kill_switch_events`:
  37 new CHECK/UNIQUE/FK and index rules covering jurisdiction posture,
  fail-safe gate evidence, scoped kill-switch evidence, and canonical
  audit linkage. Total invariants: 119 + 37 = 156.
