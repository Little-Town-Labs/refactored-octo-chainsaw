# Data Model: Product Harness Neon Seeds

## ProductDatabaseLifecycleConfig

Represents caller intent for an isolated product database run.

**Fields**:

- `project_id`: Neon project identifier or equivalent provider project identifier.
- `parent_branch_id`: Parent branch to fork from.
- `branch_name_prefix`: Human-readable prefix for generated branch names.
- `migrations_folder`: Source of schema migrations to apply.
- `cleanup_policy`: `always_delete`, `delete_on_success`, `retain_on_failure`, or `retain_always`.
- `retain_reason`: Required when policy can retain a branch for debugging.
- `seed_version`: Optional deterministic seed lifecycle version.

**Validation**:

- `project_id`, `parent_branch_id`, `branch_name_prefix`, and `migrations_folder` must be non-empty for live Neon runs.
- Any retaining cleanup policy must include a non-empty retain reason.
- Cleanup policy defaults to `always_delete` for gate mode.

## ProductDatabaseBranchContext

Represents the branch-specific context passed to migration, seed, and scenario callbacks.

**Fields**:

- `branch_id`: Provider branch identifier.
- `branch_name`: Provider branch name.
- `parent_branch_id`: Parent branch identifier.
- `database_url`: Credential-bearing connection string. Callback-only; never report-safe.
- `safe_database_ref`: Redacted connection reference suitable for logs and reports.

**Validation**:

- `database_url` must only be present in callback context, not result metadata.
- `safe_database_ref` must not include credentials.

## MigrationExecution

Represents schema migration execution for the isolated branch.

**Fields**:

- `status`: `passed` or `failed`.
- `migrations_folder`: Migration source path or stable label.
- `started_at`: ISO timestamp.
- `ended_at`: ISO timestamp.
- `duration_ms`: Non-negative duration.
- `error`: Safe error summary when failed.

**State Transitions**:

- `pending` -> `passed`
- `pending` -> `failed`

## SeedExecution

Represents optional deterministic seed lifecycle execution.

**Fields**:

- `status`: `not_configured`, `passed`, or `failed`.
- `seed_version`: Optional seed version.
- `seed_refs`: Optional list of seed record references.
- `started_at`: ISO timestamp when configured.
- `ended_at`: ISO timestamp when configured.
- `duration_ms`: Non-negative duration when configured.
- `error`: Safe error summary when failed.

**State Transitions**:

- `not_configured`
- `pending` -> `passed`
- `pending` -> `failed`

## CleanupResult

Represents terminal cleanup evidence for the branch lifecycle.

**Fields**:

- `status`: `deleted`, `retained`, `failed`, or `not_created`.
- `policy`: Cleanup policy used for the run.
- `reason`: Required when retained or failed.
- `started_at`: ISO timestamp when cleanup was attempted.
- `ended_at`: ISO timestamp when cleanup was attempted.
- `duration_ms`: Non-negative duration when cleanup was attempted.

**State Transitions**:

- Branch not created -> `not_created`
- Branch created + deletion succeeds -> `deleted`
- Branch created + retention policy applies -> `retained`
- Branch created + deletion fails -> `failed`

## ProductDatabaseLifecycleMetadata

Report-safe metadata attached to a PTH01 scenario result.

**Fields**:

- `adapter`: `neon`
- `branch`: safe branch metadata excluding raw database URL.
- `migration`: migration execution metadata.
- `seed`: seed execution metadata.
- `cleanup`: cleanup result.
- `redaction`: database URL redaction evidence.

**Validation**:

- Must not contain raw database URL credentials.
- Must include cleanup status for every run, even when branch creation fails.
- Must include migration and seed status when those phases were reached.
