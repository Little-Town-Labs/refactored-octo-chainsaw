# Feature Specification — F01 Monorepo Scaffold + Tech-Stack Baseline

**Feature ID:** F01
**Slug:** `01-monorepo-scaffold`
**Branch:** `01-monorepo-scaffold`
**Phase:** A — Foundation
**Priority:** P0 (Critical)
**Complexity:** M (2–4 weeks)
**Status:** Draft v1.3
**Created:** 2026-05-06
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.C (Cryptographic & Supply-Chain
Standards, amended at v2.0.0), §I.6 (Secure-by-Default), §IV (SoC),
§III.3 (Contract evolution)
**Roadmap:** `.specify/roadmap.md` v1.1.0
**PRD:** `PRD.md` §7 (committed tech stack), §11 (next steps)

---

## 1. Overview

Establish the project foundation: monorepo layout, build pipeline,
dependency management, environment management, deploy pipeline, and the
supply-chain integrity controls every subsequent feature will depend on.

This is the only feature whose deliverable is "the platform on which
features are built." Nothing in F01 is user-facing in the product sense —
its users are **engineers, operators, agents (per Article II), and
security/compliance auditors.** The product end-user value is delivered by
features F02 onward; F01 is the substrate that makes those features
shippable, auditable, and defensible.

### 1.1 Why this feature exists

- The constitution (§I.C) requires SBOMs, signed dependencies, and
  SLSA-level build provenance from day one. These cannot be retrofitted —
  they have to be present in the build pipeline before the first release.
- Article I.6 (Secure-by-Default) requires every default to be the most
  restrictive option that satisfies the requirement. The scaffold sets
  those defaults once.
- PRD §7 commits the tech stack at the requirements level; F01 turns those
  commitments into a working dev loop, CI pipeline, and deploy posture.
- Every later feature inherits F01's discipline. Slipping here is paid
  back compounded across F02–F25.

### 1.2 Scope

