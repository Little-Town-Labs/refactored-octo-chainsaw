# Data Model: F08.5 Tool Surface & Dispatcher

## Tool Surface Version

**Purpose**: Immutable catalog artifact advertised by a pinned F07a contract.

**Fields**:

- `surface_id`: Stable logical id, such as `seeker-tools`.
- `version`: Immutable semantic or policy version.
- `status`: `draft`, `published`, or `deprecated`.
- `description`: Human-readable purpose and scope.
- `side_scope`: `seeker`, `employer`, or `both`.
- `descriptor_refs`: Ordered descriptor `(name, version)` refs in this surface.
- `content_hash`: Canonical hash covering surface metadata and descriptor refs.
- `published_by`, `published_at`, `deprecated_by`, `deprecated_at`: Attributable lifecycle metadata.
- `audit_event_ids`: Canonical audit refs for publication and deprecation.

**Validation Rules**:

- `(surface_id, version)` is immutable after creation.
- Published surfaces must reference only published descriptor versions.
- Deprecated surfaces remain resolvable for historical review but are refused for new dispatch unless explicitly allowed for reconstruction.

## Tool Descriptor Version

**Purpose**: Immutable definition of a tool's callable shape and disclosure policy.

**Fields**:

- `name`: Stable tool name.
- `version`: Immutable descriptor version.
- `input_schema`: JSON Schema for input payloads.
- `output_schema`: JSON Schema for raw adapter outputs before disclosure routing.
- `disclosure_class`: `principal_self`, `counterparty_filtered`, or `platform_open`.
- `adapter_ref`: Internal adapter identifier.
- `status`: `draft`, `published`, or `deprecated`.
- `description`: Reviewable capability summary.
- `content_hash`: Canonical hash covering descriptor fields.
- `audit_event_ids`: Publication and deprecation evidence.

**Validation Rules**:

- `(name, version)` is immutable after creation.
- `disclosure_class` must be one of the three allowed values.
- Published descriptors must have valid input and output schemas and a registered adapter ref.

## Tool Surface Descriptor Link

**Purpose**: Ordered membership record connecting a surface version to descriptor versions.

**Fields**:

- `surface_id`, `surface_version`: Parent surface ref.
- `tool_name`, `tool_version`: Descriptor ref.
- `advertisement_order`: Stable ordering for prompt/rendering and review.
- `required`: Whether the surface is considered unavailable if this descriptor's adapter is missing.

**Validation Rules**:

- No duplicate descriptor refs within one surface version.
- All linked descriptors must exist before surface publication.

## Tool Advertisement

**Purpose**: Dispatch-time view of tools available to one run side under one resolved contract.

**Fields**:

- `run_id`: Parley run container id.
- `side`: `seeker` or `employer`.
- `contract_ref`: F07a contract id/version.
- `surface_ref`: Tool surface id/version.
- `descriptors`: Descriptor refs, schemas, disclosure classes, and adapter availability.
- `resolved_at`: Resolution timestamp.
- `reason_code`: Present when advertisement fails.

**Validation Rules**:

- Advertisement must derive from the contract's pinned `tool_surface_ref`.
- New catalog versions must not alter existing advertisements.

## Tool Dispatch Request

**Purpose**: Single attempted tool invocation through the dispatcher.

**Fields**:

- `request_id`: Stable id for idempotent evidence.
- `run_id`, `turn_id`: Parley execution context.
- `side`: Invoking side.
- `principal_id`: Authenticated agent or service principal.
- `contract_ref`: F07a contract id/version.
- `surface_ref`: Resolved tool surface id/version.
- `tool_ref`: Tool descriptor name/version.
- `input`: Payload to validate against `input_schema`.
- `call_index`: Per-turn call counter.

**Validation Rules**:

- Tool must be advertised for the resolved surface.
- Principal and side must be authorized for the contract/run.
- Call count must not exceed contract runtime settings.

## Tool Dispatch Result

**Purpose**: Structured outcome returned to the side runner.

**Fields**:

- `status`: `ok`, `tool_unsupported`, `denied`, `filtered_pending`, `adapter_failed`, `adapter_timeout`, or `schema_invalid`.
- `reason_code`: Stable reason for non-ok outcomes.
- `tool_ref`: Descriptor name/version.
- `disclosure_class`: Descriptor disclosure class.
- `principal_view`: Output visible to invoking side when allowed.
- `counterparty_view_ref`: Privacy-filter result ref when available.
- `audit_event_id`: Canonical dispatch evidence.
- `duration_ms`: Adapter and dispatcher timing metadata.

**Validation Rules**:

- `tool_unsupported` must not terminate the turn.
- Successful results must have passed input and output schema validation.
- Raw `counterparty_filtered` output must not appear in `principal_view` or counterparty-visible fields.

## Disclosure Routing Evidence

**Purpose**: Audit-ready record of how tool output was constrained.

**Fields**:

- `routing_id`: Stable evidence id.
- `dispatch_event_id`: Tool dispatch event ref.
- `disclosure_class`: Applied class.
- `route`: `principal_only`, `privacy_filter_required`, `privacy_filter_completed`, `platform_open`, or `failed_closed`.
- `privacy_filter_ref`: Optional F09 boundary/result ref.
- `created_at`: Timestamp.

**Validation Rules**:

- `counterparty_filtered` without a privacy-filter result must route to `failed_closed` or `privacy_filter_required`.
- Routing evidence must be emitted for every successful adapter output.

## Dispatcher Bypass Finding

**Purpose**: CI/type-check evidence for attempted direct tool access.

**Fields**:

- `finding_id`: Stable id.
- `source_path`: File that violated the boundary.
- `forbidden_import`: Adapter, SDK, tRPC client, or tool module path.
- `detected_by`: Guard command or lint rule.
- `detected_at`: Timestamp.
- `status`: `open`, `resolved`, or `expected_fixture`.

**Validation Rules**:

- Expected failing fixtures must be clearly marked and isolated from production source.
- Production source bypass findings block CI.
