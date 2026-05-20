# Data Model: F07a Agent Contract Registry

## AgentContractVersion

Immutable definition of one side's agent behavior for one Parley run.

| Field | Description |
| --- | --- |
| `agent_contract_version_id` | Stable row id |
| `contract_id` | Stable contract identifier |
| `version` | Immutable version tag |
| `side` | `seeker` or `employer` |
| `status` | `draft`, `published`, `deprecated`, or `retired` |
| `prompt_template_ref` | Versioned prompt template pointer |
| `rubric_ref` | Versioned rubric pointer |
| `tool_surface_ref` | Versioned tool-surface pointer |
| `model_ref` | Provider/model/version selection |
| `runtime_settings` | Per-side execution bounds |
| `extension_fields` | Preserved future-compatible fields |
| `content_hash` | Canonical hash of immutable contract material |
| `description` | Human-readable version summary |
| `author_principal_id` | Principal who authored/submitted the version |
| `reviewer_principal_id` | Principal who reviewed the version |
| `published_at` | Publication timestamp |
| `deprecated_after` | Optional cutoff for new dispatch |
| `audit_event_id` | Canonical audit event for publication |
| `created_at` | Row creation timestamp |

### Invariants

- `(contract_id, version)` is unique and immutable.
- `published` rows require `reviewer_principal_id`, `published_at`, and `audit_event_id`.
- `deprecated_after` never deletes or changes historical resolution.
- Prompt, rubric, and tool-surface bodies are not embedded.

## AgentContractEvent

Append-only evidence row for publication and deprecation.

| Field | Description |
| --- | --- |
| `agent_contract_event_id` | Stable row id |
| `agent_contract_version_id` | Referenced contract version |
| `event_type` | `published` or `deprecated` |
| `reason_code` | Closed-list reason |
| `principal_id` | Actor responsible for the event |
| `reviewer_principal_id` | Reviewer or counsel approver when applicable |
| `correlation_id` | Operator/request correlation id |
| `audit_event_id` | Canonical audit event |
| `created_at` | Event timestamp |

### Invariants

- Events are append-only.
- Every event has one canonical audit link.
- Deprecation creates an event and sets the contract's `deprecated_after` cutoff for new dispatch.

## ContractResolution

Dispatch-facing resolution output.

| Field | Description |
| --- | --- |
| `decision` | `allow` or `deny` |
| `reason_code` | Stable machine-readable outcome |
| `contract_ref` | Requested `{contract_id, version}` |
| `contract` | Resolved contract when allowed |
| `effective_runtime_settings` | Runtime settings after ceiling clamps |
| `runtime_clamps` | List of clamped fields |
| `dependency_results` | Prompt/rubric/tool/model dependency outcomes |
| `audit_ref` | Existing publication/deprecation evidence refs |

### Reason Codes

- `contract_resolved`
- `missing_contract`
- `contract_deprecated`
- `contract_schema_invalid`
- `contract_version_mutation_error`
- `prompt_template_unresolvable`
- `rubric_unresolvable`
- `rubric_missing_bias_test`
- `tool_version_unavailable`
- `model_unavailable`
- `unauthorized`
