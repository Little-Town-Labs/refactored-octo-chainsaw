# Security Policy

## Reporting a vulnerability

**Do NOT** open a public GitHub issue for security vulnerabilities.

Email **security@littletownlabs.com** (or current security contact;
update this file when changed).

Include:

- A clear description of the vulnerability.
- Steps to reproduce.
- The version / commit SHA where you observed it.
- Your assessment of impact.

We will acknowledge within 2 business days. Resolution timelines
depend on severity:

- **Critical** (cross-side data exposure, RCE, auth bypass): 7 days
  to fix or mitigate.
- **High**: 30 days.
- **Medium**: next scheduled release.
- **Low**: tracked, addressed when convenient.

## Scope

In scope:

- All code in this repository (`apps/`, `packages/`, `scripts/`).
- Configuration that ships in source (CI workflows, lefthook,
  prettier, eslint).
- Generated artifacts (SBOM, signed releases, SLSA provenance).

Out of scope (report upstream):

- Vulnerabilities in third-party dependencies — please report to
  the upstream maintainer; if you discover one *we* haven't yet
  patched, also let us know via the email above.
- Vulnerabilities in Vercel, Neon, Inngest, Clerk, or other
  managed-service providers — report directly to them.
- Issues only reachable by privileged operators (we trust our
  operators; the threat model is external).

## What we treat as a sev-1 incident

Per Constitution v2.0.0 §I.D.3 and PRD §9 (risk register), the
following are automatically sev-1 with full incident-response
runbook activation:

1. **Cross-side privacy filter bypass** — seeker PII reaching
   employer side, or vice versa, outside an unlocked introduction.
2. **Audit log integrity violation** — hash chain broken; entry
   mutation; tombstone forgery.
3. **Signed artifact compromise** — cosign signature mismatch on a
   distributed release.
4. **Supply-chain attack with confirmed code execution** — malicious
   dependency, build-tool tampering.
5. **Production credential disclosure** — Clerk secret, Inngest
   key, AI Gateway key, database URL exposure.

Sev-1 follows GDPR Art. 33 (72-hour supervisory authority) and Art.
34 (data-subject notification "without undue delay") for any
incident touching personal data, regardless of jurisdiction at the
time of the incident.

## Coordinated disclosure

We follow a coordinated-disclosure model:

1. You report; we acknowledge within 2 business days.
2. We confirm and start fixing.
3. We agree on a disclosure window (default 90 days from report).
4. We publish a fix and a public advisory at the agreed time.
5. We credit reporters who wish to be named.

We do not currently run a bug bounty. Pre-Phase 1 launch we will
review whether to start one.

## Out-of-band channels

If email is somehow inappropriate (e.g., the email service is
itself compromised), use the GitHub Security Advisory feature on
this repository as a private channel.

## Constitutional references

- v2.0.0 §I.D — Incident Response & Breach Notification (NIST SP
  800-61r2).
- v2.0.0 §I.4.4 — Data-subject rights (GDPR Arts. 12–22).
- v2.0.0 §V.3 — `/security-review` mandatory for any change
  touching foundational articles I, I.A, I.C, I.D.
