# Release Pipeline

How Spyglass produces, signs, and verifies release artifacts.

**Sources:**
- `.github/workflows/release.yml`
- `scripts/verify-artifact.sh`
- Constitution v2.0.0 §I.C.2 (supply-chain integrity)

## Trigger

A git tag matching `v*.*.*` pushed to the repo (e.g., `v0.1.0`,
`v1.0.0-rc.1`) triggers `release.yml`. No other path produces a
release.

## Pipeline stages

```
tag pushed
    │
    ▼
build              ─► standalone Next.js bundle + tarball
    │
    ▼
sbom               ─► CycloneDX SBOM via @cyclonedx/cdxgen
    │
    ▼
sign               ─► Sigstore cosign keyless signature
    │
    ▼
provenance         ─► SLSA Build Level 3 attestation
    │
    ▼
github-release     ─► all artifacts published to the GitHub release
```

Each stage produces an artifact uploaded to GitHub Actions storage
(90-day retention) and to the GitHub Release (long-term).

## What's signed

Three things, each with a different attestation:

1. **The tarball.** `cosign sign-blob --bundle` produces a
   `*.cosign.bundle` containing the signed blob digest, the
   ephemeral cert chain, and a Rekor transparency-log entry. No
   long-term key material involved (keyless OIDC).
2. **The SBOM.** Treated as a release artifact too; signed by the
   same cosign step. Verification cross-checks the SBOM digest
   against the SLSA provenance subject.
3. **The build process.** SLSA L3 provenance proves the artifact
   was built by the GitHub Actions reusable workflow we expect,
   from the source ref we expect (the tag), with no falsifiable
   intermediate steps.

## What's verified

`scripts/verify-artifact.sh` runs three checks in sequence,
fail-closed (Constitution §I.6):

1. **cosign signature** — keyless OIDC issuer + identity regex
   match the Spyglass release workflow.
2. **SLSA L3 provenance** — `slsa-verifier` confirms subject
   digest matches the tarball, builder identity matches the
   reusable workflow, source URI matches `github.com/<repo>`.
3. **SBOM digest** — the SHA-256 hash declared in the SBOM's
   `metadata.component.hashes` matches the tarball's actual
   sha256.

Repo identity is configurable via `SPYGLASS_REPO` and
`SPYGLASS_OIDC_ISSUER` env vars so the script survives a repo
rename.

## Verification example

```bash
# After downloading a release directory containing tarball, SBOM,
# cosign bundle, and intoto.jsonl:
bash scripts/verify-artifact.sh ./release-v0.1.0
```

Required local tools:

- `cosign` (https://docs.sigstore.dev/cosign/installation/)
- `slsa-verifier` (https://github.com/slsa-framework/slsa-verifier)
- `jq` (any modern version)
- `sha256sum` (coreutils)

Any broken link in the chain → exit non-zero with a named failure.
There is no "soft pass" mode. This is FR-13 + EC-6 by design.

## Long-term retention

GitHub Actions storage caps at 90 days on free tier. AEDT-relevant
artifacts (SBOM, signature, provenance) need ≥ 7 years per spec
FR-31 / Constitution §I.A.2. Strategies:

- **GitHub Releases** retain attached assets indefinitely as long
  as the release exists. Our pipeline attaches every attestation
  to the release.
- **Off-platform durable storage** (e.g., Vercel Blob, S3 with
  Glacier) is configured pre-Phase-1 launch (TODO; not in F01).
- **Audit log** — the release event itself is recorded; even if
  artifacts disappear from a third-party host, the audit trail
  proves what was released and when.

## Build provenance: what L3 actually buys us

SLSA Build Level 3 requires a non-falsifiable build platform —
the build runs on infrastructure where the builder identity
cannot be impersonated by the source publisher. GitHub Actions
runners qualify when the build uses a SLSA-aware reusable
workflow.

What an attacker can no longer do:

- Tag a malicious commit and claim it was built by us — the
  provenance attestation pins the commit, the workflow file,
  and the runner.
- Substitute a different binary post-release — `cosign verify` +
  digest match catches this.
- Backdoor the build — only steps in the SLSA-aware workflow
  are reflected in the attestation; ad-hoc local builds aren't
  accepted by `slsa-verifier`.

What L3 doesn't address (still our responsibility):

- Source-side attacks (malicious commit pre-build) — covered by
  branch protection, signed commits, code review.
- Vulnerable dependencies in the pinned tree — covered by `pnpm
  audit`, `osv-scanner`, dep-signature verification.

## Future hardening (track for Phase 2)

- **HSM-backed long-term signing keys** for dossiers (F10 owns) —
  release artifacts use keyless OIDC; dossier signing for legal-
  evidence-grade artifacts may want a different posture.
- **Off-platform SBOM/provenance archival** — see retention note
  above.
- **SLSA L4** — requires hermetic builds and two-person review;
  worth assessing when the team grows.
- **SBOM-attestation-style attaching** (in-toto attestations
  pointing at the SBOM) instead of separate file. Cleaner;
  defer until tooling is ubiquitous.
