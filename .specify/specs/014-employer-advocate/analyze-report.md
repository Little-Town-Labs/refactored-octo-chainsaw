# F14 Specification Analysis Report

## Findings

| ID | Category | Severity | Location(s) | Summary | Recommendation |
| --- | --- | --- | --- | --- | --- |
| G1 | Coverage | LOW | `tasks.md:T064` | The task ledger includes a closure task to save `/speckit-analyze` findings; this report satisfies it. | Keep the closure artifact for traceability. |

## Coverage Summary

| Requirement Key | Has Task? | Task IDs | Notes |
| --- | --- | --- | --- |
| FR-001 employer turn capability | Yes | T013-T022 | Turn tests and driver implementation |
| FR-002 employer scoring capability | Yes | T023-T034 | Scoring tests and driver implementation |
| FR-003 frozen refs/no hot reload | Yes | T014, T018, T019, T020 | Frozen refs included in outputs |
| FR-004 missing/invalid refs and bias gate | Yes | T015, T018, T027, T031 | Refusal paths covered |
| FR-005 governed AI path only | Yes | T009, T019, T059, T063 | F12 invocation plus import-boundary tests |
| FR-006 run-to-completion | Yes | T039, T044 | Human-pause refusals |
| FR-007 policy outside prompts | Yes | T025, T029, T030 | Decision and score validation outside prompt |
| FR-008 reject holistic/decision/protected-class content | Yes | T025, T030, T036, T041 | Explicit refusal/ignore paths |
| FR-009 score validation | Yes | T024, T029 | Dimension/range validation |
| FR-010 principal/filter/tool boundary | Yes | T035, T038, T040, T043 | Projection and tool guards |
| FR-011 raw data/prior context unsupported | Yes | T035, T037, T040, T042 | Refusal paths covered |
| FR-012 untrusted-input boundaries | Yes | T048, T052, T058 | Eval and threat-model evidence |
| FR-013 audit-ready evidence | Yes | T020, T033, T054, T063 | Invocation/audit refs and quickstart evidence |
| FR-014 version refs in evidence | Yes | T020, T033, T063 | Frozen refs in outputs |
| FR-015 budget controls | Yes | T049, T063 | Eval/refusal evidence |
| FR-016 local failures | Yes | T021, T033, T049 | Bounded refusals |
| FR-017 reviewer evidence | Yes | T054, T056, T057, T063 | Quickstart/runbook/classification evidence |
| FR-018 eval baseline | Yes | T046-T055, T063 | 9-case F14 baseline |
| FR-019 stable reason codes | Yes | T006, T021, T045 | Employer reason-code exports |
| FR-020 F14 scope boundary | Yes | T002, T057, T067 | README/runbook/roadmap boundaries |
| SC-001 refs present | Yes | T020, T033, T063 | Output/evidence validation |
| SC-002 exact score coverage | Yes | T024, T029 | Dimension validation tests |
| SC-003 no direct providers | Yes | T009, T059 | Import-boundary test |
| SC-004 eval evidence | Yes | T046-T055, T063 | Eval runner and evidence file |
| SC-005 safety eval cases | Yes | T048, T049, T063 | Privacy/injection/tool/bias/protected/budget cases |
| SC-006 budget breach handling | Yes | T049, T063 | Budget refusal eval |
| SC-007 deterministic fixtures | Yes | T007, T050-T052 | Fixture/eval runner paths |
| SC-008 unrelated run isolation | Yes | T037, T042 | Prior-run context refusal |

## Constitution Alignment Issues

None found. F14 maintains privacy filter mediation, signed/frozen AI refs, regulated rubric boundaries, agent-native schemas, and required threat-model/security review evidence.

## Unmapped Tasks

None. Polish tasks map to closure, documentation, or governance evidence.

## Metrics

- Total requirements checked: 28
- Total tasks: 67
- Coverage: 100%
- Ambiguity count: 0
- Duplication count: 0
- Critical issues count: 0
- High issues count: 0
