# F06 quickstart run

Generated: 2026-05-20T12:42:29.778Z

| Scenario | Evidence | Result |
| --- | --- | --- |
| Scenario 1 - Allow Supported Jurisdictions | `decision=allow`<br>`reason_code=all_allowed`<br>`audit_event_id=8650cba0-0009-417c-af3b-a7f5cc7b9c8e` | PASS |
| Scenario 2 - Fail Safe On Missing Or Unknown Jurisdiction | `missing=deny:missing_jurisdiction`<br>`unknown=deny:unknown_jurisdiction`<br>`both paths persisted structured decision and audit evidence` | PASS |
| Scenario 3 - Deny Unsupported Or Disabled Jurisdiction | `unsupported_artifact=jurisdiction-failure:2da256d3-decc-4978-af09-811e34e027b9`<br>`disabled_artifact=jurisdiction-failure:6acf5831-ce82-499c-8726-f337fdf4a242` | PASS |
| Scenario 4 - Flip Kill Switch Without Deploy | `before=allow:all_allowed`<br>`after=deny:disabled_jurisdiction`<br>`kill_switch_event_id=9bb6aee6-5804-4fd8-9d73-bdb79d9f5899`<br>`operator_principal_id=11111111-1111-4111-8111-111111111111`<br>`audit_event_id=4ddc7e8e-d540-4e13-a05d-26f8d6441196` | PASS |
| Scenario 5 - Deny Unauthorized Kill-Switch Mutation | `denied=PolicyScopeRequiredError`<br>`posture_unchanged=US-KS:allowed`<br>`denial audit is deferred to authenticated request-surface integration` | PASS |
| Scenario 6 - Scoped Review Reads | `unscoped_read_denied=PolicyScopeRequiredError`<br>`active_posture_rows=2`<br>`history_rows=1`<br>`history_fields=gate_decision_id,subject_kind,subject_id,decision,reason_code,jurisdiction_codes,policy_version,policy_revision_ids,correlation_id,principal_id,audit_event_id,created_at` | PASS |

## Summary

- scenarios: 6
- canonical_audit_events: 6
- storage: memory-backed staged run; no Neon rows were mutated
- rollback: not required because no persistent database writes were performed

Command:

```sh
pnpm --filter @spyglass/policy-gates dev-run:f06
```
