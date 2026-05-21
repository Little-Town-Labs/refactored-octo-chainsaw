# F08 Security Review

**Date**: 2026-05-21

## Findings

No blocking security findings.

## Review Notes

- No filesystem workspace is introduced; contexts are in-memory and released on terminal transition.
- Counterparty view mutation requires a privacy projection ref.
- Tool descriptors with "ask principal", "wait for human confirmation", "human approval", or equivalent pause semantics are refused before dispatch.
- Side-runner prompt assembly accepts projected views, not raw counterparty principal records.
- F08 uses F09 no-gateway and boundary checks rather than adding any model invocation inside privacy filtering.
- The staged run signs and verifies the produced dossier through F10 helpers.

## Test Evidence

- `pnpm --filter @spyglass/privacy-filter test`
- `pnpm --filter @spyglass/privacy-filter reachability:check`
- `pnpm --filter @spyglass/privacy-filter boundary:check`
- `pnpm --filter @spyglass/tool-dispatcher boundary:check`
- `pnpm --filter @spyglass/dossiers test`

**Result**: Pass.
