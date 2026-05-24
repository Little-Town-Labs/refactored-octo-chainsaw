# F19 Quickstart Run Evidence

**Date**: 2026-05-23
**Branch**: `019-web-chat-channel`
**Package**: `@spyglass/web-chat-channel`

## Commands

```bash
pnpm --filter @spyglass/web-chat-channel test
pnpm --filter @spyglass/web-chat-channel type-check
pnpm --filter @spyglass/web-chat-channel lint
pnpm --filter @spyglass/web-chat-channel build
pnpm --filter @spyglass/web-chat-channel dev-run:f19
```

The staged dev run required elevated execution because `tsx` IPC failed inside the sandbox with `listen EPERM` under `/tmp/tsx-*`.

## Results

- Package tests: PASS, 10 suites, 15 tests.
- Type check: PASS.
- Lint: PASS.
- Build: PASS.
- Staged dev run: PASS.

## Staged Evidence

```json
{
  "authenticated_normalized": true,
  "pending_link_normalized": true,
  "duplicate_suppressed": true,
  "unauthenticated_refused": true,
  "rendered": true,
  "accessibility_validated": true,
  "delivery_status": "delivered",
  "unsupported_refused": true,
  "conformance_passed": true
}
```
