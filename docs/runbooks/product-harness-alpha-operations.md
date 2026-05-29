# Product Harness Alpha Operations Runbook

PTH16 closes the product-harness operational loop. Use this runbook to configure the Alpha readiness harness, run preview/prod canaries, interpret reports, and respond to failures without reading package internals.

The product harness has two operating classes:

- **Gate and canary checks**: deterministic product-readiness evidence. These can block Alpha promotion when required checks fail.
- **Persona eval trends**: informational cost, latency, outcome, refusal, model/provider, and evaluator-score trends. These do not block promotion until explicit stability and cost thresholds are approved.

## Configuration Matrix

Configure GitHub Actions values in the environment that runs the workflow:

- `ci` for `product-gate.yml`
- `production` for `alpha-canary.yml`

Local exploratory runs may use shell env or `.env.local`, but `.env.local` is
not loaded by every package command automatically. Export the values in the
shell when validating setup from a clean terminal.

| Name | Configure as | Required for | Purpose |
| --- | --- | --- | --- |
| `NEON_API_KEY` | GitHub Actions secret or local env | `product:gate`, integration harness | Neon REST API token for disposable branch lifecycle. |
| `NEON_PROJECT_ID` | GitHub Actions secret or local env | `product:gate`, integration harness | Neon project used for disposable test branches. |
| `NEON_PARENT_BRANCH_ID` | GitHub Actions secret or local env | `product:gate` | Baseline branch for product gate test branches. |
| `PI_API_KEY` | GitHub Actions secret or local env | `product:eval` live eval mode | Pi/model provider credential for persona eval runs. Use deterministic synthetic evals when live provider access is not configured. |
| `PRODUCT_CANARY_URL` | GitHub Actions variable or workflow input | Preview/prod canaries | Absolute Vercel preview or production URL under test. |
| `PRODUCT_CANARY_DRY_RUN` | Workflow input/env | Dry run only | Explicitly marks local/manual dry-run mode. Dry runs do not prove preview/prod readiness. |
| `BROWSERBASE_PROJECT_ID` | GitHub Actions variable or secret | Preview/prod canaries | Browserbase project used for managed headless Playwright sessions. |
| `BROWSERBASE_API_KEY` | GitHub Actions secret | Preview/prod canaries | Browserbase credential. Never write the value to logs, docs, or PR comments. |
| `PRODUCT_HARNESS_DATABASE_URL` | GitHub Actions secret | Preview/prod canaries and durable reports | Non-production Neon connection string for product harness result persistence. |
| `PRODUCT_ARTIFACT_STORE_PROVIDER` | GitHub Actions variable | Preview/prod canaries | Durable object storage provider identifier. Current Alpha target is Vercel-available storage. |
| `PRODUCT_ARTIFACT_STORE_BUCKET` | GitHub Actions variable | Preview/prod canaries | Bucket/container logical name for large artifacts. |
| `PRODUCT_ARTIFACT_STORE_PREFIX` | GitHub Actions variable | Preview/prod canaries | Prefix for product harness artifacts, for example an Alpha canary namespace. |
| `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF` | GitHub Actions variable | Preview/prod canaries | Env-var reference for the storage credential, for example `env:BLOB_READ_WRITE_TOKEN`. |
| `BLOB_READ_WRITE_TOKEN` | GitHub Actions secret | Vercel Blob-backed artifact storage | Credential referenced by `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF` when using Vercel Blob. |

Do not commit `.env.local` values. Do not paste connection strings, Browserbase keys, Blob tokens, or production URLs into issues or runbooks. Use env names and artifact/report references.

## Neon `test_harness` Setup

Use a dedicated testing Neon project or non-production database for harness data. The result store expects an isolated schema named `test_harness` by default and keeps harness rows outside production application schemas.

There are two Neon surfaces:

- Branch lifecycle for gate and integration runs: `NEON_API_KEY`,
  `NEON_PROJECT_ID`, and `NEON_PARENT_BRANCH_ID`.
- Persistent product-harness result storage: `PRODUCT_HARNESS_DATABASE_URL`,
  pointing at a non-production database where `test_harness` can be created or
  used.

Setup expectations:

1. Create or choose the dedicated testing database.
2. Choose the Neon parent branch that disposable product-gate branches should fork from and store it as `NEON_PARENT_BRANCH_ID`.
3. Store the Neon REST credentials as `NEON_API_KEY` and `NEON_PROJECT_ID`.
4. Store the persistent result-store connection string as `PRODUCT_HARNESS_DATABASE_URL`.
5. Ensure the user behind that URL can create and use the `test_harness` schema, or pre-create that schema with equivalent privileges.
6. Keep production application schemas untouched.
7. Confirm result snapshots are written as harness metadata and JSON snapshots, not copied production user data.

The harness initializes the schema/table when configured to do so. If initialization fails, treat it as an environment or privilege issue before treating it as a product regression.

Minimum live database verification before relying on canary persistence:

