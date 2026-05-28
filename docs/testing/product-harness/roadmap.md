# Spyglass Product Readiness Harness Roadmap

**Version:** 0.1.0
**Created:** 2026-05-26
**Owner:** Gary
**Source PRD:** `docs/testing/product-harness/PRD.md`
**Development process:** Spec Kit workflow: specify -> clarify -> plan -> tasks -> analyze -> implement

---

## Executive Summary

| | |
|---|---|
| **Product vision** | Automated Alpha-readiness and persona-eval harness for Spyglass product workflows. |
| **Primary outcome** | Before inviting Alpha users, run deterministic product gates that prove core workflows, evidence, privacy, jurisdiction, alpha posture, API/webhook, and observability behavior. |
| **Secondary outcome** | Run broader Pi-backed seeker/employer persona evals to measure behavior, drift, failure modes, and encounter quality over time. |
| **Target platform** | Existing Spyglass pnpm/Turborepo monorepo, Vercel preview/prod URLs, Neon branch isolation, `test_harness` schema persistence, Browserbase-backed headless replay/canaries, optional Camofox research spike. |
| **Completed build features** | 10 |
| **Operationalization features** | 6 planned, plus 1 optional Camofox evaluation spike |
| **Implementation phases** | 6 |
| **Completed critical path** | PTH01 -> PTH02 -> PTH03 -> PTH04 -> PTH05 -> PTH06 -> PTH08 -> PTH10 |
| **Operationalization critical path** | PTH11 -> PTH12 -> PTH13 -> PTH14 -> PTH15 -> PTH16 |
| **Parallelizable** | PTH12 durable artifact storage can progress with PTH13 Browserbase work after PTH11 contracts settle; PTH17 Camofox evaluation remains optional and non-blocking. |

This roadmap converts the Product Readiness Harness PRD into feature-sized Spec Kit work. Each feature should be delivered through the normal Spec Kit sequence and should produce durable artifacts under `.specify/specs/` before implementation.

---

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| PTH00 Product Readiness Harness PRD | Complete | `docs/testing/product-harness/PRD.md` created from Alpha-readiness, Neon, Playwright, Browserbase, Pi persona, and observability requirements. |
| PTH01 Harness skeleton + scenario/result contracts | Complete | Merged to `main` in PR #70; `@spyglass/product-test-harness` now provides scenario/result contracts, runner, reports, sample scenario, and tests. |
| PTH02 Neon branch + migration + seed lifecycle | Complete | Merged to `main` in PR #71; product harness now supports disposable database branch lifecycle, migration, seeding, cleanup policy metadata, redaction, and lifecycle tests. |
| PTH03 Persistent result store + artifacts contract | Complete | Merged to `main` in PR #72; product harness now supports result-store snapshots, evidence categories, local file persistence, filtering, validation, and duplicate safety. |
| PTH04 Deterministic seed factories | Complete | Merged to `main` in PR #73; product harness now supports deterministic seed bundle contracts, Alpha happy-path/missing-consent/jurisdiction-kill-switch fixtures, seed validation, offline application, lifecycle callback integration, result-store-compatible seed records, and sample evidence. |
| PTH05 Deterministic Alpha gate scenarios A1-A5 | Complete | Merged to `main` in PR #74; product harness now defines deterministic A1-A5 gate scenarios, consent-withdrawn and human-review seed fixtures, result-store snapshot persistence, public exports, sample command, and local evidence. |
| PTH06 Playwright product browser runner | Complete | Merged to `main` in PR #75; product harness now defines default PTH06 browser journeys, Playwright-compatible driver contracts, deterministic synthetic driver, browser artifact capture, result-store snapshot persistence, public exports, and sample evidence. |
| PTH07 Employer API + webhook receiver scenarios | Complete | Merged to `main` in PR #76; product harness now defines deterministic employer API/webhook gate scenarios, scoped synthetic credential validation, signed webhook delivery, receiver capture, idempotency, failure evidence, payload-boundary assertions, result-store snapshot persistence, public exports, and sample evidence. |
| PTH08 Observability and incident assertions | Complete | Merged to `main` in PR #77; product harness now defines deterministic observability gates for audit coverage, monitoring latency/cost bounds, Sentry-style config readiness, incident evidence, unsafe-log rejection, result-store snapshot persistence, public exports, and sample evidence. |
| PTH09 Pi persona eval adapter | Complete | Merged to `main` in PR #78; product harness now defines deterministic Pi-compatible persona eval encounters, seeker/employer personas, synthetic driver execution, prompt-injection and privacy-boundary refusal evidence, transcript/tool/model/usage metadata, result-store agent invocation persistence, public exports, and sample evidence. |
| PTH10 Reports, dashboard, and CI/canary workflows | Complete | Merged to `main` in PR #79; product harness now defines aggregate JSON/Markdown suite reports, command/workflow metadata, root commands, deterministic reporting sample output, safe canary target labeling, and GitHub Actions workflows for product gate, persona eval, and alpha canary runs. |
| PTH11 Neon `test_harness` schema persistence | Not started | Next operational slice: replace/local-augment `LocalFileProductResultStore` with a Neon-backed store targeting an isolated `test_harness` schema outside production. |
| PTH12 Durable artifact storage | Not started | Persist report/browser/trace/video/transcript blobs outside GitHub artifact retention while storing metadata refs in Neon. |
| PTH13 Browserbase preview/prod replay driver | Not started | Add Browserbase-backed headless Playwright execution for preview/prod replay and canaries. |
| PTH14 Canary workflow hardening | Not started | Enforce required env/secrets and wire canary workflows to use Neon persistence, Browserbase, and durable artifact storage when running against preview/prod. |
| PTH15 Eval trend and cost monitoring | Not started | Persist persona eval cost, latency, outcome, and drift trends while keeping evals informational. |
| PTH16 Alpha harness operations runbook | Not started | Document Neon schema setup, Browserbase, canary URLs, artifact retention, report interpretation, and operational response. |
| PTH17 Camofox browser evaluation spike | Optional | Evaluate Camofox/Camoufox as a fallback adapter for first-party preview/prod testing only; not part of the release-blocking critical path. |

