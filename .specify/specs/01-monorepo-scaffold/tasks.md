# F01 — Tasks

**Spec:** v1.2 · **Plan:** v1.0 · **Research:** v1.0
**Tasks version:** 1.0
**Date:** 2026-05-06
**Branch:** `01-monorepo-scaffold`

---

## How to read this file

Tasks are grouped by plan sub-phase (A1–A9). Each task has:

- **ID** (`T###`) — stable; referenced from PR titles and commits.
- **Title** — imperative, one line.
- **Description** — what to do, in 1–3 sentences.
- **Acceptance** — measurable; how to verify "done."
- **Refs** — spec FRs/NFRs/stories satisfied.
- **Story tag** — primary user story served (per spec §3).
- **Blocks / Blocked by** — dependency edges.
- **Effort** — XS (≤1h), S (1–3h), M (3–6h), L (6–12h).

**Parallel execution:** Tasks within the same sub-phase that don't
depend on each other can run in parallel. Cross-phase parallelism is
explicit in `Blocks / Blocked by`.

**TDD discipline:** Per `~/.claude/rules/testing.md`, write the test
or CI assertion *before* the configuration that satisfies it. Most
F01 tasks have a test or a CI-gate component baked in — that part
ships first.

---

## Sub-phase A1 — Repo skeleton

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T001 | Initialize pnpm workspace and root package.json (incl. `.gitignore` for `.env*`) | S | T002–T060 | — | 1, 5 | FR-1, FR-4, FR-21, EC-8 |
| T002 | Pin Node 24 LTS and pnpm 9.x via Corepack | XS | T003+ | T001 | 1 | Spec Clar. 3, FR-1 |
| T003 | Add `tsconfig.base.json` with strict TypeScript baseline | S | T004, T011 | T001 | 4 | FR-25, NFR-10 |
| T004 | Create empty `packages/*` stubs with package.json + tsconfig + README | M | T006+, T011+ | T003 | 4, 7 | FR-3, FR-4, FR-25, FR-32 |
| T005 | Bootstrap `apps/web/` with Next.js 16 App Router (TypeScript) | M | T012, T028 | T002, T003 | 1 | FR-1, PRD §7 |
| T006 | Create `turbo.json` declaring build / test / lint / type-check / sbom tasks | S | T028 | T004, T005 | 1, 6 | FR-1, FR-7, NFR-3 |

**Sub-phase A1 gate:** `pnpm install` succeeds; `pnpm -r run type-check` exits 0 against empty packages.

---

### T001 — Initialize pnpm workspace and root package.json

**Description.** Create `pnpm-workspace.yaml` declaring `apps/*` and
`packages/*`. Create root `package.json` with workspace metadata,
shared dev-dependency placeholder, and scripts entry points (`build`,
`test`, `lint`, `type-check`).

Create root `.gitignore` covering at minimum: `node_modules/`,
`.next/`, `dist/`, `coverage/`, `.turbo/`, `.vercel/.env*`,
`.env`, `.env.*`, `!.env.example`, `*.log`. The `.env*` pattern
satisfies FR-21 / EC-8 (no live env files committed); the
`!.env.example` exception preserves the committed manifest.

**Acceptance.**
- `pnpm-workspace.yaml` exists with both globs.
- Root `package.json` declares `"private": true`, `"name": "spyglass"`.
- Root `.gitignore` exists with the patterns above.
- `pnpm install` exits 0 in an empty repo.
- `git status` after creating a `.env.local` with placeholder content
  shows it as ignored.

---

### T002 — Pin Node 24 LTS and pnpm 9.x via Corepack

**Description.** Configure version pinning in three places:
`packageManager: "pnpm@9.x.x"` in root `package.json` (specific
patch version, not a range); `engines.node: ">=24.0.0 <25"` and
`engines.pnpm: ">=9.0.0 <10"`; `.nvmrc` containing `24`.

**Acceptance.**
- Running `pnpm -v` after `corepack enable` returns the pinned
  version.
- Wrong-Node `pnpm install` produces a clear `engines` warning.
- `.nvmrc` matches `engines.node` major (CI gate enforces this in
  T034).

**Refs.** Spec Clarification 3.

---

### T003 — Add `tsconfig.base.json`

**Description.** Shared compiler config: strict mode, `composite: true`-friendly,
`target: "ES2022"`, `module: "NodeNext"`, `moduleResolution: "NodeNext"`,
`isolatedModules: true`, `esModuleInterop: true`, `skipLibCheck: false`.
Reference Constitution §IV — no per-package opt-out without recorded
exception.

