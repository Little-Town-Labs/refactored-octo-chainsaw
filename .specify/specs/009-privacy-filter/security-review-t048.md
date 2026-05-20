# Security Review: F09 Privacy Filter

**Date**: 2026-05-20

## Findings

No blocking security findings found.

## Controls Verified

- No-model reachability guard passes for privacy-filter source.
- Sentinel validation fails closed for missing, duplicated, mismatched, and forged active closing sentinels.
- Counterparty access boundary guard passes for side-runner scan target and detects raw counterparty access fixtures.
- Filter decisions store hashes, refs, reason codes, and redaction counts, not raw sensitive payloads by default.
- Unscoped review reads are denied.

## Follow-Up

When F08 side-runner files land, add them to the default boundary scan target if they move outside `packages/parley/src`.
