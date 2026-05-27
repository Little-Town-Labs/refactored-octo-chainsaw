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
| **Target platform** | Existing Spyglass pnpm/Turborepo monorepo, Vercel preview/prod URLs, Neon branch isolation, Playwright, optional Browserbase, optional Pi adapter. |
| **Total features** | 10 |
| **Implementation phases** | 5 |
| **Critical path** | PTH01 -> PTH02 -> PTH03 -> PTH04 -> PTH05 -> PTH06 -> PTH08 |
| **Parallelizable** | PTH07 Browserbase adapter, PTH09 Pi persona evals, and PTH10 reporting/dashboard after PTH03 result contracts stabilize. |

This roadmap converts the Product Readiness Harness PRD into feature-sized Spec Kit work. Each feature should be delivered through the normal Spec Kit sequence and should produce durable artifacts under `.specify/specs/` before implementation.

---

## Current Status

| Feature | Status | Notes |
|---------|--------|-------|
| PTH00 Product Readiness Harness PRD | Complete | `docs/testing/product-harness/PRD.md` created from Alpha-readiness, Neon, Playwright, Browserbase, Pi persona, and observability requirements. |
| PTH01 Harness skeleton + scenario/result contracts | Complete | Merged to `main` in PR #70; `@spyglass/product-test-harness` now provides scenario/result contracts, runner, reports, sample scenario, and tests. |
| PTH02 Neon branch + migration + seed lifecycle | Complete | Merged to `main` in PR #71; product harness now supports disposable database branch lifecycle, migration, seeding, cleanup policy metadata, redaction, and lifecycle tests. |
| PTH03 Persistent result store + artifacts contract | In progress | Active on branch `028-product-harness-results-store`; Spec Kit artifacts target `.specify/specs/028-product-harness-results-store`. |
| PTH04-PTH10 | Not started | Later roadmap slices remain queued. |

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
| PTH05 | Core Alpha scenarios A1-A5 run without live models and assert business outcome, privacy, jurisdiction, alpha posture, dossier/evidence, and audit behavior. |
| PTH06 | Playwright drives key web journeys against a local or Vercel preview URL and captures screenshots/video/traces on failure. |
| PTH07 | Employer API and webhook scenarios verify auth, signing, idempotency, failure evidence, and payload boundaries. |
| PTH08 | Observability assertions verify audit events, monitoring signals, incident-ready evidence, Sentry production-like config, latency/cost capture, and no credential leakage. |

### Phase 4 - Persona Evals

**Goal:** Add broader seeker/employer encounter simulation without making nondeterminism a hard release gate.

| Feature | Exit Criteria |
|---------|---------------|
| PTH09 | `PiAgentDriver` can run at least one seeker/employer encounter matrix and persist persona ids, prompts, transcripts, tool calls, model/provider metadata, cost, latency, outcome, and evaluator summary. |

### Phase 5 - Operations and Reporting

**Goal:** Make harness output actionable for engineering, product, and compliance.

| Feature | Exit Criteria |
|---------|---------------|
| PTH10 | Commands and workflows exist for `product:gate`, `product:eval`, and `product:canary`; reports are readable and machine-queryable; Vercel preview/prod canaries can run manually or on schedule. |

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
- Browserbase credentials if remote browser execution is enabled
- Pi/model provider credentials for eval mode only
- result-store database URL

---

## Open Decisions

| Decision | Options | Default Recommendation |
|----------|---------|------------------------|
| Persistent result storage | Separate Neon project vs non-prod schema | Separate Neon project if operationally simple; otherwise isolated `test_harness` schema outside production. |
| Browser execution | Local Playwright vs Browserbase-backed Playwright | Local Playwright for gate development; Browserbase for preview/prod replay and canaries. |
| Pi integration depth | `pi-ai`, `pi-agent-core`, CLI/session adapter | Start with a thin `PiAgentDriver` spike behind our `AgentDriver` interface. |
| LLM eval gating | Blocking vs informational | Informational until stability and cost are measured. |
| Artifact retention | GitHub artifacts, object storage, DB refs | Store metadata in DB, large artifacts in durable object storage. |
| Main roadmap integration | Separate harness roadmap vs merge into Spyglass roadmap | Keep separate until PTH01 is planned; then add a main-roadmap pointer. |

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
