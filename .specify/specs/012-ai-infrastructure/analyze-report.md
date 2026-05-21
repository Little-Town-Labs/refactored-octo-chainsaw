# Specification Analysis Report: F12 AI Infrastructure

## Findings

| ID  | Category | Severity | Location(s) | Summary | Recommendation |
| --- | --- | --- | --- | --- | --- |
| U1 | Underspecification | LOW | tasks.md:T008 | Initial schema-convention task used conditional phrasing. | Reworded T008 to require explicit F12 schema convention coverage and governance doc updates. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
| --- | --- | --- | --- |
| FR-001 governed invocation surface | Yes | T012-T022 | Covered by import boundary, gateway, and invocation tasks. |
| FR-002 required invocation refs | Yes | T016, T019 | Covered by invocation preflight/refusal tests and implementation. |
| FR-003 refusal for missing/unauthorized/over-policy/audit gaps | Yes | T016, T019, T021, T039-T045 | Covered across invocation and cost/supply-chain tasks. |
| FR-004 immutable prompt versions | Yes | T023, T026, T028 | Covered by prompt registry tests and implementation. |
| FR-005 immutable model versions | Yes | T024, T027, T028 | Covered by model registry tests and implementation. |
| FR-006 release-event version changes | Yes | T026-T028, T031-T035 | Covered by immutable registries and manifests. |
| FR-007 signed runtime manifests | Yes | T031, T034 | Covered by manifest tests and implementation. |
| FR-008 no-hot-reload posture | Yes | T032, T035, T037 | Covered by freeze helpers and invocation integration. |
| FR-009 audit evidence | Yes | T017, T021, T025, T029, T044 | Covered by invocation, review, and cost evidence tasks. |
| FR-010 stable reason codes | Yes | T009, T016, T019, T042-T045 | Covered by shared types and refusal paths. |
| FR-011 scoped review reads | Yes | T025, T029 | Covered by review tests and implementation. |
| FR-012 provider/model allowlists | Yes | T040, T043 | Covered by supply-chain tests and manifest enforcement. |
| FR-013 cost ceilings | Yes | T039, T042, T044 | Covered by cost-control tests and invocation integration. |
| FR-014 usage metadata risk evidence | Yes | T041, T045 | Covered by usage-metadata tests and implementation. |
| FR-015 prompt/rubric separation | Yes | T023, T026, T033, T036 | Covered by prompt registry and renderer validation. |
| FR-016 prompt variable contracts | Yes | T033, T036 | Covered by renderer tests and implementation. |
| FR-017 sentinel preservation | Yes | T033, T036 | Covered by renderer tests and implementation. |
| FR-018 direct provider verification gates | Yes | T012, T013 | Covered by import-boundary tests and scanner. |
| FR-019 F13/F14 consume refs without publication rights | Yes | T009, T029, T030, T038, T046 | Covered by typed surfaces and scoped review/export tasks. |
| FR-020 feature boundaries | Yes | T047, T048, T052, T053 | Covered by docs and review tasks. |
| SC-001 accepted invocation evidence | Yes | T017, T020, T021 | Covered by invocation audit evidence. |
| SC-002 missing refs refused | Yes | T016, T019 | Covered by preflight tests and implementation. |
| SC-003 immutable publication | Yes | T023, T024, T026-T028 | Covered by registry tests and implementation. |
| SC-004 frozen refs after newer versions | Yes | T032, T035 | Covered by no-hot-reload tests and helpers. |
| SC-005 cost/supply-chain refusals | Yes | T039-T045 | Covered by US4. |
| SC-006 scoped reconstruction | Yes | T025, T029 | Covered by review tasks. |
| SC-007 direct invocation detection | Yes | T012, T013 | Covered by import boundary. |
| SC-008 final verification | Yes | T049, T050, T054 | Covered by staged run and final commands. |

## Constitution Alignment Issues

None. F12 includes the required Article I/I.C/II threat model and keeps `/security-review` mandatory before closure.

## Unmapped Tasks

None after rewording T008.

## Metrics

- Total Requirements: 28 buildable requirements and success criteria
- Total Tasks: 55
- Coverage: 100%
- Ambiguity Count: 0 after T008 reword
- Duplication Count: 0
- Critical Issues Count: 0

## Next Actions

Proceed to `/speckit-implement`. Keep T052 `/code-review` and T053 `/security-review` as closure gates before publishing F12.
