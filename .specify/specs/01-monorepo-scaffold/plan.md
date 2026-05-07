# F01 — Implementation Plan

**Spec:** `.specify/specs/01-monorepo-scaffold/spec.md` v1.2
**Research:** `.specify/specs/01-monorepo-scaffold/research.md` v1.0
**Branch:** `01-monorepo-scaffold`
**Plan version:** 1.1
**Date:** 2026-05-06
**Owner:** Gary
**Constitution refs:** v2.0.0 §I.C (amended at v2.0.0), §I.6, §I.5,
§II, §III.3, §IV, §V.3
**Estimated effort:** 60–80 engineer-hours (≈ 2–3 weeks at ~30 h/wk)

---

## 1. Executive Summary

F01 establishes the platform on which F02–F25 are built. Its
deliverable is a working Spyglass repository with:

- Turborepo + pnpm workspaces in PRD §7's module layout.
- A reproducible, signed build pipeline producing CycloneDX SBOMs and
  SLSA L3 build provenance on every release.
- Two-layer secret scanning (local Gitleaks via Lefthook + GitHub
  push-protection) and `pnpm audit` + `osv-scanner` for vulnerability
  scanning.
- Type-checked package boundaries via TypeScript project references
  + Biome import rules + `publint` validation.
- A typed Zod-backed environment manifest as the single source of
  truth for env vars.
- Vercel project linked, Neon database provisioned (empty), Inngest
  project created (no functions yet), Vercel AI Gateway configured (no
  calls yet).
- `.github/` codification of branch protection, required checks,
  Dependabot, and security policy.

No business logic, no API surfaces, no UI. Just the substrate.

---

## 2. Architecture Overview

### 2.1 Repository topology

```
spyglass/
├── apps/
│   └── web/                 Next.js 16 App Router app (admin, web chat,
│                            API routes, A2A, Inngest handlers — empty
│                            shell in F01)
│   (telegram-bot/ and whatsapp-bot/ created in F17 / v1)
├── packages/
│   ├── parley/              empty stub w/ public API placeholder
│   ├── tickets/             empty stub w/ public API placeholder
│   ├── agents/              empty stub w/ public API placeholder
│   ├── db/                  Drizzle config + migrations dir (no schema)
│   ├── api-contracts/       empty stub for OpenAPI YAMLs (F23)
│   ├── a2a/                 empty stub (F21)
│   ├── channels-core/       empty stub (F16)
│   ├── auth/                empty stub (F02)
│   ├── ai/                  empty stub (F12)
│   └── shared/              env.ts (Zod schema), errors, common types
├── .github/
│   ├── workflows/
│   │   ├── ci.yml           type-check, lint, test, audit, SBOM, secret-scan
│   │   ├── release.yml      tagged release: signed artifact + SBOM + SLSA
│   │   └── slsa.yml         reusable workflow (SLSA L3 generator)
│   ├── dependabot.yml
│   ├── CODEOWNERS
│   ├── SECURITY.md
│   └── pull_request_template.md
├── .specify/                spec-kit artifacts (already exists)
├── docs/
│   ├── architecture/        ADR-style notes
│   └── COMPLIANCE_ARCHITECTURE.md   (already exists)
├── scripts/
│   ├── bootstrap.sh         single-command dev setup
│   ├── verify-artifact.sh   SBOM + signature + provenance verifier
│   └── gen-env-example.ts   .env.example generator from Zod schema
├── lefthook.yml             pre-commit + commit-msg hook config
├── biome.json               lint + format config
├── turbo.json               Turborepo task graph
├── tsconfig.base.json       shared compiler options
├── pnpm-workspace.yaml
├── package.json             root, packageManager-pinned
├── .gitleaks.toml
├── .nvmrc                   24
├── .env.example             generated; do not edit by hand
├── README.md
├── CONTRIBUTING.md
├── PRD.md                   (already exists)
└── LICENSE
```

### 2.2 Build graph (Turborepo)

