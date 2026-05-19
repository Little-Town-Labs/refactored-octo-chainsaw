# F05 quickstart run

Generated: 2026-05-19T19:33:09.712Z

## T009 audit-chain performance baseline

- events_seeded: 10000
- verification_ms: 31.74
- threshold_ms: 30000
- chain_status: valid
- result: PASS

Command:

```sh
pnpm --filter @spyglass/audit-log bench:f05-chain -- --out=.specify/specs/05-audit-log-tombstone/quickstart-run-2026-05-19.md
```

## T016 transcript append benchmark

- turns_appended: 500
- p90_append_ms: 0.07
- threshold_ms: 200
- linked_audit_events: 500
- result: PASS

Command:

```sh
pnpm --filter @spyglass/audit-log bench:f05-transcript -- --out=.specify/specs/05-audit-log-tombstone/quickstart-run-2026-05-19.md
```

## T024 quickstart scenarios

Executed: 2026-05-19T19:33:30Z

| Scenario | Evidence | Result |
| --- | --- | --- |
| Scenario 1 — Replay F02/F04 buffer events | `packages/audit-log/src/__tests__/replay.test.ts` covers exact-once replay and retry idempotency. | PASS |
| Scenario 2 — Detect audit tampering | `packages/audit-log/src/__tests__/hash-chain.test.ts` covers mutation detection and first invalid event reporting. | PASS |
| Scenario 3 — Append transcript turns | `packages/audit-log/src/__tests__/transcripts.test.ts` covers append ordering, duplicate denial, read scope denial, and linked audit events. | PASS |
| Scenario 4 — Tombstone audit and transcript evidence | `packages/audit-log/src/__tests__/tombstone.test.ts` covers audit/transcript tombstone execution, denial paths, denial audit events, operator-scope denial, tombstone evidence, and preserved chain verification material. | PASS |
| Scenario 5 — Deny unauthorized evidence access | `packages/audit-log/src/__tests__/export.test.ts` covers unscoped audit read, transcript read, and export denial. | PASS |
| Scenario 6 — Evidence export for review | `packages/audit-log/src/__tests__/export.test.ts` covers scoped export creation, deterministic manifest hash, event ids, transcript ids, tombstone markers, and chain status. | PASS |

Commands:

```sh
pnpm --filter @spyglass/audit-log test
pnpm --filter @spyglass/audit-log type-check
pnpm --filter @spyglass/audit-log lint
pnpm schema:lint
```

Results:

- audit-log tests: 6 suites passed, 24 tests passed
- audit-log type-check: PASS
- audit-log lint: PASS
- schema-lint: 13 tables checked, 0 violations
