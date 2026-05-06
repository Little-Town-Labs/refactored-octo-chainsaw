# F01 — Technology Research & Decisions

**Spec:** `.specify/specs/01-monorepo-scaffold/spec.md` v1.2
**Plan:** `.specify/specs/01-monorepo-scaffold/plan.md` v1.0
**Date:** 2026-05-06

This document records the **non-PRD-committed** technology and tooling
choices for F01, with options considered, the chosen approach, and
tradeoffs accepted.

PRD §7-committed choices are not re-litigated here — they are
constraints, not decisions. Spec-resolved clarifications (Jest, Biome,
Node 24 LTS + pnpm 9.x via Corepack) are likewise treated as decided.

---

## Decision matrix summary

| # | Concern | Chosen | Alt(s) considered | Constitution refs |
|---|---------|--------|-------------------|-------------------|
| D1 | Monorepo orchestrator | **Turborepo** (PRD-committed) | Nx, Bazel | I.C.2 (cacheable, deterministic builds) |
| D2 | Package manager | **pnpm 9.x via Corepack** (spec-resolved) | npm, yarn | — |
| D3 | Test runner | **Jest** + `next/jest` + `@swc/jest` (spec-resolved) | Vitest, node:test | — |
| D4 | Lint + format | **ESLint + Prettier** (spec-resolved, revised 2026-05-06) | Biome (original pick), ESLint-only | III.2 (NFR-10 enforcement); IV |
| D5 | SBOM generator | **`@cyclonedx/cyclonedx-npm`** (workspace-aware) | Syft, Trivy SBOM | I.C.2; EO 14028 §4(e) |
| D6 | Artifact signing | **Sigstore `cosign`** (keyless via OIDC) | GPG, in-toto | I.C.1, I.C.2 |
| D7 | SLSA build provenance | **`slsa-framework/slsa-github-generator`** at L3 | Manual attestation | I.C.2; SLSA spec |
| D8 | Secret scanner | **Gitleaks** (pre-commit + CI) + GitHub native secret scanning | TruffleHog, detect-secrets | I.4, I.6 |
| D9 | Pre-commit framework | **Lefthook** | Husky, simple-git-hooks, pre-commit (Python) | IV (SoC, fast) |
| D10 | Vulnerability scanner | **`pnpm audit` + `osv-scanner`** | Snyk, Socket | I.C.2 |
| D11 | License audit | **`@licensee/licensee` or `license-checker-rseidelsohn`** | OSS Review Toolkit | I.C.2 (license compatibility) |
| D12 | Type-check strategy | **TypeScript project references** with `composite: true` per package | Single root `tsconfig` | III.2, IV (SoC) |
| D13 | CI host | **GitHub Actions** | Vercel-only CI, CircleCI | I.C.2 (provenance generator native) |
| D14 | Commit-message lint | **commitlint + conventional-commits** | None, gitlint | III.3 (semver requires conventional commits) |
| D15 | Release tooling (deferred to F02+) | **`changesets`** for package versioning | semantic-release, release-please | III.3 |
| D16 | Boundary enforcement | **`eslint-plugin-boundaries` + `eslint-plugin-import` + `package.json#exports` + `publint`** (revised 2026-05-06) | dependency-cruiser | IV (SoC) |
| D17 | Env-var manifest format | **TypeScript-typed Zod schema in `packages/shared/env.ts`** consumed via `vercel env pull` | Plain `.env.example`, dotenv-vault | I.6 (fail-safe), III.2 (typed) |
| D18 | Repo settings (branch protection, required checks) | **Codified in repo `.github/` config** + GitHub branch protection rules | Manual settings only | V.3 (conformance gates) |

---

## D4 — Lint + format toolchain: ESLint + Prettier (revised 2026-05-06)

**Original choice (spec v1.2):** Biome.

**Revised choice (spec v1.3 / `/speckit-analyze` Finding 2):** ESLint
+ Prettier with `eslint-config-next`, `@typescript-eslint/*`,
`eslint-plugin-import`, `eslint-plugin-boundaries`.

**Reasons for revision:**
1. ESLint's `max-lines` rule directly enforces NFR-10 (file size ≤
   800 lines). Biome v1.x has no equivalent rule and Biome's plugin
   API was preview at the time of this decision.
2. Prettier as the formatter aligns with the global
   `~/.claude/settings.json` PostToolUse Prettier hook — no
   reconciliation required.
3. The plugin ecosystem (`eslint-plugin-boundaries`,
   `eslint-plugin-import`, `eslint-plugin-jsx-a11y`,
   `eslint-plugin-security`) covers concerns Spyglass will need
   downstream (boundary enforcement, accessibility per Constitution
   §III.1, security lint per §I.6) without writing custom checks.