```
turbo run build
   └── packages/* build (parallel; uses TS project refs)
          └── packages/shared build (depends on by all)
   └── apps/web build
          └── packages/* (transitive)

turbo run test           parallel; depends on build
turbo run lint           parallel; no deps (Biome)
turbo run type-check     parallel; uses TS project refs
turbo run sbom           generates per-package + workspace-root SBOM
```

Caching uses Turborepo's local cache; remote cache is enabled on
Vercel deployments. CI uses `turbo run --concurrency=1` only when
required for ordered side effects (SBOM generation); everything else
runs concurrent.

### 2.3 Trust boundary diagram

```
  Developer machine
   ├── Lefthook pre-commit hook  ─┐
   │     ├── ESLint (lint)        │  Layer 1: developer-side
   │     ├── Prettier (format)    │  (best-effort, can be bypassed)
   │     ├── Gitleaks scan        │
   │     └── commitlint           │
   │
   └── git push ──▶ GitHub
                     │
                     ├── Push protection (GitHub native secret scan)  Layer 2: server-side, can't be bypassed
                     │
                     └── PR opened ──▶ GitHub Actions
                                         │
                                         ├── ci.yml (Layer 3: type-check, lint, tests, audit, SBOM, secret scan)
                                         │
                                         └── on release tag ──▶ release.yml + slsa.yml
                                                                 │
                                                                 ├── Build artifact
                                                                 ├── Generate CycloneDX SBOM
                                                                 ├── Sign via cosign (keyless, OIDC)
                                                                 ├── Generate SLSA L3 provenance
                                                                 └── Publish artifact + attestations
                                                                            │
                                                                            └── Vercel deploys artifact (verified)
```

Three independent layers per Constitution §I.6 (Defense in Depth).

---

## 3. Technology Stack

| Layer | Choice | Source |
|-------|--------|--------|
| Runtime | Node.js 24 LTS | Spec Clarification 3 |
| Package manager | pnpm 9.x via Corepack | Spec Clarification 3 |
| Monorepo orchestrator | Turborepo | PRD §7 |
| Application framework | Next.js 16 App Router | PRD §7 (Vercel default) |
| Database | Neon Postgres | PRD §7 |
| ORM | Drizzle | PRD §7 (config only in F01; schema in F03) |
| Auth | Clerk | PRD §7 (configured in F02; not F01) |
| Durable workflow | Inngest | PRD §7 (project link only in F01) |
| LLM access | Vercel AI Gateway + AI SDK v6 | PRD §7 |
| Object storage | Vercel Blob | PRD §7 (configured in F10) |
| Test runner | Jest + `next/jest` + `@swc/jest` | Spec Clarification 1 |
| Lint | ESLint + `eslint-config-next` + `@typescript-eslint/*` + `eslint-plugin-import` + `eslint-plugin-boundaries` | Spec Clarification 2 (revised) |
| Format | Prettier | Spec Clarification 2 (revised) |
| SBOM | `@cyclonedx/cdxgen` | Research D5 |
| Signing | Sigstore `cosign` (keyless via OIDC) | Research D6 |
| Provenance | SLSA L3 via `slsa-github-generator` | Research D7 |
| Secret scan | Gitleaks + GitHub native | Research D8 |
| Pre-commit framework | Lefthook | Research D9 |
| Vuln scanner | `pnpm audit` + `osv-scanner` | Research D10 |
| License audit | `license-checker-rseidelsohn` | Research D11 |
| Type system | TypeScript 5.x with project references | Research D12 |
| CI | GitHub Actions | Research D13 |
| Commit linting | commitlint + conventional-commits | Research D14 |
| Versioning | `changesets` (config only in F01) | Research D15 |
| Boundary enforcement | `eslint-plugin-boundaries` + `eslint-plugin-import/no-internal-modules` + `package.json#exports` + `publint` | Research D16 |
| Env validation | Zod schema in `packages/shared/env.ts` | Research D17 |
| Repo settings | `.github/` codified | Research D18 |

---

## 4. Implementation Phases

Sub-phases inside F01. Roughly sequenced; some run in parallel.