---

## Guiding Principles

- **Deterministic gates first.** Alpha gate mode must be reproducible and suitable for promotion decisions.
- **Eval mode is separate.** Persona/LLM/Pi runs inform readiness and drift, but do not initially block Alpha.
- **Synthetic data only.** Harness data must be generated, traceable, and never copied from production users.
- **Neon branch isolation.** Product workflows run against disposable database branches.
- **Persistent evidence.** Test outcomes, artifacts, assertions, and observability refs must be queryable after the run.
- **First-party assertions.** Compliance, privacy, alpha posture, and business-outcome assertions belong in Spyglass-owned code.
- **Adapter-friendly agents.** Support deterministic drivers first, then add Pi/live-model adapters behind stable interfaces.

---

## Feature Inventory

Priorities:

- **P0**: Required before Alpha gate can be trusted.
- **P1**: Required before broad Alpha operations.
- **P2**: Useful for scale, reporting, or broader eval maturity.

Complexity:

- **S**: 1-2 days
- **M**: 3-5 days
- **L**: 1-2 weeks

| ID | Feature | Slug | Priority | Complexity | Spec Kit trigger |
|----|---------|------|----------|------------|------------------|
| PTH01 | Harness skeleton + scenario/result contracts | `026-product-harness-skeleton` | P0 | M | Create base package, contracts, runner shape, result model. |
| PTH02 | Neon branch + migration + seed lifecycle | `027-product-harness-neon-seeds` | P0 | M | Extend lower-level harness into product run lifecycle. |
| PTH03 | Persistent result store + artifacts contract | `028-product-harness-results-store` | P0 | M | Store run/scenario/step/assertion/artifact refs. |
| PTH04 | Deterministic seed factories | `029-product-harness-seed-factories` | P0 | L | Generate realistic synthetic users, employers, tickets, rubrics, policies, consents, keys, webhooks. |
| PTH05 | Deterministic Alpha gate scenarios A1-A5 | `030-alpha-gate-core-scenarios` | P0 | L | Happy path, missing/withdrawn consent, human review, jurisdiction kill switch. |
| PTH06 | Playwright product browser runner | `031-product-browser-gate-runner` | P0 | L | Seeker, employer, operator, alpha consent, informational-only surfaces. |
| PTH07 | Employer API + webhook receiver scenarios | `032-product-api-webhook-gates` | P0 | M | REST auth, req flow, webhook delivery/signature/idempotency/failure. |
| PTH08 | Observability and incident assertions | `033-product-observability-gates` | P0 | M | Audit, monitoring, Sentry config, incident evidence, no-secret logs. |
| PTH09 | Pi persona eval adapter | `034-pi-persona-eval-runner` | P1 | L | Simulated seekers/employers, encounter matrix, transcripts, tool traces, model usage. |
| PTH10 | Reports, dashboard, and CI/canary workflows | `035-product-harness-reporting-ci` | P1 | M | Markdown/JSON reports, GitHub Actions, Vercel preview/prod canaries, trend summaries. |
| PTH11 | Neon `test_harness` schema persistence | `036-product-harness-neon-result-store` | P0 | M | Add Neon-backed result store in isolated `test_harness` schema outside production. |
| PTH12 | Durable artifact storage | `037-product-harness-artifact-storage` | P0 | M | Store metadata in Neon and large artifacts in durable object storage. |
| PTH13 | Browserbase preview/prod replay driver | `038-product-harness-browserbase-driver` | P0 | M | Add Browserbase-backed headless Playwright driver for preview/prod replay and canaries. |
| PTH14 | Canary workflow hardening | `039-product-harness-canary-hardening` | P0 | M | Require and validate canary URL, Browserbase credentials, result-store DB URL, and artifact storage config for preview/prod canaries. |
| PTH15 | Eval trend and cost monitoring | `040-product-harness-eval-trends` | P1 | M | Persist eval cost, latency, outcome, and drift trends without making evals release-blocking. |
| PTH16 | Alpha harness operations runbook | `041-product-harness-operations-runbook` | P1 | S | Document setup, secrets, storage, canary operation, report interpretation, and response playbooks. |
| PTH17 | Camofox browser evaluation spike | `042-product-harness-camofox-spike` | P2 | S | Evaluate Camofox/Camoufox as an optional first-party testing fallback after Browserbase is available. |