**Tradeoffs accepted:**
- Two tools instead of one — more config surface and slower CI per
  pass. Mitigated by Turborepo caching keeping warm-cache CI under
  NFR-3 (≤ 4 min).
- More plugins to keep up to date. Dependabot covers; the cost is
  PR review time, not engineering time.
- Loss of Biome's speed advantage. Acceptable at our repo size.

**Why we considered Biome originally:** smaller operational surface
and faster CI. Both still true; ESLint's `max-lines` rule and
Prettier-hook alignment are the deciding factors here.

---

## D1 — Monorepo orchestrator: Turborepo (PRD-committed)

PRD §7 commits Turborepo. Recording for traceability:

- **Pros:** First-class Vercel integration, remote caching free on
  Vercel, minimal config, `turbo.json` is declarative.
- **Cons:** Less powerful than Nx for cross-language graphs; not
  needed here since the tree is TypeScript-only.
- **Alternatives:** Nx (heavier, plugin-driven), Bazel
  (over-engineered for this size).

---

## D5 — SBOM: CycloneDX via `@cyclonedx/cyclonedx-npm`

**Options:**
1. **`@cyclonedx/cyclonedx-npm`** — official CycloneDX generator for
   npm/pnpm/yarn workspaces. Outputs CycloneDX 1.5 JSON.
2. **Syft (Anchore)** — language-agnostic, runs against the artifact
   or filesystem. Heavier dependency for our pure-TS tree.
3. **Trivy SBOM** — bundled with vuln scanner; one tool, less
   focused.

**Chosen:** Option 1.

**Rationale:** Workspace-aware out of the box; outputs CycloneDX which
is the format Constitution §I.C.2 names; runs entirely from Node, no
extra binary in CI. NTIA minimum SBOM elements satisfied by default.

**Tradeoffs:** If we ever introduce non-Node components (Rust, Python),
revisit and add Syft for those subtrees. Constitution §I.C.2 requires
crypto-agility-equivalent flexibility for the SBOM toolchain — Syft
can be added without removing CycloneDX-npm.

---

## D6 — Artifact signing: Sigstore `cosign` (keyless)

**Options:**
1. **Sigstore `cosign` keyless via GitHub OIDC** — short-lived
   certificates from Fulcio, transparency log via Rekor; the modern
   default.
2. **`cosign` with long-lived keys (KMS / HSM)** — older pattern;
   requires key management infrastructure F01 doesn't yet provide.
3. **GPG signing** — legacy; no transparency log; key-management
   burden.

**Chosen:** Option 1 (keyless via OIDC).

**Rationale:** Removes long-term key management from the F01 critical
path. Aligns with Constitution §I.C.1 (crypto-agility) — keyless +
KMS-backed are not mutually exclusive; the latter can be added in F10
when dossier signing requires HSM-backed keys for legal-evidence-grade
artifacts. F01 build artifacts have a different threat model than
production dossier signing.

**Tradeoffs:** Verification requires Fulcio/Rekor connectivity. For
fully-airgapped verification (rare here), would need to fall back to
key-based signing — accept the gap; revisit only if the threat model
demands.

---

## D7 — SLSA Build Level 3: `slsa-github-generator`

**Options:**
1. **`slsa-framework/slsa-github-generator`** at L3 — official
   reusable workflow producing in-toto attestations.
2. **Hand-rolled provenance** — error-prone; not auditable as
   "SLSA L3" by definition.
3. **GitHub Actions native attestations (`attest-build-provenance`
   action)** — newer, supported, generates SLSA-format attestations.

**Chosen:** Option 1 for now; **revisit at first quarterly review** —
Option 3 is becoming the GitHub-native default and may simplify the
pipeline. Constitutional commitment is to SLSA L3 *outcome*, not the
specific generator.

**Rationale:** L3 requires a **non-falsifiable build platform** —
GitHub Actions runners with the SLSA reusable workflow satisfy this.
F01 standardizes on the well-documented path; future migration to
Option 3 is mechanical.

**Tradeoffs:** Reusable workflows pin via SHA, bumping requires a PR.
Acceptable.

---

## D8 — Secret scanning: Gitleaks + GitHub native

**Options:**
1. **Gitleaks** (pre-commit + CI) + **GitHub native secret scanning**
   (push-protection enabled).
2. **TruffleHog** — comparable; slightly noisier on TS codebases.
3. **detect-secrets (Yelp)** — Python tool; mature but requires Python
   in our pipeline.

**Chosen:** Option 1.

**Rationale:** Defense-in-depth (Constitution §I.6): two independent
scanners on different code paths.
- **Gitleaks** runs locally (pre-commit via Lefthook) and in CI on
  PRs/pushes — covers EC-3, EC-8.
- **GitHub native secret scanning + push protection** rejects secrets
  at the `git push` boundary — last-line defense even if pre-commit
  was skipped.