**Acceptance.**
- `tsconfig.base.json` exists at root.
- Empty `tsc --noEmit -p tsconfig.base.json` exits 0.

**Refs.** FR-25, FR-26, NFR-10.

---

### T004 — Create empty `packages/*` stubs

**Description.** Per plan §2.1, create stubs for `parley`, `tickets`,
`agents`, `db`, `api-contracts`, `a2a`, `channels-core`, `auth`, `ai`,
`shared`. Each stub:
- `package.json` with `name: "@spyglass/<pkg>"`, `private: true`,
  `version: "0.0.0"`, `exports` map declaring `./` → `./src/index.ts`,
  `main`/`types` fields.
- `tsconfig.json` extending `tsconfig.base.json`,
  `compilerOptions.composite: true`, `outDir: "./dist"`, `rootDir: "./src"`.
- `src/index.ts` placeholder exporting an empty object or a typed
  marker (`export const __pkg = "@spyglass/<pkg>" as const`).
- `README.md` with: purpose, public API placeholder, stability tier
  (`alpha — under construction`).

**Acceptance.**
- All 10 packages exist and are detected by pnpm workspace.
- Each has the four required files.
- `pnpm -r run type-check` exits 0.

**Refs.** FR-3, FR-4, FR-25, FR-26, FR-32.

---

### T005 — Bootstrap `apps/web/` with Next.js 16 App Router

**Description.** Use `npx create-next-app@latest` with TypeScript,
App Router, no Tailwind preset (frontend styling decisions are
F19/F21/F22's call). Update generated `tsconfig.json` to extend
`tsconfig.base.json` and add project references to `packages/shared`.

**Acceptance.**
- `apps/web/` runs `pnpm dev` and serves the Next.js default page.
- TypeScript project references resolve `@spyglass/shared` correctly.
- No Tailwind / no shadcn — those are added in F19+ if/when chosen.

**Refs.** FR-1, FR-2, PRD §7.

---

### T006 — Create `turbo.json`

**Description.** Declare the task graph from plan §2.2:
`build`, `test`, `lint`, `type-check`, `format-check`, `sbom`,
`audit`. Each task declares its `dependsOn` (e.g., `build` →
`^build` for upstream packages). Configure caching: input/output
hashing per task; outputs whitelisted (`dist/**`, `.next/**`).

**Acceptance.**
- `turbo run build` produces a valid graph (use `turbo run build
  --dry-run`).
- Cache hits on a re-run.

**Refs.** FR-7, NFR-3.

---

## Sub-phase A2 — Lint, format, and git hooks

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T007 | Install + configure ESLint + Prettier + plugins | M | T028 | T001 | 4, 6 | Spec Clar. 2 (revised), FR-25, NFR-10 |
| T008 | Install Lefthook + lefthook.yml (pre-commit + commit-msg) | S | T010, T012 | T007 | 5, 6 | FR-22 |
| T009 | Install commitlint + conventional config | XS | T008 | T001 | — | FR-26, Research D14 |
| T010 | Install + configure Gitleaks; create `.gitleaks.toml` | S | T028 | T008 | 5 | FR-22, FR-23 |
| T011 | Document the no-bypass policy in CONTRIBUTING.md draft | XS | — | — | 7 | NFR-12 |

**Sub-phase A2 gate:** `lefthook install` registers hooks; sample
commit triggers Biome + Gitleaks + commitlint; bad-message commit is
rejected.

---

### T007 — Install + configure ESLint + Prettier + plugins

**Description.**
Install:
```
pnpm add -D -w eslint @typescript-eslint/eslint-plugin
  @typescript-eslint/parser eslint-config-next prettier
  eslint-plugin-import eslint-plugin-boundaries
```

Create `eslint.config.js` (flat config) at root:
- Extends ESLint `recommended` + `@typescript-eslint/recommended-type-checked`
- `apps/web/` overlay extends `eslint-config-next`
- `packages/*` rules use `eslint-plugin-boundaries` to enforce that
  `apps/*` packages don't import from each other (per plan §2.1
  FR-5) and `packages/*` consume only their declared dependencies
- `eslint-plugin-import/no-internal-modules` rejects deep imports
  (Research D16, FR-25)
- `max-lines: ["error", { "max": 800, "skipBlankLines": true,
  "skipComments": true }]` directly enforces NFR-10 — no custom CI
  script needed

Create `prettier.config.js` aligned with the global
`~/.claude/settings.json` PostToolUse Prettier hook output (2-space
indent, single quotes, semicolons, trailing commas `all`,
`printWidth: 100`).

