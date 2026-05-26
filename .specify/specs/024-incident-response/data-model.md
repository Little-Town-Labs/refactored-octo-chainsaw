# Data Model: Incident Response + Breach Notification + Monitoring

## MonitoringSignal

Represents a normalized security-relevant observation.

**Fields**: `id`, `source`, `category`, `severity`, `status`, `dedupe_key`, `observed_at`, `affected_subject_kind`, `affected_subject_id`, `evidence_ref`, `escalation_hint`, `metadata`, `created_at`.

**Validation**:

- `category=cross_side_leakage` and `category=audit_chain_integrity_failure` require `severity=sev1`.
- `dedupe_key` is required and stable for equivalent signals.
- `evidence_ref` must be a reference/hash envelope, not raw sensitive payload.

## Incident

Durable response record opened from a signal or manual report.

**Fields**: `id`, `incident_key`, `severity`, `status`, `title`, `description`, `commander_principal_id`, `source_signal_id`, `awareness_at`, `detected_at`, `affected_systems`, `affected_data_classes`, `personal_data_involved`, `high_risk_to_data_subjects`, `notification_summary`, `created_by_principal_id`, `created_at`, `updated_at`, `closed_at`.

**State transitions**:

```text
triage -> investigating -> contained -> recovering -> review -> closed
triage -> closed (sev3 false positive only)
investigating -> review (low-risk/no containment needed)
```

**Validation**:

- Sev-1 closure requires notification assessment, postmortem summary, and corrective-action tracking.
- Awareness time is required before notification obligations can be active.

## IncidentTimelineEntry

Append-only update on an incident.

**Fields**: `id`, `incident_id`, `entry_type`, `body`, `principal_id`, `occurred_at`, `evidence_ref`, `created_at`.

**Validation**: `principal_id` is required for operator-authored entries. Entries are never updated in place.

## EvidenceReference

Minimal pointer to preserved evidence.

**Fields**: `id`, `incident_id`, `kind`, `ref`, `hash`, `contains_personal_data`, `retention_note`, `tombstone_ref`, `created_by_principal_id`, `created_at`.

**Validation**: `ref` may identify audit events, credential IDs, webhook events, API request IDs, match/dossier IDs, object storage keys, or external issue IDs; raw log bodies are out of scope.

## NotificationObligation

Tracks notification clocks and decision state.

**Fields**: `id`, `incident_id`, `obligation_type`, `jurisdiction`, `recipient`, `deadline_at`, `status`, `decision`, `decision_rationale`, `decided_by_principal_id`, `decided_at`, `sent_at`, `created_at`, `updated_at`.

**Validation**:

- GDPR supervisory authority obligations default to `awareness_at + 72 hours`.
- Data-subject high-risk review is tracked separately from supervisory notification.
- Counsel-pending and blocked states still produce approaching/overdue monitoring signals.

## CorrectiveAction

Post-incident action item.

**Fields**: `id`, `incident_id`, `owner_principal_id`, `title`, `status`, `due_at`, `closed_at`, `closure_evidence_ref`, `created_at`, `updated_at`.

**Validation**: Sev-1 incidents require at least one tracked corrective-action decision: action created, or documented "none required" rationale in postmortem.

## RunbookExercise

Tabletop or drill artifact for Stage 8 gate evidence.

**Fields**: `id`, `scenario`, `status`, `facilitator_principal_id`, `started_at`, `completed_at`, `incident_id`, `gaps`, `follow_ups`, `evidence_ref`, `created_at`.

**Validation**: Required F24 closure scenarios are `cross_side_leakage`, `credential_compromise`, and `monitoring_deadline_failure`.