---

## Implementation Phases

### Phase 1 - Harness Foundation

**Goal:** Establish the package, contracts, runner, DB lifecycle, and durable result model.

| Feature | Exit Criteria |
|---------|---------------|
| PTH01 | `packages/product-test-harness` exists; exports typed scenario, step, assertion, artifact, and run-result contracts; includes a no-op sample scenario and JSON/Markdown report writer. |
| PTH02 | A product run can create a Neon branch, apply migrations, expose `DATABASE_URL`, run a callback, and clean up. |
| PTH03 | Run results can be persisted to a dedicated test-control DB/schema or written through an interface with a local file implementation for early development. |

### Phase 2 - Synthetic Product State

**Goal:** Make product scenarios easy to seed consistently.

| Feature | Exit Criteria |
|---------|---------------|
| PTH04 | Seed factories cover principals, organizations, seekers, employers, tickets, policies, consents, human review, contracts, rubrics, signing keys, notification templates, and webhooks. Seeds are deterministic and versioned. |

### Phase 3 - Alpha Gate Scenarios

**Goal:** Implement deterministic product gates that can block Alpha promotion.

| Feature | Exit Criteria |
|---------|---------------|
| PTH05 | Core Alpha scenarios A1-A5 run without live models and assert business outcome, privacy, jurisdiction, alpha posture, dossier/evidence, and audit behavior. Complete and merged to `main` in PR #74. |
| PTH06 | Playwright drives key web journeys against a local or Vercel preview URL and captures screenshots/video/traces on failure. Complete and merged to `main` in PR #75. |
| PTH07 | Employer API and webhook scenarios verify auth, signing, idempotency, failure evidence, and payload boundaries. Complete and merged to `main` in PR #76. |
| PTH08 | Observability assertions verify audit events, monitoring signals, incident-ready evidence, Sentry production-like config, latency/cost capture, and no credential leakage. Complete and merged to `main` in PR #77. |

### Phase 4 - Persona Evals

**Goal:** Add broader seeker/employer encounter simulation without making nondeterminism a hard release gate.