### Phase A1 — Repo skeleton (≈ 8h)

**Tasks:**
1. Initialize pnpm workspace; create `pnpm-workspace.yaml`,
   root `package.json` with `packageManager: "pnpm@9.x.x"`.
2. Pin Node version: `.nvmrc` (`24`), root `engines`.
3. Create `apps/web/` with `npx create-next-app@latest` against
   Next.js 16 App Router (TypeScript, Biome-compatible flags).
4. Create empty `packages/*` stubs per §2.1, each with:
   - `package.json` (`name: @spyglass/<pkg>`, `private: true`,
     `exports` field declaring public API entry)
   - `tsconfig.json` extending `tsconfig.base.json`,
     `composite: true`
   - `README.md` (purpose, public API, stability tier)
   - `src/index.ts` placeholder
5. Add `tsconfig.base.json` with strict-mode TypeScript baseline.
6. Create `turbo.json` with task graph from §2.2.

**Validation:** `pnpm install` succeeds; `pnpm -r run type-check`
exits 0 against empty packages.

---

### Phase A2 — Linting, formatting, hooks (≈ 6h)

**Tasks:**
1. `pnpm add -D -w eslint @typescript-eslint/eslint-plugin
   @typescript-eslint/parser eslint-config-next eslint-plugin-import
   eslint-plugin-boundaries prettier`. Init `eslint.config.js`
   (flat config) with:
   - `recommended` + `@typescript-eslint/recommended-type-checked`
   - `eslint-config-next` for `apps/web/`
   - `eslint-plugin-boundaries` configured to enforce
     `packages/*` ↔ `apps/*` rules
   - `eslint-plugin-import/no-internal-modules` to reject deep
     imports (FR-25, Research D16)
   - `max-lines: ["error", { "max": 800, "skipBlankLines": true,
     "skipComments": true }]` (NFR-10)
2. `prettier.config.js` aligned with global
   `~/.claude/settings.json` PostToolUse Prettier hook output —
   the Biome reconciliation question from spec v1.2 no longer
   applies.
3. `pnpm add -D -w lefthook` and create `lefthook.yml` with:
   - `pre-commit`: parallel — eslint on staged files, prettier
     check on staged files, gitleaks, type-check on changed
     packages (via `tsc --noEmit -p`)
   - `commit-msg`: commitlint
4. `pnpm add -D -w @commitlint/cli @commitlint/config-conventional`;
   add `commitlint.config.js`.
5. `pnpm add -D -w gitleaks` (or document brew/binary install in
   bootstrap); create `.gitleaks.toml` from default with project
   tweaks (e.g., allow false positives in `__fixtures__`).
6. Document hook bypass policy: never `--no-verify` on protected
   branches; pre-commit failure is investigated, not bypassed
   (per Constitution §I.6 fail-safe defaults; per
   `~/.claude/rules/debugging.md`).

**Validation:** `lefthook install` runs; sample commit triggers
hooks; commit with bad message rejected.

---

### Phase A3 — Test infrastructure (≈ 6h)

**Tasks:**
1. `pnpm add -D -w jest @swc/jest @types/jest`; in
   `apps/web/` add `next/jest` preset.
2. Create root `jest.config.base.ts` with `@swc/jest` transformer,
   `transformIgnorePatterns` configured for ESM-only deps as
   needed.
3. Each package extends the base: `jest.config.ts`. `apps/web/`
   uses `next/jest`.
4. Add coverage reporter (LCOV + JSON summary).
5. Add a placeholder smoke test in `packages/shared` to prove the
   pipeline.

**Validation:** `pnpm -r test` runs the smoke test green.

---

### Phase A4 — Environment manifest (≈ 4h)

**Tasks:**
1. `pnpm add -w zod` (already in dep closure but pinned at root for
   workspace-wide use).
