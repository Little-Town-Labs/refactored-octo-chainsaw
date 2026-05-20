# Tool Surface & Dispatcher Runbook

## Scope

F08.5 owns immutable tool descriptor versions, immutable tool surface versions, contract-pinned advertisement, dispatcher-only invocation, disclosure-class routing, unsupported-tool continuation, and scoped review reads.

It does not own the full Parley runner, the F09 privacy filter implementation, or production business tool adapters.

## Publish Procedure

1. Publish descriptor versions with `name`, `version`, input/output schemas, disclosure class, adapter ref, content hash, and audit evidence.
2. Publish a tool surface version that references only published descriptors.
3. Pin the surface from an F07a contract through `tool_surface_ref`.
4. Never mutate an existing descriptor or surface version. Publish a new version for any semantic change.

## Dispatch Procedure

1. Resolve the F07a contract.
2. Resolve its pinned `tool_surface_ref`.
3. Build the advertised descriptor list from that exact surface version.
4. Invoke tools only through `@spyglass/tool-dispatcher`.
5. Treat unsupported tools as `tool_unsupported` and continue the turn.

## Disclosure Routing

- `principal_self`: return output only to the invoking side.
- `platform_open`: output may be reused by either side.
- `counterparty_filtered`: route through the F09 privacy-filter port; fail closed while the port is unavailable.

## Review Procedure

Scoped reviewers with `tool_surface.read` may inspect catalog versions, dispatch outcomes, disclosure-routing evidence, unsupported-tool outcomes, and dispatcher-bypass findings. Review reads must not expose raw sensitive payloads by default.

## Rollback Procedure

Catalog rows are immutable. To remove a tool from new dispatch:

1. Deprecate the affected surface version.
2. Publish a replacement surface version without the tool.
3. Publish a replacement F07a contract version that pins the replacement surface.
4. Preserve historical reads for existing runs.
