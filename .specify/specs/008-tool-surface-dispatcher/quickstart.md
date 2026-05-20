# Quickstart: F08.5 Tool Surface & Dispatcher

## Purpose

Validate the F08.5 slice from catalog publication through contract-pinned resolution, dispatcher invocation, unsupported-tool continuation, disclosure routing, direct-call guard evidence, and scoped review reads.

## Prerequisites

- F07a and F07b are merged to `main`.
- Dependencies are installed with `pnpm install`.
- The workspace can run package tests, type-check, lint, schema-lint, and the staged F08.5 script.

## Staged Run

1. Create a published descriptor `lookup_profile@1.0.0` with `principal_self`.
2. Create a published descriptor `summarize_counterparty_context@1.0.0` with `counterparty_filtered`.
3. Create a published descriptor `read_public_policy@1.0.0` with `platform_open`.
4. Publish `seeker-tools@1.0.0` containing those descriptor refs.
5. Resolve an F07a contract pinned to `seeker-tools@1.0.0`.
6. Invoke `lookup_profile@1.0.0` through the dispatcher and verify an `ok` result.
7. Invoke a non-advertised tool and verify `tool_unsupported` with continuation evidence.
8. Invoke `summarize_counterparty_context@1.0.0` and verify raw output is not counterparty-visible without the privacy-filter boundary.
9. Run the direct-call bypass fixture and verify the guard fails only the expected fixture.
10. Read catalog and dispatch evidence through scoped review APIs.

## Expected Commands

```bash
pnpm --filter @spyglass/tool-dispatcher test
pnpm --filter @spyglass/tool-dispatcher type-check
pnpm --filter @spyglass/tool-dispatcher lint
pnpm --filter @spyglass/tool-dispatcher dev-run:f08-5
pnpm schema:lint
```

## Expected Evidence

- `seeker-tools@1.0.0` resolves to the same descriptor list on repeated runs.
- Newer catalog versions do not alter the pinned F07a contract advertisement.
- Unsupported calls return `tool_unsupported` and the turn is marked continue-capable.
- `counterparty_filtered` output is routed to the privacy-filter boundary or fails closed.
- Direct adapter/SDK/tRPC access from side-runner source is rejected by the guard.
- Scoped review reads include catalog refs, descriptor refs, reason codes, audit ids, and routing decisions without raw sensitive payloads.
