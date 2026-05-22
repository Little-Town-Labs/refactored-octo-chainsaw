# F15 Quickstart Run Evidence - 2026-05-22

## Commands

| Command | Result |
|---------|--------|
| `pnpm --filter @spyglass/parley test` | PASS: 20 test suites, 32 tests |
| `pnpm --filter @spyglass/parley type-check` | PASS |
| `pnpm --filter @spyglass/parley lint` | PASS |
| `pnpm --filter @spyglass/parley build` | PASS |
| `pnpm --filter @spyglass/parley dev-run:f15` | PASS |

## Staged Dev-run Evidence

```json
{
  "accepted": {
    "decision": "allow",
    "reason_code": "renegotiation_allowed",
    "run_id_distinct_from_prior": true,
    "same_match_ticket": true,
    "attempt": 2,
    "isolation": {
      "prompt_history_entries": 0,
      "tool_call_entries": 0,
      "seeker_scratch_entries": 0,
      "employer_scratch_entries": 0,
      "prior_context_rehydrated": false,
      "allowed_reference_types": [
        "match_ticket_fact",
        "prior_run_id",
        "prior_dossier_id",
        "contract_ref",
        "rubric_ref",
        "prompt_ref",
        "model_ref",
        "runtime_ref"
      ]
    },
    "projection": {
      "match_ticket_id": "00000000-0000-7000-8000-000000001502",
      "attempt": 2,
      "decision": "allow",
      "reason_code": "renegotiation_allowed",
      "run_id": "00000000-0000-7000-8000-000000001501",
      "hidden_run_state_exposed": false,
      "non_cleared_side_notified": false
    }
  },
  "duplicate": {
    "decision": "idempotent_replay",
    "reason_code": "duplicate_request",
    "run_count": 1
  },
  "refusals": {
    "cap": "round_cap_exhausted",
    "unauthorized": "unauthorized_requester",
    "cost": "cost_ceiling_exceeded"
  },
  "runtime_cost": {
    "status": "terminated",
    "terminal_reason": "cost_ceiling_exceeded",
    "alarm_type": "cost_ceiling_exceeded"
  }
}
```

## Success Criteria Mapping

- SC-001: Accepted scenario shows `run_id_distinct_from_prior: true`.
- SC-002: Isolation counters are all zero and `prior_context_rehydrated` is false.
- SC-003: Duplicate scenario returns `idempotent_replay` and `run_count: 1`.
- SC-004: Cap scenario returns `round_cap_exhausted`.
- SC-005: Cost scenarios return and terminate with `cost_ceiling_exceeded` plus alarm evidence.
- SC-006: Unauthorized scenario returns `unauthorized_requester` without allocation.
- SC-007: Dev-run demonstrates accepted fresh run plus cap, unauthorized, and cost refusal paths.