| Feature | Exit Criteria |
|---------|---------------|
| PTH09 | `PiAgentDriver` can run at least one seeker/employer encounter matrix and persist persona ids, prompts, transcripts, tool calls, model/provider metadata, cost, latency, outcome, and evaluator summary. Complete and merged to `main` in PR #78. |

### Phase 5 - Operations and Reporting

**Goal:** Make harness output actionable for engineering, product, and compliance.

| Feature | Exit Criteria |
|---------|---------------|
| PTH10 | Commands and workflows exist for `product:gate`, `product:eval`, and `product:canary`; reports are readable and machine-queryable; Vercel preview/prod canaries can run manually or on schedule. Complete and merged to `main` in PR #79. |

### Phase 6 - Alpha Operationalization

**Goal:** Turn the completed harness into durable Alpha launch infrastructure.

| Feature | Exit Criteria |
|---------|---------------|
| PTH11 | `ProductResultStore` has a Neon-backed implementation that creates/uses an isolated `test_harness` schema, persists all PTH03-PTH10 snapshot categories, supports idempotent writes, and keeps production schemas untouched. |
| PTH12 | Large report, browser, trace, video, and transcript artifacts can be written to durable storage; result-store rows contain safe metadata refs, checksums, redaction status, and retention class. |
| PTH13 | Browser journeys can run through Browserbase-backed headless Playwright for preview/prod replay and canaries, with screenshots/traces/session refs captured as artifacts. |
| PTH14 | `alpha-canary.yml` fails fast when preview/prod canary requirements are missing, uses Browserbase and Neon persistence when configured, and keeps dry-run behavior explicit for local/manual non-prod use. |
| PTH15 | Persona eval reports persist trend points for cost, latency, outcome, tool refusals, model/provider version, and evaluator scores; evals remain informational until stability and cost thresholds are approved. |
| PTH16 | Operators can follow one runbook to provision `test_harness`, configure Browserbase and artifact storage, run canaries, read reports, and respond to failures. |
| PTH17 | Optional: Camofox/Camoufox is evaluated against the same `BrowserJourneyDriver` contract and compared to Browserbase for setup cost, pass rate, artifacts, security posture, and maintenance risk. |

---

## Required Scenario Coverage

The first complete Alpha gate suite should include:

| Scenario | Covered By | Gate? |
|----------|------------|-------|
| A1 Alpha happy path | PTH05, PTH06 | Yes |
| A2 Missing consent blocks flow | PTH05 | Yes |
| A3 Consent withdrawal blocks flow | PTH05 | Yes |
| A4 Human review required | PTH05 | Yes |
| A5 Jurisdiction kill switch | PTH05 | Yes |
| A6 Privacy boundary attempt | PTH05, PTH08 | Yes |
| A7 Prompt injection / unsafe tool request | PTH09 initially, later PTH05 deterministic fixture | Eval first, gate later |
| A8 Employer API + signed webhook | PTH07 | Yes |
| A9 Incident signal path | PTH08 | Yes |
| A10 Observability canary | PTH08, PTH10 | Yes before live Alpha |

---

## Persona Eval Matrix

Initial seeker personas:

- senior engineer
- career switcher
- under-qualified candidate
- over-qualified candidate
- privacy-sensitive seeker
- consent-withdrawal seeker
- low-evidence seeker
- prompt-injection attacker

Initial employer personas:

- structured compliant employer
- vague employer
- over-demanding employer
- jurisdiction-sensitive employer
- webhook-integrated employer
- policy-violating employer
- high-volume employer
- slow/nonresponsive employer

Initial encounter categories:

- strong match
- weak match
- insufficient evidence
- privacy attack
- protected-class boundary
- jurisdiction denial
- consent denial
- human review path
- webhook failure
- incident-triggering event

---

## Proposed Commands

```bash
pnpm product:gate
pnpm product:eval
pnpm product:canary
```

Additional package-level commands may include:

```bash
pnpm --filter @spyglass/product-test-harness test
pnpm --filter @spyglass/product-test-harness type-check
pnpm --filter @spyglass/product-test-harness run:sample
```

---

