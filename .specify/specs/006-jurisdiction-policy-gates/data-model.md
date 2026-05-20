# Data Model — F06 Jurisdiction Policy Gates

## Entities

### `jurisdiction_policies`

Active and historical policy posture for a jurisdiction.

| Field | Purpose |
| --- | --- |
| `jurisdiction_policy_id` | Stable policy revision id |
| `jurisdiction_code` | Normalized jurisdiction code, e.g. `US-MO` or `US-NY` |
| `status` | `allowed`, `unsupported`, `disabled`, `review_required`, or `retired` |
| `policy_version` | Human/compliance-readable policy version |
| `effective_from` | First instant this revision can be used |
| `effective_until` | Optional end instant |
| `operational_reason` | Closed-list reason for this posture |
| `reviewer_principal_id` | Counsel/compliance/operator principal who approved the posture |
| `created_by_principal_id` | Principal that recorded the revision |
| `created_at` | Revision creation timestamp |

**Validation rules:**

- `jurisdiction_code` is non-empty and normalized uppercase.
- `status` is a closed enum.
- `policy_version` is non-empty.
- `effective_until`, when present, is after `effective_from`.
- Only one active revision per jurisdiction may be effective for a given time window.

### `jurisdiction_gate_decisions`

Immutable result of evaluating a workflow subject against jurisdiction policy.

| Field | Purpose |
| --- | --- |
| `gate_decision_id` | Stable decision id |
| `subject_kind` | `seeker_ticket`, `employer_req_ticket`, `match_ticket`, or `run_dispatch` |
| `subject_id` | Subject record id or run id |
| `decision` | `allow` or `deny` |
| `reason_code` | Closed-list reason code |
| `jurisdiction_codes` | Required jurisdiction set used for evaluation |
| `policy_version` | Policy version or `none` when missing/unknown |
| `policy_revision_ids` | Policy revisions considered during evaluation |
| `correlation_id` | Workflow correlation id |
| `principal_id` | Requesting principal, when available |
| `audit_event_id` | Canonical audit event for this decision |
| `created_at` | Decision timestamp |

**Decision reason codes:**

- `all_allowed`
- `missing_jurisdiction`
- `unknown_jurisdiction`
- `unsupported_jurisdiction`
- `disabled_jurisdiction`
- `review_required`
- `expired_policy`
- `conflicting_jurisdictions`
- `unauthorized`

**Validation rules:**

- `decision='allow'` only with `reason_code='all_allowed'`.
- `decision='deny'` never uses `all_allowed`.
- `jurisdiction_codes` is non-empty for normal evaluations; missing-source cases store an empty array with `missing_jurisdiction`.
- `correlation_id` is required.
- `audit_event_id` is required.

### `jurisdiction_kill_switch_events`

Immutable record of an operator/compliance posture mutation.

| Field | Purpose |
| --- | --- |
| `kill_switch_event_id` | Stable event id |
| `jurisdiction_code` | Jurisdiction affected |
| `from_status` | Prior status |
| `to_status` | New status |
| `reason_code` | Closed-list operational reason |
| `policy_version` | New policy version or revision |
| `operator_principal_id` | Principal that executed the change |
| `reviewer_principal_id` | Optional counsel/compliance reviewer |
| `correlation_id` | Workflow correlation id |
| `audit_event_id` | Canonical audit event for this change |
| `created_at` | Change timestamp |

**Kill-switch reason codes:**

- `new_regulation`
- `counsel_directive`
- `incident_response`
- `bias_audit_gap`
- `launch_posture`
- `manual_reenable`

**Validation rules:**

- `from_status` and `to_status` must differ.
- `to_status` must be one of the policy status enum values.
- `reason_code` is required and closed-list.
- `operator_principal_id`, `correlation_id`, and `audit_event_id` are required.

### Failure Artifact

Structured denial artifact derived from a denied `jurisdiction_gate_decisions` row.

| Field | Purpose |
| --- | --- |
| `failure_artifact_id` | Deterministic artifact id or decision id alias |
| `gate_decision_id` | Source decision |
| `subject_kind` / `subject_id` | Blocked workflow subject |
| `decision` | Always `deny` |
| `reason_code` | Denial reason |
| `jurisdiction_codes` | Jurisdictions considered |
| `policy_version` | Policy version or `none` |
| `correlation_id` | Workflow correlation id |
| `audit_event_id` | Canonical audit event |
| `created_at` | Artifact timestamp |

Failure artifacts intentionally exclude raw personal data and user-facing explanation copy.

## Relationships

```text
principals 1 ── n jurisdiction_policies.created_by_principal_id
principals 1 ── n jurisdiction_policies.reviewer_principal_id
principals 1 ── n jurisdiction_gate_decisions.principal_id
principals 1 ── n jurisdiction_kill_switch_events.operator_principal_id

audit_log_events 1 ── 1 jurisdiction_gate_decisions
audit_log_events 1 ── 1 jurisdiction_kill_switch_events

jurisdiction_policies n ── n jurisdiction_gate_decisions (via policy_revision_ids)
```

## State Transitions

### Jurisdiction Policy Status

```text
review_required -> allowed
review_required -> unsupported
allowed -> disabled
unsupported -> disabled
disabled -> allowed
disabled -> unsupported
allowed -> retired
unsupported -> retired
disabled -> retired
```

### Gate Decision

```text
requested -> allow
requested -> deny -> failure_artifact_available
```

### Kill Switch Event

```text
requested -> authorized -> recorded -> audited
requested -> denied
```

Denied kill-switch attempts should be audited if they reach an authenticated principal context.
