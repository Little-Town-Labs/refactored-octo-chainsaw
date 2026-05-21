# Project Spyglass — Implementation Roadmap

**Version:** 1.5.5
**Created:** 2026-05-06
**Last Amended:** 2026-05-21
**Owner:** Gary
**PRD source:** `PRD.md` (Draft v0.1, 2026-05-05)
**Constitution:** `.specify/memory/constitution.md` (v1.1.0)
**Compliance posture:** `docs/COMPLIANCE_ARCHITECTURE.md`
**Parley spec:** `/mnt/f/parley/SPEC.md`; design rationale in `/mnt/f/parley/PARLEY_ADAPTATIONS.md`

---

## Executive Summary

| | |
|---|---|
| **Product vision** | Two-sided AI hiring platform where seeker and employer advocates negotiate via Parley, each scoring fit against its own versioned rubric. Mutual threshold clearance escalates to a human introduction. |
| **Target launch** | v0 ≡ Phase 1 (3–5 US states, no AEDT-specific law). Phase 0 private alpha precedes v0 and runs the same code under "informational only / no production hiring decisions" posture. |
| **Total features** | 27 |
| **Implementation phases** | 8 |
| **Estimated timeline** | ~20 weeks to Phase 0 alpha; Phase 1 launch follows counsel review and bias audit completion |
| **Critical path** | F01 → F02 → F04 → F05 → F08 → F13/F14 → F20 → F25 |
| **Parallelizable** | Channel adapters (F17–F19); seeker vs. employer surfaces; privacy filter (F09) parallel with Parley runner (F08); F08.5 tool dispatcher parallel with F08 runner |

This roadmap converts `PRD.md` §6 ("v0 Scope") and §10 ("Open Questions") into
a sequenced feature list, refined against Parley's normative spec
(`/mnt/f/parley/SPEC.md` §4–§18). Every feature is tied to a constitutional
article; foundational-article work is gated by `/security-review` and threat
modeling per `.specify/memory/constitution.md` §V.3.

---

## Current Status (2026-05-21)

