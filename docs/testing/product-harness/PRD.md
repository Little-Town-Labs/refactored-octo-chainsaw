# Product Readiness Harness PRD

## 1. Purpose

Spyglass needs an automated product-readiness harness before Alpha testing. Existing tests prove package behavior, schema conventions, API contracts, and feature quickstarts, but they do not yet exercise full product workflows with realistic users, employers, agents, seeded data, browser/API paths, observability checks, and persistent run evidence.

This harness will provide two related capabilities:

1. **Alpha gate mode**: deterministic, repeatable tests that must pass before Alpha users are allowed onto a build.
2. **Eval mode**: larger simulated encounter runs using seeker and employer personas, including Pi-backed agents, to measure product behavior, safety, compliance posture, and drift over time.

## 2. Goals

- Automate realistic end-to-end product journeys before Alpha.
- Use isolated Neon database branches for each test run.
- Seed realistic seekers, employers, roles, rubrics, consents, policies, tickets, and agent contracts.
- Drive the product through browser, API, package, and agent surfaces.
- Capture durable test results, evidence, observability signals, artifacts, screenshots, videos, and agent traces.
- Support deterministic release-gating tests and broader nondeterministic eval runs separately.
- Make Alpha readiness auditable: every pass/fail should have evidence, seed ids, scenario version, commit SHA, environment, and assertions.

## 3. Non-Goals

- This harness will not replace package unit tests or existing feature quickstart scripts.
- This harness will not make LLM-driven persona evals a hard release gate initially.
- This harness will not store production user data.
- This harness will not use production databases for test execution.
- This harness will not depend on one browser/agent vendor for core release gates.

## 4. Users

- **Product/operator team**: wants to know whether a build is ready for Alpha.
- **Engineering team**: wants repeatable failures with enough evidence to debug quickly.
- **Compliance/counsel reviewers**: want evidence that consent, informational-only posture, privacy boundaries, jurisdiction gates, audit trails, and incident readiness are working.
- **Founder/partner reviewers**: want readable scenario outcomes and business-level readiness signals.

## 5. Operating Modes

### 5.1 Gate Mode

Gate mode is deterministic and should be allowed to block Alpha promotion.

Characteristics:

- Uses fixed seed data.
- Uses deterministic agent drivers where possible.
- Uses Playwright and direct API calls for stable assertions.
- Runs against a Vercel preview or local deployment.
- Uses an isolated Neon branch.
- Stores a run report and machine-readable results.
- Fails on missing evidence, incorrect business outcome, privacy leak, bad audit trail, missing observability signal, or performance budget breach.

### 5.2 Eval Mode

Eval mode measures behavior across many simulated encounters. It informs readiness and drift detection but should not initially block deployment.

Characteristics:

- Uses persona-driven seeker and employer agents.
- May use Pi-backed agent sessions.
- May use live model providers.
- Captures transcripts, tool calls, token/cost metrics, evaluator judgments, and outcome distributions.
- Runs scenario matrices rather than a small fixed suite.
- Can include adversarial or ambiguous interactions.

## 6. Directory and Package Structure

Initial documentation lives here:

```text
docs/testing/product-harness/
  PRD.md
```

Proposed implementation layout:

```text
packages/product-test-harness/
  src/
    agents/
    api/
    assertions/
    browser/
    db/
    observability/
    results/
    scenarios/
    seeds/
    webhooks/

tests/product/
  scenarios/
  fixtures/
  playwright/
```

Existing `packages/test-harness` remains the lower-level shared utility package for Neon branch lifecycle, migrations, fake clocks, and audit sinks.

## 7. Core Capabilities

### 7.1 Neon Branch Lifecycle

The harness must:

- Create an ephemeral Neon branch per test run.
- Apply current migrations.
- Seed deterministic test data.
- Provide `DATABASE_URL` to app/API/browser runners.
- Delete the branch after the run.
- Sweep orphaned branches in CI.
- Record branch id, parent branch id, migration version, seed version, and cleanup result.

### 7.2 Persistent Test Result Store

The harness should write results to a dedicated test-control database or isolated schema, not the production app schema.

Recommended tables:

- `test_runs`
- `test_scenarios`
- `test_steps`
- `test_assertions`
- `test_seed_records`
- `test_agent_invocations`
- `test_browser_artifacts`
- `test_webhook_captures`
- `test_observability_assertions`
- `test_result_artifacts`

