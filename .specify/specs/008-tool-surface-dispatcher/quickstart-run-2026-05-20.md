# F08.5 Quickstart Run Evidence

**Date**: 2026-05-20
**Branch**: `008-tool-surface-dispatcher`
**Command**: `pnpm --filter @spyglass/tool-dispatcher dev-run:f08-5`

## Result

Passed.

```json
{
  "surface": {
    "id": "seeker-tools",
    "version": "1.0.0"
  },
  "descriptors": 3,
  "supported": "ok",
  "unsupported": "tool_unsupported",
  "filtered": "filtered_pending",
  "dispatch_events": 3,
  "routing_events": 2
}
```

## Notes

- The staged run published three descriptors and one `seeker-tools@1.0.0` surface.
- Supported dispatch returned `ok`.
- Unsupported dispatch returned `tool_unsupported` and remained continue-capable.
- `counterparty_filtered` output failed closed with `filtered_pending` because F09 is not implemented yet.
