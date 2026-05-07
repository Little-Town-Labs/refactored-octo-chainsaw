---
name: Bug report
about: Something is broken. Use the security advisory link instead if it's a vulnerability.
title: "bug: "
labels: bug
---

## What happened

<!-- Concise description. Steps to reproduce. -->

## What you expected

<!-- What should have happened? Link the spec or commit defining
the expected behavior if relevant. -->

## Environment

- Branch / commit SHA:
- OS:
- Node version:
- pnpm version:
- Browser (if frontend bug):

## Severity (your assessment)

- [ ] Sev-1 — production hiring decisions affected, cross-side data exposure, audit log integrity, signed-artifact compromise, or production credential disclosure
- [ ] High — blocks development for the team
- [ ] Medium — workaround exists; fix needed soon
- [ ] Low — minor, can wait

If sev-1, **stop filing this and use the SECURITY.md flow instead** —
some sev-1 incidents (cross-side leakage, audit log integrity) have
GDPR 72-hour notification clocks attached.

## Logs / screenshots

<!-- Paste relevant output. Redact any credentials. -->

## Constitutional surface (if known)

<!-- Optional: which foundational article does this touch? Helps
route reviewers. -->

- [ ] §I.1 Confidentiality
- [ ] §I.2 Integrity
- [ ] §I.3 Availability
- [ ] §I.4 Privacy
- [ ] §I.5 AAA
- [ ] §I.A Parley primitives
- [ ] None obvious
