# F07a Specification Analysis Report

**Date:** 2026-05-20
**Feature:** `007-agent-contract-registry`
**Result:** PASS after remediation. No CRITICAL/HIGH issues remain.

## Findings

| ID | Category | Severity | Location(s) | Summary | Resolution |
| --- | --- | --- | --- | --- | --- |
| C1 | Coverage | HIGH | `spec.md` FR-007; `research.md` Dependency Validation; `tasks.md` T019/T023 | The spec and research require dependency validation at write time and dispatch time, but the initial implementation only validated dependencies during dispatch resolution. | Fixed in `packages/agent-contracts/src/publish.ts`; `publication-audit.test.ts` covers publish-time dependency denial with no persisted contract row. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
| --- | --- | --- | --- |
| FR-001 immutable versions | Yes | T006, T008, T011, T012, T014 | Schema uniqueness plus publish tests |
| FR-002 reject mutation | Yes | T012, T014, T033 | `ContractVersionMutationError` plus quickstart scenario |
| FR-003 store contract refs/provenance | Yes | T006, T009, T019, T020 | DB schema, types, publish path |
| FR-004 scoped publication | Yes | T017, T018, T019 | `contract.publish` guard |
| FR-005 canonical audit evidence | Yes | T017, T020, T033 | publish/deprecate audit events |
| FR-006 structured failures | Yes | T011, T015, T022, T023 | resolution reason codes |
| FR-007 write/dispatch dependency validation | Yes | T017, T019, T022, T023 | publish-time and dispatch-time checker coverage |
| FR-008 historical resolution | Yes | T006, T014, T027, T032 | immutable versions and review/runbook guidance |
| FR-009 scoped review reads | Yes | T026, T027, T028 | `contract.read`, bounded filters |
| FR-010 extension fields | Yes | T009, T013, T033 | preserved in types/hash and quickstart evidence |
| FR-011 effective runtime settings/clamps | Yes | T022, T024, T033 | resolver and quickstart clamp scenario |
| FR-012 F07a boundaries | Yes | T002, T032, T034 | contracts/runbook keep bodies and runner out of scope |
| SC-001 deterministic resolution | Yes | T011, T015, T037 | package tests |
| SC-002 mutation rejection | Yes | T012, T014, T033 | package tests and quickstart |
| SC-003 dependency denials | Yes | T022, T023, T033 | package tests and quickstart |
| SC-004 audit event id | Yes | T017, T020, T033 | publication/deprecation tests and quickstart |
| SC-005 scoped review reads | Yes | T026, T027, T028 | review tests |
| SC-006 final verification | Yes | T037 | final verification command set |

## Constitution Alignment

No open constitution conflicts.

- §I.2: immutable contract versions and event evidence preserve integrity.
- §I.5: publish/deprecate paths require scoped principals and canonical audit links.
- §I.6: missing, deprecated, and dependency-unresolvable contracts fail closed.
- §II: contracts define side-agent execution refs and runtime bounds.
- §III.3: `(contract_id, version)` mutation is rejected.
- §I.D: contract version and event history are scoped and reviewable.

## Metrics

- Total functional requirements: 12
- Total success criteria: 6
- Total tasks: 37
- Requirement coverage: 100%
- Ambiguity count: 0
- Duplication count: 0
- Critical issues: 0
- High issues remaining: 0

## Next Actions

Proceed with code/security review and final verification.