Each run should include:

- commit SHA
- branch/ref
- scenario version
- seed version
- app URL
- Neon branch id
- runner version
- mode: `gate` or `eval`
- start/end timestamps
- pass/fail status
- artifact refs

### 7.3 Seed Data Factories

The harness must provide deterministic factories for:

- human principals
- service principals
- agent principals
- seekers
- employers
- organizations
- job requirements
- seeker tickets
- employer requirement tickets
- match tickets
- jurisdiction policies
- consent records
- human review decisions
- agent contracts
- rubrics
- bias-test evidence
- privacy rulesets
- notification templates
- webhook endpoints
- signing keys

Seed data must be versioned and traceable to each scenario run.

### 7.4 Browser Automation

Use Playwright as the primary browser automation layer.

Required browser journeys:

- seeker landing page
- seeker sign-in/sign-up/profile
- employer console
- employer req creation
- employer candidate review
- operator credential/audit views
- alpha consent and informational-only surfaces

The harness should support:

- local Playwright
- Vercel preview URL testing
- optional Browserbase remote browser execution
- screenshot, video, trace, console log, and network capture

### 7.5 API and Webhook Automation

The harness must test:

- employer REST API auth
- req creation/update/close
- webhook registration
- webhook signature verification
- webhook idempotency
- webhook retry/failure behavior
- service credential issuance and verification

It should include a synthetic webhook receiver that records received payloads, headers, signature verification result, and delivery timing.

### 7.6 Agent Simulation

The harness must support multiple agent drivers:

```text
AgentDriver
  DeterministicAgentDriver
  SpyglassPackageAgentDriver
  PiAgentDriver
  LiveModelAgentDriver
```

Gate mode should default to deterministic drivers.

Eval mode may use Pi-backed agents to represent:

- different job seeker personas
- different employer personas
- adversarial users
- confused users
- privacy-sensitive users
- noncompliant employers
- high-quality and low-quality matches

### 7.7 Pi Persona Layer

Pi should be considered for persona simulation and agent-session capture.

Expected role:

- Represent simulated seekers and employers.
- Execute multi-turn interactions.
- Use tools exposed by the Spyglass harness.
- Capture persona prompts, messages, tool calls, model/provider metadata, costs, and failure states.
- Replay or summarize sessions for evaluation.

Pi should not own:

- database branch lifecycle
- seed data truth
- release-gate assertions
- compliance assertions
- Vercel deployment orchestration
- browser hard gates

### 7.8 Observability Assertions

The harness must verify that expected operational signals exist.

Required checks:

- audit events were written
- monitoring signals were emitted when expected
- incident-response evidence is generated for synthetic incident paths
- Sentry DSN is configured in production-like runs
- no credential values appear in logs
- webhook failures produce reviewable evidence
- latency and cost budgets are captured
- privacy/jurisdiction/alpha gate decisions are queryable

## 8. Required Alpha Readiness Scenarios

### A1. Alpha Happy Path

Seeker and employer consent, employer creates req, seeker profile exists, match progresses, Parley completes, dossier generated, informational-only posture is preserved.

Pass criteria:

- alpha gate allows flow
- dossier is signed
- informational-only marker is present
- audit events exist
- no raw private data crosses audience boundary

### A2. Missing Consent Blocks Flow

Attempt Alpha workflow without required seeker or employer consent.

Pass criteria:

- flow blocks
- reason code is stable
- audit evidence exists
- UI/API response is safe and non-leaky

### A3. Consent Withdrawal Blocks Flow

Consent is withdrawn mid-flow.

Pass criteria:

- subsequent alpha gate blocks
- existing evidence remains reviewable
- no new dossier dispatch occurs

### A4. Human Review Required

Scenario requires human review before progression.

Pass criteria:

- gate blocks until human review evidence exists
- reviewer principal is attributed
- decision and evidence ref are queryable

### A5. Jurisdiction Kill Switch

Operator disables a jurisdiction without deployment.

Pass criteria:

- new decisions deny within the expected window
- failure artifact is non-PII
- audit event exists

### A6. Privacy Boundary Attempt

Employer attempts to access seeker-only data or protected/private content.

Pass criteria:

- privacy filter refuses or redacts
- employer projection excludes private data
- refusal evidence exists

### A7. Prompt Injection / Unsafe Tool Request