**Acceptance.**
- `pnpm exec eslint .` runs and reports clean on the empty scaffold.
- `pnpm exec prettier --check .` is idempotent (no diff after
  `--write`).
- A test file with > 800 lines triggers an ESLint error
  (`max-lines`).
- A deep import path violation triggers an ESLint error
  (`no-internal-modules`).

**Refs.** Spec Clarification 2 (revised), FR-25, NFR-10, Research D4, D16.

---

### T008 — Install Lefthook and create `lefthook.yml`

**Description.** `pnpm add -D -w lefthook`. Create `lefthook.yml`:
- `pre-commit` (parallel):
  - `eslint` — `pnpm exec eslint {staged_files} --max-warnings=0`
  - `prettier` — `pnpm exec prettier --check {staged_files}`
  - `gitleaks` — `gitleaks protect --staged --redact`
  - `type-check` — `pnpm exec turbo run type-check --filter='[HEAD]'`
- `commit-msg`:
  - `commitlint` — `pnpm exec commitlint --edit {1}`

**Acceptance.**
- `lefthook install` succeeds.
- A commit with an ESLint violation is rejected.
- A commit with a Prettier diff is rejected.
- A commit with a fake-secret is rejected.
- A commit with non-conventional message is rejected.

**Refs.** FR-22, FR-29 (pre-commit slice of CI), Research D9.

---

### T009 — Install commitlint + conventional config

**Description.** `pnpm add -D -w @commitlint/cli
@commitlint/config-conventional`. Add `commitlint.config.js`
extending the conventional config.

**Acceptance.**
- `echo "feat: x" | pnpm exec commitlint` exits 0.
- `echo "broken message" | pnpm exec commitlint` exits non-zero.

**Refs.** FR-26, Research D14.

---

### T010 — Install + configure Gitleaks

**Description.** Make Gitleaks available locally (via a documented
install path: `brew install gitleaks` or `pnpm dlx gitleaks` — bootstrap
script handles install; this task documents the choice). Create
`.gitleaks.toml`:
- Inherits default rules.
- Allowlists test fixtures (`__fixtures__/**`, `*.test.ts` snapshots
  if needed).
- Adds Spyglass-specific patterns later as they emerge (none
  required for F01).

**Acceptance.**
- `gitleaks protect --staged` runs cleanly on the empty repo.
- A staged AWS-key-shaped string is detected and rejected.

**Refs.** FR-22, FR-23, EC-3, Research D8.

---

### T011 — Document no-bypass policy

**Description.** Add a section to a draft `CONTRIBUTING.md`
(completed in T039) stating: pre-commit hook failures are
investigated, not bypassed; `--no-verify` on a feature branch is
acceptable for in-progress WIP commits; `--no-verify` on `main` /
release branches is a sev-1 process violation. Reference
Constitution §I.6.

**Acceptance.**
- Draft `CONTRIBUTING.md` exists with the section.
- Section ≥ 4 lines, includes the rationale.

**Refs.** Constitution §I.6, NFR-12.

---

## Sub-phase A3 — Test infrastructure

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T012 | Install Jest + @swc/jest + @types/jest | S | T013, T014 | T002 | 6 | Spec Clar. 1 |
| T013 | Create `jest.config.base.ts` (root) | S | T014 | T012 | 6 | FR-8, FR-9 |
| T014 | Add per-package `jest.config.ts` extending base | S | T015 | T013, T004 | 6 | FR-8 |
| T015 | Add `next/jest` preset to `apps/web/` | XS | — | T012, T005 | 6 | FR-8 |
| T016 | Configure coverage reporting (LCOV + JSON summary) | XS | T028 | T013 | 6 | FR-9 |
| T017 | Add smoke test in `packages/shared` | XS | — | T014 | 6 | FR-8 |

**Sub-phase A3 gate:** `pnpm -r test` exits 0; coverage report
produced in `coverage/`.

---

### T012 — Install Jest + @swc/jest + types

**Description.** `pnpm add -D -w jest @swc/jest @types/jest jest-environment-jsdom`. Pin specific versions in root.

**Acceptance.** `pnpm exec jest --version` prints a version.

**Refs.** Spec Clarification 1.

---

### T013 — Create `jest.config.base.ts`

**Description.** Shared base config:
- Transformer: `@swc/jest` for `.ts` / `.tsx`.
- `transformIgnorePatterns`: opt-in transform for known ESM-only
  deps (start with empty list; add as encountered — note in
  CONTRIBUTING.md).