Both are free for public/private repos under standard plans. Gitleaks
config is committed in `.gitleaks.toml`; GitHub settings are codified
in `.github/` per D18.

---

## D9 — Pre-commit framework: Lefthook

**Options:**
1. **Lefthook** (Go binary; runs hooks in parallel; YAML config).
2. **Husky** (Node-based; serial by default; requires Node in env to
   run hooks).
3. **simple-git-hooks** (lighter than Husky; serial).
4. **`pre-commit`** (Python framework; mature but Python adds a
   runtime to the dev-dep matrix).

**Chosen:** Option 1.

**Rationale:** Parallel execution keeps pre-commit fast (NFR-2 budget
implies sub-second hooks). Lefthook config is a single
`lefthook.yml` — clearer than husky's per-hook script files. No
Python runtime added.

**Tradeoffs:** Lefthook is less ubiquitous than Husky; contributors
unfamiliar with it have a one-command install (`brew install
lefthook` or `pnpm dlx lefthook install`). Bootstrap script handles
this transparently.

---

## D10 — Vulnerability scanning: `pnpm audit` + `osv-scanner`

**Options:**
1. **`pnpm audit`** (built-in, npm Advisory DB) + **`osv-scanner`**
   (Google OSS-Vulnerabilities; broader DB; cross-ecosystem).
2. **Snyk** (commercial, generous free tier; richer policy engine).
3. **Socket** (commercial; supply-chain-attack-focused).

**Chosen:** Option 1.

**Rationale:** Two independent advisory databases (npm Advisory + OSV)
without commercial dependencies. Aligns with avoiding supply-chain
lock-in. EC-4 fail-closed behavior is enforced via CI step that exits
non-zero on findings above threshold.

**Tradeoffs:** Less mature policy engine than Snyk. If at Phase 1 we
need richer policy (e.g., licence-aware exception handling), revisit.

**Severity threshold (FR-29):** Initial baseline — fail CI on any
**high** or **critical** vulnerability in production dependencies; **moderate**
and below produce CI warnings. Threshold can be tightened (not
loosened) without amendment; loosening requires a recorded exception.

---

## D11 — License audit

**Options:**
1. **`license-checker-rseidelsohn`** — workspace-aware fork of
   classic `license-checker`; produces JSON + reports.
2. **`@licensee/licensee`** (Ruby; the GitHub-canonical tool).
3. **OSS Review Toolkit (ORT)** — heaviest, most thorough; overkill
   for F01.

**Chosen:** Option 1.

**Rationale:** Pure-Node tool; runs in CI without extra runtimes.
Allow-list of compatible licenses is committed (`MIT`, `Apache-2.0`,
`BSD-2-Clause`, `BSD-3-Clause`, `ISC`, `0BSD`, `Unlicense`,
`CC0-1.0`); incompatible licenses trigger CI failure with clear
remediation message (EC-4 pattern).

**Tradeoffs:** Less thorough than ORT; revisit before Phase 2 if
counsel raises license-stack questions.

---

## D12 — TypeScript project references

**Options:**
1. **Project references** with `composite: true` and per-package
   `tsconfig.json` extending a root `tsconfig.base.json`.
2. **Single root `tsconfig` with `paths`** mapping — simpler, but
   slower incremental builds and weaker boundary enforcement.
3. **Each package independent (no references)** — fastest single-pkg
   builds, but type-check-everything becomes O(N) instead of cached.

**Chosen:** Option 1.

**Rationale:** Project references give:
- Cached incremental builds (Turborepo dovetails with this).
- Type-level enforcement of declared dependencies (FR-25, FR-26).
- A foundation for `@spyglass/<pkg>` exports being typecheck-verified
  without deep imports.

`packages/*` set `"composite": true`; `apps/*` consume via project
references in their own `tsconfig.json`. Strict mode on globally;
no per-package opt-out without recorded exception.

---

## D13 — CI host: GitHub Actions

**Options:**
1. **GitHub Actions** — first-class for SLSA L3 (D7), free private
   minutes adequate for F01.
2. **Vercel CI** — bundled with Vercel deploy; fewer SLSA-generator
   integrations.
3. **CircleCI / Buildkite** — both viable; neither offers anything
   over GitHub Actions for our needs.

**Chosen:** Option 1.

**Rationale:** SLSA L3 reusable workflows are GitHub-Actions-native;
moving off GitHub Actions later means rewriting the provenance
pipeline. Vercel CI runs deploy previews independently — both can
coexist. Vercel pulls from GitHub on PR webhook; nothing forces a
single CI provider.

---

## D14 — Conventional commits + commitlint

**Options:**
1. **commitlint** + **conventional-commits** spec, enforced via
   commit-msg hook (Lefthook).
