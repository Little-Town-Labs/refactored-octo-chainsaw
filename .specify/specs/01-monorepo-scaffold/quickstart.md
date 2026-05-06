# F01 — Quickstart & Validation Scenarios

**Spec:** v1.2 · **Plan:** v1.0 · **Date:** 2026-05-06

How a contributor or auditor exercises F01 once it lands. Each scenario
maps back to a spec acceptance criterion or success metric.

---

## Prerequisites

- macOS, Linux, or WSL2.
- `git`, `bash`, `curl` available.
- A GitHub account with repo access.
- A Vercel account linked to the Spyglass team.

(Bootstrap installs everything else.)

---

## Scenario 1 — Fresh-clone bootstrap (Story 1, NFR-1)

```bash
git clone git@github.com:LittleTownLabs/spyglass.git
cd spyglass
bash scripts/bootstrap.sh
```

**Expected:**
- Bootstrap detects/installs Node 24, pnpm 9.x via Corepack, Vercel
  CLI, Lefthook, Gitleaks.
- `pnpm install` completes.
- `vercel link` prompts (one-time).
- `vercel env pull .env.local` populates required env vars.
- `lefthook install` registers git hooks.
- Final smoke test: `pnpm -r build && pnpm -r test` exits 0.
- Total time ≤ 30 minutes.

**Failure modes:**
- Missing Vercel auth: bootstrap exits with "Run `vercel login` and
  re-run bootstrap" (single actionable line, EC-1).
- Network failure mid-install: bootstrap retries with backoff
  (NFR-9); persistent failure exits non-zero.

---

## Scenario 2 — Idempotent re-bootstrap (Story 1, NFR-2)

```bash
bash scripts/bootstrap.sh   # second run on a working checkout
```

**Expected:** ≤ 2 minutes; most steps no-op; only env-var refresh
runs network calls.

---

## Scenario 3 — Empty-scaffold CI (Story 6, NFR-3)

```bash
git checkout -b ci-noop
git commit --allow-empty -m "chore: ci smoke test"
git push -u origin ci-noop
gh pr create --fill
```

**Expected:**
- CI runs all gates: type-check, lint, format-check, unit tests,
  dependency audit, SBOM generation, secret scan.
- Cold-cache run ≤ 10 minutes; warm-cache run ≤ 4 minutes.
- All gates pass on the empty scaffold.

---

## Scenario 4 — Secret-commit blocked (Story 5, FR-22, EC-3)

```bash
echo "AWS_SECRET_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE" > leak.txt
git add leak.txt
git commit -m "chore: oops"
```

**Expected:** Commit rejected by Lefthook + Gitleaks. Output names
the file, the matched pattern, and points at remediation.

---

## Scenario 5 — Push-time defense (Story 5, FR-23)

```bash
git commit --no-verify -m "chore: bypass"   # local hook bypassed
git push
```

**Expected:** GitHub native secret scanning + push protection
rejects the push. Layer 2 catches what Layer 1 missed (Constitution
§I.6 Defense in Depth).

---

## Scenario 6 — Release pipeline produces a verifiable artifact
(Story 2, FR-10–14)

```bash
git tag v0.0.0-rc.1
git push origin v0.0.0-rc.1
```

Then in another terminal, after release.yml completes:

```bash
gh run download <run-id> --name release-artifact
gh run download <run-id> --name sbom
gh run download <run-id> --name attestation
bash scripts/verify-artifact.sh ./release-artifact
```

**Expected:**
- Release workflow produces:
  - Built artifact (Next.js standalone)
  - CycloneDX SBOM (JSON)
  - Sigstore signature (cosign keyless)
  - SLSA L3 provenance attestation
- `verify-artifact.sh` exits 0; reports signature verified, SLSA
  builder allowed, SBOM digest matches provenance subject.

---

## Scenario 7 — Tampered artifact fails verification (Story 2,
FR-13, EC-6)

```bash
echo "tamper" >> ./release-artifact/server.js
bash scripts/verify-artifact.sh ./release-artifact
```

**Expected:** Exits non-zero; clear message identifying the broken
link in the chain (signature mismatch / digest mismatch).

---

## Scenario 8 — Env-manifest drift (Story 5, FR-18, FR-20)

```bash
# Edit packages/shared/src/env.ts to add a new optional var
# but DO NOT regenerate .env.example
git add packages/shared/src/env.ts
git commit -m "feat(shared): add NEW_VAR env"
git push
```

**Expected:** CI's "env-example up-to-date" gate fails; output
instructs `pnpm gen:env-example && git add .env.example`.

---

## Scenario 9 — Boundary violation (Story 4, FR-25, EC-7)

```ts
// In apps/web/some-route.ts:
import { internalThing } from '@spyglass/shared/dist/internal/private'
```

**Expected:**
- `pnpm type-check` fails — the deep path is not in the
  `@spyglass/shared` `exports` map.
- Biome lint also flags the violation.
- `publint` flags any package whose `exports` are mis-declared.

---

## Scenario 10 — Cyclic-dependency rejection (Story 4, EC-7)

Make `packages/auth` import from `packages/agents`, and vice-versa.

**Expected:** Type-check fails (TypeScript project references reject
cycles). CI gate fails.

---

## Scenario 11 — Vulnerability gate (FR-29, Research D10)

Add a dependency with a known CRITICAL vuln (or pin a known-bad
version transitively).

**Expected:**
- `pnpm audit --audit-level high --prod` step fails.
- `osv-scanner` step also flags it.
- PR cannot merge until either the dep is updated or a recorded
  exception is filed in `.specify/exceptions/`.

---

## Scenario 12 — Unsigned dependency (FR-14, EC-4)

Add a production dependency that lacks a verifiable signature.

**Expected:**
- CI step "verify dependency signatures" fails.
- Remediation in error message: replace, sign upstream, or file
  `.specify/exceptions/<dep>.md` with rationale.

---

## What success looks like

All 12 scenarios pass in CI on the F01 PR. Two contributors
independently complete Scenario 1 within the time budget. The PR
goes through `/security-review` and `/code-review` before merging.

The next contributor opening this repo should:
1. Run Scenario 1.
2. Read `.specify/roadmap.md` for next-feature context.
3. Run `/speckit-specify 02-identity-auth-aaa` if assigned to F02.

---

## Reference

- F01 spec: `../spec.md`
- F01 plan: `../plan.md`
- F01 research: `../research.md`
- Constitution: `.specify/memory/constitution.md`
- Roadmap: `.specify/roadmap.md`