- Coverage: collected from `src/**/*.ts`; reporters `lcov`, `json-summary`,
  `text-summary`.
- `testEnvironment: "node"` by default; `apps/web/` overrides to
  `jsdom`.

**Acceptance.** Config compiles (it's a `.ts` file consumed via
`ts-node` or built once).

**Refs.** FR-8, FR-9.

---

### T014 — Per-package `jest.config.ts`

**Description.** Each `packages/*` extends the base via `import`.
`apps/web/jest.config.ts` uses `next/jest` preset and merges with
the base.

**Acceptance.** `pnpm --filter '*' test` runs (no tests yet =
0 tests, exits 0).

---

### T015 — Add `next/jest` preset to `apps/web/`

**Description.** Per Jest's Next.js docs: import `next/jest` and
wrap the base config. Configure `moduleNameMapper` for path
aliases (none yet — placeholder for F19+).

**Acceptance.** Smoke test in `apps/web/__tests__/smoke.test.ts`
(added in T017's spirit, here scoped to `apps/web/`) passes.

---

### T016 — Coverage reporting

**Description.** Configure CI to collect LCOV + JSON-summary; upload
LCOV as a CI artifact retained per FR-31. Display the JSON summary
in the PR's CI step output. **Coverage threshold: non-blocking
warning** (per spec FR-29 and plan §7); promotion to blocking is
F03's call.

**Acceptance.** CI summary surfaces coverage %; threshold not
enforced as a gate (yet).

**Refs.** FR-9, FR-29.

---

### T017 — Smoke test in `packages/shared`

**Description.** Add `packages/shared/src/__tests__/smoke.test.ts`
with one assertion exercising `packages/shared/src/index.ts`. The
goal is to prove the test pipeline works end-to-end before any
business logic exists.

**Acceptance.** `pnpm --filter @spyglass/shared test` exits 0 with
1 passing test.

---

## Sub-phase A4 — Environment manifest

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T018 | Install `zod` at workspace root | XS | T019 | T001 | 5 | Research D17 |
| T019 | Create `packages/shared/src/env.ts` Zod schema | M | T020, T022 | T018, T004 | 5 | FR-18, FR-20 |
| T020 | Create `scripts/gen-env-example.ts` | S | T021 | T019 | 5 | FR-20 |
| T021 | Add CI gate: `.env.example` drift check | S | T028 | T020 | 5, 6 | FR-20 |
| T022 | Add unit tests for env schema (valid/invalid) | S | — | T019 | 5, 6 | FR-8, EC-2 |
| T023 | Document env manifest in `docs/architecture/env-manifest.md` | S | — | T019 | 7 | FR-32 |

**Sub-phase A4 gate:** `pnpm gen:env-example` is idempotent; CI
detects drift; schema rejects missing required vars at boot.

---

### T019 — Zod env schema

**Description.** `packages/shared/src/env.ts` exports a `parsedEnv`
object computed at module load via `Schema.parse(process.env)`.
Schema covers F01 envelope:

```ts
NODE_ENV: z.enum(['development', 'preview', 'production']).default('development'),
VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),
DATABASE_URL: z.string().url().optional(),         // required from F03
INNGEST_SIGNING_KEY: z.string().optional(),         // required from F08
INNGEST_EVENT_KEY: z.string().optional(),
CLERK_SECRET_KEY: z.string().optional(),            // required from F02
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
AI_GATEWAY_API_KEY: z.string().optional(),          // required from F12
SENTRY_DSN: z.string().url().optional(),            // required from F24
```

Each future-required var carries a comment naming the consuming
feature.

**Acceptance.**
- Importing `parsedEnv` with all required-in-F01 vars set succeeds.
- Importing with invalid `DATABASE_URL` (when set) throws with a
  message naming the variable.
- Tests in T022 cover both cases.

**Refs.** FR-18, NFR-6 (fail-safe), Research D17.

---

### T020 — `gen-env-example.ts`

**Description.** Script reads the Zod schema's shape, emits
`.env.example` with one line per var: `# <description>` then
`<NAME>=`. Description sourced from a sibling `envDescriptions`
record co-located with the schema.

**Acceptance.**
- Running the script produces a `.env.example` matching the schema.
- Re-running is byte-identical (deterministic).

**Refs.** FR-20.

---

### T021 — CI drift gate

**Description.** Add a CI step: `pnpm gen:env-example && git diff --exit-code .env.example`. Fails if drift.

**Acceptance.** Modifying the schema without regenerating fails CI
with a clear remediation message.

**Refs.** FR-20, Scenario 8.

---

## Sub-phase A5 — Vercel / Neon / Inngest / AI Gateway wiring

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T024 | `vercel link` (one-time, per checkout) | XS | T025–T028 | T001 | 5 | PRD §7 |
| T025 | Provision Neon Postgres via Vercel Marketplace | S | T029 | T024 | 5 | PRD §7, FR-18 |
| T026 | Create Inngest project + capture signing keys | S | — | T024 | 5 | PRD §7 |
| T027 | Configure Vercel AI Gateway | S | — | T024 | 5 | PRD §7 |
| T028 | `vercel env pull .env.local` in bootstrap | XS | — | T024 | 5 | FR-19 |
| T029 | Configure `packages/db` with Drizzle (config only) | M | — | T025 | 4 | PRD §7, F03 prerequisite |

**Sub-phase A5 gate:** `pnpm dev` in `apps/web/` starts; no schema-
related errors; required env vars all present in `.env.local`.

---

### T024 — `vercel link`

**Description.** Project owner runs `vercel link` once and commits
the resulting `.vercel/project.json` (NOT `.vercel/.env*`).

**Acceptance.** `.vercel/project.json` exists; bootstrap script
detects and skips on subsequent runs.

---

### T029 — Drizzle config

**Description.** `pnpm --filter @spyglass/db add drizzle-orm
drizzle-kit pg`. Create `drizzle.config.ts` pointing at
`process.env.DATABASE_URL`. Create empty `migrations/` with
`.gitkeep`. **No schema definitions** — F03 owns the schema.

**Acceptance.** `pnpm --filter @spyglass/db drizzle-kit generate`
runs against an empty schema and produces no output (or a no-op
migration file that's then deleted).

**Refs.** PRD §7, scoped-out: schema is F03.

---

## Sub-phase A6 — CI pipeline

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T030 | Write `.github/workflows/ci.yml` | L | T046 | A1–A5 done | 6 | FR-28, FR-29, NFR-3 |
| T031 | Add `cyclonedx-npm` SBOM generation step | S | T032 | T030 | 2, 3 | FR-10 |
| T032 | Add `cosign` signing step (release workflow) | M | T033 | T031 | 2 | FR-11 |
| T033 | Add SLSA L3 reusable workflow `slsa.yml` | M | T034 | T032 | 2 | FR-12 |
| T034 | Write `scripts/verify-artifact.sh` | M | — | T033 | 2 | FR-13 |
| T035 | Add `pnpm audit` step (high/critical fail) | S | T036 | T030 | 3 | FR-29, EC-4 |
| T036 | Add `osv-scanner` step | S | — | T035 | 3 | FR-29 |
| T036b | Add `npm audit signatures` shim + exceptions-register check | S | — | T030 | 3 | FR-14 (revised), EC-4, EC-4b, Constitution v2.0.0 §I.C.2 |
| T037 | Add `license-checker-rseidelsohn` step + allowlist | S | — | T030 | 3 | Research D11 |
| T038 | Add `publint` step (per-package) | S | — | T030, T004 | 4 | FR-25, EC-7 |
| T039 | Add Knip (CI warning, not gate) | XS | — | T030 | 4 | Research D16 |
| T040 | Configure concurrency cancellation | XS | — | T030 | 6 | NFR-3 |
| T041 | Pin all third-party action SHAs | S | — | T030, T033 | 2, 3 | I.C.2, I.6 |
| T042 | Configure CI artifact retention ≥ 7 years | XS | — | T030 | 2 | FR-31 |
| T043 | Add `.nvmrc` ↔ `engines.node` consistency check | XS | — | T002 | 6 | FR-NFR consistency |
| T044 | CI bootstrap-idempotency check (run twice) | S | — | T030, T045 | 1 | NFR-2 |
| T044b | Add CI guard rejecting any tracked `.env*` file (other than `.env.example`) | XS | — | T030 | 5 | FR-21, EC-8 |

**Sub-phase A6 gate:** Open a draft PR; all CI gates pass; runtime
≤ 10 min cold cache, ≤ 4 min warm; tag a `v0.0.0-rc.1` and
release pipeline produces verifiable signed artifact + SBOM +
provenance.

---

### T030 — `ci.yml`

**Description.** PR-triggered workflow:
1. `actions/checkout`
2. `actions/setup-node` with Node 24.
3. `corepack enable && pnpm install --frozen-lockfile`.
4. Parallel jobs: `lint`, `type-check`, `test`, `audit`, `sbom`,
   `secret-scan`, `license`, `publint`, `env-drift`, `nvmrc-consistency`.
5. Each job uploads its artifact (LCOV, SBOM, etc.) where
   applicable.
6. Required for merge per branch protection (T053).

**Acceptance.**
- All jobs declared in YAML.
- Matrix where useful (none required for F01 — single Node version).
- Cold-cache run ≤ 10 min; warm-cache ≤ 4 min, validated empirically
  across ≥ 3 runs.

---

### T032 — `cosign` keyless signing

**Description.** Use `sigstore/cosign-installer` action; sign
release artifact with keyless OIDC. Signature uploaded as artifact.

**Acceptance.** `cosign verify-blob` succeeds against the produced
signature in CI smoke test.

**Refs.** FR-11, Research D6.

---

### T033 — SLSA L3 reusable workflow

**Description.** `.github/workflows/slsa.yml` calls
`slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml`
(pin SHA per T041). Generates `intoto.jsonl` provenance.

**Acceptance.** Provenance attestation produced; `slsa-verifier` (or
`verify-artifact.sh`) verifies subject digest + builder identity.

**Refs.** FR-12, Research D7.

---

### T034 — `verify-artifact.sh`

**Description.** Single script that:
1. Verifies cosign signature against expected OIDC issuer + identity.
2. Verifies SLSA provenance: subject digest matches artifact, builder
   identity is the expected reusable workflow.
3. Verifies SBOM digest is referenced from provenance.
4. Exits non-zero on any failure (FR-13 fail-closed).

**Acceptance.**
- Verifies a freshly-built artifact: exits 0.
- Tampered artifact: exits non-zero with named broken link.
- Missing SBOM: exits non-zero.

**Refs.** FR-13, EC-6, Scenarios 6, 7.

---

### T036b — Dependency-signature verification + exceptions register

**Description.** Implements FR-14 as revised under Constitution
v2.0.0 §I.C.2.

CI step that:
1. Runs `npm audit signatures` (npm CLI 10.5+) against the
   pnpm-installed dependency tree (use `pnpm install
   --shamefully-hoist=false` plus a small shim that walks the lockfile,
   or call `npm audit signatures` against an npm-style view via
   `pnpm install --lockfile-only && npm install --package-lock-only`
   bridge — finalize the bridge approach in implementation; the
   contract is "verify what npm provenance is published for our
   deps").
2. Parses output. **Signature mismatch** = build fails immediately,
   never allowlisted (EC-4 — real attack signal).
3. **No-signature-available** packages are matched against
   `.specify/exceptions/dependency-signatures.md` (a markdown table
   with columns: package, version range, rationale, date-added,
   reviewer). Any unsigned dep not on the list fails the build
   (EC-4b — ecosystem gap).
4. The exceptions register is a committed artifact. Adding a new
   exception requires a one-line rationale and a reviewer name.

**Acceptance.**
- `.specify/exceptions/dependency-signatures.md` exists with the
  table schema documented and an initial pass populating exceptions
  for the F01 dep tree (any deps without provenance at install
  time).
- CI step fails on simulated signature mismatch.
- CI step fails on a fresh unsigned dep not in the exceptions
  register.
- CI step passes when all unsigned deps are accounted for.

**Refs.** FR-14 (revised), EC-4, EC-4b, Constitution v2.0.0 §I.C.2.

---

### T044b — CI guard against tracked `.env*` files

**Description.** A CI step that lists tracked files matching
`^\.env(\..+)?$` and fails if any match other than `.env.example`.
Belt-and-suspenders alongside `.gitignore` (T001) and Gitleaks
(T010): `.gitignore` covers untracked files, Gitleaks covers
content, this guard covers tracked filenames.

```bash
git ls-files | grep -E '^\.env(\..+)?$' | grep -v '^\.env\.example$'
test -z "$(git ls-files | grep -E '^\.env(\..+)?$' | grep -v '^\.env\.example$')"
```

**Acceptance.**
- Empty output → CI passes.
- A `.env` (or `.env.local` etc.) tracked → CI fails with a clear
  remediation message (`git rm --cached .env && commit`).

**Refs.** FR-21, EC-8.

---

### T038 — `publint` integration

**Description.** Add `publint` to CI; runs per package; fails on
mis-declared `exports` or `package.json` issues that would break
publishing.

**Acceptance.** `publint` exits 0 on the empty scaffold.

**Refs.** FR-25, FR-26, Research D16.

---

### T041 — Pin third-party action SHAs

**Description.** Replace all `actions/<name>@vN` references with
SHA-pinned versions. Add a comment with the version tag for
human readability. Add Dependabot (T050) to auto-PR SHA bumps.

**Acceptance.**
- No `@v\d+` references remain in `.github/workflows/`.
- Each pin has a trailing `# v1.2.3` comment.

**Refs.** Constitution §I.C.2, §I.6.

---

## Sub-phase A7 — Documentation

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T045 | Write `README.md` | M | — | A1–A6 in progress | 1, 7 | FR-32, NFR-12 |
| T046 | Write `CONTRIBUTING.md` | M | — | T011, T030 | 7 | FR-32, NFR-12 |
| T047 | Write `.github/SECURITY.md` | S | — | — | 7 | FR-32 |
| T048 | Per-package `README.md` content | S | — | T004 | 7 | FR-32 |
| T049 | `docs/architecture/{monorepo-decisions,env-manifest,release-pipeline,repo-settings}.md` | M | — | T019, T030 | 7 | FR-32 |
| T050 | Reserve `apps/web/public/{agents.md,llms.txt}` placeholders | XS | — | T005 | — | FR-33 |

**Sub-phase A7 gate:** A new contributor following the README +
CONTRIBUTING completes Scenario 1.

---

### T045 — README.md

**Description.** Sections: What is Spyglass (1 paragraph from PRD
§1), Status, Onboarding (point at `bash scripts/bootstrap.sh`),
Project layout, Development workflow, Spec-kit pointer, License.

**Acceptance.** Length ≤ 200 lines; every link works; bootstrap
command is the *only* required step for fresh-clone setup.

---

### T046 — CONTRIBUTING.md

**Description.** Sections: Branch naming (`<feature-id>-<slug>`),
Conventional commits, SDD workflow (link to Plan/Tasks workflow),
Constitutional gates, Code style (link to Biome + global rules),
No-bypass policy (per T011), How to add a dependency, How to add
an env var.

**Acceptance.** Coverage of every PR-time concern a new contributor
needs.

---

### T050 — `agents.md` and `llms.txt` placeholders

**Description.** Create both files at `apps/web/public/`. Content
is one line each: `# To be populated in F21 (Seeker web surface).`
Path is the deliverable; content is F21's.

**Acceptance.**
- Files exist at the spec-required paths.
- F21's spec will see them and replace.

**Refs.** FR-33.

---

## Sub-phase A8 — Bootstrap + smoke test

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T051 | Write `scripts/bootstrap.sh` | L | T044 | A1–A5 done | 1 | NFR-1, NFR-2, NFR-9, EC-1, EC-2, EC-9, EC-10 |
| T052 | Time bootstrap on ≥ 2 contributor machines | S | — | T051 | 1 | NFR-1 metric |

**Sub-phase A8 gate:** Median bootstrap ≤ 30 min; warm re-run ≤ 2
min; idempotent (CI-verified per T044).

---

### T051 — `bootstrap.sh`

**Description.** Idempotent shell script:
1. Verify Node 24 (read `.nvmrc`); offer `nvm install` instruction
   if missing.
2. `corepack enable && corepack prepare pnpm@<pin> --activate`.
3. Verify Vercel CLI; install via `npm i -g vercel` if missing.
4. Verify Lefthook; install via `pnpm dlx lefthook install` if
   missing.
5. Verify Gitleaks; install via documented path.
6. `pnpm install --frozen-lockfile`.
7. `vercel link` if `.vercel/project.json` absent.
8. `vercel env pull .env.local` (skip if `.env.local` present and
   recent — `--yes` for non-interactive).
9. `lefthook install`.
10. Smoke test: `pnpm -r build && pnpm -r test`.
11. Print summary: green check + next-steps (start dev server, link
    to CONTRIBUTING).

Handles errors per EC-1, EC-2, EC-9, EC-10. Each step is wrapped
with `set -e` discipline + an explicit failure handler that prints
a single actionable message.

**Acceptance.**
- Cold run on a fresh machine ≤ 30 min (median across ≥ 2
  contributors).
- Re-run on working checkout ≤ 2 min.
- Manual fault injection (delete `.env.local`, then re-run) heals.

---

## Sub-phase A9 — Repo settings codification

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T053 | Configure GitHub branch protection on `main` | S | — | T030 | 6 | V.3 |
| T054 | `.github/CODEOWNERS` | XS | — | — | — | — |
| T055 | `.github/dependabot.yml` (npm + actions, weekly) | XS | T041 | T030 | 3 | I.C.2 |
| T056 | `.github/pull_request_template.md` | S | — | — | 6, 7 | V.3 |
| T057 | `.github/ISSUE_TEMPLATE/{bug.md,feature.md}` | S | — | — | 7 | — |
| T058 | Document settings in `docs/architecture/repo-settings.md` | S | — | T053 | 7 | NFR-12 |

---

### T053 — Branch protection on `main`

**Description.** Configure via GitHub UI (and document in T058):
- Require status checks before merge: all jobs from `ci.yml` plus
  `verify-artifact` from release.yml when triggered.
- Require ≥ 1 approval from CODEOWNERS.
- Require linear history (squash or rebase only).
- Require signed commits.
- No force-push.
- No direct push (admins included).
- Require conversation resolution.

**Acceptance.** A PR with a failing check cannot merge; admin
override is auditable in repo audit log.

**Refs.** Constitution §V.3.

---

### T056 — PR template

**Description.** Sections:
- Linked spec / feature ID.
- Summary.
- Constitutional gates touched (checkboxes for §I, §I.A, §I.C, §I.D,
  §II, §III).
- Threat model link (if §I/§II touched).
- `/security-review` reviewer assigned (if mandatory per §V.3).
- Test plan.

**Acceptance.** Template renders in GitHub PR creation UI.

---

## Sub-phase A10 — Quality gates (cross-cutting)

| ID | Title | Effort | Blocks | Blocked by | Story | Refs |
|----|-------|--------|--------|------------|-------|------|
| T059 | Install + configure `changesets` (config only) | S | — | T001 | — | Research D15, III.3 |
| T060 | Run `/speckit-analyze 01-monorepo-scaffold` | S | T061 | A1–A9 done | — | V.3 |
| T061 | Run `/security-review` on F01 PR | M | T062 | T060 | — | V.3 (MANDATORY) |
| T062 | Run `/code-review` on F01 PR | M | T063 | T061 | — | V.3 |
| T063 | Squash-merge F01 PR to `main` | XS | — | T062 | — | — |

**Sub-phase A10 gate:** F01 PR merged; `main` is at the F01
baseline; F02 spec can begin.

---

### T060 — `/speckit-analyze`

**Description.** Run the analyzer; verify spec ⇄ plan ⇄ tasks
consistency; resolve any drift before proceeding to security
review.

**Acceptance.** Analyzer report shows no foundational-article
violations and no unexplained drift.

---

### T061 — `/security-review`

**Description.** MANDATORY per Constitution §V.3 (F01 touches
§I.C). Reviewer checks:
- Three secret-scan layers operational.
- Signed artifacts + SBOM + SLSA L3 in release pipeline.
- Verify-artifact script fail-closed semantics.
- Pinned action SHAs.
- No unsigned production deps.
- Branch protection enforces required checks.

**Acceptance.** Reviewer comment with verdict; CRITICAL findings
must be remediated before merge.

---

### T063 — Merge

**Description.** Squash-merge with the conventional commit
message `feat(scaffold): F01 monorepo + tech-stack baseline`. Ensure
the commit message references the spec, plan, and tasks documents.

---

## Dependency Graph (high-level)

```
A1 ─┬─▶ A2 ─┬─▶ A6 ─▶ A9 ─▶ A10
    │       │
    ├─▶ A3 ─┘
    │
    ├─▶ A4 ─▶ A5 ─▶ A8
    │
    └─▶ A7 (parallel — depends on knowledge from A4, A6)
```

Critical path: A1 → A4 → A5 → A8 → A10. ~22 hours of irreducible
sequencing; the rest parallelizes.

---

## Tracking

Tasks should be reflected in the project's task tracker (or
`/TaskCreate`-managed list during execution). Each task's PR title
should reference its `T###` ID.

A task transitions: `pending` → `in_progress` (when work starts) →
`completed` (when its acceptance criteria are met and any associated
CI gates pass). Tasks blocked by failing CI are *not* completed —
mark `blocked` and address the failure.

---

## Change Log

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-05-06 | Initial task breakdown. 63 tasks across 10 sub-phases (A1–A10) with explicit dependencies, story tags, effort estimates, and acceptance criteria. |
| 1.1 | 2026-05-06 | Post-`/speckit-analyze` revisions: T007 rewritten for ESLint+Prettier (was Biome) — now also enforces NFR-10 via ESLint `max-lines`. T008 hook commands updated. T001 acceptance expanded to include `.gitignore` for `.env*`. New T036b for FR-14 (revised) — `npm audit signatures` shim + `.specify/exceptions/dependency-signatures.md` register. New T044b CI guard for tracked `.env*` files. Total tasks 63 → 65. |
