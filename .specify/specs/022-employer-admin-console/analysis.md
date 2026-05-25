# Specification Analysis: Employer Admin Console

**Date**: 2026-05-25

## Summary

`/speckit-analyze` found two blocking constitution coverage gaps and four spec/task consistency gaps before implementation. The blocking gaps were missing STRIDE/LINDDUN threat-model coverage and missing explicit mandatory `/security-review` coverage for an Article I/II feature.

## Findings and Remediation

| ID | Severity | Finding | Remediation |
| --- | --- | --- | --- |
| C1 | CRITICAL | F22 touches Articles I and II but tasks lacked a threat-model deliverable. | Added T061 for STRIDE/LINDDUN threat model. |
| C2 | CRITICAL | Security review task did not explicitly require mandatory `/security-review`. | Added T063 for `/security-review`; split accessibility review to T064. |
| I1 | HIGH | User-facing "cancelled" terminology drifted from internal `closed` terminal state. | Clarified canceled maps to internal `closed` with cancellation reason in spec, contracts, data model, quickstart, and tasks. |
| G1 | HIGH | Candidate disposition was mentioned without FR/action/task coverage. | Deferred candidate disposition mutation out of F22 and made candidate inbox/dossier surfaces read-only. |
| U1 | MEDIUM | Employer profile persistence was conditional and underbounded. | Tightened profile persistence to require `employer_organization_profiles` unless an existing durable profile table already satisfies the contract. |
| G2 | MEDIUM | Bounded list performance goal lacked task/test coverage. | Added bounded page-size coverage for req and candidate list tasks. |

## Coverage Status

- Functional requirements: covered after remediation.
- Success criteria: covered after remediation.
- Constitution alignment: no known blocking gaps after remediation.
- Remaining expected work: implementation, verification evidence, threat model, code review, `/security-review`, accessibility review, and PR publication.
