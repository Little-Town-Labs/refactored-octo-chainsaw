# F13 Quickstart Run

Date: 2026-05-21T18:38:49.351Z

## Evidence

- accepted_turn_invocation: 74c88142-9115-4f6a-9099-2a7b19e0e953
- accepted_scoring_invocation: 5c3808b3-a987-4aae-a8f1-3e54dd8244f8
- score_dimensions: role_fit, constraints_fit
- privacy_attack_refusal: unfiltered_counterparty_data
- eval_cases: 7
- eval_passed: true

## Verification

- `pnpm --filter @spyglass/agents test` — pass, 5 suites / 17 tests
- `pnpm --filter @spyglass/agents type-check` — pass
- `pnpm --filter @spyglass/agents lint` — pass
- `pnpm --filter @spyglass/agents build` — pass
- `pnpm --filter @spyglass/agents dev-run:f13` — pass with elevated execution due sandbox `tsx` IPC `EPERM`
- `pnpm schema:lint` — pass, 21 tables checked / 0 violations
- `pnpm exec prettier --check AGENTS.md .specify/roadmap.md .specify/specs/013-seeker-advocate packages/agents docs/runbooks/seeker-advocate.md docs/data-governance/data-classification.yaml` — pass
- `git diff --check` — pass