2. Create `packages/shared/src/env.ts` with a Zod schema covering
   the F01 envelope:
   - `NODE_ENV`
   - `VERCEL_ENV`
   - `DATABASE_URL` (Neon, optional in F01 — required in F03)
   - `INNGEST_SIGNING_KEY` (optional in F01)
   - `CLERK_*` (placeholder; required in F02)
   - `AI_GATEWAY_*` (placeholder; required in F12)
   - `SENTRY_*` (optional; F24)
3. Schema parses on first import; throws on missing/invalid required
   values. Optional-in-F01 vars are `optional()` for now and bumped
   to required in their consuming feature.
4. Create `scripts/gen-env-example.ts` that emits `.env.example`
   from the schema. CI verifies `.env.example` is up-to-date
   (drift = CI failure).
5. Document the env manifest in `docs/architecture/env-manifest.md`.

**Validation:** `pnpm gen:env-example` produces a `.env.example`
matching the schema; CI drift check passes; `pnpm dev` in
`apps/web/` errors on missing required vars.

---

### Phase A5 — Vercel + Neon + Inngest + AI Gateway wiring (≈ 6h)

**Tasks:**
1. `vercel link` against the Spyglass project.
2. Provision Neon Postgres via Vercel Marketplace (or Neon CLI);
   capture `DATABASE_URL` into Vercel env (preview + production +
   development).
3. Create Inngest project; capture `INNGEST_SIGNING_KEY` into Vercel
   env.
4. Configure Vercel AI Gateway; capture credentials.
5. `vercel env pull .env.local` into local dev (gitignored).
6. Configure `packages/db/` with Drizzle config pointing at
   `DATABASE_URL`; **no schema yet** — that's F03's deliverable.
   Drizzle's `migrations/` dir exists with a `.gitkeep`.

**Validation:** `pnpm dev` starts the Next.js app; no schema-related
errors; Inngest dev server runs (no functions registered).

---

### Phase A6 — CI pipeline (≈ 12h)

**Tasks:**
1. Create `.github/workflows/ci.yml`:
   - Matrix: Node 24 (single version; explicit pin to `24.x`).
   - Steps: checkout → setup-node + pnpm via Corepack → install →
     `turbo run lint test type-check audit` → SBOM generation →
     Gitleaks → license check.
   - Concurrency-cancel on PR push.
   - Required for merge per branch protection (D18).
2. `.github/workflows/release.yml`:
   - Triggered on `v*.*.*` tags.
   - Build artifact (Next.js standalone build for `apps/web/`).
   - Generate CycloneDX SBOM via `@cyclonedx/cdxgen` (root +
     per-package).
   - Sign via cosign (keyless OIDC).
   - Call `slsa.yml` reusable workflow for L3 provenance.
   - Upload SBOM, signature, provenance as workflow artifacts (≥ 7y
     retention per FR-31).
3. `.github/workflows/slsa.yml`:
   - Reusable; wraps `slsa-framework/slsa-github-generator`
     `generic_generator` at L3.
4. `scripts/verify-artifact.sh`:
   - Takes an artifact URL/path.
   - Verifies cosign signature against expected OIDC issuer.
   - Verifies SLSA provenance matches the artifact digest and was
     produced by an allowed builder.
   - Verifies SBOM digest is referenced from provenance.
   - Exits non-zero on any failure (FR-13).
5. Vulnerability scan job in CI:
   - `pnpm audit --audit-level high --prod` (fails on high/critical
     prod vulns)
   - `osv-scanner --recursive .` (cross-checks)

**Validation:** Open a draft PR; all checks run and pass on the
empty scaffold. Tag a `v0.0.0` pre-release; release pipeline
produces signed artifact + SBOM + provenance; verification script
succeeds.

---

### Phase A7 — Documentation (≈ 8h)

**Tasks:**
1. `README.md`:
   - What Spyglass is (1-paragraph from PRD §1).
   - Onboarding: clone → `bash scripts/bootstrap.sh` → `pnpm dev`.
   - Where things are (link to PRD, constitution, roadmap).
   - Spec-kit workflow pointer.
