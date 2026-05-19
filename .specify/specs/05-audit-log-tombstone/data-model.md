# Data Model — F05 Audit Log + Transcript Store + Tombstone

## Entities

### `audit_log_events`

Canonical append-only audit event.

| Field | Purpose |
|---|---|
| `audit_event_id` | Stable canonical id |
| `source_table` / `source_event_id` | Optional replay origin, e.g. `audit_events_buffer.event_id` |
| `event_name` | Structured event name |
| `principal_id` / `principal_kind` / `role_or_scope` | Actor attribution |
| `correlation_id` | Request or workflow correlation |
| `payload` | Structured event payload or tombstone envelope |
| `payload_hash` | Hash of canonical payload/tombstone envelope |
| `previous_hash` | Previous chain hash in namespace |
| `event_hash` | Current event hash |
| `chain_namespace` | Logical chain partition |
| `hash_algorithm` | Algorithm label, initially SHA-256 |
| `canonicalization_version` | Serializer version |
| `created_at` | Event timestamp |
| `tombstoned_at` | Null unless redacted by tombstone |

**Constraints:**

- `event_hash` unique.
- `(source_table, source_event_id)` unique when source is present.
- Direct update/delete forbidden outside tombstone procedure.
- `principal_id` required for privileged actions; pre-auth events remain console-only until a later authenticated bridge exists.

### `transcript_turns`

Canonical record of one Parley turn.

| Field | Purpose |
|---|---|
| `transcript_turn_id` | Stable id |
| `match_ticket_id` | F04 match reference |
| `run_id` | Negotiation run |
| `side` | `seeker` or `employer` |
| `turn_index` | Per-side ordered index |
| `contract_id` / `contract_version` | Future F07a refs |
| `rubric_id` / `rubric_version` | Future F07b refs |
| `model_ref` | Future F12 model ref |
| `tool_call_refs` | Optional tool call references |
| `content` | Canonical turn content until tombstoned |
| `content_hash` | Hash of canonical content |
| `audit_event_id` | Audit event recording append |
| `created_at` | Storage timestamp |
| `tombstoned_at` | Null unless redacted |

**Constraints:**

- Unique `(run_id, side, turn_index)`.
- Append-only outside tombstone procedure.
- Raw content reads require transcript/audit scope.

### `tombstone_records`

Versioned redaction metadata.

| Field | Purpose |
|---|---|
| `tombstone_id` | Stable id |
| `target_kind` | `audit_event` or `transcript_turn` |
| `target_id` | Target record id |
| `subject_ref` | Data-subject reference |
| `lawful_basis` | Erasure basis |
| `procedure_version` | Tombstone procedure version |
| `operator_principal_id` | Executing operator |
| `original_hash` | Original payload/content hash |
| `replacement_hash` | Tombstone envelope hash |
| `audit_event_id` | Audit event for the tombstone action |
| `created_at` | Redaction timestamp |

**Constraints:**

- Unique `(target_kind, target_id)` for active tombstones.
- No tombstone without lawful basis, operator principal, original hash, and audit event.

### `evidence_exports`

Deterministic manifest for scoped review.

| Field | Purpose |
|---|---|
| `export_id` | Stable id |
| `requested_by_principal_id` | Actor |
| `purpose` | Incident, counsel, audit, or operator review |
| `filters` | Match/principal/run/correlation/date filters |
| `manifest_hash` | Deterministic package manifest hash |
| `chain_verification_status` | Valid/invalid + first invalid id |
| `created_at` | Export timestamp |

## Relationships

```text
audit_events_buffer 1 ── 0..1 audit_log_events
audit_log_events   1 ── 0..1 tombstone_records
transcript_turns   1 ── 0..1 tombstone_records
transcript_turns   n ── 1 match_tickets
transcript_turns   n ── 1 audit_log_events
evidence_exports   n ── 1 principals
```

## State Transitions

### Audit Event

```text
buffered -> canonical -> tombstoned
canonical -> exported
```

### Transcript Turn

```text
appended -> tombstoned
appended -> exported
```

### Tombstone Request

```text
requested -> validated -> executed
requested -> denied
executed -> audited
```
