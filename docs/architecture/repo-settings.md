# Repository Settings

How `main` is protected and what GitHub-side configuration is
required for Spyglass.

**Constitution refs:** v2.0.0 §V.3 (conformance gates)

> **Status:** Documented intent. The actual GitHub branch protection
> rules and other web-UI settings are configured in T053 (Phase A9)
> when the repo is pushed to GitHub. This file is the source of truth
> for what those settings should be — re-applying them after a future
> Terraform migration uses this doc as the spec.

## Branch protection on `main`

| Setting | Value | Why |
|---|---|---|
| Require pull requests before merging | ✅ | No direct pushes; CR is mandatory |
| Required approving reviews | ≥ 1 | At least one CODEOWNER signs off |
| Dismiss stale approvals when new commits push | ✅ | Approvals reflect the *current* code |
| Require review from CODEOWNERS | ✅ | Owner-of-record on file changes |
| Require status checks before merging | ✅ | All `ci.yml` jobs must pass |
| Require branches to be up to date before merging | ✅ | No merge-skew bugs |
| Require linear history | ✅ | Audit log is simpler — no merge commits |
| Require signed commits | ✅ | Constitution §V.2 — provenance of every change |
| Require conversation resolution | ✅ | No merging with unresolved review threads |
| Lock branch | ❌ | Not yet — flip on at Phase 0 alpha |
| Restrict who can push (admin override) | ✅ | Only break-glass admins |
| No force-push | ✅ | History integrity |
| No deletions | ✅ | History integrity |

### Required status checks (must mirror `ci.yml` job names)

- `lint (eslint)`
- `format (prettier --check)`
- `type-check`
- `test (jest, with coverage)`
- `publint`
- `audit (pnpm audit, high+critical fail)`
- `osv-scanner`
- `dep-signatures (npm audit signatures + exceptions register)`
- `sbom (cdxgen, pnpm-aware)`
- `license (allowlist)`
- `secret-scan (gitleaks)`
- `env-drift (.env.example vs schema)`
- `.nvmrc ↔ engines.node consistency`
- `guard tracked .env files`

When jobs are renamed in `ci.yml`, the branch-protection list must
be updated in the same change. Drift = false-pass merges.

## CODEOWNERS

`.github/CODEOWNERS` defines mandatory reviewers per path. Sketch:

```
# Default owner — at least one of these reviews every PR.
*                              @LittleTownLabs/spyglass-core

# Constitution + roadmap — governance changes need broader review.
.specify/memory/**             @LittleTownLabs/spyglass-core @LittleTownLabs/governance
.specify/roadmap.md            @LittleTownLabs/spyglass-core @LittleTownLabs/governance

# Compliance harness primitives — counsel review per V.2.
.specify/specs/06-*/**         @LittleTownLabs/spyglass-core @LittleTownLabs/compliance
.specify/specs/07*/**          @LittleTownLabs/spyglass-core @LittleTownLabs/compliance

# Security-sensitive code paths.
packages/auth/**               @LittleTownLabs/security
packages/parley/**             @LittleTownLabs/security
.github/workflows/**           @LittleTownLabs/security
scripts/verify-artifact.sh     @LittleTownLabs/security
scripts/check-dep-signatures.sh @LittleTownLabs/security
```

Concrete team handles get filled in by T054.

## Secret scanning + push protection (GitHub-native)

Layer 2 of the three-layer secret-scanning architecture (lefthook =
1, gitleaks CI = 3).

| Setting | Value |
|---|---|
| Secret scanning | Enabled |
| Push protection | Enabled |
| Block pushes that contain detected secrets | ✅ |
| Notify users of bypassed pushes | ✅ |

Push protection turns "the local hook was skipped" from a hidden
risk into a forced server-side block. Combined with the CI gate,
this is Constitution §I.6 (Defense in Depth) materially implemented.

## Dependabot

`.github/dependabot.yml` runs weekly:

- npm ecosystem (workspace-aware)
- github-actions ecosystem
- Group major-version bumps for review batching

Dependabot also handles the SHA-pinning task (T041) — its first PR
on each action will pin to the SHA that corresponds to the version
tag we initially used. Reviewer accepts; pinning is permanent.

## Vercel-side configuration (separate from GitHub repo settings)

| Setting | Value |
|---|---|
| Production branch | `main` |
| Preview deployments | All PRs |
| Environment scopes | development, preview, production |
| Auto-deploy on push to main | ❌ until Phase 0 launch |

## Apply-this-from-source migration target

When we migrate repo settings to Terraform (planned before Phase 2
NYC per Research D18), this document is the spec the Terraform
should produce. Settings drift in the GitHub UI is its own bug —
diff what the UI shows against this file at every quarterly
review.
