# Security Review: F08.5 Tool Surface & Dispatcher

**Date**: 2026-05-20
**Result**: Pass

## Findings

No blocking security findings.

## Security Checks

- Dispatcher-only invocation is enforced with an import-boundary guard and a failing-fixture test.
- Tool invocation checks principal scope, contract-pinned advertisement, input schema, output schema, and per-turn call limits before returning success.
- Unsupported tools return `tool_unsupported` and remain continue-capable instead of silently failing or terminating a run.
- `counterparty_filtered` outputs fail closed while the F09 privacy-filter implementation is unavailable.
- Review reads require `tool_surface.read` and avoid raw sensitive payload exposure by default.

## Verification

- `pnpm --filter @spyglass/tool-dispatcher boundary:check`
- `pnpm --filter @spyglass/tool-dispatcher test`
- `pnpm --filter @spyglass/tool-dispatcher type-check`
- `pnpm --filter @spyglass/tool-dispatcher lint`
- `pnpm schema:lint`