| Feature | Status | Notes |
|---------|--------|-------|
| **F01** Monorepo scaffold | ✅ **Complete** (merged to `main`) | A1–A10 closed; CI green; SBOM published; signed releases; lefthook + lint/test/type-check; Neon verified |
| **F02** Identity & Auth | ✅ **Complete** (merged to `main` at `1d5e4ca`, PR #25) | B1–B9 closed; 384 tests green; 17/18 CI gates passing. Operator-run gates deferred: B6 (Scenarios 10+11 + NVDA), B7 (Scenario 6 + drill), B8 (T071 metrics + T072 end-to-end). |
| **F03** Database schema umbrella | ✅ **Complete** (merged to `main` at `0ab3b69`, PR #26) | Governance envelope over F02's shipped schema: data-classification register (6 classes · 8 tables · 73 cols), retention-policy (per-class horizons), schema-conventions (10 sections), integrity-invariants catalog (46 rows), schema-lint CI gate (19/19 checks green). Counsel review of `retention-policy.md` flagged pending; not blocking merge, blocks Phase 1 jurisdictional admission. |
| **F04** Ticket store + state machines | ✅ **Complete** (merged to `main` at `cbcbd56`, PR #38) | Seeker, employer-req, and match ticket tables/state machines shipped with ticket scopes, server actions/tRPC wiring, CI state-machine/principal gates, benchmark baseline, operator runbook, and F04 closure reviews. Follow-up dependency cleanup landed through PRs #28, #30, #31, #34, #35, #36, #37, and #39. |
| **F05** Audit log + transcript store + tombstone | ✅ **Complete** (merged to `main`, PR #40) | Canonical hash-chained audit package, replay, transcript append/read primitives, redaction-by-tombstone with denial audit events, evidence export manifests, runbooks, quickstart evidence, and final package gates are complete. Operational tombstone use still requires counsel/legal-hold wiring before Phase 2 use. |
| **F06** Jurisdiction policy gates + kill switches | ✅ **Complete** (merged to `main`, PR #41) | DB-backed jurisdiction posture, fail-safe gate evaluator, no-deploy kill switches, non-PII failure artifacts, scoped review reads, runbook, quickstart evidence, and final package gates are complete. |
| **F07a** Agent Contract Registry | ✅ **Complete** (merged to `main`, PR #42) | Immutable agent contract versions, scoped publication/deprecation, dispatch-time resolution, fail-closed reason codes, provenance/audit evidence, scoped review reads, runbooks, quickstart evidence, and final package gates are complete. |
| **F07b** Rubric Registry + bias-test dispatch gate | ✅ **Complete** (merged to `main`, PR #43) | Immutable rubric versions, bias-test artifact registration, dispatch refusal for missing/invalid bias evidence, deterministic weighted scoring, scoped review reads, runbook, quickstart evidence, and package gates are complete. |
| F08–F25 | ⏳ In progress | F08 Parley Runner is complete and merged to `main` in PR #48 with quickstart evidence recorded and CI rerouted to the PowerBox self-hosted runner; F08.5 Tool Surface & Dispatcher is complete and merged to `main` in PR #44; F09 Privacy Filter is complete and merged to `main` in PR #45; F10 Dossier Builder + Signer is complete and merged to `main` in PR #46 with quickstart evidence recorded; F11 Candidate Notification Artifact System is complete and merged to `main` in PR #47 with quickstart evidence recorded. F12 AI Infrastructure is complete and merged to `main` in PR #49 with quickstart evidence recorded. F13 Seeker Advocate Agent is implemented on branch `013-seeker-advocate` with quickstart evidence recorded; F14 Employer Advocate Agent is the next Stage 5 baseline. |

### F02 sub-slice progress (branch `02-identity-auth-aaa`)

| Slice | Scope | Tasks | Status |
|-------|-------|-------|--------|
| **B1** | `packages/auth` skeleton + Principal model + CI gates | T001–T012 | ✅ |
| **B2** | Clerk + materializer + webhook + revocation + reconciliation + Drizzle repo | T013–T026 | ✅ |
| **B3** | AAL2 enforcement + role/scope guards + operator runbook | T027–T034 | ✅ |
| **B4** | Agent-credential schema + EdDSA mint/verify + JWKS + bootstrap + issuance + revocation/listing/pruner | T034b–T048 | ✅ |
| **B5.1** | `service_credentials` schema + migration | T049, T050 | ✅ |
| **B5.2** | Bootstrap-exchange handler + rotation (FR-25, FR-26, FR-26a, NFR-5) | T051, T052, T055 | ✅ |
| **B5.3** | Vercel-OIDC rejection guard at in-app service surfaces (FR-26b, FR-26c) | T053, T054 | ✅ |
| **B6** | Operator console UI: list/issue/revoke + audit viewer + two-operator sign-out gate + auth banners + a11y artifact | T047b, T056–T062 ✅ | ✅ (impl) — gate pending operator-run scenarios |
| **B7** | Lifecycle runbooks + compromise drill (FR-39, FR-40) | T063, T064 ✅ / T065 ✅ (scaffold) | ✅ (impl) — gate pending Scenario 6 + Gary review + operator-run drill |
| **B8** | STRIDE threat model + `/security-review` round-trip + (deferred) metrics + quickstart | T067, T068, T069, T070 ✅ / T071, T072 ⏳ | ✅ (impl) — gate pending T071 metrics + T072 quickstart end-to-end |
| **B9** | Final `/code-review` + `/simplify` + merge to `main` | T073–T078 | ⏳ |

Discipline: every slice runs `code-reviewer` + `code-simplifier` before
commit. 384 tests green at HEAD (`55ab86b`) — 242 auth + 142 web;
type-check + lint clean across the workspace.

**B6 implementation closed.** T047b operator credential listing,
T056 list page, T057 issue form, T058 revoke action, T059a audit
buffer + sink, T059 audit viewer, T059b two-operator
revoke-all-sessions backend orchestrator, T060 sign-out confirmation
UI + Drizzle adapters, T061 enumeration-resistant auth banners
(NFR-13, NFR-14), and T062 WCAG 2.2 AA verification artifact
(`docs/security/operator-console-a11y.md` — 35 SCs pass, 6 pending
environment verification once design tokens land, 0 failing) are
all in. **B6 gate** still requires an operator-run pass of
Quickstart Scenarios 10 (enumeration resistance) and 11 (operator
console workflow) against a live dev server + NVDA. Deferred
follow-ups: jest-axe integration into view tests, per-route
metadata.title, query-string flash hardening (signed cookie / HMAC)
across all B6 surfaces, design-token landing.

---

## Feature Inventory

Each feature gets a numeric ID (`F##` or `F##x`) and a slug suitable for
`/speckit-specify F##-slug`. Priorities:

- **P0 — Critical.** Required for Phase 0 alpha; blocks downstream features.
- **P1 — High.** Required for v0 / Phase 1 launch.
- **P2 — Medium.** Required before Phase 2 (NYC) or for production-readiness.
- **P3 — Low.** Deferred beyond v0 unless promoted.

Complexity: **S** (1–2w), **M** (2–4w), **L** (4–8w), **XL** (8w+).

---

### Stage 1 — Foundation

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F01 | Monorepo scaffold + tech-stack baseline | `01-monorepo-scaffold` | P0 | M | I.C (SBOM, signed deps, SLSA L3); IV (SoC) |
| F02 | Identity & Auth (Clerk + AAA primitives) | `02-identity-auth-aaa` | P0 | M | I.5 (AAA); I.6 (DiD); II (agent identity) |
| F03 | Database schema + Drizzle migrations | `03-db-schema-migrations` | P0 | S | I.2 (integrity); I.4 (data classes for retention) |

**Stage 1 goal.** Establish the repo, deploy pipeline, auth foundation, and
data layer — nothing in this phase is product-visible, but everything else
depends on these three.

**Notes:**
- F01 includes pnpm/Turborepo, Vercel project linking, Neon provisioning,
  Inngest setup, Vercel AI Gateway wiring, CI with SBOM generation
  (CycloneDX), Sigstore-signed releases, and SLSA Level 3 build provenance
  per Constitution §I.C.2.
- F02 establishes scoped/short-lived agent credentials, MFA for
  operator/employer-admin surfaces (NIST 800-63B AAL2), and the
  verifiable-principal pattern Article II demands.
- F03 must declare retention horizons per data class per Article I.4.2,
  even if specific durations are TBD pending counsel.

---

### Stage 2 — Ticket Spine

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F04 | Ticket store + state machines (seeker / employer-req / match) | `04-ticket-store-state-machines` | P0 | L | I.2; II (canonical data spine for agents) |
| F05 | Hash-chained audit log + canonical transcript store + redaction-by-tombstone | `05-audit-log-tombstone` | P0 | L | I.2; I.4.3 (tombstone); I.D (forensic readiness); Parley §13 |

**Stage 2 goal.** The data spine the PRD calls "first spec" in §11.5.
Everything from Parley onward writes through these.

**F05 scope (expanded per Parley §13).** Three co-deployed stores:
1. **Hash-chained audit log** of state transitions and events.
2. **Canonical transcript store** of negotiation turns, with stricter
   access controls than the dossier (Parley §13 explicitly separates
   these — the dossier is the consumer-facing artifact; the transcript
   store is the source-of-truth).
3. **Redaction-by-tombstone procedure** (Constitution §I.4.3) covering
   both stores, with the tombstone itself being an audited event.

The tombstone procedure ships in code; operational use requires counsel
sign-off before Phase 2 per Constitution §V.4.

---

### Stage 3 — Compliance Spine

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F06 | Jurisdiction tagging + policy gates + geographic kill switches | `06-jurisdiction-policy-gates` | P0 | M | I.A (Parley primitives 1, 2, 5); I.B |
| F07a | Agent Contract Registry | `07a-agent-contract-registry` | P0 | M | III.3 (immutable versioned contracts); II; Parley §4.1.2, §5 |
| F07b | Rubric Registry + bias-test dispatch gate | `07b-rubric-registry-bias-gate` | P0 | L | I.A (primitive 3); I.A.1 (NIST AI RMF); I.A.2 (audit cadence); Parley §5.4, §17.1, §18.2 |

**Stage 3 goal.** The compliance harness lives at this layer. Parley
separates Agent Contracts from Rubrics — they are co-deployed but
independently versioned, so each gets its own feature.

**F07a — Agent Contract Registry.** Pins `(contract_id, version)` to a
prompt-template ref, rubric ref, tool-surface ref, model selection, and
runtime settings. Immutable for all time. Every dossier records the exact
`(contract_id, version)` that produced it. Contract version updates do not
invalidate in-flight runs — runs complete under their dispatch-time
contract (Parley §7.4, §14.3).

**F07b — Rubric Registry + bias-test dispatch gate.** This is sharper
than "rubric registry":
- `(rubric_id, version)` immutable for all time (Parley §5.1).
- **Prompt templates MUST NOT embed dimension weights or scoring
  guidance.** Rubric resolution and prompt rendering are separate paths
  (Parley §5.4, §12.2).
- **Harness computes weighted totals deterministically.** Any holistic
  score the model produces is **ignored AND audited** as a regression
  signal (Parley §10.4, §17.5 — CI-gated).
- Each rubric version MUST carry a `bias_test_ref`.
- **Production posture refuses to dispatch a run whose rubric lacks a
  bias-test artifact** (Parley §5.4, §17.1, §18.2 — CI-gated). This is
  the strongest expression of Constitution §I.A primitive 3.
- Bias-test methodology is policy artifact referenced from the registry,
  not encoded in the harness (Parley `PARLEY_ADAPTATIONS.md` open item).

**F06 notes.** Includes the per-jurisdiction config store, gate-evaluation
engine, structured failure-dossier shape (never silent skip), and an ops
surface for flipping kill switches without a deploy. Fail-safe default per
Constitution §I.6: missing or unknown jurisdiction = deny.

---

### Stage 4 — Parley Harness

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F08 | Parley runner (six Inngest functions, run-to-completion) | `08-parley-runner` | P0 | L — Complete (merged to `main`, PR #48) | II (agent-first runtime); Parley §7, §8, §10.5 |
| F08.5 | Tool Surface & Dispatcher (versioned catalog, type-level enforcement) | `08-5-tool-surface-dispatcher` | P0 | M — Complete (merged to `main`, PR #44) | I.5.2 (least privilege); I.6 (DiD); Parley §4.1.2, §5.5, §10.3, §17.5 |
| F09 | Privacy filter module (no-model, sentinel-wrapped, CI-gated) | `09-privacy-filter` | P0 | L — Complete (merged to `main`, PR #45) | I.1; I.6; PRD §4.4, §9; Parley §9, §15.1, §15.2, §17.4–17.6 |
| F10 | Dossier builder + signer + per-audience projections + verifier | `10-dossier-builder-signer` | P0 | L — Complete (merged to `main`, PR #46) | I.2; I.C.1; I.A; Parley §4.1.8, §15.4 |
| F11 | Candidate notification artifact system | `11-candidate-notifications` | P0 | M — Complete (merged to `main`, PR #47) | I.A (primitive 4); I.A.1 (EU AI Act Art. 86); Parley §13.7 |

**Stage 4 goal.** The negotiation engine. F08, F08.5, F09, F10 are
co-dependent but parallelizable in isolation: F09 and F08.5 can be built
and tested standalone before F08 integration.

**F08 scope (expanded per Parley §7–§10).**
- **Six Inngest functions** corresponding to Parley §8: dispatch,
  coordination, per-side runs (×2), privacy filtering, dossier production,
  run invalidation. No polling.
- **Run-to-completion contract.** Agents MUST NOT pause for human input
  mid-negotiation (Parley §7, §10.5). Inability to score surfaces as an
  `inconclusive` dossier with flags, never a paused run.
- **Tool-catalog scan** (Parley §17.5) ensures the harness advertises no
  tool whose semantics include "ask the principal" or "wait for human
  confirmation."
- **Round cap** default = 3 (Parley §6.4). Contracts MAY specify a lower
  `round_cap_contribution`; effective cap = minimum across both sides.
- **No filesystem workspaces.** `NegotiationContext` is in-memory per
  side, per run (Parley §4.1.5, §9). Durability comes from the audit log
  and dossier persistence.
- **No hot-reload of policy files** (Parley §6.2). Harness config is
  frozen per deployment; runs complete under their dispatch-time config.
  Aligns with Constitution §I.C.2 (prompts/rubrics/configs are release
  events, not edits).
- **Five isolation invariants** (Parley §9), three of which are CI-gated
  (per-run isolation; per-side isolation; counterparty-access type-level
  prohibition) — see F09 for filter-side enforcement.

**F08.5 scope (new — extracted from F08 per Parley §5.5, §10.3).**
- **Versioned tool catalog.** Each tool descriptor:
  `(name, version, input_schema, output_schema, disclosure_class)`.
- **`disclosure_class ∈ {principal_self, counterparty_filtered,
  platform_open}`** routes tool outputs through the privacy filter when
  appropriate.
- **Per-contract advertisement.** Contracts pin tool versions; new tools
  added to the catalog do NOT break older active runs.
- **Type-level enforcement.** The harness tool dispatcher is the **only**
  path that invokes tools; direct tRPC/SDK calls from side-runner code are
  rejected at type-check (Parley §10.3, §17.5 — CI-gated).
- **Unsupported tool calls return `tool_unsupported`** and the turn
  continues (Parley §10.3) — graceful degradation per Symphony's
  tool-extension model.
- **Disclosure-class enforcement for `counterparty_filtered` outputs is
  CI-gated** (Parley §17.5, §18.2).

**F09 scope (sharpened per Parley §9, §15).**
- **No model invocation** in the privacy filter (Parley §15.2). The
  filter's call graph cannot reach the AI Gateway client — enforced by a
  CI-gated **no-gateway-reachability test** (Parley §17.6, §18.2).
- **Untrusted-input sentinels.** Every untrusted free-text field is
  wrapped at prompt-construction time with sentinels containing a
  per-run nonce (Parley §12.4) so a malicious payload cannot forge a
  closing sentinel. Untrusted inputs are explicitly enumerated:
  seeker resume text, employer JD/req text, ATS-imported content,
  tool-returned text, A2A-received content (Parley §15.1).
- **Sentinel-injection attack test** in the production CI gate
  (Parley §17.6).
- **Counterparty access only via filter.** Side runners read counterparty
  data only through `counterparty_view` or `counterparty_filtered` tool
  results (Parley §9.4, §10.3 — CI-gated).
- **Disclosure stages** on the privacy ruleset (Parley §4.1.7); active
  stage recorded on every projection. Progression triggers
  (round-counted vs. signal-driven vs. hybrid) are
  implementation-defined per ruleset version — open question, see §10.
- **Fail-closed mandatory** on filter errors (Parley §15.2).
- F09 has its own isolated test suite per PRD §9 risk row ("Privacy
  filter leaks negotiating posture") — co-equal with the production CI
  gates above.

**F10 scope (expanded per Parley §4.1.8, §15.4).**
- **Per-audience transcript projections pre-computed and stored** on the
  dossier — projections for seeker, employer, auditor, A2A receiver. Not
  derived at delivery time. Each projection is the result of applying
  the privacy ruleset at the corresponding audience's disclosure stage.
- **Per-side, per-dimension rubric breakdowns** with deterministic
  weighted totals (computed by the harness, not the model — see F07b).
- **Per-side one-paragraph rationale** in the agent's voice.
- **Reconciled flags** from both sides for human attention.
- **Version metadata.** Contract refs `(contract_id, version)`, ruleset
  ref, harness version, model invocations.
- **Signing.** `dossier.signing_enabled` defaults to true in production
  (Parley §6.4). Signature covers all dossier fields except the signature
  object itself, using deterministic canonical serialization
  (Parley §15.4).
- **Verification helper** is a required deliverable, not just signing.
- **Inconclusive dossiers** carry flags describing what would resolve
  them (Parley §4.1.8, §16.6) — the failure mode for run-to-completion.
- **Best-effort inconclusive dossier even on `timed_out` / `tool_failure`**
  before terminating (Parley §7.1, §14.2).

**F11 notes.** Notifications consume `dossier.produced` events
(Parley §13.7). Reinforces the existing scope.

---

### Stage 5 — Agents

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F12 | AI infrastructure (Gateway client, prompt registry, model/prompt versioning) | `12-ai-infrastructure` | P0 | M — Complete (merged to `main`, PR #49) | I.C.2 (AI supply chain); II |
| F13 | Seeker advocate agent | `13-seeker-advocate` | P0 | L — Implemented on branch `013-seeker-advocate`; pending PR/merge | II; I.4.1 (purpose limitation on seeker data) |
| F14 | Employer advocate agent | `14-employer-advocate` | P0 | L | II; I.A (rubric is the regulated surface) |
| F15 | Re-negotiation loop logic (fresh `run_id`, no state inheritance) | `15-renegotiation-loop` | P1 | S | I.A.1 (OWASP LLM Top 10 — cost/abuse); PRD §4.7; Parley §7.2, §9 invariant 5 |

**F15 scope (sharpened per Parley §7.2, §9 invariant 5).**
- **Re-negotiation is a fresh `run_id`**, never a transparent retry.
- **Triggered by an explicit `match_ticket.renegotiation_requested`
  event**, not by run-level retry logic.
- **No state inheritance** across re-negotiations (Parley §9 isolation
  invariant 5).
- **Round cap is the minimum across both sides' contracts**; default 3
  (Parley §6.4). Empirical validation of `3` is open per
  `PARLEY_ADAPTATIONS.md` — Phase 0 alpha is where this is validated.
- **Per-match cost ceiling** with alarms on threshold breach.

**Stage 5 notes.**
- F12 treats prompts/models/rubrics as **supply chain** (Constitution
  §I.C.2): every prompt change is a release, signed and SBOM-equivalent.
  No "edit prompt in admin UI" path. Reinforced by Parley's no-hot-reload
  posture.
- F13/F14 are scored against an eval harness (PRD §9 mitigation for
  agent-credibility risk).

---

### Stage 6 — Seeker Channels (the product)

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F16 | Channel adapter framework + `ChannelMessage` interface | `16-channels-core` | P0 | M | III.2 (semantic clarity for adapters); IV (SoC) |
| F17 | Telegram channel adapter | `17-telegram-channel` | P0 | M | III.1 (human surface) |
| F18 | Email channel adapter (inbound/outbound + threading) | `18-email-channel` | P0 | M | III.1 |
| F19 | Web-chat channel adapter (Clerk-authed) | `19-web-chat-channel` | P1 | S | III.1; III.4 (WCAG 2.2 AA) |
| F20 | Conversational onboarding & seeker product flows | `20-seeker-conversational-flows` | P0 | XL | I.4.1 (data minimization); III.1; PRD §6.1 |

**Stage 6 goal.** The seeker product surface. F20 carries every
conversational flow: resume import, profile completion, threshold tuning,
match notifications, dossier review, pause/resume/withdraw, aggregate
insight reports, and the demographic opt-in flow with segregated storage.

**Notes:**
- F17–F19 can run in parallel after F16 lands.
- F20's demographic opt-in is **counsel-gated UX** (Constitution §V.4).
- F18's inbound parsing strategy is PRD Open Question #7 — must resolve
  during `/speckit-clarify`.
- The seeker conversational surface is **explicitly NOT subject to
  run-to-completion** (Parley `PARLEY_ADAPTATIONS.md` §5). Only the
  agent-to-agent negotiation run is autonomous; a seeker chatting with
  their own agent is normal interactive UX.

---

### Stage 7 — Web Surface & Employer Side

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F21 | Seeker web surface (landing + Clerk profile + agents.md/llms.txt + A2A cards) | `21-seeker-web-surface` | P0 | M | III (dual-audience landing page); II (A2A agent cards) |
| F22 | Employer admin console | `22-employer-admin-console` | P0 | L | III.1; III.4 (WCAG); I.5.1 (MFA for admin seats) |
| F23 | Employer REST API + signed-webhook delivery | `23-employer-api-webhooks` | P0 | M | II; III.2 (OpenAPI 3.1 contracts); III.3 (deprecation policy); I.C.1 (webhook signing) |

**Stage 7 goal.** Account-management + employer-side surfaces. F21
enforces PRD §3.4 — **no seeker dashboard, ticket list, or analytics UI
ever.**

**Notes:**
- F23 publishes OpenAPI 3.1 contracts and adopts the N-2 backwards-compat
  policy from Constitution §III.3 (`Deprecation` / `Sunset` headers per
  RFC 8594/9745).
- A2A agent cards in F21 are **published, not depended on** for v0
  customer flow per PRD §5.3.
- A2A receiver dossier-projection rules (Parley `PARLEY_ADAPTATIONS.md`
  open item) are deferred to v1 when the actual A2A protocol stabilizes.

---

### Stage 8 — Operations, Hardening & Phase 0 Posture

| ID | Feature | Slug | Priority | Complexity | Constitution refs |
|----|---------|------|----------|------------|-------------------|
| F24 | Incident response capability + breach notification + monitoring | `24-incident-response` | P0 | M | I.D (NIST 800-61); I.D.2 (GDPR Art. 33/34) |
| F25 | Phase 0 alpha posture infrastructure | `25-phase-0-alpha-posture` | P0 | S | I.B.1 (no production hiring decisions); V.2 (counsel-review evidence) |

**Stage 8 goal.** Operational readiness for Phase 0 launch. F24 is the
foundational IR capability the constitution demands; F25 is the thin
wrapper that locks the platform into "informational only" mode for the
private alpha.

**Notes:**
- F24 includes detection (audit-log anomalies, privacy-filter bypass
  attempts, auth anomalies), runbooks for sev-1/2/3,
  evidence-preservation procedures, and the GDPR 72-hour notification
  workflow.
- F25 ships consent banners ("alpha — informational only"), per-seeker
  / per-employer alpha-consent flow, the human-review gate before any
  escalation, and the constitutional change-log entry the Phase 0→1
  transition requires.
- Parley's optional operator API (§13.8) is auth-required and OPTIONAL —
  consider as a sub-deliverable inside F24 if internal ops needs visibility
  beyond the audit log.

---

## Dependency Graph

```
F01  Monorepo scaffold
 │
 ├─▶ F02  Identity & Auth (AAA)
 │    │
 │    ├─▶ F16 Channels framework ─┬─▶ F17 Telegram
 │    │                            ├─▶ F18 Email
 │    │                            └─▶ F19 Web chat
 │    │                                        │
 │    │                                        └─▶ F20 Seeker flows
 │    ├─▶ F21 Seeker web surface
 │    └─▶ F22 Employer admin console
 │
 └─▶ F03  DB schema
      │
      └─▶ F04  Ticket store ──┬─▶ F05 Audit log + transcript store + tombstone
                              │
                              ├─▶ F06 Jurisdiction gates / kill switches
                              │
                              ├─▶ F07a Agent Contract Registry ──┐
                              │                                   │
                              └─▶ F07b Rubric Registry + gate ───┤
                                                                  │
                              F05 + F06 + F07a + F07b ────────────▼
                                                                  │
                              F12 AI infra ──┬─▶ F13 Seeker advocate
                                             └─▶ F14 Employer advocate
                                                                  │
                              F08.5 Tool Surface & Dispatcher ◀───┤
                              F09 Privacy filter ◀────────────────┤
                              F08 Parley runner ◀─────────────────┤
                              F10 Dossier signer ◀────────────────┤
                              F11 Notification artifacts ◀────────┘
                                             │
                                             └─▶ F15 Re-negotiation
                                                         │
                              F20 + F22 + F23 + F15 ─────▼
                                                         │
                              F24 Incident Response ─────┤
                                                         │
                                                         ▼
                                                   F25 Phase 0 posture
                                                         │
                                                         ▼
                                                Phase 0 Alpha launch
```

Critical path: **F01 → F02 → F04 → F05 → F08 → F13/F14 → F20 → F25.**

Parallelizable opportunities:
- **F09** (privacy filter) has no upstream dependency on F08 — build and
  test independently, integrate when F08 lands.
- **F08.5** (tool surface) has no upstream dependency on F08 runner —
  build and test the catalog + dispatcher type-checks independently.
- **F22** (employer console) starts as soon as F02 + F04 are ready —
  doesn't have to wait for the agent layer; until agents are ready, the
  console operates against test fixtures.
- **F07a** and **F07b** can run in parallel — distinct registries with
  distinct schemas.

---

## Implementation Stages

| Stage | Weeks | Features | Goal | Gate to next |
|-------|-------|----------|------|--------------|
| 1 — Foundation | 1–4 | F01, F02, F03 | Repo, auth, data layer | Auth + DB green; CI signed; SBOM published |
| 2 — Ticket Spine | 4–7 | F04, F05 | Three ticket types + audit log + transcript store | All three state machines green; tombstone procedure tested in dev |
| 3 — Compliance Spine | 6–10 | F06, F07a, F07b | Jurisdiction primitives + Agent Contract Registry + Rubric Registry with bias-test gate | At least one rubric version with completed bias-test artifact; dispatch refusal verified for missing `bias_test_ref` |
| 4 — Parley Harness | 9–14 | F08, F08.5, F09, F10, F11 | Negotiation engine | End-to-end Parley run produces signed dossier with all four audience projections; privacy-filter test suite green; CI gates §17.4–17.6 green |
| 5 — Agents | 12–15 | F12, F13, F14, F15 | Two advocates + re-negotiation | Eval harness baseline cleared on both advocates; cost ceiling enforced; re-negotiation produces fresh `run_id` |
| 6 — Seeker Channels | 13–18 | F16, F17, F18, F19, F20 | Seeker product | Telegram + email + web chat working; full conversational onboarding flow; demographic opt-in counsel-reviewed |
| 7 — Web + Employer | 15–19 | F21, F22, F23 | Account-mgmt web + employer surfaces | Employer can post req, receive signed-dossier webhook; seeker landing live with `agents.md` + `llms.txt`; WCAG 2.2 AA verified |
| 8 — Hardening + Phase 0 | 19–21 | F24, F25 | Ops + alpha posture | IR runbooks tabletop-tested; alpha consent flow live; counsel sign-off filed |

**Phase 0 Alpha launch** requires **counsel review evidence** filed per
Constitution §V.2 in `.specify/memory/counsel-reviews/`.

**Phase 1 (v0) launch** additionally requires:
- Phase 0 → Phase 1 counsel review and constitutional change-log entry
- Initial bias audit completed for shipped rubrics (Constitution §I.A.2)
- Phase 1 jurisdiction set decided (PRD Open Question #9)
- Round-cap = 3 empirically validated against Phase 0 negotiation data

**Phase 2 (NYC) launch** additionally requires:
- Independent bias audit published
- 10-business-day candidate notification flow live and tested
- Tombstone-redaction procedure counsel-approved
  (Constitution §I.4.3 / §V.4)

---

## Risk Assessment

Per-feature risks. Severity uses PRD §9 scale.

| Feature | Risk | Severity | Mitigation |
|---------|------|----------|------------|
| F02 | BYO seeker agent identity federation complexity (PRD §3.3 Mode 1) | High | Defer A2A `seeker-delegate` flow to v1; v0 ships hosted-agent only |
| F05 | Tombstone procedure conflicts with audit-log integrity if implemented incorrectly | Critical | Counsel-reviewed before Phase 2; `/security-review` mandatory; threat model required (STRIDE + LINDDUN) |
| F06 | Mis-tagged jurisdiction silently routes to wrong policy gate | Critical | Fail-safe default: missing jurisdiction = deny (Constitution §I.6); structured failure dossier never silent |
| F07a | Contract version drift causes runs to use stale prompt + new rubric (or vice versa) | High | Contract pins all sub-refs; in-flight runs complete under dispatch-time contract (Parley §7.4) |
| F07b | Rubric bias not caught pre-ship | Critical | Bias-test pipeline gates rubric activation; production refuses to dispatch without `bias_test_ref` (CI-gated, Parley §17.1) |
| F08 | Run never terminates / agent loops indefinitely | High | Run-to-completion contract; round cap = min across sides; inconclusive dossier as terminal failure mode |
| F08.5 | Side-runner code bypasses dispatcher with direct tool call | High | Type-level rejection + CI-gated test (Parley §17.5); enforced before any run can execute |
| F09 | Privacy filter leaks negotiating posture (PRD §9) | High | Isolated test suite; defense-in-depth — privacy filter is one of multiple barriers; CI-gated no-gateway-reachability + sentinel-injection tests; threat model required |
| F10 | Dossier signing key compromise | Critical | HSM-stored keys; rotation procedure; crypto-agility built in |
| F10 | Per-audience projection leaks data across audiences | High | Pre-computed at dossier-build time, not at delivery; projections derived from privacy ruleset at the audience's disclosure stage |
| F13/F14 | Agent quality below threshold (PRD §9) | High | Eval harness (PRD §9 mitigation); human-in-loop dossier review through Phase 0 |
| F15 | Re-negotiation infinite loop or runaway cost (PRD §9) | Low | Hard 3-round cap; per-match cost ceiling; alarms on threshold breach; **fresh `run_id`** prevents transparent retry exploitation |
| F20 | Demographic data leak or misuse (PRD §9) | Critical | Opt-in only; segregated storage (separate schema); access controls; counsel-reviewed consent UX (Constitution §V.4) |
| F22 | Employer admin console accessibility violations (ADA/Section 508 exposure) | High | WCAG 2.2 AA conformance from day one (Constitution §III.1); axe/Lighthouse gates in CI |
| F23 | Webhook delivery failure leaves employer in unknown state | Medium | Idempotent delivery; retry with exponential backoff; webhook receipts in audit log |
| F24 | Detection gap delays sev-1 awareness past GDPR 72-hour clock | Critical | Synthetic alerts tested at least quarterly; on-call rotation documented |
| F25 | Phase 0 → Phase 1 transition happens without counsel review | Critical | Constitutional gate; `/speckit-analyze` blocks; counsel-review memo required in `.specify/memory/counsel-reviews/` |

---

## Constitutional Compliance Validation

Reading `.specify/memory/constitution.md` v1.1.0:

| Article | Roadmap coverage |
|---------|------------------|
| **I.1 Confidentiality** | F09 (privacy filter), F20 (demographic data segregation), F08.5 (`disclosure_class` routing) |
| **I.2 Integrity** | F05 (hash-chained log + transcript store), F07a/b (versioned contracts/rubrics), F10 (dossier signing) |
| **I.3 Availability** | F06 (kill switches no-deploy), F08 (Inngest durable runs, run-to-completion), F24 (recovery procedures) |
| **I.4 Privacy** | F03 (retention horizons declared), F05 (tombstone procedure), F20 (data minimization in onboarding) |
| **I.5 AAA** | F02 (Clerk + MFA + scoped tokens), F08.5 (least-privilege tool dispatcher with type-level enforcement), F23 (signed webhooks) |
| **I.6 Defense in Depth & Secure-by-Default** | F09 (one of multiple barriers, no-model-invocation, sentinel wrapping), F06 (fail-safe default = deny), F08.5 (dispatcher as only path), every feature ships with secure defaults |
| **I.A Parley primitives 1–5** | F06 (1, 2, 5), F07b (3 — strengthened with dispatch-time gate), F11 (4) |
| **I.A.1 AI standards** | F07b (NIST AI RMF Measure 2.11), F12 (model/prompt versioning per ISO/IEC 42001), F09 (OWASP LLM Top 10 — prompt injection via sentinel pattern), F15 (cost/abuse) |
| **I.A.2 Bias-audit cadence** | F07b (bias-test pipeline runs at every rubric/material change; dispatch refusal on missing `bias_test_ref`) |
| **I.B Phased posture** | F25 (Phase 0 posture); F06 (jurisdiction set management); Phase transitions require counsel review per V.2 |
| **I.C Cryptographic & Supply-Chain** | F01 (SBOM, Sigstore-signed deps, SLSA L3), F10 (FIPS-approved signing, HSM keys, crypto-agility), F12 (AI supply chain — signed prompts/models, no hot-reload) |
| **I.D Incident Response** | F24 (full IR capability); cross-side leakage as named sev-1 |
| **II Agent-Native** | F13/F14 (agents as principals), F23 (REST API as primary contract), F21 (A2A cards as first-class), F12 (machine-readable manifests), F07a (versioned agent contracts), F08.5 (declared tool capabilities) |
| **III.1 Human UI** | F19/F20/F21/F22 — all with WCAG 2.2 AA; PRD §3.4 enforced (no seeker dashboard) |
| **III.2 Agent semantics** | F23 (OpenAPI 3.1), F16 (typed `ChannelMessage` interface), F12 (agent capability manifests), F07a (contract schemas), F08.5 (tool descriptors with input/output schemas) |
| **III.3 Contract evolution** | F23 (semver, N-2 backwards-compat, RFC 8594/9745 deprecation headers); F07a (immutable `(contract_id, version)`); F07b (immutable `(rubric_id, version)`) |
| **III.4 Completeness rule** | Every feature with a UI component must also have its agent semantics — enforced at `/speckit-analyze` |
| **IV Engineering Discipline** | Advisory; per-PR exceptions allowed |
| **V Governance & Amendments** | F25 (counsel-review-evidence retention); roadmap itself follows MAJOR/MINOR/PATCH |

**Status:** ✅ Roadmap conforms to all foundational articles.

**Open compliance gates** (must close before the indicated phase per
Constitution §V.4):

- Demographic data consent UX & storage segregation → before Phase 2
- DPA templates & joint controllership → before any EU engagement
- Audit cadence beyond Constitution §I.A.2 floor → before Phase 2
- Candidate appeal / human-review sufficiency → before EU phase
- Cross-border data flow mechanism → before any cross-border ticket
- Tombstone-redaction procedure detailed spec & counsel sign-off → before Phase 2

These are **not** roadmap features — they are governance gates tracked
in the constitution itself.

---

## Open Questions Surfaced by Parley

Items the Parley spec defers, that Spyglass must resolve at spec or Phase 0
time. These extend PRD §10:

1. **Round-cap empirical validation.** Parley pins `default_round_cap = 3`
   (§6.4) but flags it as needing empirical validation against real
   negotiations (`PARLEY_ADAPTATIONS.md`). **Phase 0 alpha is where this
   gets validated**; promote to Phase 1 only if data supports it.
2. **Disclosure-stage progression triggers.** Parley defines disclosure
   stages on the privacy ruleset (§4.1.7) and records the active stage on
   every projection. Whether progression is round-counted, signal-driven,
   or hybrid is **implementation-defined per ruleset version** — must
   resolve during F09 `/speckit-clarify`.
3. **A2A receiver projection rules.** The dossier carries an
   `a2a_receiver` transcript projection (§4.1.8). The actual A2A protocol
   Spyglass speaks to external negotiation peers stabilizes in v1; until
   then the projection rules are placeholders. Affects F10 and F21.
4. **Audit retention durations per regulatory class.** Parley defers
   concrete durations (§6.4 `audit.retention_class`); Constitution §I.4.2
   says "tracked in data-lifecycle spec, never indefinite." Must be
   locked per regulatory class before Phase 2.
5. **Calibration across users.** Parley spec records per-dimension scores
   deterministically; whether scores get normalized against a population
   baseline before threshold checks is a **downstream consumer concern**,
   not a harness concern. PRD §4.5 already takes the "no platform-wide
   absolute calibration" stance; reaffirm during F13/F14 spec.

---

## Execution Checklist

### Pre-implementation
- [x] PRD reviewed (`PRD.md` v0.1)
- [x] Constitution ratified (`.specify/memory/constitution.md` v1.1.0)
- [x] Compliance architecture documented (`docs/COMPLIANCE_ARCHITECTURE.md`)
- [x] Parley spec referenced (`/mnt/f/parley/SPEC.md`,
      `PARLEY_ADAPTATIONS.md`)
- [x] All 27 features identified and numbered
- [x] Dependencies mapped
- [x] Priorities assigned
- [x] Complexity estimated
- [x] 8 phases defined with gates
- [x] Constitutional compliance verified
- [ ] Counsel of record engaged for Phase 0 review
- [ ] Phase 1 jurisdiction set decided (PRD Open Question #9)
- [ ] Spec-kit `.specify/specs/` directory ready

### Per-feature workflow

For every feature `F##`, run the full SDD pipeline:

```
/speckit-specify F##-slug
/speckit-clarify
/speckit-plan
/speckit-tasks
/speckit-analyze        # MUST pass — foundational article violations block
/speckit-implement      # TDD-enforced
/code-review
/security-review        # MANDATORY for F02, F05, F06, F07a, F07b, F08,
                        #              F08.5, F09, F10, F11, F20, F23, F24
```

Threat modeling (STRIDE for security, LINDDUN for privacy) is required at
`/speckit-plan` for any feature touching Articles I or II — i.e., almost
all of them. Skip-list: F01, F19, F21 (web-only surface).

### Stage 1 checklist
- [x] **F01** Monorepo scaffold + tech-stack baseline _(merged to `main`; PR #1)_
- [x] **F02** Identity & Auth (Clerk + AAA) _(merged to `main` at `1d5e4ca`, PR #25; B6/B7/B8 operator-run gates deferred)_
- [x] **F03** Database schema + Drizzle migrations _(merged to `main` at `0ab3b69`, PR #26; counsel review of retention policy flagged pending)_
- [ ] **Stage 1 gate:** CI green ✅, SBOM published ✅, signed releases ✅, MFA working for admin ✅, schema-lint gate ✅. Counsel review of `docs/data-governance/retention-policy.md` remains for Phase 1 jurisdictional admission (not gating Stage 1 sign-off).

### Stage 2 checklist
- [x] **F04** Ticket store + state machines _(merged to `main` at `cbcbd56`, PR #38; post-merge handoff notes recorded)_
- [x] **F05** Hash-chained audit log + transcript store + tombstone procedure _(merged to `main`, PR #40; quickstart evidence recorded)_
- [x] **Stage 2 gate:** State transitions exhaustively tested; tombstone procedure tested in dev; transcript-store access controls distinct from dossier. Counsel sign-off remains deferred to pre-Phase-2 and does not block Stage 2 closure.

### Stage 3 checklist
- [x] **F06** Jurisdiction tagging + policy gates + kill switches _(merged to `main`, PR #41)_
- [x] **F07a** Agent Contract Registry _(merged to `main`, PR #42)_
- [x] **F07b** Rubric Registry + bias-test dispatch gate _(merged to `main`, PR #43; quickstart evidence recorded)_
- [x] **Stage 3 gate:** At least one rubric version with completed bias-test artifact; CI verifies dispatch refusal when `bias_test_ref` is missing; kill switches flippable in staging; `(contract_id, version)` and `(rubric_id, version)` immutability enforced at the storage layer

### Stage 4 checklist
- [x] **F08** Parley runner (six Inngest functions) _(merged to `main`, PR #48; quickstart evidence recorded)_
- [x] **F08.5** Tool Surface & Dispatcher _(merged to `main`, PR #44; quickstart evidence recorded)_
- [x] **F09** Privacy filter (no-model-invocation, sentinel-wrapped) _(merged to `main`, PR #45; quickstart evidence recorded)_
- [x] **F10** Dossier builder + signer + per-audience projections + verifier _(merged to `main`, PR #46; quickstart evidence recorded)_
- [x] **F11** Candidate notification artifacts _(merged to `main`, PR #47; quickstart evidence recorded)_
- [x] **Stage 4 gate:**
  - End-to-end synthetic match produces signed, valid dossier with all
    four audience projections
  - Privacy-filter test suite green; no-gateway-reachability test green;
    sentinel-injection test green
  - Tool dispatcher type-level enforcement verified; direct tool calls
    from side-runner code rejected at type-check
  - Five Parley §9 isolation invariants enforced; three CI-gated
  - Run-to-completion verified — no path produces a paused run;
    inconclusive dossier on failure

### Stage 5 checklist
- [x] **F12** AI infrastructure _(merged to `main`, PR #49; quickstart evidence recorded)_
- [x] **F13** Seeker advocate agent _(implemented on branch `013-seeker-advocate`; quickstart evidence recorded; pending PR/merge)_
- [ ] **F14** Employer advocate agent
- [ ] **F15** Re-negotiation loop
- [ ] **Stage 5 gate:** Eval harness baseline cleared; cost ceiling enforced; re-negotiation produces a fresh `run_id` with no state inheritance

### Stage 6 checklist
- [ ] **F16** Channel adapter framework
- [ ] **F17** Telegram channel adapter
- [ ] **F18** Email channel adapter
- [ ] **F19** Web-chat channel adapter
- [ ] **F20** Conversational onboarding & flows
- [ ] **Stage 6 gate:** Seeker can complete onboarding end-to-end via Telegram and email; demographic opt-in counsel-reviewed

### Stage 7 checklist
- [ ] **F21** Seeker web surface
- [ ] **F22** Employer admin console
- [ ] **F23** Employer REST API + signed webhooks
- [ ] **Stage 7 gate:** Employer can post req, receive signed-dossier webhook; seeker landing live with `agents.md` and `llms.txt`; WCAG 2.2 AA verified

### Stage 8 checklist
- [ ] **F24** Incident response + monitoring
- [ ] **F25** Phase 0 alpha posture
- [ ] **Stage 8 gate / Phase 0 launch gate:**
  - [ ] IR runbooks tested via tabletop
  - [ ] Alpha consent flow live for both seeker and employer
  - [ ] "Informational only" banner on every dossier
  - [ ] Counsel review memo filed in `.specify/memory/counsel-reviews/`
  - [ ] Constitutional change-log entry recorded

---

## Next Steps

1. **Begin Stage 5 advocate agents:** F13/F14 can now pin signed
   prompt/model/runtime manifest refs from F12. F15 re-negotiation loop
   remains after the advocate-agent baseline.
2. **Engage counsel of record** for Phase 0 / Phase 1 review.
   Constitutional §V.2 requires this before any phase-transition merge.
3. **Resolve PRD Open Question #9** — Phase 1 jurisdiction set.
4. **Read Parley `SPEC.md` Stage 5-relevant sections** before specifying
   F13–F15, especially agent identity, signed model/prompt/runtime
   manifest refs, run isolation, eval harness criteria, and auditability
   requirements.

---

## Change Log

| Version | Date       | Change |
|---------|------------|--------|
| 1.5.5   | 2026-05-21 | Status update for F13 implementation: Seeker Advocate Agent package slice implemented, quickstart/eval evidence recorded, data-classification and runbook notes added, and F14 advanced as the next Stage 5 advocate baseline after F13 PR/merge. PATCH-style status amendment. |
| 1.5.4   | 2026-05-21 | Status update for F13 start: Seeker Advocate Agent is active on branch `013-seeker-advocate`, active Spec Kit pointers now target `.specify/specs/013-seeker-advocate`, and F14 remains the next advocate baseline after F13 plan/tasks. PATCH-style status amendment. |
| 1.5.3   | 2026-05-21 | Status update for F12 merge: AI Infrastructure is complete and merged to `main` in PR #49, branch cleanup complete, and Stage 5 next steps now begin with F13/F14 advocate agents. PATCH-style status amendment. |
| 1.5.2   | 2026-05-21 | Status update for F12 branch implementation: AI infrastructure spec/plan/tasks completed, governed `@spyglass/ai` package slice implemented, F12 DB schema/migration added, quickstart evidence recorded, and Stage 5 next steps advanced to F13/F14 advocate agents after F12 PR/merge. PATCH-style status amendment. |
| 1.0.0   | 2026-05-06 | Initial roadmap. 25 features across 8 phases extracted from PRD v0.1; aligned to Constitution v1.1.0. |
| 1.1.0   | 2026-05-06 | Refined against `/mnt/f/parley/SPEC.md` and `PARLEY_ADAPTATIONS.md`. Split F07 into F07a (Agent Contract Registry) + F07b (Rubric Registry + bias-test dispatch gate). Added F08.5 (Tool Surface & Dispatcher). Expanded F05 to cover canonical transcript store per Parley §13. Added sub-deliverables to F08 (six Inngest functions, run-to-completion, no hot-reload, in-memory NegotiationContext, round-cap min-across-sides), F09 (no-model-invocation CI gate, sentinel wrapping, sentinel-injection test, fail-closed), F10 (per-audience projections pre-computed, deterministic canonical signing, verification helper, inconclusive-dossier failure mode), F15 (fresh `run_id`, explicit event trigger, no state inheritance). Added Open Questions Surfaced by Parley section. Total features 25 → 27. MINOR — additions and strengthenings only. |
| 1.2.0   | 2026-05-08 | Status update only — no scope changes. Added "Current Status" section recording F01 complete (merged to `main`), F02 in progress on branch `02-identity-auth-aaa` with B1–B5.2 closed (tasks T001–T052, T055) and B5.3 → B9 remaining. Ticked F01 in Stage 1 checklist; F02/F03 remain open. PATCH-style status amendment surfaced as MINOR for the new section. |
| 1.2.1   | 2026-05-10 | Status update only — no scope changes. F02 B6 progress: T047b, T056–T060 complete (operator credential list/issue/revoke, audit-events buffer + sink + viewer, two-operator-gated revoke-all-sessions orchestrator + Drizzle adapters + sign-out confirmation UI). Test count 348 green at HEAD `e53e38e` (236 auth + 112 web). B6 remaining: T061 MFA banners, T062 WCAG 2.2 AA artifact. PATCH-style status amendment. |
| 1.2.2   | 2026-05-11 | Editorial only — no scope changes. Renamed feature-delivery phases A–H to **Stage 1–8** to disambiguate from the product-lifecycle "Phase 0/1/2" wording (Phase 0 alpha, pre-Phase-2 counsel review). Touches headings, the Implementation Stages table, per-stage checklists/gates, and the "stage-by-stage execution" guidance. PATCH-style editorial amendment. |
| 1.2.3   | 2026-05-11 | Status update only — no scope changes. F02 B6 implementation closed: T061 enumeration-resistant auth banners (NFR-13, NFR-14) and T062 WCAG 2.2 AA verification artifact (`docs/security/operator-console-a11y.md` — 35 SCs pass, 6 pending environment verification, 0 failing) landed. Tests: 373 green at HEAD `e0cfcac` (236 auth + 137 web). B6 gate remains pending an operator-run pass of Quickstart Scenarios 10 + 11 against a live dev server + NVDA. PATCH-style status amendment. |
| 1.2.4   | 2026-05-11 | Status update only — no scope changes. Corrected B5.3 status (Vercel-OIDC rejection guard was already complete at commit `3aa4479`, prior entries stale). F02 B7 implementation closed: T063 credential-lifecycle runbook, T064 IdP coverage matrix, T065 compromise tabletop scaffold (execution log empty pending operator-run drill). All three docs at `docs/security/`. B7 gate pending Quickstart Scenario 6 + Gary review + drill execution. PATCH-style status amendment. |
| 1.2.5   | 2026-05-11 | Status update only — no scope changes. F02 B8 implementation closed: T067 STRIDE threat model (`.specify/specs/02-identity-auth-aaa/threat-model.md`, 0 CRITICAL/HIGH residuals), T068 security-review pass (0/0/3/4/5 across CRITICAL/HIGH/MEDIUM/LOW/INFO; `docs/security/security-review-f02-t068.md`), T069 remediation of all 7 actionable findings (commit `c39440e`), T070 re-verification APPROVE (`docs/security/security-review-f02-t070.md`). Tests: 384 green at HEAD `55ab86b` (242 auth + 142 web). B8 gate remains pending T071 metrics + T072 quickstart end-to-end. PATCH-style status amendment. |
| 1.3.0   | 2026-05-12 | F03 (Database schema umbrella + Drizzle migrations) merged to `main` at `0ab3b69` via PR #26. Stage 1 closes — F01/F02/F03 all green. Deliverables: 4 governance artifacts under `docs/data-governance/` (data-classification register · retention-policy · schema-conventions · integrity-invariants), schema-lint script (`scripts/check-schema-conventions.sh`, 7 rules, TDD 11/11) wired as required CI gate. Back-check resolved 11 findings via path-b skip-comments (0 unresolved). M-1..M-6 all satisfied; 384 F02 tests still green (no regression). Counsel review of `retention-policy.md` flagged `$counsel_review: pending` — gates Phase 1 jurisdictional admission, not Stage 1 sign-off. MINOR — F03 closure transitions Stage 1 to complete. |
| 1.5.1   | 2026-05-21 | Status update only — no scope changes. F08 Parley Runner merged to `main` in PR #48 with quickstart evidence recorded and PowerBox self-hosted CI green. Updated Stage 2 checklist to reflect F05 closure, Stage 4 F08 status to merged, and Next Steps to point at F12 AI Infrastructure as the next Stage 5 feature. PATCH-style status amendment. |
