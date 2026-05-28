# Data Model: PTH11 Neon Test Harness Schema Persistence

## Schema

Default schema: `test_harness`

## Table: product_result_runs

Stores one row per product-harness run snapshot.

| Column | Type | Notes |
| --- | --- | --- |
| `run_id` | `text primary key` | Existing `ProductResultStoreSnapshot.run.run_id` |
| `schema_version` | `text not null` | Snapshot schema version |
| `scenario_id` | `text not null` | Indexed list filter |
| `scenario_version` | `text not null` | Scenario version at execution time |
| `mode` | `text not null` | `gate` or `eval` |
| `status` | `text not null` | `passed`, `failed`, or `invalid` |
| `environment_label` | `text not null` | Preview/prod/local label |
| `git_ref` | `text` | Optional git ref |
| `git_sha` | `text` | Optional git SHA |
| `started_at` | `timestamptz not null` | Run start time |
| `ended_at` | `timestamptz not null` | Run end time |
| `created_at` | `timestamptz not null` | Snapshot creation time |
| `summary` | `text not null` | Existing run summary |
| `artifact_count` | `integer not null` | Aggregate artifact/reference count |
| `assertion_count` | `integer not null` | Aggregate assertion count |
| `step_count` | `integer not null` | Step count |
| `snapshot_hash` | `text not null` | Stable duplicate-detection hash |
| `snapshot` | `jsonb not null` | Complete `ProductResultStoreSnapshot` |

## Indexes

- `(started_at desc, created_at desc, run_id desc)` for newest-first lists.
- `(scenario_id, started_at desc)` for scenario history.
- `(mode, status, started_at desc)` for gate/eval dashboards.
- `(environment_label, started_at desc)` for preview/prod canaries.
- `(git_ref, started_at desc)` for PR and branch history.

## Retention Boundary

Neon stores metadata and JSON snapshots only. Large artifacts remain referenced by URI and can move to durable object storage in a later feature.
