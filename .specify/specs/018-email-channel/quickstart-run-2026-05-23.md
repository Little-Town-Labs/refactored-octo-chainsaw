# Quickstart Run: Email Channel Adapter

**Date:** 2026-05-23
**Branch:** `018-email-channel`
**Package:** `@spyglass/email-channel`

## Commands

```bash
pnpm --filter @spyglass/email-channel test
pnpm --filter @spyglass/email-channel type-check
pnpm --filter @spyglass/email-channel lint
pnpm --filter @spyglass/email-channel build
pnpm --filter @spyglass/email-channel dev-run:f18
```

## Results

- `test`: passed — 9 suites, 32 tests
- `type-check`: passed
- `lint`: passed
- `build`: passed
- `dev-run:f18`: passed after rerunning outside the sandbox because `tsx` IPC pipe creation under `/tmp/tsx-*` hit the known sandbox `EPERM`

## Staged Dev Run Output

```json
{
  "feature": "F18 Email channel adapter",
  "checks": 8,
  "verified_message": "chanmsg_inbound_email_thread-email-spyglass-reply-abc-m-root-example-com_email-resend-evt-run-1-m-1-example-com-spyglass-reply-abc-example-spyglass-test-thread-email-spy",
  "pending_message": "chanmsg_inbound_email_thread-email-verify-abc-m-verify-root-example-com_email-resend-evt-verify-m-verify-example-com-verify-abc-example-spyglass-test-thread-email-verif",
  "duplicate_reason": "duplicate_suppressed",
  "delivery_statuses": [
    "terminal_failure",
    "terminal_failure"
  ]
}
```