2. `CONTRIBUTING.md`:
   - Branch naming (`<feature-id>-<slug>` per roadmap).
   - Conventional commits + commitlint.
   - SDD workflow: spec → clarify → plan → tasks → analyze →
     implement.
   - Constitution gates that apply to every PR.
   - Code style pointer (Biome config; `~/.claude/rules/coding-style.md`).
3. `SECURITY.md` (in `.github/`): vulnerability reporting,
   responsible disclosure, scope of this repo.
4. `docs/architecture/`:
   - `monorepo-decisions.md` (links to research.md key decisions).
   - `env-manifest.md` (Zod schema rationale, how to add a var).
   - `release-pipeline.md` (signing, SBOM, provenance).
5. Per-package `README.md` for each `packages/*`: purpose, public
   API, stability tier (alpha until consumer feature ships).
6. Reserve paths `apps/web/public/agents.md` and
   `apps/web/public/llms.txt` with placeholder content noting "to
   be populated in F21" (FR-33).

**Validation:** A new contributor can complete bootstrap using only
`README.md` + `CONTRIBUTING.md` (Story 1, Story 7).

---

### Phase A8 — Bootstrap script + smoke test (≈ 4h)

**Tasks:**
1. `scripts/bootstrap.sh`:
   - Verifies Node 24, pnpm 9.x, vercel CLI, lefthook, gitleaks.
     Installs missing tools where safe (lefthook, gitleaks via
     pnpm dlx; vercel CLI via npm) or surfaces clear instructions.
   - `pnpm install`.
   - `vercel link` if not already linked.
   - `vercel env pull .env.local`.
   - `lefthook install`.
   - Runs final smoke test: `pnpm -r build && pnpm -r test`.
   - Fails fast on any step; idempotent on re-run.
2. Time the script across two contributors to validate NFR-1
   (≤ 30 min cold).

**Validation:** Two contributors run bootstrap on clean machines;
median ≤ 30 min; idempotent re-run ≤ 2 min (NFR-2).

---

### Phase A9 — Repo settings codification (≈ 4h)

**Tasks:**
1. `.github/CODEOWNERS` — `@LittleTownLabs/spyglass-core` (or
   equivalent) as default owner.
2. `.github/dependabot.yml` — npm + github-actions, weekly cadence,
   grouped by major.
3. Branch protection rules on `main`:
   - Require status checks: ci.yml job names.
   - Require ≥ 1 approval.
   - Require linear history (no merge commits) — keeps audit log
     simpler.
   - No force-push.
   - No direct push (PRs only).
   - Signed commits required.
4. PR template — links to spec, checks constitutional gates.
5. Issue templates — bug, feature-request (defers to spec-kit
   workflow for non-trivial features).
6. Document the settings in `docs/architecture/repo-settings.md`
   so they can be reproduced after a future Terraform migration.

**Validation:** Open a test PR with a failing check — merge is
blocked; admin override is the only path through (and it's
auditable).

---

## 5. Security Considerations

Cross-references the OWASP Top 10 + Constitution §I; F01 hits the
supply-chain and secret-management portions.

| OWASP / risk | F01 mitigation |
|---|---|
| A06 Vulnerable & Outdated Components | `pnpm audit` + `osv-scanner` in CI; weekly Dependabot |
| A07 ID & Auth Failures | Out of scope for F01; AAA baseline configured for F02 |
| A08 Software & Data Integrity | Signed deps, SBOM, SLSA L3 provenance |
| A02 Cryptographic Failures | NIST-approved baseline; crypto-agility via Sigstore + future HSM |
| Hardcoded secrets | Three-layer scanning (Lefthook + Gitleaks CI + GitHub native); Zod env manifest as positive control |
| Build-tool compromise | SLSA L3 non-falsifiable build platform |
| CI runner compromise | Pinned action SHAs; minimal-perms `GITHUB_TOKEN`; reusable workflows |
| Supply-chain attack via dependency | Two independent vuln DBs (npm + OSV); license allowlist |
| Cross-package coupling regressing | Three independent boundary-enforcement layers (Research D16) |

