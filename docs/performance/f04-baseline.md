# F04 Performance Baseline

**Owner:** F04 (Ticket store + state machines) · **Version:** 1.0 · **Date:** 2026-05-19

This document records the F04 baseline for ticket-store hot paths. It
combines the 10k-row T030 benchmark with the B8 staged dev-run.

Both captures used the configured dev Neon database. Seed data was
inserted inside a transaction and rolled back after measurement.

## Source Runs

| Source | Timestamp | Scope |
| --- | --- | --- |
| `.specify/specs/04-ticket-store-state-machines/f04-t030-benchmark-2026-05-18.md` | 2026-05-18T23:59:32.629Z | 10,000 seeker rows, 10,000 employer-req rows, 10,000 match rows |
| `.specify/specs/04-ticket-store-state-machines/quickstart-run-2026-05-19.md` | 2026-05-19T13:04:47.139Z | 100 seeker tickets, 100 employer requisitions, 50 matches, 25 delivered |

## Baseline Latencies

| Operation | Source | Samples | p50 ms | p90 ms | p99 ms | p90 target ms | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| fetch-by-id | T030 10k benchmark | 250 | 37.43 | 43.48 | 48.53 | 50 | PASS |
| list-by-state | T030 10k benchmark | 100 | 44.76 | 51.34 | 72.25 | 200 | PASS |
| match-create | T030 10k benchmark | 100 | 36.23 | 40.37 | 45.75 | 500 | PASS |
| match-create | B8 staged dev-run | 100 | 35.36 | 38.78 | 43.77 | 500 | PASS |
| audit-emission | B8 staged dev-run | 304 | 35.66 | 41.49 | 46.49 | 200 | PASS |
| match-advance | B8 staged dev-run | 55 | 35.79 | 42.07 | 277.40 | 500 | PASS |
| seeker-submit | B8 staged dev-run | 101 | 35.69 | 42.66 | 51.24 | 500 | PASS |
| employer-submit | B8 staged dev-run | 102 | 35.69 | 43.43 | 47.87 | 500 | PASS |
| audit/read checks | B8 staged dev-run | 4 | 40.42 | 81.89 | 81.89 | 200 | PASS |

## Acceptance Summary

- `fetch-by-id` p90 is 43.48 ms against the 50 ms target.
- `list-by-state` p90 is 51.34 ms against the 200 ms target.
- `match-create` p90 is 40.37 ms in the 10k benchmark and 38.78 ms in
  the staged dev-run, both against the 500 ms target.
- `audit-emission` p90 is 41.49 ms against the 200 ms target.
- The staged dev-run audited 100 recent payloads and found 0 PII
  findings.
- The staged dev-run produced 25 `match_ticket.delivered` events.

## Notes

- The B8 staged run is a workflow validation run, not a 10k-row
  capacity benchmark. Use the T030 capture for 10k-row read-path
  baselines.
- `match-advance` p99 was 277.40 ms while p90 remained 42.07 ms. This
  is within the current target and should be watched in future F08/F09
  integrations.
- F09 remains the dedicated field-level privacy projection layer for
  cross-side views. F04 validates that audit payloads do not leak raw
  PII.

