# F04 B8 Quickstart + Staged Dev-Run

Run timestamp: 2026-05-19T13:04:47.139Z
Run id: 32f5e3b1-86f9-42ec-9fc6-52ff1ce43fc7

## Scope

- T041 quickstart scenarios: 11/11 captured
- T042 staged run: 100 seeker tickets, 100 employer requisitions, 50 matches, 25 delivered
- Data handling: all rows inserted inside a transaction and rolled back after capture

## Scenario Results

| Scenario | Result | Evidence |
|---:|---|---|
| 1. Submit a seeker intent | PASS | 100 seeker_tickets inserted; first identifier ST-2026-70001<br>submitted audit payloads include only ticket metadata and state names |
| 2. Open an employer requisition | PASS | 100 employer_req_tickets inserted for org 019e4056-5c02-75ea-b31c-926d771b31bb<br>submitted audit payloads include no raw employer content beyond ticket metadata |
| 3. Create a match ticket atomically | PASS | 50 match_tickets inserted<br>match_ticket.created audit events emitted |
| 4. Idempotency on match creation | PASS | duplicate pair+attempt probe returned existing row count 1; no duplicate inserted |
| 5. Operator transition with reason_code | PASS | operator closed seeker ST-2026-70100 with reason_code=stale<br>negative check: {"missing_reason_code_rejected":true} |
| 6. Seeker withdrawal during active negotiation | PASS | seeker_ticket.withdrawn and match_ticket.rejected share seeker correlation id |
| 7. Parley harness advances a match | PASS | 25 matches advanced through delivered with non-null dossier_id |
| 8. Re-negotiation increments attempt | PASS | renegotiation reset dossier_id/round and assigned a new run_id |
| 9. Audit trail retrieval | PASS | 4 audit events retrieved in created_at order for MT-2026-70025<br>PII findings: 0 |
| 10. Cross-side leakage prevention | PASS_WITH_NOTE | service read returned 1 exact match row<br>audit sample PII findings: 0<br>F09 projection filtering remains the dedicated field-level privacy layer |
| 11. Year-rollover identifier sequence | PASS_WITH_NOTE | 0/3 next-year sequences already present in dev DB<br>bootstrap behavior is covered by packages/tickets rollover tests; scheduler firing is outside this DB rollback run |

## Staged Run Details

- seeker_principal_id: 019e4056-5c4f-7efb-b8b0-3ca90cb644dc
- employer_principal_id: 019e4056-5c50-796b-b63f-aa84d756e486
- operator_principal_id: 019e4056-5c50-7ca7-9173-d5bce8c60e7e
- service_principal_id: 019e4056-5c50-76b0-9723-45dec5497f22
- org_id: 019e4056-5c02-75ea-b31c-926d771b31bb
- delivered_event_count: 25
- audit_payload_sample_size: 100
- audit_payload_pii_findings: 0
- transaction_mode: ROLLBACK after capture

## Latencies

| Operation | Samples | p50 ms | p90 ms | p99 ms | p90 threshold ms | Result |
|---|---:|---:|---:|---:|---:|---|
| seeker-submit | 101 | 35.69 | 42.66 | 51.24 | 500 | PASS |
| employer-submit | 102 | 35.69 | 43.43 | 47.87 | 500 | PASS |
| match-create | 100 | 35.36 | 38.78 | 43.77 | 500 | PASS |
| match-advance | 55 | 35.79 | 42.07 | 277.40 | 500 | PASS |
| audit-emission | 304 | 35.66 | 41.49 | 46.49 | 200 | PASS |
| audit/read checks | 4 | 40.42 | 81.89 | 81.89 | 200 | PASS |