`/security-review` will run against the F01 PR before merge per
Constitution §V.3 (F01 touches §I.C, which is in the
mandatory-review list).

---

## 6. Performance Strategy

| Concern | Strategy |
|---|---|
| Cold dev bootstrap (NFR-1) | Bootstrap script orchestrates network-bound steps in parallel where safe; pnpm content-addressable cache reused if present |
| Warm dev bootstrap (NFR-2) | Bootstrap idempotency — most steps no-op on second run |
| CI runtime (NFR-3) | Turborepo task parallelism; concurrency cancellation on PR force-pushes; `--prefer-offline` install; pnpm fetch cache via setup-node |
| Hot reload (NFR-4) | Next.js Turbopack default in Next 16 |

Targets validated empirically before Phase A is declared complete.

---

## 7. Testing Strategy

F01 has limited testable surface — most "tests" here are CI
gates exercising the pipeline itself.

| Layer | What's tested | How |
|---|---|---|
| Unit | The `packages/shared/env.ts` schema (parses valid envs, rejects invalid) | Jest in `packages/shared/` |
| Boundary | `package.json#exports` are correctly declared | `publint` in CI |
| CI gate self-test | The verify-artifact script | Runs against a fresh release tag |
| Bootstrap | Bootstrap is idempotent | Two-pass run in CI; second pass exits clean |
| Drift | `.env.example` matches schema | CI step regenerates and `git diff --exit-code` |

Coverage threshold (per global `~/.claude/rules/testing.md`): 80%
*aspiration* across the project. F01 is reported as a non-blocking
warning since the testable surface is small; promotion to blocking
is F03's call once the schema and migration code add real test
volume.

---

## 8. Deployment Strategy

F01 itself does not deploy to production — that's F25's gate.

What F01 *does* set up:
- Vercel project linked.
- Preview deployments per PR (Vercel default).
- Production environment configured but **not** receiving traffic;
  no domain attached. Production-deploy gate flips on at F25.
- Release pipeline produces signed artifact whether or not it's
  deployed.

Rollout posture per Constitution §I.B.1: zero production hiring
decisions; zero seekers; zero employers. F01 is platform
plumbing, not product.

---

## 9. Risks & Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| SLSA L3 reusable workflow churn breaks the pipeline | Medium | Pin actions to SHAs; revisit at quarterly review (Research D7) |
| ESLint plugin churn (multiple plugins to keep current) | Low | Dependabot auto-PRs; weekly cadence; group major-version bumps |
| `cosign` keyless verification requires Fulcio/Rekor connectivity | Low | Document; add KMS-backed signing path before Phase 2 |
| Lefthook unfamiliar to contributors | Low | Bootstrap installs + docs explain |
| Coverage threshold not enforced creates false confidence | Medium | Explicit non-blocking warning until F03 promotes; surfaced in CI summary |
| `.env.example` drift goes undetected | Low | CI gate regenerates and diffs |
| GitHub Actions credit overrun on heavy CI | Low | Concurrency cancel on PR force-push; warm caches |
| F02 / F03 blocked if F01 slips | High | Phase A1+A2+A4 unlocks F02 spec; full F01 not strictly required for F02 spec to begin |

---

## 10. Constitutional Compliance

| Article | How F01 plan satisfies |
|---|---|
| **§I.2 Integrity** | Reproducible deterministic builds (Phase A6); SBOM + provenance (Phase A6) |
| **§I.4.2 Retention** | CI artifact retention ≥ 7y configured in release.yml |
| **§I.5.2 Least privilege** | `GITHUB_TOKEN` scoped per workflow; no admin tokens in CI |
| **§I.6 Defense in Depth + Secure-by-Default** | Three secret-scan layers; three boundary-enforcement layers; Zod env fail-safe; pre-commit + CI + GitHub-native |
| **§I.C.1 Cryptographic standards** | Sigstore (NIST-aligned); crypto-agility via signing tool boundary |
| **§I.C.2 Supply-chain (v2.0.0 amendment)** | CycloneDX SBOM, cosign signing of Spyglass artifacts, SLSA L3 provenance, two-DB vuln scanning, license allowlist, **upstream-provenance verification where available + exceptions register at `.specify/exceptions/dependency-signatures.md`** (per Constitution v2.0.0 §I.C.2; satisfies revised FR-14) |
| **§II Agent-Native** | Machine-readable manifests via `package.json#exports`; `agents.md`/`llms.txt` paths reserved |
| **§III.3 Contract evolution** | Conventional commits + changesets configured; semver enforced via package boundaries |
| **§III.4 Completeness** | Dual-audience doc surface (README for humans; agents.md path for agents) |
| **§IV Engineering discipline** | Workspace SoC; per-package boundaries enforced at type-check; file-size limits via Biome lint |
| **§V.3 Conformance gates** | CI gates inspectable in `.github/workflows/`; required-checks codified |

