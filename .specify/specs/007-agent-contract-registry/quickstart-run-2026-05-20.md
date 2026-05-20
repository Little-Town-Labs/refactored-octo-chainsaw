# F07a quickstart run

Generated: 2026-05-20T16:06:03.390Z

| Scenario | Evidence | Result |
| --- | --- | --- |
| Scenario 1 - Publish And Resolve A Contract | `contract=seeker.standard@1.0.0`<br>`status=published`<br>`event=published:initial_launch`<br>`audit_event_id=e26d0b2c-15e3-42d5-862d-29079a247615`<br>`resolution=allow:contract_resolved` | PASS |
| Scenario 2 - Reject Immutable Version Mutation | `rejected=ContractVersionMutationError`<br>`stored_model=gpt-5.4-mini`<br>`stored_hash=9a2c414a2baa63db47d92ed11160f5c70cc23f86b39da79ad5cf313f4b266290` | PASS |
| Scenario 3 - Fail Closed On Missing Dependencies | `prompt=deny:prompt_template_unresolvable`<br>`rubric=deny:rubric_missing_bias_test`<br>`tool=deny:tool_version_unavailable`<br>`model=deny:model_unavailable` | PASS |
| Scenario 4 - Runtime Ceiling Clamp | `effective={"max_rounds":3,"timeout_ms":10000,"max_tool_calls_per_turn":2}`<br>`clamps=max_rounds:4->3,timeout_ms:30000->10000,max_tool_calls_per_turn:4->2`<br>`stored_max_rounds=4` | PASS |
| Scenario 5 - Scoped Review Reads | `unscoped_read_denied=ContractScopeRequiredError`<br>`version_rows=1`<br>`event_rows=1`<br>`version_fields=agent_contract_version_id,contract_id,version,side,status,prompt_template_ref,rubric_ref,tool_surface_ref,model_ref,runtime_settings,extension_fields,content_hash,description,author_principal_id,reviewer_principal_id,published_at,deprecated_after,audit_event_id,created_at` | PASS |
| Scenario 6 - Deprecate A Contract | `status=deprecated`<br>`deprecated_after=2026-05-21T00:00:00.000Z`<br>`event=deprecated:compliance_deprecation`<br>`audit_event_id=bc06568a-d864-424d-9f9d-b0b3533cf888`<br>`post_cutoff_resolution=deny:contract_deprecated` | PASS |

## Summary

- scenarios: 6
- canonical_audit_events: 2
- storage: memory-backed staged run; no Neon rows were mutated
- rollback: not required because no persistent database writes were performed

Command:

```sh
pnpm --filter @spyglass/agent-contracts dev-run:f07a
```
