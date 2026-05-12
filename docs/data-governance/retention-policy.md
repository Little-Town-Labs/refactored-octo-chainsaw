# Spyglass retention policy

**Version:** 1.0 (2026-05-12)
**Last reviewed:** 2026-05-12
**Owner:** Gary
**Counsel review:** `pending`

Per-class retention horizons for Spyglass relational data. Each class
declared in [`data-classification.yaml`](./data-classification.yaml)
has a section here declaring a horizon (human-readable + ISO-8601 or
sentinel) and a lawful basis.

Constitutional anchor: §I.4.2 (retention limits per class, never
indefinite). Transitional sentinels (`transitional:<endpoint>`) name a
concrete endpoint and are permitted; they expire when the named
endpoint lands.

**Enforcement.** F03 *declares* horizons. *Automated enforcement*
(per-class sweepers consuming this artifact) is owned by a later
feature; until those sweepers ship, F03's contribution is the policy
record this document holds. The schema-lint (FR-6) checks that every
class in the register has a section here (M-3).

---

## 1. Data classes

### 1.1 `identity_humanref`

| Field | Value |
|---|---|
| Horizon (human) | Until linked principal is tombstoned, then 30 days |
| Horizon (ISO-8601) | `tombstone-driven:identity_principal+P30D` |
| Lawful basis | GDPR Art. 5(1)(e) storage limitation, cascaded from Art. 17 right-to-erasure obligation on the linked principal |
| Erasure mode | `tombstone` (see [§2 Tombstone procedure](#2-tombstone-procedure-pending-f05)) |
| Notes | The 30-day grace covers in-flight audit reconciliation; pre-grace tombstones are valid but should reference an active erasure ticket |

### 1.2 `identity_principal`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after principal is disabled or tombstoned |
| Horizon (ISO-8601) | `disabled-driven:principals.disabled_at+P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) audit-retention obligation joined with platform accountability (Constitution §I.5.3); NYC LL 144 §5-301 7-year audit floor |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-pending-f05)) |
| Notes | Structural id is retained so audit chains referencing the principal remain joinable. Identity_humanref columns on the same row are tombstoned per §1.1's shorter horizon |

### 1.3 `operational_credential`

| Field | Value |
|---|---|
| Horizon (human) | 90 days after `expires_at` |
| Horizon (ISO-8601) | `expires_at+P90D` |
| Lawful basis | GDPR Art. 6(1)(f) legitimate interest (security forensics & rate-limit decisioning); SOC 2 CC7 monitoring |
| Erasure mode | `hard_delete` |
| Notes | Pruner job (Inngest) sweeps daily; F02 T048 already implements the `revocations` table prune. Equivalent sweep for `agent_credentials` / `service_credentials` past horizon is deferred to a later feature |

### 1.4 `operational_signing_key`

| Field | Value |
|---|---|
| Horizon (human) | Until `verify_until` elapses, then 90 days |
| Horizon (ISO-8601) | `verify_until+P90D` |
| Lawful basis | Operational requirement — credentials signed by the key must verify until they expire; GDPR Art. 6(1)(f) legitimate interest |
| Erasure mode | `hard_delete` |
| Notes | Key row drops from JWKS query once `verify_until` passes; physical row removed after the 90-day grace. F-TBD sweeper job |

### 1.5 `audit_record`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from `created_at` |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) legal obligation; NYC LL 144 §5-301 audit-retention floor; SOC 2 CC7 trail retention |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-pending-f05)) |
| Notes | Hash-chain integrity (Constitution §I.2) means rows cannot be deleted; subject erasure requests redact payload and replace with a tombstone row |
| **Special case — `audit_events_buffer`** | Transitional. See §1.5.1 |

#### 1.5.1 `audit_events_buffer` (transitional)

| Field | Value |
|---|---|
| Horizon (human) | Retained until F05 cutover, then migrated to F05's hash-chained log |
| Horizon (ISO-8601) | `transitional:f05` |
| Lawful basis | Inherits from `audit_record` |
| Erasure mode | `tombstone` (inherited) |
| Notes | F05's hash-chained log replaces this table; cutover removes this transitional entry. Per CL-3 in spec.md §8 |

### 1.6 `approval_workflow`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from `initiated_at`; `notes` column redacted on subject erasure within 30 days of request |
| Horizon (ISO-8601) | `P7Y` for row; `redact:notes:P30D` on erasure request |
| Lawful basis | GDPR Art. 6(1)(c) accountability obligation (Constitution §I.5.3); operator-action audit retention |
| Erasure mode | `redact_in_place` |
| Notes | Row metadata (who/when/reason_code) retained for the 7-year accountability horizon; free-text `notes` redacted on subject erasure per the F02 T069/MEDIUM-3 redaction pattern. Pruner job F-TBD |

---

## 2. Tombstone procedure (pending F05)

**Placeholder per NFR-6.** Columns whose erasure mode is `tombstone`
will route through the hash-chained audit log + tombstone procedure
shipped by F05. Until F05 lands:

- **Credential-bearing tables** (agent_credentials, service_credentials,
  revocations, signing_keys): follow the runbook at
  [`docs/security/credential-lifecycle.md`](../security/credential-lifecycle.md)
  (shipped by F02 B7).
- **Audit + identity tables**: operators escalate to the owner of
  this policy (Gary) for manual procedure. No erasure requests against
  these tables have been received in Phase 0; the procedure
  formalization is gated on F05 closing.

When F05 closes, this section is replaced with the canonical
tombstone-procedure link, and §1.1, §1.2, §1.5 links update to point
at the F05 procedure.

---

## 3. Coverage table

Cross-check: every `data_classes[].id` in
[`data-classification.yaml`](./data-classification.yaml) MUST appear
in §1 above. (M-3 mechanical check.)

| Class id (register) | Section (this doc) | Horizon | Erasure |
|---|---|---|---|
| `identity_humanref` | §1.1 | `tombstone-driven:identity_principal+P30D` | tombstone |
| `identity_principal` | §1.2 | `disabled-driven:principals.disabled_at+P7Y` | tombstone |
| `operational_credential` | §1.3 | `expires_at+P90D` | hard_delete |
| `operational_signing_key` | §1.4 | `verify_until+P90D` | hard_delete |
| `audit_record` | §1.5 | `P7Y` (buffer: `transitional:f05`) | tombstone |
| `approval_workflow` | §1.6 | `P7Y` (notes: `redact:notes:P30D`) | redact_in_place |

**6 classes declared · 6 classes covered · M-3 ✅**

---

## 4. Changelog

- **v1.0 (2026-05-12)** — Initial declaration. Authored under F03
  T007/T008. Counsel review pending; horizons reflect
  engineer-best-judgment against Constitution §I.4.2 + cited
  regulatory minima. Counsel revision may amend horizons in §1
  without changing the structure of this document.