Simulated seeker or employer attempts prompt injection or unsupported tool use.

Pass criteria:

- agent refuses or routes to safe fallback
- reason code is captured
- no unsafe action executes

### A8. Employer API + Signed Webhook

Employer creates a req via API and receives signed webhook event.

Pass criteria:

- API auth succeeds with scoped credential
- webhook signature verifies
- idempotency is preserved
- payload does not include forbidden fields

### A9. Incident Signal Path

Synthetic privacy/security signal is injected.

Pass criteria:

- monitoring signal classifies severity
- incident-ready evidence exists
- notification obligation path can be evaluated

### A10. Observability Canary

Run a small synthetic Alpha flow after deployment.

Pass criteria:

- audit, monitoring, logs, and artifacts are present
- no secrets appear in logs
- expected timing/cost metrics are captured

## 9. Persona Eval Matrix

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

Encounter categories:

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

## 10. Assertions

Every scenario should support assertions across:

- business outcome
- ticket state
- consent state
- jurisdiction gate decision
- alpha posture decision
- privacy decision
- agent decision
- dossier status
- notification/webhook outcome
- audit trail
- observability signals
- latency and cost budgets
- forbidden data exposure

## 11. Artifacts

The harness should capture:

- scenario JSON result
- Markdown summary
- browser screenshots
- browser videos/traces
- API request/response summaries with secrets redacted
- webhook captures
- agent transcripts
- tool-call traces
- model/provider usage
- audit event refs
- dossier refs
- monitoring signal refs
- Sentry event refs where applicable

## 12. CI and Deployment Integration

Recommended commands:

```bash
pnpm product:gate
pnpm product:eval
pnpm product:canary
```

Recommended workflows:

- `product-gate.yml`: manual and label-triggered PR workflow.
- `alpha-canary.yml`: scheduled and post-deploy workflow against Vercel preview/production.
- `persona-eval.yml`: manual matrix run for Pi/live-model persona evaluations.

Gate mode should be required before Alpha launch approval. Eval mode should produce reports and trend data.

## 13. Security and Privacy Requirements

- Test secrets must never be logged.
- Test data must be synthetic.
- Test result storage must be isolated from production data.
- Browser/session artifacts must be retained under an explicit policy.
- Any live-model eval must mark transcripts as synthetic.
- Prompt/persona files must not contain real applicant or employer data.
- Webhook receiver artifacts must redact credentials and signatures by default.

## 14. Open Questions

- Should persistent test-result storage live in a separate Neon project or a dedicated schema in a shared non-production project?
- What retention period should apply to Alpha readiness artifacts?
- Which Browserbase features are worth paying for initially: remote execution, replay, session recording, or all of them?
- Which Pi package should be adopted first: `pi-ai`, `pi-agent-core`, or a thin CLI/session adapter?
- Should eval-mode persona transcripts be included in counsel review packets?
- What minimum scenario pass rate is required before inviting Alpha users?

## 15. Milestones

### M1. Harness Skeleton

- Create `packages/product-test-harness`.
- Add scenario/result types.
- Add seed registry.
- Add result writer.
- Add first Markdown/JSON report output.

### M2. Neon + Seed Runner

- Create ephemeral Neon branch.
- Apply migrations.
- Seed baseline Alpha data.
- Tear down branch.
- Persist run metadata.

### M3. Deterministic Gate Scenarios

- Implement A1-A5 without Pi/live models.
- Add `pnpm product:gate`.
- Add CI workflow.

### M4. Browser + API Coverage

- Add Playwright.
- Add employer API and webhook receiver scenarios.
- Capture browser artifacts.

### M5. Observability Assertions

- Assert audit, monitoring, incident, and log evidence.
- Add canary mode for Vercel deployments.

### M6. Pi Persona Eval Adapter

- Add `PiAgentDriver`.
- Implement initial seeker/employer persona matrix.
- Persist agent invocations and transcripts.
- Produce eval summary report.

## 16. Success Metrics

- Alpha gate can run end to end from one command.
- Every run creates an isolated database branch and cleans it up.
- Every scenario has deterministic seed ids and evidence refs.
- Gate-mode failures identify the failing product step and assertion.
- Persona eval mode can run at least 25 seeker/employer encounter combinations.
- Reports are understandable by engineering, product, and compliance reviewers.
- No production data or secrets are used in harness execution.

