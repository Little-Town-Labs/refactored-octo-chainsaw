# Data Model: PTH10 Reports, Dashboard, and CI/Canary Workflows

## ProductHarnessSuiteReport

- `schema_version`: report contract version.
- `report_id`: stable identifier for the aggregate report.
- `generated_at`: ISO timestamp.
- `command`: command plan that produced the report.
- `status`: aggregate `passed`, `failed`, or `invalid`.
- `summary`: aggregate counts for runs, assertions, artifacts, evidence records, and duration.
- `runs`: summarized runs from result-store snapshots.
- `scenario_coverage`: scenario ids, modes, and statuses included in the report.
- `trend`: optional trend points for dashboards and canary history.

## ProductHarnessCommandPlan

- `command`: `product:gate`, `product:eval`, or `product:canary`.
- `mode`: `dry_run`, `local`, `ci`, or `canary`.
- `description`: operator-facing command purpose.
- `scenario_refs`: product-harness suites covered by the command.
- `required_env`: environment variable names only, never values.
- `output_artifacts`: expected JSON/Markdown/report artifact names.

## ProductHarnessWorkflowPlan

- `workflow_id`: GitHub workflow identifier.
- `workflow_file`: workflow file path.
- `command`: associated product harness command.
- `triggers`: manual, label, push, deployment, or schedule trigger names.
- `environment`: optional GitHub environment.
- `artifact_name`: uploaded report artifact name.
