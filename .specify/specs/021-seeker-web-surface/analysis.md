# Specification Analysis Report: Seeker Web Surface

**Date**: 2026-05-25
**Scope**: `.specify/specs/021-seeker-web-surface/spec.md`, `plan.md`, and `tasks.md`
**Status**: Remediated

## Findings

| ID  | Category           | Severity | Location(s)                                  | Summary                                                                                                                                   | Resolution                                                                                                                                                              |
| --- | ------------------ | -------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | Underspecification | High     | `spec.md` FR-002; `tasks.md` US1 tasks       | Clerk signup/login/profile entry points were required, but the task wording did not define whether the profile/account target was local or Clerk-hosted. | Clarified that the profile/account entry point is Clerk-backed, either via a local Clerk component route or a Clerk-hosted account URL; updated T018 to require that target. |
| C1  | Inconsistency      | Medium   | `plan.md` project tree; `tasks.md` test paths | The plan omitted `landing-page.test.tsx` and `a2a-card-routes.test.ts`, both required by tasks.                                           | Updated the plan source tree to include both test files.                                                                                                                |
| G1  | Coverage Gap       | Medium   | `spec.md` FR-012; `tasks.md` verification     | Cache/privacy/no-auth behavior was covered for A2A responses but not for landing or public docs.                                          | Added T021 for landing cache/privacy/no-auth assertions and T025 for `/agents.md` and `/llms.txt` cache/privacy/no-auth tests.                                         |

## Coverage Summary

| Requirement Key                       | Status  | Task IDs                  | Notes                                      |
| ------------------------------------- | ------- | ------------------------- | ------------------------------------------ |
| FR-001 landing page                   | Covered | T013-T019, T021           | Includes landing content and public safety |
| FR-002 Clerk signup/login/profile     | Covered | T018                      | Clerk-backed profile/account target pinned |
| FR-003 no dashboard/product web       | Covered | T009, T011, T014, T020    | Prohibited surfaces guarded                |
| FR-004 no-dashboard guard             | Covered | T009, T011, T020          | Explicit guard behavior                    |
| FR-005 preserve F20 / no internals    | Covered | T013, T014, T022-T025     | Covered through content and doc tests      |
| FR-006 `/agents.md`                   | Covered | T022, T026, T028, T037    | Public docs and A2A links                  |
| FR-007 `/llms.txt`                    | Covered | T023, T027, T029          | LLM-readable boundaries                    |
| FR-008 A2A card index                 | Covered | T006-T010, T030, T034     | Index and route tests                      |
| FR-009 individual cards               | Covered | T006, T031-T035           | Five card set                              |
| FR-010 card metadata                  | Covered | T006, T010, T030-T036     | Availability/runtime metadata              |
| FR-011 A2A future interop status      | Covered | T024, T030-T037           | Runtime over-promise guarded               |
| FR-012 cache-safe public surfaces     | Covered | T021, T025, T036          | Landing, docs, and A2A covered             |
| FR-013 WCAG semantics                 | Covered | T014, T015, T047, T050    | Test and review coverage                   |
| FR-014 prohibited surface tests       | Covered | T011, T014, T020, T024    | Guard and public doc checks                |
| FR-015 quickstart evidence            | Covered | T038-T047                 | Evidence tasks remain in verification      |

## Constitution Alignment

No constitutional conflicts remain. The remediated artifacts preserve the no-dashboard boundary, public read-only discovery posture, no new durable storage assumption, no private data exposure, and separation between F20 conversational flows, F21 web discovery, and F23 employer APIs/webhooks.

## Metrics

- Total functional requirements: 15
- Total tasks after remediation: 52
- Coverage: 15/15
- Ambiguity count after remediation: 0
- Duplication count: 0
- Critical issues: 0
- High issues after remediation: 0
