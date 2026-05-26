# Spyglass — Documentation Overview

**Purpose:** A single map of where project documentation lives and what each
document covers. This is a synthesis report, not a substitute for the
underlying documents — every entry below points back to a file in the repo.

**Generated:** 2026-05-08
**Scope covered:** Top-level governance docs (`README.md`, `PRD.md`,
`CONTRIBUTING.md`), the `docs/` tree, and the spec-driven-development
artifacts under `.specify/`. Package-level READMEs (under `packages/*`) are
out of scope for this overview.

---

## 1. What Spyglass is

Spyglass is an **Agent-Native, two-sided AI hiring platform for the
agentic era**. Agent-Native is the load-bearing characterization (PRD
§1.1, Constitution Article II): agents are first-class principals, not
bolted-on assistants. The primary actors mediating both sides of the
marketplace are autonomous agents — a seeker advocate and an employer
advocate — with humans supervising thresholds, rubrics, and escalations
rather than sitting in the inner loop. APIs, data contracts, identity,
audit, and lifecycle are designed for agents first; human UIs are the
secondary surface, not the reference implementation.

The mechanic: each advocate independently scores fit against its own
versioned rubric, and only when both sides clear human-set thresholds
does a pairing escalate to an interview-ready introduction. Spyglass is
built on top of **Parley**, a separate agent-negotiation harness
specification, and is the first consuming product of Parley.

API-first and channel-mediated delivery (Telegram, email, minimal web
chat for seekers; admin console plus REST/webhook APIs and forward-
looking Google A2A for employers) is a *consequence* of the Agent-
Native posture, not a peer framing — it's how the agent-first
architecture surfaces to humans and to external agents.

The second foundational tenet is dual-audience surfaces: humans need
clear UI, agents need clear semantics. A surface that is pretty for
humans but ambiguous for agents — or precise for agents but unusable
for humans — is incomplete, not shipped (Constitution §III.4).

The product was previously named *JobBobber*; older artifacts using that
name are preserved verbatim and should be read as Spyglass.

---

## 2. How the project is governed

