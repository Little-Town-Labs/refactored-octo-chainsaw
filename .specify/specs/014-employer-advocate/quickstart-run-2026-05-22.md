# F14 Quickstart Run

Date: 2026-05-22T12:12:29.792Z

## Evidence

- accepted_turn_invocation: ac59dfaa-18bb-4023-98bd-63ed3da8e0a1
- accepted_scoring_invocation: b45895ff-4e0a-415d-b60c-a1b3e8e3d773
- score_dimensions: skills_fit, role_constraints_fit
- privacy_attack_refusal: unfiltered_counterparty_data
- protected_class_refusal: protected_class_boundary_refused
- eval_cases: 9
- eval_passed: true

## Verification Commands

- `pnpm --filter @spyglass/agents test` — passed, 23 suites / 45 tests.
- `pnpm --filter @spyglass/agents type-check` — passed.
- `pnpm --filter @spyglass/agents lint` — passed.
- `pnpm --filter @spyglass/agents build` — passed.
- `pnpm --filter @spyglass/agents dev-run:f14` — passed, 9 eval cases.