1. Connect to `PRODUCT_HARNESS_DATABASE_URL`.
2. Create or verify the `test_harness` schema.
3. Write one synthetic product result snapshot.
4. Read the snapshot by `run_id`.
5. List recent runs by mode, status, scenario id, environment label, and git ref.
6. Re-write the identical `run_id` and confirm it is idempotent.
7. Re-write the same `run_id` with different content and confirm it fails.
8. Confirm no rows are written outside `test_harness.product_result_runs`.

## Browserbase Setup

Preview/prod canaries should use Browserbase-backed headless Playwright. Local Playwright and dry-run mode are useful for development, but they are not substitutes for managed preview/prod canary evidence.

Setup expectations:

1. Configure `BROWSERBASE_PROJECT_ID`.
2. Configure `BROWSERBASE_API_KEY` as a secret.
3. Keep session ids, artifact ids, screenshots, traces, and videos as evidence references.
4. Do not copy remote browser credentials or raw session credentials into reports.

If Browserbase session creation fails, first verify project/key configuration and provider availability. If configuration is correct and only the product journey fails, triage it as a product or environment regression.

## Canary Target Setup

Set `PRODUCT_CANARY_URL` to the Vercel preview or production target. It must be an absolute `http` or `https` URL.

Operational rules:

- Use preview URLs for PR/deployment validation.
- Use production URL only for scheduled or manually approved production canaries.
- Use `PRODUCT_CANARY_DRY_RUN=true` only when intentionally exercising command wiring without preview/prod dependencies.
- Treat missing or malformed `PRODUCT_CANARY_URL` as a configuration failure.

The canary report uses a safe target label derived from the URL host. It must not expose query strings or credentials.

## Artifact Storage And Retention

The product harness stores metadata in Neon and large artifacts in durable object storage. Large artifacts include report files, screenshots, traces, videos, and transcript artifacts when they are enabled by a scenario.

Required metadata expectations:

- artifact type
- provider and object key/ref
- checksum
- retention class
- redaction status
- safe metadata only

Configure:

1. `PRODUCT_ARTIFACT_STORE_PROVIDER`
2. `PRODUCT_ARTIFACT_STORE_BUCKET`
3. `PRODUCT_ARTIFACT_STORE_PREFIX`
4. `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF`
5. The env var referenced by `PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF`, such as `BLOB_READ_WRITE_TOKEN`

Retention policy:

- Keep gate/canary reports long enough to support Alpha launch review and regression investigation.
- Keep failed-run browser traces and screenshots until the failure is resolved or explicitly waived.
- Keep transcript-like artifacts redacted and access-limited.
- Delete or archive artifacts according to the provider retention policy once no longer needed.

## Running Commands And Workflows

Local smoke commands:

```bash
pnpm --filter @spyglass/product-test-harness test
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness run:reporting-ci
PRODUCT_CANARY_DRY_RUN=true PRODUCT_CANARY_VALIDATE_ENV=true pnpm product:canary
```

Configured local commands:

```bash
pnpm product:gate
pnpm product:eval
pnpm product:canary
```

Command setup:

| Command | Required setup | Notes |
| --- | --- | --- |
| `pnpm product:gate` | `NEON_API_KEY`, `NEON_PROJECT_ID`, `NEON_PARENT_BRANCH_ID` | Runs deterministic Alpha gate report metadata. Use a dedicated non-production Neon project or branch baseline. |
| `pnpm product:eval` | `PI_API_KEY` for live provider mode | Eval trends are informational until thresholds are approved. Deterministic package tests do not require provider credentials. |
| `pnpm product:canary` | Preview/prod canary env from the configuration matrix, or `PRODUCT_CANARY_DRY_RUN=true` for wiring checks | Set `PRODUCT_CANARY_VALIDATE_ENV=true` when you want the command to fail fast on missing preview/prod canary config. |

GitHub Actions workflows:

| Workflow | Command | Use |
| --- | --- | --- |
| `product-gate.yml` | `product:gate` | Deterministic product readiness gate evidence. |
| `persona-eval.yml` | `product:eval` | Informational persona eval report and trend evidence. |
| `alpha-canary.yml` | `product:canary` | Preview/prod canary execution with env validation. |

Recommended operating sequence:

1. Run package tests and type checks locally.
2. Run `PRODUCT_CANARY_DRY_RUN=true PRODUCT_CANARY_VALIDATE_ENV=true pnpm product:canary` to verify command wiring without preview/prod dependencies.
3. Configure Neon branch lifecycle and result-store persistence.
4. Run `product:gate` for deterministic readiness evidence.
5. Run `product:eval` to inspect persona trend movement.
6. Run `product:canary` against the Vercel preview URL.
7. Run production canaries only after preview evidence is clean or explicitly waived.

## Live Neon Scenario Gap

Current automated coverage proves the Neon result-store SQL through deterministic fake-SQL tests. Before treating the testing database as operationally ready, add an opt-in live Neon scenario that is skipped unless `PRODUCT_HARNESS_DATABASE_URL` is set.

Recommended scenario coverage:

1. Initialize `test_harness.product_result_runs`.
2. Persist a synthetic passed gate snapshot and read it back.
3. Persist failed gate and eval snapshots, then verify filtered list queries.
4. Verify identical duplicate writes are idempotent.
5. Verify conflicting duplicate writes fail without changing the existing row.
6. Verify unsafe schema names and production-like schemas are rejected before SQL writes.
7. Verify raw connection strings are rejected from snapshot metadata.
8. Verify teardown or cleanup policy for smoke rows, using a unique run id prefix.

This should live as product-harness work rather than a canary-runbook-only task: the runbook can describe the check, but the package should provide the opt-in command or integration test that operators can run against the dedicated Neon testing database.

## Reading Reports

Product harness reports are generated as machine-readable JSON and readable Markdown.

Read these sections first:

1. **Suite status**: overall pass/fail/error status.
2. **Scenario summary**: scenario id, version, environment label, git ref, and git SHA.
3. **Assertions**: failed or warning assertions are the first product regression signal.
4. **Artifacts**: artifact refs, checksums, redaction status, and retention class.
5. **Browser artifacts**: screenshots, traces, videos, console/network evidence refs.
6. **Observability assertions**: audit, monitoring, Sentry-like readiness, incident evidence, and unsafe-log checks.
7. **Eval trends**: cost, latency, outcome, tool refusals, model/provider version, and evaluator scores.

Classification rules:

- Gate/canary failures require triage before Alpha promotion.
- Missing evidence is a gate/canary failure unless explicitly waived by the owner.
- Eval trend movement is informational until approved thresholds make a specific eval release-blocking.
- Privacy, credential, jurisdiction, or cross-side leakage signals bypass normal trend review and escalate immediately.

## Eval Trend And Cost Monitoring

Eval trends help measure behavior over time. Use them to identify drift, model/provider changes, cost movement, latency spikes, refusal changes, and evaluator-score movement.

Do:

- Compare trend movement across comparable scenario ids and model/provider versions.
- Preserve report refs for notable changes.
- Open follow-up work when cost, latency, refusal rate, or evaluator scores move in a way that could affect Alpha readiness.

Do not:

- Treat eval trends as release-blocking by default.
- Add ad hoc thresholds during a release decision.
- Copy transcripts or prompt content into triage notes.

Thresholds become release-blocking only after the team approves explicit stability and cost criteria.

## Operational Response Matrix

| Failure class | First checks | Preserve | Escalation |
| --- | --- | --- | --- |
| Missing preview/prod env | Check `alpha-canary.yml` inputs, GitHub variables, GitHub secrets, and dry-run setting. | Workflow run URL and missing env names only. | Platform/operator owner. |
| Invalid canary URL | Verify `PRODUCT_CANARY_URL` is absolute and targets the intended Vercel environment. | Safe target label and workflow run URL. | Platform/operator owner; product owner if target deployment is missing. |
| Neon persistence failure | Verify `PRODUCT_HARNESS_DATABASE_URL`, database reachability, schema privileges, and `test_harness` access. | Run id, error class, sanitized database project/context, report ref. | Platform/operator owner; database owner for privilege or availability issues. |
| Browserbase execution failure | Verify `BROWSERBASE_PROJECT_ID`, `BROWSERBASE_API_KEY`, provider status, and session creation logs. | Browserbase session ref, workflow run URL, safe target label. | Platform/operator owner; product owner if browser journey reaches the app and then fails. |
| Artifact storage failure | Verify provider, bucket, prefix, credential ref, and referenced env var such as `BLOB_READ_WRITE_TOKEN`. | Artifact metadata, checksum when available, provider error class. | Platform/operator owner. |
| Gate/canary report regression | Review suite status, failed assertion, scenario id, git SHA, artifacts, and observability refs. | Report JSON/Markdown refs and artifact refs. | Product/engineering owner for the failing scenario. |
| Eval trend movement | Compare scenario, persona, model/provider version, cost, latency, outcome, refusals, and evaluator scores. | Trend report ref and comparable run ids. | Product/engineering review; not release-blocking unless thresholds are approved. |
| Privacy, credential, jurisdiction, or cross-side leakage signal | Stop normal promotion flow and preserve minimal evidence refs. | Audit ids, report refs, artifact refs, incident signal ids; no raw personal data or secrets. | Incident response runbook and counsel/operator review as applicable. |

## Escalation And Closure Checklist

Before closing a harness failure:

1. Classify the failure as configuration, provider, product regression, report regression, informational eval trend, or privacy/security signal.
2. Preserve minimal evidence references.
3. Confirm no raw secrets, connection strings, or personal data were copied into tickets.
4. Assign an owner.
5. Record the fix, waiver, or follow-up decision.
6. Rerun the relevant command or workflow when a fix is available.
7. Attach the passing report ref or document why a rerun is not required.

For privacy, credential, jurisdiction, cross-side leakage, or audit-chain integrity concerns, use `docs/runbooks/incident-response.md` and keep this runbook as supporting harness context only.