Spyglass uses **specification-driven development (SDD)** via
[spec-kit](https://github.com/github/spec-kit). Specs are the primary
artifact; code is the implementation output. Every feature flows through
a fixed pipeline:

`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` →
`/speckit-tasks` → `/speckit-analyze` → `/speckit-implement` →
`/code-review` → `/security-review`.

Three documents at the top of the hierarchy govern what may ship:
`PRD.md` (what we are building and why), `.specify/memory/constitution.md`
(non-negotiable foundations every PR is checked against), and
`.specify/roadmap.md` (the 27-feature implementation plan with
dependencies). `docs/COMPLIANCE_ARCHITECTURE.md` is the load-bearing
companion that records the AEDT compliance posture and jurisdictional
phasing.

Current implementation status: F01 (monorepo scaffold) is in progress;
F02 (identity & auth) is specified.

---

## 3. Top-level documents

These three files live at the repo root and are the entry points for any
new contributor or reviewer.

### `README.md`

The orientation document. Explains what Spyglass is in two sentences,
gives quick-start commands (`pnpm install`, `pnpm dev`), shows the
`apps/` and `packages/` layout with each package's owning feature ID,
and links the four governance documents (PRD, constitution, roadmap,
compliance architecture). Also lists common workspace commands and
points at `.github/SECURITY.md` for vulnerability reporting.

### `PRD.md`

**Project Spyglass — Product Requirements Document, Draft v0.1
(2026-05-05).** The single source of truth for the *what* and *why*.
Owner: Gary; reviewer: Austin. Sections cover: the two-tenet
foundation (agent-native; dual-audience surfaces); problem and
positioning (sourcing, not screening; competitive lane vs. ATS / AI
screening / cold outreach); user model (seeker vs. employer asymmetry,
the "deliberately not SaaS" stance, and BYO-agent Mode 1 in v1 only);
the core mechanic (two scores, two thresholds, privacy filter as
negotiation posture, asymmetric outcomes, re-negotiation cap);
day-one defensibility (jurisdiction tagging, bias-audit-ready dossier,
candidate notifications, geographic kill switches); v0 scope (must
ship, out of scope, out of scope *forever*); the v0 labor segment
(white-collar full-time, US-only); geographic phasing as the launch
model (Phase 0 alpha through Phase 4 EU); the committed tech stack
(Vercel, Next.js, Neon, Drizzle, Clerk, Inngest, Vercel AI Gateway,
pnpm + Turborepo); success metrics; risks; and 14 open questions for
the spec phase.

### `CONTRIBUTING.md`

Day-to-day contributor surface. Covers branch naming
(`<feature-id>-<slug>`), Conventional Commits enforced via commitlint,
the Lefthook pre-commit hook stack (eslint, prettier, gitleaks,
type-check-changed, commitlint), the **hook-bypass policy**
(`--no-verify` is acceptable on feature branches for WIP, never on
`main` / release / PR-attached branches), the procedure for adding a
dependency (justification, scope, vulnerability + license + provenance
checks), the procedure for adding an environment variable (Zod schema
edit → regenerate `.env.example` → Vercel env add → commit both), the
spec-kit workflow, and the **constitutional gates** every PR is
checked against.

---

## 4. The `docs/` tree

A small, focused tree. One umbrella compliance note at the root, plus
two subtrees for architecture decisions and security runbooks.

### `docs/COMPLIANCE_ARCHITECTURE.md`

The compliance architecture note authored under the JobBobber name and
preserved verbatim. Records: the US AI hiring law landscape (NYC LL
144, Illinois AIVIA + HB 3773, Colorado SB 205, California FEHA,
Maryland HB 1202, EU AI Act); the **strawman phase plan** (Phase 0
alpha → Phase 1 3–5 US states → Phase 2 + NYC → Phase 3 + CO/CA/IL →
Phase 4 + EU); the principle that **compliance is harness policy, not
bolt-on features**; the five required harness primitives that the
constitution adopts in Article I.A; UX surfaces that double as
compliance coverage; and the open questions (demographic data
handling, joint controllership, audit cadence, candidate appeal
rights, cross-border data flows). Explicitly working notes — not legal
guidance — and requires counsel review before any launch.

### `docs/architecture/`

Five files recording architectural decisions and operational realities.

`monorepo-decisions.md` — why pnpm + Turborepo (vs. Nx, Bazel, npm,
yarn), why TypeScript project references with `composite: true`, the
three-layer package boundary discipline (`package.json#exports` +
ESLint `import/no-internal-modules` + `publint`), the apps-don't-
depend-on-apps rule, naming conventions, and the 800-line file-size
limit.

`release-pipeline.md` — how a `v*.*.*` git tag triggers
`release.yml`: build → SBOM (CycloneDX via cdxgen) → cosign keyless
signature → SLSA Build Level 3 provenance → GitHub release. Includes
what `scripts/verify-artifact.sh` checks, what L3 provenance buys
us, and the long-term retention strategy for AEDT-relevant artifacts.

`env-manifest.md` — the typed Zod env schema in
`packages/shared/src/env.ts` as the single source of truth, with
`.env.example` generated from it. Documents the optional → required
lifecycle, the procedure for adding a variable, the CI drift gate,
and what the schema deliberately does not validate (cross-field
consistency, secret strength, connectivity).

`bootstrap-timings.md` — how `scripts/bootstrap.sh` is validated
against NFR-1 (cold ≤ 30 min) and NFR-2 (warm ≤ 2 min). Includes the
recorded measurement table, gotchas (network variance, optional
tools, Turbo cache misses), and the CI `bootstrap-idempotency` job.

`repo-settings.md` — documented intent for GitHub branch protection
on `main` (signed commits, linear history, required status checks),
the required-status-checks list that must mirror `ci.yml` job names,
the CODEOWNERS sketch, secret-scanning + push-protection settings,
Dependabot config, and Vercel-side configuration. Settings are
applied manually in T053; this file is the spec for a future
Terraform migration.

### `docs/security/`

Two Clerk-specific operational documents, owned by F02.

`clerk-mfa-config.md` — operator runbook for configuring AAL2
verifiers (TOTP, passkeys, SMS-as-fallback, backup codes) and
bootstrapping the restricted Clerk Operator Org per environment.
Includes verification steps, the quarterly drift audit checklist,
and constitutional references.

`clerk-accessibility.md` — accessibility paper trail for Clerk's
hosted auth UI. Records the pinned `@clerk/nextjs` version (`7.3.2`,
Clerk Core 3), the items a reviewer must verify against Clerk's
WCAG 2.2 AA statement, the manual a11y checklist for
Spyglass-rendered components (MFA banners, sign-out confirmation,
operator console), and a review log to be updated on every SDK bump.

---

## 5. The `.specify/` tree

Spec-kit artifacts. Three layers: governance (constitution + roadmap),
exceptions registers, and per-feature specifications.

### `.specify/memory/constitution.md`

**Project Spyglass Constitution, v2.0.0** (ratified 2026-05-06; pending
reviewer sign-off on the v2.0.0 amendment). The non-negotiable
foundations.

Articles are tiered. **Foundational** articles (I, I.A–I.D, II, III)
are review-blocking; **disciplinary** Article IV is advisory;
**procedural** Article V governs amendments.

Article I extends the classical CIA triad with privacy, AAA, and
defense-in-depth. Sub-articles cover confidentiality (privacy filter
non-bypassable; demographic data segregated; cross-side leakage as
named sev-1), integrity (versioned rubrics/prompts/scores; signed
dossiers; hash-chained append-only audit log; bias-audit-ready
dossier shape), availability (geographic kill switches without
deploys; structured failure dossiers, never silent skips), privacy
(data minimization and purpose limitation; per-data-class retention;
the **redaction-by-tombstone** procedure that resolves the GDPR
Art. 17 vs. immutable-audit-log conflict; data-subject rights), AAA
(every principal authenticated; cryptographically verifiable agent
identity; least privilege with scoped short-lived credentials;
zero-trust posture; non-repudiation via signed audit log), and
defense in depth (privacy filter as one layer among many; secure-by-
default; fail-safe defaults).

Article I.A names the five Parley-derived compliance primitives —
jurisdiction tagging, per-jurisdiction policy gates, bias-audit-ready
dossier, candidate notification artifacts, geographic kill switches
— as first-class harness concepts that cannot be removed without a
constitutional amendment. Article I.B locks in the phased
jurisdictional posture (no production hiring decisions in Phase 0;
production hiring only inside the active jurisdiction set from
Phase 1 onward; counsel review required and documented before any
phase transition). Article I.C covers cryptographic and supply-chain
standards (NIST-approved algorithms; crypto-agility; SBOMs; two-DB
vulnerability auditing; npm provenance verification with an
exceptions register; SLSA L3; Sigstore signing of our own artifacts;
prompts/rubrics/models as supply chain). The v2.0.0 MAJOR amendment
relaxed universal dependency signing to "verify where upstream
provides, register exceptions otherwise" pending ecosystem maturity.
Article I.D covers incident response per NIST SP 800-61r2 and breach
notification per GDPR Arts. 33–34, with cross-side leakage as the
named sev-1.

Article II asserts the agent-native architecture. Article III asserts
the dual-audience surface principle (humans get WCAG 2.2 AA UI;
agents get versioned, machine-readable contracts) and the contract
evolution policy (semver, N-2 backwards compatibility, six-month
deprecation window, RFC 8594/9745 deprecation headers).

Article IV gathers the engineering-discipline principles (SoC, DRY,
SRP, KISS, YAGNI, no premature optimization, Law of Demeter, Principle
of Least Astonishment, fail-safe defaults), with a carve-out
clarifying that KISS does not override Article II's typed-semantics
requirements.

Article V governs versioning, the amendment process, mandatory
counsel-review evidence retained in `.specify/memory/counsel-reviews/`
for phase transitions and I.A/I.B amendments, conformance gates
(`/speckit-analyze`, `/code-review`, mandatory `/security-review` for
I/I.A/I.C/I.D, mandatory threat modeling for I/II), and the open
questions tracked elsewhere.

A change log records v1.0.0 → v1.1.0 → v2.0.0.

### `.specify/roadmap.md`

**Implementation Roadmap, v1.1.0** (2026-05-06; refined against the
Parley spec). Converts PRD §6 (v0 scope) and §10 (open questions) into
**27 features across 8 phases**, each tied to a constitutional article.

Phases A–H: Foundation (F01–F03), Ticket Spine (F04–F05), Compliance
Spine (F06, F07a Agent Contract Registry, F07b Rubric Registry +
bias-test dispatch gate), Parley Harness (F08 runner, F08.5 Tool
Surface & Dispatcher, F09 Privacy Filter, F10 Dossier Builder + Signer,
F11 Candidate Notifications), Agents (F12 AI infra, F13 Seeker
advocate, F14 Employer advocate, F15 Re-negotiation), Seeker Channels
(F16 framework, F17 Telegram, F18 Email, F19 Web chat, F20
Conversational onboarding), Web + Employer (F21 Seeker web surface,
F22 Employer admin console, F23 Employer REST API + signed webhooks),
and Hardening + Phase 0 (F24 Incident response, F25 Phase 0 alpha
posture).

F24 incident-response operating docs live in
`docs/runbooks/incident-response.md`,
`docs/runbooks/incident-response-tabletop.md`, and
`docs/architecture/monitoring-signals.md`.

F25 Phase 0 alpha posture docs live in
`docs/runbooks/phase-0-alpha-posture.md` and
`.specify/specs/025-phase-0-alpha-posture/`, including threat model,
security review, code review, analyze report, and quickstart evidence.

Critical path: **F01 → F02 → F04 → F05 → F08 → F13/F14 → F20 → F25.**
Estimated timeline: ~20 weeks to Phase 0 alpha.

Includes the dependency graph, per-phase weekly schedule with gates,
per-feature risk assessment with severity and mitigations,
constitutional-compliance validation matrix (every article mapped to
the features that satisfy it), open questions surfaced by Parley
(round-cap empirical validation, disclosure-stage progression, A2A
projection rules, audit retention durations, calibration), the
execution checklist (pre-implementation; per-feature SDD pipeline;
per-phase gates), and the change log.

### `.specify/exceptions/`

Two registers tracking deviations the constitution allows with
recorded rationale.

`dependency-signatures.md` — register for production npm packages
without published provenance attestations, per Constitution §I.C.2 as
amended in v2.0.0. Currently empty (F01 baseline). Documents the
format (package, version range, reason, first-added, reviewer), the
hard rule that signature **mismatches** are never allowlisted, the
add/remove procedure, and the "> 20 exceptions = escalate" trigger.

`license-allowlist.md` — production-dependency license allowlist
(MIT, Apache-2.0, BSD variants, ISC, 0BSD, Unlicense, CC0, BlueOak,
CC-BY-4.0 for docs/data only). Blocks GPL-* / AGPL-* / LGPL-* /
BUSL-* / SSPL-*. The CI license job is the source-of-truth mirror.
Currently no active exceptions.

### `.specify/specs/01-monorepo-scaffold/`

The F01 spec-kit bundle. Standard spec-kit layout:

`spec.md` (v1.3) — feature specification (the WHAT). Establishes the
monorepo layout, build pipeline, dependency management, environment
management, deploy pipeline, and supply-chain integrity controls
every later feature inherits. F01's stakeholders are engineers,
operators, security/compliance auditors, future-feature developers,
and agents — there is no end-user product surface.

`plan.md` (v1.1) — implementation plan (the HOW). Covers repository
topology (the `apps/` + `packages/` skeleton), the signed build
pipeline, the two-layer secret-scanning architecture, type-checked
package boundaries, the typed Zod env manifest, and the Vercel +
Neon + Inngest + AI Gateway provisioning, with effort estimated at
60–80 engineer-hours.

`research.md` — non-PRD-committed technology decisions: Jest
(D3), ESLint+Prettier (D4, revised from Biome), `@cyclonedx/cdxgen`
(D5, pnpm-aware, revised from cyclonedx-npm), Sigstore cosign keyless
(D6), `slsa-github-generator` at L3 (D7), Gitleaks + GitHub native
secret scanning (D8), Lefthook (D9), and the rest of the toolchain.

`tasks.md` — ordered task breakdown grouped by plan sub-phase
(A1–A9). Each task carries an ID, acceptance criteria, FR/NFR/story
references, dependency edges, and effort sizing. TDD discipline:
test or CI assertion ships before the configuration that satisfies
it.

`quickstart.md` — validation scenarios mapped to spec acceptance
criteria. Walks a contributor or auditor through fresh-clone
bootstrap, warm-rerun timing, CI behavior on a deliberate violation,
and SBOM/provenance verification.

`checklists/requirements.md` — requirements-quality checklist (a
yes/no judgment of the spec itself, not the implementation).

### `.specify/specs/02-identity-auth-aaa/`

The F02 spec-kit bundle. Same standard layout, plus contract
artifacts and an analyze report.

`spec.md` (v1.2; clarifications resolved 2026-05-07) — establishes
the AAA primitives (Authentication, Authorization, Accountability)
for every principal: human seekers, employer admins/members, human
operators, hosted Parley agents, and platform services. Commits
Clerk for all human auth (signup, login, MFA, profile — Spyglass
renders no custom views), Clerk Organizations for the employer side,
single-user Clerk accounts for seekers, and a restricted Clerk
Organization inside the same instance for operators with mandatory
AAL2 MFA. The internal `Principal` model is IdP-agnostic by
construction.

`plan.md` (v1.0) — clerk hosts every human-facing UI; Spyglass
mirrors Clerk users into a `principals` table via signed webhooks
(with a lazy materialization fallback); a typed `Principal` model in
`packages/auth` is the single authentication-result object every
Next.js route, tRPC procedure, and Inngest function consumes; hosted
agent credentials are EdDSA-signed JWTs minted by F02's tRPC issuer
and verified offline by F08.5 against a JWKS endpoint.

`research.md` — F02 technology decisions and rationale, including
the CL-1 Clerk-vs.-Neon-Auth question (resolved Clerk-only for v0).

`data-model.md` — the auth-related Drizzle tables F02 contributes
to the F03 schema umbrella, starting with the `principals`
system-of-record table (UUID v7 PKs, `kind` discriminator for
human/agent/service, lazy or eager materialization).

`contracts/auth-trpc.md` — the in-app tRPC router contract for
`packages/auth`, with zero-trust resolution on every procedure,
fail-closed error handling, and no-enumeration-leak error shapes.

`contracts/frontend-architecture.md` — React/Next.js component
architecture given that PRD §3.4 commits to "deliberately not
SaaS." Describes the `proxy.ts` (Next.js 16 middleware) gate, the
`<PrincipalProvider>` boundary, and the narrow set of Spyglass-side
components that surround Clerk's hosted UI.

`tasks.md` — ordered task breakdown for F02 implementation.

`quickstart.md` — validation scenarios for the AAA layer.

`analyze-report.md` — the `/speckit-analyze` cross-artifact
consistency check across spec, plan, research, data-model,
contracts, quickstart, and tasks. Verdict **PASS** (0 BLOCKER, 0
HIGH, 4 MEDIUM, 6 LOW, 3 INFO findings).

`checklists/requirements.md` — F02 requirements-quality checklist.

---

### `.specify/specs/023-employer-api-webhooks/`

The F23 spec-kit bundle for the employer REST API and signed webhook
delivery surface. It includes the feature spec, implementation plan,
data model, OpenAPI/webhook contracts, threat model, security review,
code review, and quickstart evidence.

Package-facing contract docs live in `packages/api-contracts/README.md`.
The published contract sources are
`packages/api-contracts/openapi/employer-api.v1.yaml` and
`packages/api-contracts/openapi/webhook-events.v1.yaml`.

---

## 6. What's deliberately not in this overview

Out of scope by user instruction: package-level READMEs under
`packages/*` (`a2a`, `agents`, `ai`, `api-contracts`, `auth`,
`channels-core`, `db`, `parley`, `shared`, `tickets`). Each of these
packages has a README that describes its current implementation state
(most are empty stubs in F01) and its owning feature ID; consult them
directly when working inside a specific package.

Also out of scope: `.changeset/README.md` (changesets configuration),
`.github/` policy and template files (`SECURITY.md`, issue and PR
templates), and `apps/web/public/agents.md` (the agent-readable
landing-page companion described in PRD §5.3).

The Parley harness specification itself lives in a **separate repo**
referenced by `PRD.md` and the roadmap (`/mnt/f/parley/SPEC.md`,
`/mnt/f/parley/PARLEY_ADAPTATIONS.md`). It is the load-bearing
companion to everything in Phase D, but not part of this repository.
