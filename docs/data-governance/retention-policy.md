# Spyglass retention policy

**Version:** 1.1 (2026-05-19)
**Last reviewed:** 2026-05-19
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
| Erasure mode | `tombstone` (see [§2 Tombstone procedure](#2-tombstone-procedure-f05)) |
| Notes | The 30-day grace covers in-flight audit reconciliation; pre-grace tombstones are valid but should reference an active erasure ticket |

### 1.2 `identity_principal`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after principal is disabled or tombstoned |
| Horizon (ISO-8601) | `disabled-driven:principals.disabled_at+P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) audit-retention obligation joined with platform accountability (Constitution §I.5.3); NYC LL 144 §5-301 7-year audit floor |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
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
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Hash-chain integrity (Constitution §I.2) means rows cannot be deleted; subject erasure requests redact payload and replace with a tombstone row |
| **Special case — `audit_events_buffer`** | Transitional. See §1.5.1 |

#### 1.5.1 `audit_events_buffer` (transitional)

| Field | Value |
|---|---|
| Horizon (human) | Retained until F05 canonical replay and cutover complete, then migrated to `audit_log_events` or archived read-only until removal |
| Horizon (ISO-8601) | `transitional:f05` |
| Lawful basis | Inherits from `audit_record` |
| Erasure mode | `tombstone` (inherited) |
| Notes | F05 replay writes one canonical event per buffered source row using `(source_table, source_event_id)` for exact-once cutover. After replay back-checks pass, new audit writes go to `audit_log_events`; this transitional entry expires when the buffer is read-only or removed. Per CL-3 in spec.md §8 |

### 1.7 `ticket_intent`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after `disabled_at` |
| Horizon (ISO-8601) | `disabled_at+P7Y` |
| Lawful basis | GDPR Art. 6(1)(b) performance of contract; audit-retention obligation under §I.5.3; NYC LL 144 §5-301 audit-retention floor where applicable to the employer side |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Tombstones the personal-data linkage (principal_id, identifier) but retains structural metadata for bias-audit re-derivation (Constitution §I.2 + NIST AI RMF Measure 2.11). F-TBD per-class sweeper executes the tombstone after the horizon |

### 1.8 `ticket_match`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after terminal-state entry (`accepted` / `rejected` / `expired`) |
| Horizon (ISO-8601) | `terminal-state-driven:match_tickets.state+P7Y` |
| Lawful basis | GDPR Art. 6(1)(b) performance of contract; row-level audit retention under §I.5.3; NIST AI RMF Measure 2.11 (bias-audit-readiness retains rubric refs even after subject erasure) |
| Erasure mode | `tombstone` |
| Notes | Personal-data linkages (seeker_ticket_id, employer_req_ticket_id) tombstoned with the source tickets; match-row metadata (round, attempt, contract refs, decision_locus_jurisdiction) retained for audit reconstruction |

### 1.6 `approval_workflow`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from `initiated_at`; `notes` column redacted on subject erasure within 30 days of request |
| Horizon (ISO-8601) | `P7Y` for row; `redact:notes:P30D` on erasure request |
| Lawful basis | GDPR Art. 6(1)(c) accountability obligation (Constitution §I.5.3); operator-action audit retention |
| Erasure mode | `redact_in_place` |
| Notes | Row metadata (who/when/reason_code) retained for the 7-year accountability horizon; free-text `notes` redacted on subject erasure per the F02 T069/MEDIUM-3 redaction pattern. Pruner job F-TBD |

### 1.9 `transcript_record`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after the related match reaches a terminal state or the transcript run completes, whichever retention trigger is later |
| Horizon (ISO-8601) | `terminal-state-driven:match_tickets.state+P7Y` |
| Lawful basis | GDPR Art. 6(1)(b) performance of contract; audit-retention obligation under §I.5.3; NIST AI RMF Measure 2.11 bias-audit reconstruction |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Raw turn content and tool-call references are tombstoned on subject erasure; content hashes, contract refs, rubric refs, model refs, and append metadata remain for audit reconstruction |

### 1.10 `tombstone_evidence`

| Field | Value |
|---|---|
| Horizon (human) | Same horizon as the target canonical record, with a 7-year minimum from tombstone execution |
| Horizon (ISO-8601) | `target-record-horizon:min-P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) accountability obligation; GDPR Art. 17 erasure evidence; NYC LL 144 §5-301 audit-retention floor where the target relates to employment decisions |
| Erasure mode | `hard_delete` after target horizon and counsel-approved evidence-retention review |
| Notes | Tombstone evidence stores hashes, opaque subject references, lawful basis, procedure version, and operator attribution. It MUST NOT store raw personal data. Operational deletion remains counsel-review pending because deleting evidence can affect non-repudiation |

### 1.11 `evidence_export`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from `created_at`; incident exports may inherit a longer incident-retention horizon if counsel designates one |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) accountability obligation; SOC 2 CC7 forensic evidence retention; NYC LL 144 §5-301 audit-retention floor for covered employment-decision evidence |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Export manifests retain deterministic hashes and filter metadata. Any raw export artifact is outside this relational table and must follow the runbook storage location's evidence-retention controls |

### 1.12 `jurisdiction_policy`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after policy revision is retired or superseded |
| Horizon (ISO-8601) | `retired-driven:jurisdiction_policies.effective_until+P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) legal and regulatory compliance obligation; GDPR Art. 6(1)(f) legitimate interest in launch-posture enforcement |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Policy posture rows contain operator/reviewer attribution and compliance reasons. Structural jurisdiction status is retained for audit reconstruction; principal linkages can be tombstoned through the F05 procedure |

### 1.13 `jurisdiction_gate_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from gate decision, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and AEDT compliance evidence; GDPR Art. 6(1)(f) legitimate interest in forensic readiness and fail-safe workflow enforcement |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Gate evidence stores non-PII reason codes, jurisdiction codes, subject references, correlation ids, and audit-event links. Subject references may be tombstoned while decision/reason metadata remains reviewable |

### 1.14 `jurisdiction_kill_switch_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from kill-switch event, or inherited longer incident/counsel horizon if related to an incident |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) legal and regulatory compliance obligation; GDPR Art. 6(1)(f) legitimate interest in incident response, operational safety, and non-repudiation |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Kill-switch evidence is privileged operator/compliance action history. It retains jurisdiction status transitions, reason codes, and audit links; principal linkages can be tombstoned according to the F05 procedure |

### 1.15 `agent_contract_policy`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after contract version is retired or after the last run referencing it reaches terminal retention, whichever is later |
| Horizon (ISO-8601) | `max(retired-driven:agent_contract_versions.status+P7Y, referenced-run-horizon)` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and employment-decision audit obligation; GDPR Art. 6(1)(f) legitimate interest in policy-artifact provenance |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Contract definitions do not contain raw transcript content, prompt bodies, or rubric bodies. Principal linkages may be tombstoned while structural refs, hashes, and version metadata remain for audit reconstruction |

### 1.16 `agent_contract_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from event, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and compliance evidence; GDPR Art. 6(1)(f) legitimate interest in forensic readiness and non-repudiation |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Publication/deprecation evidence retains reason codes, contract refs, correlation ids, and audit links. Actor/reviewer principal links can be tombstoned through the F05 procedure |

### 1.17 `rubric_policy`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after rubric version is retired or after the last run referencing it reaches terminal retention, whichever is later |
| Horizon (ISO-8601) | `max(retired-driven:rubric_versions.status+P7Y, referenced-run-horizon)` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and AEDT audit obligation; GDPR Art. 6(1)(f) legitimate interest in preserving scoring-policy provenance |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Rubric definitions do not contain raw transcript content or prompt bodies. Structural refs, hashes, dimensions, weights, and version metadata remain for audit reconstruction |

### 1.18 `rubric_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from artifact/event, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) AEDT bias-audit and accountability evidence; GDPR Art. 6(1)(f) legitimate interest in forensic readiness |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Bias-test artifacts and rubric publication/deprecation events retain methodology refs, rubric hashes, coverage, reason codes, and audit links. Principal links can be tombstoned |

### 1.19 `rubric_dispatch_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from gate decision, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) compliance gate evidence; GDPR Art. 6(1)(f) legitimate interest in proving fail-closed dispatch behavior |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Dispatch gate evidence records non-PII reason codes and rubric/bias-test refs for compliance reconstruction |

### 1.20 `tool_surface_policy`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after tool surface version is retired or after the last run referencing it reaches terminal retention, whichever is later |
| Horizon (ISO-8601) | `max(retired-driven:tool_surface_versions.status+P7Y, referenced-run-horizon)` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and employment-decision audit obligation; GDPR Art. 6(1)(f) legitimate interest in preserving tool policy provenance |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Tool policy records contain descriptor schemas, disclosure classes, adapter refs, hashes, and version metadata, not raw tool outputs |

### 1.21 `tool_dispatch_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from dispatch event or bypass finding, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) compliance gate evidence; GDPR Art. 6(1)(f) legitimate interest in proving dispatcher-only tool behavior |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Dispatch evidence records non-PII reason codes, tool refs, surface refs, run refs, and audit links; raw sensitive payloads are not stored by default |

### 1.22 `tool_disclosure_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from routing event, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) privacy and accountability evidence; GDPR Art. 6(1)(f) legitimate interest in proving fail-closed disclosure routing |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Disclosure evidence records route decisions and privacy-filter refs without raw tool payloads by default |

### 1.23 `privacy_ruleset_policy`

| Field | Value |
|---|---|
| Horizon (human) | 7 years after privacy ruleset version is retired or after the last run referencing it reaches terminal retention, whichever is later |
| Horizon (ISO-8601) | `max(retired-driven:privacy_ruleset_versions.status+P7Y, referenced-run-horizon)` |
| Lawful basis | GDPR Art. 6(1)(c) accountability and employment-decision audit obligation; GDPR Art. 6(1)(f) legitimate interest in preserving privacy-policy provenance |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Ruleset policy records contain disclosure stages, allowed fields, deterministic rule metadata, hashes, and version metadata, not raw negotiation payloads |

### 1.24 `privacy_filter_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from filter decision or sentinel failure, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) privacy and compliance evidence; GDPR Art. 6(1)(f) legitimate interest in proving fail-closed filtering and prompt-injection containment |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Filter evidence stores reason codes, redaction counts, ruleset refs, filtered-view refs, and content hashes without raw sensitive payloads by default |

### 1.25 `privacy_boundary_evidence`

| Field | Value |
|---|---|
| Horizon (human) | 7 years from boundary finding, or inherited longer incident/counsel horizon if attached to an evidence package |
| Horizon (ISO-8601) | `P7Y` |
| Lawful basis | GDPR Art. 6(1)(c) compliance gate evidence; GDPR Art. 6(1)(f) legitimate interest in proving non-bypassable counterparty disclosure controls |
| Erasure mode | `tombstone` (see [§2](#2-tombstone-procedure-f05)) |
| Notes | Boundary evidence records source paths, forbidden access patterns, detector refs, statuses, and audit links |

---

## 2. Tombstone procedure (F05)

Columns whose erasure mode is `tombstone` route through F05's
redaction-by-tombstone procedure. The procedure is the only permitted
mutation path for canonical audit and transcript records that are
otherwise append-only.

- **Scope.** Eligible targets are canonical audit events and transcript
  turns whose class or column erasure mode is `tombstone`.
- **Required evidence.** Each execution creates a `tombstone_records`
  row with target kind/id, opaque subject reference, lawful basis,
  procedure version, operator principal, original payload/content hash,
  replacement tombstone-envelope hash, linked tombstone audit event, and
  execution timestamp.
- **Hash-chain preservation.** Canonical records replace raw payload or
  content with a versioned tombstone envelope and retain enough digest
  material for chain verification. The tombstone action itself is
  appended to `audit_log_events`.
- **Operational gate.** Code, tests, and development verification ship in
  F05. Production execution requires counsel sign-off before Phase 2/NYC
  use because procedure scope can affect legal evidence.
- **Credential-bearing tables** (`agent_credentials`,
  `service_credentials`, `revocations`, `signing_keys`) continue to
  follow the credential lifecycle runbook at
  [`docs/security/credential-lifecycle.md`](../security/credential-lifecycle.md)
  and are not routed through the canonical tombstone table.

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
| `ticket_intent` | §1.7 | `disabled_at+P7Y` | tombstone |
| `ticket_match` | §1.8 | `terminal-state-driven:match_tickets.state+P7Y` | tombstone |
| `transcript_record` | §1.9 | `terminal-state-driven:match_tickets.state+P7Y` | tombstone |
| `tombstone_evidence` | §1.10 | `target-record-horizon:min-P7Y` | hard_delete |
| `evidence_export` | §1.11 | `P7Y` | tombstone |
| `jurisdiction_policy` | §1.12 | `retired-driven:jurisdiction_policies.effective_until+P7Y` | tombstone |
| `jurisdiction_gate_evidence` | §1.13 | `P7Y` | tombstone |
| `jurisdiction_kill_switch_evidence` | §1.14 | `P7Y` | tombstone |
| `agent_contract_policy` | §1.15 | `max(retired-driven:agent_contract_versions.status+P7Y, referenced-run-horizon)` | tombstone |
| `agent_contract_evidence` | §1.16 | `P7Y` | tombstone |
| `rubric_policy` | §1.17 | `max(retired-driven:rubric_versions.status+P7Y, referenced-run-horizon)` | tombstone |
| `rubric_evidence` | §1.18 | `P7Y` | tombstone |
| `rubric_dispatch_evidence` | §1.19 | `P7Y` | tombstone |
| `tool_surface_policy` | §1.20 | `max(retired-driven:tool_surface_versions.status+P7Y, referenced-run-horizon)` | tombstone |
| `tool_dispatch_evidence` | §1.21 | `P7Y` | tombstone |
| `tool_disclosure_evidence` | §1.22 | `P7Y` | tombstone |
| `privacy_ruleset_policy` | §1.23 | `max(retired-driven:privacy_ruleset_versions.status+P7Y, referenced-run-horizon)` | tombstone |
| `privacy_filter_evidence` | §1.24 | `P7Y` | tombstone |
| `privacy_boundary_evidence` | §1.25 | `P7Y` | tombstone |

**25 classes declared · 25 classes covered · M-3 ✅**

---

## 4. Changelog

- **v1.1 (2026-05-19)** — Replaced the F03 tombstone placeholder with
  the F05 procedure, documented the audit buffer cutover path, and added
  retention coverage for `transcript_record`, `tombstone_evidence`, and
  `evidence_export`. Counsel review remains pending for operational
  execution and evidence-deletion decisions.
- **v1.2 (2026-05-20)** — Added F06 retention coverage for
  `jurisdiction_policy`, `jurisdiction_gate_evidence`, and
  `jurisdiction_kill_switch_evidence`. These classes preserve policy
  posture, gate decisions, and no-deploy kill-switch actions for
  compliance review while routing principal linkages through the F05
  tombstone procedure.
- **v1.4 (2026-05-20)** — Added F08.5 retention coverage for
  `tool_surface_policy`, `tool_dispatch_evidence`, and
  `tool_disclosure_evidence`. These classes preserve tool catalog,
  dispatcher, bypass, and disclosure-routing evidence without storing
  raw sensitive tool payloads by default.
- **v1.5 (2026-05-20)** — Added F09 retention coverage for
  `privacy_ruleset_policy`, `privacy_filter_evidence`, and
  `privacy_boundary_evidence`. These classes preserve privacy ruleset,
  filter, sentinel, and access-boundary evidence without storing raw
  sensitive payloads by default.
- **v1.0 (2026-05-12)** — Initial declaration. Authored under F03
  T007/T008. Counsel review pending; horizons reflect
  engineer-best-judgment against Constitution §I.4.2 + cited
  regulatory minima. Counsel revision may amend horizons in §1
  without changing the structure of this document.