**In scope:**
- Monorepo structure matching PRD §7 module layout
- Build, test, lint, type-check, format pipelines
- Dependency management with signing and SBOM generation
- Vercel project linking and environment management
- Neon Postgres provisioning (empty database; schema is F03's deliverable)
- Inngest project setup (no functions yet; functions are F08's deliverable)
- Vercel AI Gateway wiring (no model calls yet; agents are F12+)
- CI/CD pipeline with mandatory quality gates
- Pre-commit hooks for secret scanning and basic checks
- Documentation: contributor onboarding, environment-variable manifest

**Out of scope (deferred to later features):**
- Database schema (F03)
- Authentication implementation (F02)
- Any business logic, state machines, agents, or product surfaces
- Deployment to production (Phase 0 alpha launch is F25's gate)

---

## 2. Stakeholders & "Users"

F01 has no end-user product surface. Its stakeholders are:

| Role | What they need from F01 |
|------|--------------------------|
| **Platform engineer** | Working dev loop on first clone; clear conventions; type-safe boundaries between packages |
| **Operator / SRE** | Reproducible builds, environment management, observable deploys, signed artifacts they can verify |
| **Security/compliance auditor** | SBOM per release, build provenance, dependency-signing chain, secret-scanning gate, vulnerability tracking |
| **Future-feature developer** | Stable package contracts, semver-disciplined exports, machine-readable manifests, no surprise coupling |
| **Agents (Article II)** | Machine-readable package manifests; type definitions exportable for client SDKs (consumed by F12 onward) |

---

## 3. User Stories

### Story 1 — Developer Onboarding

**As a** new platform engineer joining Spyglass,
**I want** to clone the repo and reach a working dev environment in
under 30 minutes,
**So that** I can start contributing without fighting setup.

**Acceptance criteria:**
- [ ] `git clone` followed by a single documented bootstrap command
      installs all dependencies, links Vercel, pulls environment
      variables, runs migrations against a local-dev database, and
      starts the dev server.
- [ ] A new contributor with no prior Spyglass context can complete
      onboarding using only `README.md` plus the linked
      `CONTRIBUTING.md`.
- [ ] The bootstrap is idempotent — running it again on a working
      checkout is a no-op or a quick refresh.
- [ ] Bootstrap failure produces a single actionable error message,
      not a stack trace dump.

**Priority:** High

---

### Story 2 — Reproducible, Signed CI Builds

**As an** operator,
**I want** every CI build to produce a signed, reproducible artifact
with attached SBOM and provenance,
**So that** I can prove what shipped, when, and from what source —
and verify the chain at any point.

**Acceptance criteria:**
- [ ] Every push to a release branch produces a build with: a
      CycloneDX-format SBOM, SLSA-level build provenance, and a
      Sigstore signature over the artifact.
- [ ] SBOM, provenance, and signature are stored as build artifacts and
      retrievable for at least 7 years (Constitution §I.A.2 audit
      retention floor).
- [ ] A documented verification command takes an artifact and confirms
      its signature, provenance chain, and SBOM integrity in a single
      pass.
- [ ] Verification fails closed: if any link is broken, the artifact is
      rejected (Constitution §I.6 fail-safe defaults).

**Priority:** High

---

### Story 3 — Dependency Supply-Chain Discipline

**As a** security/compliance auditor,
**I want** every production dependency to be tracked, signed, and
audited for known vulnerabilities,
**So that** Spyglass can answer EO 14028 / NIST SSDF / SLSA queries
without forensic excavation.

**Acceptance criteria:**
- [ ] Adding a new dependency triggers automated checks: license
      compatibility, known CVE scan, signature verification.
- [ ] CI fails on any production dependency lacking a verifiable
      signature or with a known CVE above an agreed severity threshold.
- [ ] The dependency graph is exported as part of the SBOM and is
      diffable across releases.
- [ ] Dependency updates flow through a single mechanism (no parallel
      package files, no shadow installs).

**Priority:** High

---

### Story 4 — Package Boundary Discipline (Separation of Concerns)

**As a** future-feature developer,
**I want** package boundaries to be enforced at type-check time, not
just by convention,
**So that** unintended coupling between packages cannot regress.

**Acceptance criteria:**
- [ ] Each package in `packages/` has an explicit public API via
      `package.json` `exports` field; deep-import paths from outside
      the package are rejected at type-check.
- [ ] Inter-package dependencies are explicit in each package's
      `package.json` — no implicit hoisting that bypasses declared
      dependencies.
- [ ] Cyclic dependencies between packages fail CI.
- [ ] Each package exports type definitions consumable by other
      packages and (where appropriate) by external clients.

**Priority:** High

---

### Story 5 — Environment & Secret Management

**As an** operator,
**I want** environment variables managed through a single source of
truth with no secrets in source control,
**So that** rotation, audit, and per-environment differences are
trivial — and a leaked credential is a contained event.

**Acceptance criteria:**
- [ ] All environment variables are declared in a manifest (purpose,
      required-or-optional, environment scope).
- [ ] Secrets are managed through Vercel environment variables
      (preview / production / development scopes) and pulled to local
      via `vercel env pull`.
- [ ] Pre-commit and CI gates reject commits containing patterns that
      look like secrets (high-entropy strings, common API-key prefixes,
      private-key headers).
- [ ] The manifest is the documentation: a developer can determine
      every env var the app needs without running the app.
- [ ] No `.env*` file outside `.env.example` (which contains only
      placeholders) may be committed.

**Priority:** High

---

### Story 6 — Quality Gates in CI

**As a** platform engineer,
**I want** CI to enforce quality gates on every PR,
**So that** main branch is always in a state that satisfies the
constitution's foundational articles.

**Acceptance criteria:**
- [ ] Every PR runs: type-check, lint, format-check, unit tests,
      dependency audit, SBOM generation, secret scan.
- [ ] CI fails on any of the above.
- [ ] Coverage threshold of 80%+ on changed code (per global
      `~/.claude/rules/testing.md`) is reported on every PR. Initial
      threshold is "non-blocking warning"; promotion to blocking is a
      separate, explicit decision in F03 once meaningful test surface
      exists.
- [ ] CI runtime budget for the standard PR pipeline is under 10
      minutes for a no-cache build, under 4 minutes for a warm-cache
      build.

**Priority:** High

---

### Story 7 — Foundation Documents Itself

**As a** future contributor or auditor,
**I want** the scaffold to ship with documentation describing what was
chosen, why, and where to change it,
**So that** the rationale survives staff turnover and audit cycles.

**Acceptance criteria:**
- [ ] `README.md` covers what Spyglass is, how to onboard, how to run
      tests, how to deploy a preview, and where to find deeper docs.
- [ ] `CONTRIBUTING.md` covers branch naming, commit conventions, the
      spec-kit workflow, and the constitutional gates that apply to
      every PR.
- [ ] An `architecture/` (or equivalent) note records the
      monorepo-vs-polyrepo decision, build-tool choice, and any
      non-obvious workspace conventions.
- [ ] Each package has a one-paragraph `README.md` describing its
      purpose, public API, and stability tier.

**Priority:** Medium

---

## 4. Functional Requirements

Stated in capability terms, not implementation terms. Where PRD §7 has
already committed a specific technology, the requirement still describes
the *capability* and notes the committed tool in parentheses for
traceability.

### 4.1 Repository structure

- **FR-1.** The repository is a single monorepo under
  pnpm-workspaces + Turborepo orchestration (PRD §7).
- **FR-2.** Top-level structure matches PRD §7 module layout:
  `apps/` for runnable applications, `packages/` for shared libraries,
  `.specify/` for spec-kit artifacts, `docs/` for human-facing
  documentation.
- **FR-3.** Each package has a clear, single-purpose name aligned with
  PRD §7 (e.g., `parley`, `tickets`, `agents`, `db`, `api-contracts`,
  `a2a`, `channels-core`, `auth`, `ai`, `shared`).
- **FR-4.** A package's `name` field follows the pattern
  `@spyglass/<purpose>`.
- **FR-5.** No `apps/` package depends on another `apps/` package.
  Inter-app sharing flows through `packages/`.

### 4.2 Build & test pipelines

- **FR-6.** Type-check, lint, format-check, and unit-test commands are
  available at the workspace root and per-package.
- **FR-7.** Builds are deterministic given the same input
  (lockfile + source). Equivalent inputs produce byte-identical SBOMs.
- **FR-8.** Test framework supports unit, integration, and contract
  tests with consistent reporting. (Specific framework — see
  Clarification 1.)
- **FR-9.** Coverage reporting is wired to the test runner and
  produces machine-readable output for CI.

### 4.3 Supply-chain integrity (Constitution §I.C.2)

- **FR-10.** Every release produces a CycloneDX-format SBOM (NTIA
  minimum elements; EO 14028 §4(e)).
- **FR-11.** Every release artifact carries a Sigstore-signed
  attestation (cosign or equivalent).
- **FR-12.** Every release artifact carries SLSA Build Level 3
  provenance.
- **FR-13.** A documented verification command verifies signature +
  provenance + SBOM integrity in a single pass and fails closed on
  any broken link.
- **FR-14.** Production dependencies are tracked via SBOM (FR-10) and
  audited for known vulnerabilities (FR-29). Where the npm/pnpm
  ecosystem provides upstream provenance attestations (npm CLI 10.5+),
  CI verifies them; **signature mismatches fail the build and are
  never allowlisted.** Packages without published provenance are
  recorded in `.specify/exceptions/dependency-signatures.md` with a
  one-line rationale and reviewed at each release. Universal
  dependency signing was relaxed from a foundational requirement in
  Constitution v2.0.0 pending ecosystem maturity; the exceptions
  register is the audit-readable record of current coverage.

### 4.4 Cryptographic baseline (Constitution §I.C.1)

- **FR-15.** Cryptographic operations use NIST-approved algorithms
  (FIPS 140-3 validated modules where available).
- **FR-16.** Cryptographic configuration is centralized; algorithm
  choices are configurable without code changes (crypto-agility).
- **FR-17.** No long-term secrets are stored in source. HSM or
  Vercel-environment-variable scope are the only sanctioned stores
  for production keys.

### 4.5 Environment management

- **FR-18.** Environment variables are declared in a single manifest.
  The manifest specifies: variable name, purpose, environment scope
  (development / preview / production), required-or-optional,
  default if any.
- **FR-19.** A documented bootstrap path pulls environment variables
  from Vercel into local dev (`vercel env pull`).
- **FR-20.** A `.env.example` (or equivalent) committed file lists
  all expected variables with placeholder values.
- **FR-21.** No live `.env*` file is permitted in commit history;
  pre-commit and CI gates enforce.

### 4.6 Secret hygiene

- **FR-22.** Pre-commit hook scans staged content for secret
  patterns (high-entropy strings, common API-key prefixes, private-key
  headers).
- **FR-23.** CI scans the full diff of every PR for the same patterns
  and additionally scans new commits on protected branches.
- **FR-24.** A leaked-secret discovery is a sev-1 incident
  (Constitution §I.D); this requirement is satisfied by F01 even
  though the IR runbook itself is F24's deliverable.

### 4.7 Package contracts (Constitution §III.3)

- **FR-25.** Each `packages/*` package has a `package.json` `exports`
  field defining its public API; deep imports from outside the
  package are rejected at type-check.
- **FR-26.** Package versions follow semver 2.0.0; breaking changes
  require a major bump.
- **FR-27.** A package's exported type definitions are a first-class
  artifact, validated by CI.

### 4.8 Continuous integration

- **FR-28.** CI runs on every PR and on every push to protected
  branches (`main`, release branches).
- **FR-29.** CI gate set: type-check, lint, format-check, unit tests,
  dependency audit, SBOM generation, secret scan.
- **FR-30.** A CI run is reproducible from its commit SHA — the same
  SHA produces the same gate results given the same external state
  (dependency registry, etc.).
- **FR-31.** CI artifacts (SBOM, signatures, provenance, test
  reports) are retained per the audit retention floor (Constitution
  §I.A.2 — 7 years minimum for AEDT-relevant artifacts; non-AEDT CI
  logs may be retained for shorter durations to be set in F03).

### 4.9 Documentation surface (Article III, dual-audience)

- **FR-32.** Human-facing docs: `README.md`, `CONTRIBUTING.md`,
  `SECURITY.md`, per-package `README.md`.
- **FR-33.** Agent/machine-facing surfaces are scaffolded but empty
  in F01: `agents.md` and `llms.txt` placeholders at the web app
  root, to be populated by F21. F01 commits the *paths*, not the
  content.
- **FR-34.** All documentation is consistent with Constitution §III.4
  — no surface ships with one audience served and the other ignored.

---

## 5. Non-Functional Requirements

### 5.1 Performance

- **NFR-1.** Cold dev bootstrap (clone → working dev server) ≤ 30
  minutes on a typical contributor machine and a residential
  internet connection.
- **NFR-2.** Warm dev bootstrap (re-running bootstrap on a working
  checkout) ≤ 2 minutes.
- **NFR-3.** Standard PR CI pipeline ≤ 10 minutes cold cache, ≤ 4
  minutes warm cache.
- **NFR-4.** Dev-server hot-reload after a typical edit ≤ 3 seconds
  to visible effect.

### 5.2 Security (Constitution §I)

- **NFR-5.** No secrets in source control history at any point.
- **NFR-6.** Default permissions are the most restrictive available
  (Constitution §I.6 fail-safe defaults).
- **NFR-7.** Every authenticated surface enforces MFA at AAL2 or
  higher (Constitution §I.5.1) — F01 commits the *configuration
  surface*; AAL2 is implemented by F02.

### 5.3 Reliability

- **NFR-8.** CI gate failures produce actionable error messages with
  links to remediation docs.
- **NFR-9.** The bootstrap process is robust to network hiccups
  (retries with backoff for fetches).

### 5.4 Maintainability (Constitution §IV)

- **NFR-10.** No file in the scaffold exceeds 800 lines without a
  recorded exception (per `~/.claude/rules/coding-style.md`).
- **NFR-11.** Bootstrap and CI logic is in named, documented scripts —
  not inline shell pasted into multiple workflow files.

### 5.5 Documentation

- **NFR-12.** Every committed bootstrap command, CI workflow, and
  package configuration has a one-line comment or doc reference
  explaining its purpose if not self-evident from the name.

---

## 6. Edge Cases & Error Handling

| # | Scenario | Required behavior |
|---|----------|-------------------|
| EC-1 | Contributor runs bootstrap without `vercel` CLI installed | Bootstrap detects, instructs install, exits non-zero with single-line guidance |
| EC-2 | `vercel env pull` fails (auth expired, network) | Bootstrap fails fast with actionable error; partial env files are not written |
| EC-3 | Pre-commit hook detects a secret-shaped string in staged content | Commit is rejected; hook output names the file/line and the matched pattern; instruction to use `git rm --cached` if file was already tracked |
| EC-4 | Dependency added with a *mismatched* upstream signature (real attack signal) | CI fails with a clear "signature mismatch" message; the dep is rejected; mismatches are **never** allowlisted |
| EC-4b | Dependency added without an upstream signature available (ecosystem gap, not attack) | CI fails until the dep is added to `.specify/exceptions/dependency-signatures.md` with a one-line rationale; the exceptions list is reviewed at each release |
| EC-5 | SBOM generation fails on a release build | Release pipeline aborts; no artifact is published; failure is paged to operator (channel TBD in F24) |
| EC-6 | Sigstore signature verification fails on consumption | Verification command exits non-zero; calling pipeline halts; no artifact is deployed |
| EC-7 | Two packages develop a circular dependency | Type-check fails; CI fails; PR cannot merge until cycle is resolved |
| EC-8 | A `.env` file is accidentally added to a commit | Pre-commit hook rejects; if it slips through, CI rejects; if it reaches `main`, treat as sev-1 secret-leak incident even if the leaked values were placeholders |
| EC-9 | Bootstrap succeeds but produces a non-runnable dev environment | Bootstrap's final step is a smoke-test that exits non-zero on failure; partial success is treated as failure |
| EC-10 | A new contributor's machine has incompatible Node.js / pnpm versions | Tool-version pinning (via `engines`, `.nvmrc`, `packageManager`) detects mismatch; bootstrap surfaces the exact required versions |

---

## 7. Constitutional Compliance

| Article | How F01 satisfies |
|---------|-------------------|
| **§I.2 Integrity** | Reproducible builds (FR-7); SBOM + provenance (FR-10–12); package versioning (FR-26) |
| **§I.5.2 Authorization (least privilege)** | Default-restrictive permissions baseline (NFR-6) |
| **§I.6 Defense in Depth & Secure-by-Default** | Multiple secret-scan layers (FR-22, FR-23); fail-safe verification (FR-13); restrictive defaults (NFR-6) |
| **§I.A.2 Audit retention** | CI artifact retention ≥ 7 years for AEDT-relevant artifacts (FR-31) |
| **§I.C.1 Cryptographic standards** | NIST-approved algorithms + crypto-agility (FR-15, FR-16) |
| **§I.C.2 Supply-chain integrity** | SBOM (FR-10), Sigstore signing (FR-11), SLSA L3 provenance (FR-12), signed-deps gate (FR-14) |
| **§II Agent-Native** | Machine-readable package manifests (FR-25, FR-27); `agents.md` / `llms.txt` paths reserved (FR-33) |
| **§III.3 Contract evolution** | Semver discipline (FR-26); explicit `exports` API (FR-25) |
| **§III.4 Completeness** | Dual-audience doc surface from day one (FR-32, FR-33) |
| **§IV Engineering discipline** | Package boundaries enforced (FR-25); SoC at workspace level (FR-1, FR-2); file-size limits (NFR-10) |
| **§V.3 Conformance gates** | CI runs `/speckit-analyze`-relevant checks (FR-28, FR-29) |

---

## 8. Success Metrics

Quantitative gates F01 must meet before being declared complete:

| Metric | Target |
|--------|--------|
| Cold dev bootstrap time (median, recorded across ≥ 3 contributors) | ≤ 30 minutes |
| Warm CI pipeline time | ≤ 4 minutes |
| Cold CI pipeline time | ≤ 10 minutes |
| Number of secrets in committed history | 0 |
| % of production dependencies with verifiable signatures | 100% (modulo recorded exceptions) |
| % of releases with valid SBOM + provenance + signature | 100% |
| Verification command false-negatives in test runs | 0 |
| Lint / type-check warnings on default branch | 0 |

---

## 9. Out of Scope (defer to indicated feature)

- Database schema and migrations → **F03**
- Auth implementation, MFA enforcement, scoped tokens → **F02**
- Inngest function bodies → **F08**
- AI Gateway model calls / prompt registry → **F12**
- `agents.md` / `llms.txt` content → **F21** (paths only in F01)
- Production deploy gates (Phase 0 alpha posture) → **F25**
- Runtime monitoring, on-call, IR runbooks → **F24**
- Feature flagging / kill switches → **F06** (jurisdiction-specific)

---

## 10. Clarifications Needed

Three open questions. Recommendations are based on standards alignment and
reduce-the-cognitive-load reasoning. Address in `/speckit-clarify`.

### Clarification 1 — Test framework — RESOLVED

**Decision (2026-05-06):** **Jest** with `next/jest` for Next.js
integration and `@swc/jest` (or `ts-jest`) for the TypeScript
transformer.

**Rationale:** Team familiarity and ecosystem maturity outweigh the
startup-time advantage Vitest would offer. CI runtime budgets in NFR-3
(≤ 4 min warm, ≤ 10 min cold) remain in force; if Jest startup pushes
the warm budget at scale, revisit at the Phase D / Phase E boundary
when the test surface is larger.

**Implementation notes (informational, for `/speckit-plan`):**
- ESM interop in Jest still requires care — pin `transformIgnorePatterns`
  for any ESM-only dependency, or transpile via the Jest transformer.
- Use `next/jest` preset for the `apps/web/` package; share a base
  Jest config for `packages/*` to avoid drift.
- Coverage reporter must produce LCOV (or compatible) for CI parsing
  (FR-9).

---

### Clarification 2 — Lint + format toolchain — REVISED

**Original decision (2026-05-06, spec v1.2):** Biome as a single tool
for lint and format.

**Revised decision (2026-05-06, spec v1.3, post-`/speckit-analyze`):**
**ESLint + Prettier**, with `eslint-config-next` for Next.js,
`@typescript-eslint/*` for TypeScript, `eslint-plugin-import` and
`eslint-plugin-boundaries` for monorepo boundary enforcement.

**Why revised:**
1. ESLint's built-in `max-lines` rule directly satisfies NFR-10
   (file size ≤ 800 lines) without a custom CI script —
   `/speckit-analyze` Finding 2.
2. Prettier as the formatter aligns naturally with the global
   `~/.claude/settings.json` PostToolUse Prettier hook — the
   reconciliation question raised by the Biome path goes away.
3. The plugin ecosystem (boundaries, import, security, custom rules)
   is a better fit for a 27-feature monorepo than Biome's speed
   advantage at small repo size.

**Tradeoffs accepted:** two tools instead of one; more config; more
plugin-version maintenance. Mitigated by Turborepo caching keeping
warm-cache CI inside NFR-3.

**Implementation notes (informational, for `/speckit-plan` and
`/speckit-tasks` revision):**
- Lefthook hook commands change from `biome check` to
  `eslint --fix-dry-run` + `prettier --check` on staged files.
- The original Biome-vs-Prettier reconciliation note (and its
  follow-up task) are no longer applicable.
- Boundary enforcement is now `eslint-plugin-boundaries` +
  `eslint-plugin-import/no-internal-modules` instead of Biome's
  `noPrivateImports`.

---

### Clarification 3 — Node.js & package-manager version pinning — RESOLVED

**Decision (2026-05-06):** **Node 24 LTS** + **pnpm 9.x**, pinned via
`engines.node`, `engines.pnpm`, the root `packageManager` field, and a
top-level `.nvmrc`. Pnpm is invoked via Corepack to avoid global-install
drift.

**Rationale:** Node 24 is Vercel's current default (per platform
knowledge update 2026-02-27); using the platform default minimizes
deploy surprises and reduces the supported-version matrix.

**Implementation notes (informational, for `/speckit-plan`):**
- `packageManager: "pnpm@9.x.x"` (pin to a specific patch in the
  scaffold; bump deliberately).
- `.nvmrc` should track the same Node major as `engines.node` —
  divergence is a CI failure.
- CI base image must match locally pinned versions to keep
  reproducibility (FR-7).

---

## 11. Dependencies & Sequencing

**Blocks:** F02, F03, F04, and effectively every subsequent feature.
**Blocked by:** None — F01 is the root of the dependency graph.

**Concurrent work allowed:**
- Counsel engagement (governance, not engineering)
- PRD Open Question #9 resolution (Phase 1 jurisdiction set)
- Reading Parley `SPEC.md` end-to-end in preparation for Phase D

**Risk if delayed:** F02 and F03 cannot start. F03 in particular is on
the critical path to the entire ticket spine (F04, F05).

---

## 12. Threat Model Hooks

Per Constitution §V.3, F01's threat model is **out of scope** because
F01 ships no application logic touching Articles I or II directly. It
ships *the pipeline* that future features will rely on. The following
threats are noted here for the threat models of features that consume
F01's outputs:

- **Build-tool compromise** (e.g., malicious dependency executes in CI).
  F01 mitigates by signed deps + SBOM + provenance; future-feature
  threat models inherit these mitigations.
- **CI runner compromise.** GitHub Actions / Vercel Build hardening is
  considered baseline; deeper hardening is an F24 concern.
- **Developer-machine compromise leaking signing keys.** Mitigated by
  HSM/Vercel-env scoping for production keys (FR-17); developer
  signing is local and non-production.

---

## 13. Open Questions for `/speckit-clarify`

All three clarifications resolved 2026-05-06:
- **Clarification 1 — Test framework:** Jest (with `next/jest` +
  `@swc/jest`).
- **Clarification 2 — Lint + format:** ESLint + Prettier (revised
  from Biome on 2026-05-06 per `/speckit-analyze` Finding 2; see
  Clarification 2 above for revised rationale).
- **Clarification 3 — Node + pnpm:** Node 24 LTS + pnpm 9.x via
  Corepack.

Spec is ready for plan/tasks re-validation and `/speckit-implement`.

---

## Change Log

| Version | Date       | Change                          |
|---------|------------|---------------------------------|
| 1.0     | 2026-05-06 | Initial draft for `/speckit-clarify`. |
| 1.1     | 2026-05-06 | Resolved Clarification 1 — test framework = Jest (with `next/jest` + `@swc/jest`). Two clarifications remain. |
| 1.2     | 2026-05-06 | Resolved Clarifications 2 (lint+format = Biome) and 3 (Node 24 LTS + pnpm 9.x via Corepack). All clarifications closed; spec ready for `/speckit-plan`. |
| 1.3     | 2026-05-06 | Post-`/speckit-analyze` revisions: (a) FR-14 + EC-4 softened — universal dep signing relaxed to "verify upstream provenance where available; record exceptions"; constitutional basis is Constitution v2.0.0 amendment to §I.C.2. (b) Clarification 2 revised — Biome → ESLint+Prettier (gains `max-lines` for NFR-10; aligns with global Prettier hook). (c) Constitution reference bumped to v2.0.0. |
