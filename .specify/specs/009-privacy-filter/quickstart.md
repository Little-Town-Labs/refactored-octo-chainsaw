# Quickstart: F09 Privacy Filter

## Purpose

Validate F09 from immutable ruleset publication through sentinel wrapping, deterministic filtering, F08.5 `counterparty_filtered` handling, no-gateway reachability, counterparty-access guards, and scoped review reads.

## Prerequisites

- F08.5 is merged and `@spyglass/tool-dispatcher` is available.
- Dependencies are installed with `pnpm install`.
- The workspace can run package tests, type-check, lint, schema-lint, and the staged F09 script.

## Staged Run

1. Publish `default-seeker-to-employer@1.0.0` with stages `intro_guarded` and `post_intro`.
2. Wrap seeker resume text with a per-run nonce and the `seeker_resume` input class.
3. Validate the wrapped text and verify forged sentinel payloads fail closed.
4. Filter seeker-to-employer content and verify contact details are redacted.
5. Filter employer-to-seeker content and verify employer confidential notes are redacted or refused.
6. Send an F08.5-style `counterparty_filtered` tool output to the privacy-filter port and verify a filtered view ref is returned.
7. Run the no-gateway-reachability guard.
8. Run the counterparty-access boundary guard.
9. Read ruleset and decision evidence through scoped review APIs.

## Expected Commands

```bash
pnpm --filter @spyglass/privacy-filter test
pnpm --filter @spyglass/privacy-filter type-check
pnpm --filter @spyglass/privacy-filter lint
pnpm --filter @spyglass/privacy-filter build
pnpm --filter @spyglass/privacy-filter dev-run:f09
pnpm --filter @spyglass/privacy-filter reachability:check
pnpm --filter @spyglass/privacy-filter boundary:check
pnpm schema:lint
```

## Expected Evidence

- No model gateway import is reachable from `@spyglass/privacy-filter`.
- Sentinel injection attempts return `sentinel_injection_detected`.
- Counterparty access bypass fixtures are detected by the guard.
- F08.5 `counterparty_filtered` output returns a filtered view ref and never raw counterparty output.
- Scoped review reads include ruleset refs, decisions, redaction counts, reason codes, and audit ids without raw sensitive payloads.
