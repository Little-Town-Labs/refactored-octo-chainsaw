<!-- Spyglass PR template. Per Constitution v2.0.0 §V.3, PRs are
checked against foundational articles. This template surfaces the
gates as checkboxes — answer them, don't delete them. -->

## Summary

<!-- One paragraph: what changed and why. Link to the spec
(`.specify/specs/<feature>/spec.md`) if this is a feature PR. -->

## Linked artifacts

- Spec: <!-- e.g., .specify/specs/04-ticket-store-state-machines/spec.md -->
- Plan: <!-- e.g., .specify/specs/04-ticket-store-state-machines/plan.md -->
- Tasks completed: <!-- e.g., T012, T013 -->

## Constitutional gates

Check the articles this PR touches. Foundational article changes
(I, I.A–I.D, II, III) require explicit reviewer sign-off; Article IV
deviations require inline justification in code or spec.

- [ ] **§I.1 Confidentiality** — privacy filter, demographic data, cross-side leakage paths
- [ ] **§I.2 Integrity** — audit log, signed dossiers, rubric/contract versioning
- [ ] **§I.3 Availability** — kill switches, ticket lifecycle, fail-safe defaults
- [ ] **§I.4 Privacy** — data minimization, retention, redaction-by-tombstone
- [ ] **§I.5 AAA** — authn, authz, scoped agent credentials, accountability
- [ ] **§I.6 Defense in Depth & Secure-by-Default** — multiple layers, fail-safe
- [ ] **§I.A Parley primitives** — jurisdiction tagging, policy gates, bias-test gate
- [ ] **§I.B Phased posture** — Phase 0/1/2 boundaries, jurisdiction set
- [ ] **§I.C Cryptographic & Supply Chain** — keys, SBOM, signing, dep verification
- [ ] **§I.D Incident Response** — IR runbook, breach notification
- [ ] **§II Agent-Native** — agent identity, machine-readable manifests
- [ ] **§III Dual-audience surfaces** — humans + agents both served; WCAG 2.2 AA
- [ ] None of the above (Article IV / disciplinary only)

## /security-review status

`/security-review` is **MANDATORY** when any of §I, §I.A, §I.C,
§I.D is touched. Mark one:

- [ ] Not required (none of the above touched)
- [ ] Required and complete — link to review:
- [ ] Required and pending (must complete before merge)

## Threat model

Threat modeling is required for any feature touching §I or §II
(STRIDE for security; LINDDUN for privacy).

- [ ] Not required (this PR doesn't touch §I or §II)
- [ ] Threat model added/updated — location:
- [ ] N/A — disciplinary change only

## Tests

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated (if applicable)
- [ ] Coverage threshold met (or recorded exception)
- [ ] Manual verification performed: <!-- describe -->

## Pre-merge checklist

- [ ] CI green
- [ ] Conventional commit messages
- [ ] No `--no-verify` commits on this branch (other than feature-WIP early in the branch)
- [ ] No tracked `.env*` files (other than `.env.example`)
- [ ] No hardcoded secrets
- [ ] Documentation updated if behavior or APIs changed
- [ ] CHANGELOG / changeset added if a public package changed (if applicable post-F02)

## Risks / rollback

<!-- What could go wrong if this lands? How would we roll back?
Especially relevant for changes to packages/parley, packages/auth,
packages/db, .github/workflows, scripts/verify-artifact.sh. -->