## CI and Environment Plan

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `product-gate.yml` | manual, PR label, pre-Alpha release branch | Run deterministic Alpha gate suite against Neon branch and local/Vercel URL. |
| `persona-eval.yml` | manual, scheduled during Alpha | Run Pi/live-model persona matrix and store eval results. |
| `alpha-canary.yml` | post-deploy, scheduled | Exercise small deployed Alpha flow and verify observability evidence. |

Required secrets are expected to include:

- `NEON_API_KEY`
- `NEON_PROJECT_ID`
- `NEON_PARENT_BRANCH_ID`
- Vercel preview/prod URL inputs
- `PRODUCT_HARNESS_DATABASE_URL` or equivalent non-prod Neon URL with access to the isolated `test_harness` schema
- Browserbase credentials for preview/prod replay and canaries
- Pi/model provider credentials for eval mode only
- artifact storage credentials and bucket/blob-store identifiers for durable report/browser/eval artifacts

---

## Operational Decisions

| Decision | Resolution | Notes |
|----------|------------|-------|
| Persistent result storage | Use an isolated `test_harness` schema outside production. | Keep harness metadata and run summaries queryable without sharing production application schemas. |
| Browser execution | Use headless execution, with Browserbase planned for preview/prod replay and canaries. | Local Playwright remains acceptable for development, but preview/prod canaries should target Browserbase-backed execution. |
| Pi integration depth | Start with the thin `PiAgentDriver` adapter behind the stable agent-driver interface. | Keep provider/session details behind the adapter boundary so Pi integration can deepen without changing report/result contracts. |
| LLM eval gating | Keep evals informational until stability and cost are measured. | Persona/LLM evals inform readiness and drift, but do not block Alpha promotion until the signal is proven stable. |
| Artifact retention | Store metadata in the DB and large artifacts in durable object storage. | Use Neon for metadata; use Vercel/available durable storage for large report, browser, trace, video, and transcript artifacts. |
| Main roadmap integration | Add and maintain a main-product roadmap pointer to this completed harness roadmap. | The harness roadmap remains separate, with the root PRD pointing to it as the Alpha-readiness validation roadmap. |

---

## Next Build Sequence

1. **PTH11 Neon `test_harness` schema persistence**: establish the durable metadata store first so later Browserbase, artifact, canary, and eval-trend work has a stable persistence target.
2. **PTH12 Durable artifact storage**: add blob/object storage refs and retention classes before preview/prod canaries start producing large browser artifacts.
3. **PTH13 Browserbase preview/prod replay driver**: add the managed headless driver for canary-grade browser execution.
4. **PTH14 Canary workflow hardening**: make preview/prod canaries fail fast on missing config and use Neon, Browserbase, and artifact storage when configured.
5. **PTH15 Eval trend and cost monitoring**: persist informational eval trends so the team can later decide whether any eval becomes release-blocking.
6. **PTH16 Alpha harness operations runbook**: close the operational loop with provisioning, secret, retention, report-interpretation, and incident-response guidance.
7. **PTH17 Camofox browser evaluation spike**: optional after PTH13, only if Browserbase or stock Playwright exposes bot-detection friction on first-party Spyglass preview/prod surfaces.

---

## Spec Kit Execution Plan

Use one Spec Kit feature per roadmap feature. Recommended first command:

```text
/speckit-specify PTH01 product harness skeleton and scenario result contracts
```

For each feature:

1. Generate or update `spec.md`.
2. Clarify only if blocking ambiguity remains.
3. Produce `plan.md` with architecture and validation strategy.
4. Generate `tasks.md`.
5. Run `/speckit-analyze`.
6. Implement tasks.
7. Record quickstart or staged-run evidence.
8. Review, commit, push, and open PR.

---

## Definition of Alpha Harness Ready

The harness is ready to support Alpha launch when:

- `pnpm product:gate` runs end to end from a clean checkout.
- Each run creates and cleans up an isolated Neon branch.
- A1-A6, A8, A9, and A10 pass deterministically.
- Reports include run id, scenario id, seed version, commit SHA, app URL, branch id, artifacts, and evidence refs.
- Failures identify the failed product step and assertion.
- No real production data is used.
- No secrets appear in logs, reports, screenshots, videos, or webhook artifacts.
- Product, engineering, and compliance reviewers can read the summary without parsing raw logs.