**Recorded exceptions:** none in F01.

`/security-review` MANDATORY before merge per §V.3.

---

## 11. Validation Scenarios

(Populated more fully in `quickstart.md`; brief here.)

1. **Fresh-clone bootstrap.** New machine, no caches → bootstrap →
   working dev server. ≤ 30 min.
2. **Empty-scaffold CI.** Open a no-op PR → all gates pass; runtime
   ≤ 10 min cold, ≤ 4 min warm.
3. **Secret commit attempt.** Stage a fake AWS key → pre-commit
   rejects.
4. **Bypass attempt.** `git commit --no-verify` succeeds locally,
   but `git push` triggers GitHub push-protection rejection.
5. **Release pipeline.** Tag `v0.0.0-rc.1` → signed artifact + SBOM
   + SLSA provenance produced; `verify-artifact.sh` succeeds; tampered
   artifact fails verification.
6. **Env drift.** Add a new var to Zod schema, forget to regenerate
   `.env.example` → CI fails with clear remediation.
7. **Boundary violation.** Add a deep import from `apps/web/` into
   `packages/shared/dist/internal/...` → type-check fails.
8. **Cycle.** Make `packages/auth` depend on `packages/agents` and
   vice-versa → CI fails.

---

## 12. Implementation Sequence Summary

| Sub-phase | Hours | Blocks |
|-----------|-------|--------|
| A1 Repo skeleton | 8 | A2–A8 |
| A2 Lint + format + hooks | 6 | (parallel after A1) |
| A3 Test infra | 6 | (parallel after A1) |
| A4 Env manifest | 4 | A5 |
| A5 Vercel/Neon/Inngest/Gateway | 6 | A8 final smoke test |
| A6 CI pipeline | 12 | A9 (required-checks list) |
| A7 Docs | 8 | (parallel) |
| A8 Bootstrap + smoke test | 4 | After A1–A5 |
| A9 Repo settings | 4 | After A6 (knows check names) |

**Total:** 58 engineer-hours nominal. With buffer: 60–80h ≈ 2–3 weeks.

Critical path: A1 → A4 → A5 → A8 (≈ 22h). The rest parallelizes.

---

## 13. Next Steps

1. `/speckit-tasks 01-monorepo-scaffold` — generate the
   dependency-aware task breakdown from this plan.
2. `/speckit-analyze 01-monorepo-scaffold` — cross-artifact
   consistency check (spec ⇄ plan ⇄ tasks).
3. `/speckit-implement 01-monorepo-scaffold` — TDD-driven execution
   per `~/.claude/rules/testing.md`.
4. `/security-review` — MANDATORY before merge (§V.3).
5. `/code-review` — before merge.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-06 | Initial plan. Maps F01 spec v1.2 to a sub-phased implementation across 9 sub-phases with 18 tooling decisions resolved in research.md. |
| 1.1 | 2026-05-06 | Post-`/speckit-analyze` revisions: lint+format swapped from Biome to ESLint+Prettier (NFR-10 enforced via `max-lines`; Prettier-hook reconciliation removed); §I.C.2 row updated to reflect Constitution v2.0.0 amendment (upstream-provenance verification + exceptions register). Constitution reference bumped to v2.0.0. |
