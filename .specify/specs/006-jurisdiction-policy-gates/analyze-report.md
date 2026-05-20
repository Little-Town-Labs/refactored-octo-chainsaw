# F06 Specification Analysis Report

**Date:** 2026-05-20
**Feature:** `006-jurisdiction-policy-gates`
**Result:** PASS after remediation. No CRITICAL/HIGH issues remain.

## Findings

| ID | Category | Severity | Location(s) | Summary | Resolution |
| --- | --- | --- | --- | --- | --- |
| C1 | Coverage | HIGH | `spec.md` FR-013; `tasks.md` T036/T037 | The spec requires grouping related gate decisions by `correlation_id`, but the initial decision-history API only returned correlation ids and lacked a correlation filter. | Fixed in `packages/policy-gates/src/review.ts` and `packages/policy-gates/src/repo.ts`; `review.test.ts` covers correlation filtering. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
| --- | --- | --- | --- |
| FR-001 jurisdiction posture | Yes | T003, T006, T035 | DB schema, governance, active posture reads |
| FR-002 gate evaluation | Yes | T012, T015, T017, T018 | evaluator plus F04 adapters |
| FR-003 fail-safe deny | Yes | T012, T015, T019 | missing, unknown, unsupported, disabled covered |
| FR-004 structured decisions | Yes | T002, T014, T016 | JSON schema and persisted decision rows |
| FR-005 canonical audit evidence | Yes | T013, T016, T020, T024 | gate and kill-switch audit linkage |
| FR-006 no-deploy kill switches | Yes | T020, T023, T025, T042 | mutation path and quickstart scenario |
| FR-007 scoped kill-switch changes | Yes | T020, T022, T023 | `policy.kill_switch.manage` |
| FR-008 closed-list reasons | Yes | T021, T023, T024 | contract and schema enums |
| FR-009 historical evidence | Yes | T008, T024, T036, T037 | immutable rows plus bounded history |
| FR-010 failure artifacts | Yes | T027, T028, T029, T030, T031 | non-PII projection and schema fixture |
| FR-011 scoped review reads | Yes | T033, T034, T035, T036, T037 | posture and history APIs |
| FR-012 deny unscoped access | Yes | T020, T033, T034 | authorization tests |
| FR-013 correlation grouping | Yes | T036, T037 | resolved with `correlationId` history filter |
| FR-014 multi-jurisdiction deny | Yes | T012, T015 | multi-jurisdiction deny test |
| FR-015 stable downstream semantics | Yes | T002, T028, T041, T046 | contracts, runbook, handoffs |

## Constitution Alignment

No open constitution conflicts.

- §I.3: kill switches flip without deployment in code and quickstart.
- §I.5: privileged mutation requires scoped principal and canonical audit evidence.
- §I.6: missing/unknown/disabled/unsupported posture denies by default.
- §I.A: jurisdiction tagging, per-jurisdiction gates, and geographic kill switches are implemented.
- §I.D: decision and kill-switch evidence is preserved and reviewable.

## Metrics

- Total functional requirements: 15
- Total tasks: 46
- Requirement coverage: 100%
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0
- High issues remaining: 0

## Next Actions

Proceed with code/security review and final verification.