2. **No enforcement** — relies on contributor discipline.
3. **gitlint** (Python) — equivalent; adds Python.

**Chosen:** Option 1.

**Rationale:** Constitution §III.3 requires semver discipline. Semver
bumps need to be inferable from commit history — conventional
commits is the de-facto convention. Commitlint enforces in pre-commit
and CI.

**Tradeoffs:** Slight friction on initial PRs from new contributors.
Contributor docs explain the convention; commitizen optional.

---

## D15 — Release tooling: `changesets` (deferred wiring to F02+)

**Options:**
1. **`changesets`** — designed for monorepos; per-package versioning;
   PR-driven changelog.
2. **`semantic-release`** — automated; mono-repo support is bolt-on.
3. **`release-please`** (Google) — automated, GitHub-Actions-friendly.

**Chosen:** Option 1.

**Rationale:** Per-package versioning aligned with Constitution §III.3
N-2 backwards-compat policy. F01 ships the changesets config and
contributor docs; first actual release is post-F02 when there's
something publishable.

---

## D16 — Package boundary enforcement (revised 2026-05-06)

**Options:**
1. **ESLint plugins** (`eslint-plugin-boundaries` +
   `eslint-plugin-import/no-internal-modules`) + **`package.json#exports`** +
   **`publint`** in CI — three independent layers.
2. **dependency-cruiser** — comprehensive; another tool to learn.
3. **Knip** — primarily for unused-export detection; useful
   secondarily.

**Chosen:** Option 1, with Knip added as a CI warning (not a gate)
for unused-export hygiene.

**Rationale:** Defense-in-depth on FR-25 (boundary enforcement).
Three independent mechanisms catch different failure modes:
- `exports` field — runtime + bundler-level enforcement.
- ESLint plugins — lint-time visibility, configurable per-package.
- `publint` — validates `exports` is correctly declared.

**Revision note:** Originally chose Biome's `noPrivateImports`. Swapped
to ESLint plugins as part of the D4 lint-toolchain revision. The
boundary primitives are equivalent in capability; the ESLint plugins
are more configurable for monorepo per-package rules.

---

## D17 — Env-var manifest: typed Zod schema

**Options:**
1. **Zod schema in `packages/shared/env.ts`** that parses
   `process.env` once at boot, throwing on missing/invalid values.
   `.env.example` generated *from* the schema.
2. **Plain `.env.example` as canonical manifest** — no runtime
   validation.
3. **`dotenv-vault`** or similar managed service — vendor lock-in.

**Chosen:** Option 1.

**Rationale:**
- Constitution §I.6: missing env defaults to refuse (Zod throws at
  boot — fail-safe).
- Constitution §III.2: typed semantics for "the env" — a Zod schema
  *is* a machine-readable contract.
- `.env.example` is a derived artifact, kept in sync via a generator
  script. Drift = CI failure.

**Tradeoffs:** Adds a Zod dep at the foundation level. Acceptable —
Zod is already in the AI SDK / Inngest dependency closure.

---

## D18 — Repo settings codification

**Options:**
1. **`.github/` directory** with: branch protection rules referenced
   from `CODEOWNERS`, `SECURITY.md`, issue/PR templates, dependabot
   config, workflow files. Required-checks list pinned to the F01
   CI gate names.
2. **Manual GitHub UI configuration only** — undocumented; bus-factor
   risk.
3. **Terraform-managed via `integrations/terraform-provider-github`**
   — full IaC; over-engineered for v0.

**Chosen:** Option 1, with a documented intent to migrate to Option 3
before Phase 2 (NYC) per audit-readiness expectations.

**Rationale:** Codifies enough to satisfy Constitution §V.3
(conformance gates are inspectable in source). IaC is the right
endgame but not F01's burden.

---

## Open items deferred to plan or implementation

- Specific CI runner labels (`ubuntu-latest` is fine; pinning a
  specific Ubuntu version is a small win but adds maintenance.
  Decide in `/speckit-tasks`.)
- Coverage threshold enforcement timing — spec FR-29 says
  "non-blocking warning" initially. Promotion to blocking is a F03
  decision once meaningful test surface exists.
- Whether to run dependency audit on every PR vs. nightly only
  (latency vs. coverage tradeoff). Default to every PR; revisit if CI
  budget is breached.

---

## References

- CycloneDX spec: <https://cyclonedx.org/>
- SLSA framework: <https://slsa.dev/>
- Sigstore: <https://www.sigstore.dev/>
- Gitleaks: <https://github.com/gitleaks/gitleaks>
- OSV Scanner: <https://github.com/google/osv-scanner>
- NIST SSDF SP 800-218: <https://csrc.nist.gov/publications/detail/sp/800-218/final>
- EO 14028: <https://www.federalregister.gov/documents/2021/05/17/2021-10460/improving-the-nations-cybersecurity>
