# Quickstart: F07a Agent Contract Registry

## Prerequisites

- Dependencies installed with `pnpm install`.
- Existing F05/F06 packages compile.
- Local test database configuration available when running migration smoke tests.

## Scenario 1 - Publish And Resolve A Contract

1. Create a reviewed seeker contract version with prompt template, rubric, tool-surface, model, and runtime refs.
2. Publish it with `contract.publish` scope and reviewer metadata.
3. Resolve `(contract_id, version)` for dispatch.
4. Verify the resolution decision is `allow` with reason `contract_resolved`.
5. Verify publication wrote a canonical audit event.

Expected result: PASS.

## Scenario 2 - Reject Immutable Version Mutation

1. Publish a contract version.
2. Attempt to publish the same `(contract_id, version)` with different immutable material.
3. Verify the operation fails with `contract_version_mutation_error`.
4. Verify the original row still resolves unchanged.

Expected result: PASS.

## Scenario 3 - Fail Closed On Missing Dependency

1. Seed a contract whose rubric dependency checker returns unavailable.
2. Resolve the contract for dispatch.
3. Verify dispatch is denied with `rubric_unresolvable`.
4. Verify unrelated valid contracts still resolve.

Expected result: PASS.

## Scenario 4 - Runtime Ceiling Clamp

1. Seed a contract with `max_rounds` above the harness ceiling.
2. Resolve the contract with ceiling `{max_rounds: 3}`.
3. Verify the original contract remains unchanged.
4. Verify the resolution returns effective settings and a clamp record.

Expected result: PASS.

## Scenario 5 - Scoped Review Reads

1. Query contract history with `contract.read`.
2. Verify bounded results include contract refs, status, provenance, and audit event ids.
3. Query without the scope.
4. Verify access is denied.

Expected result: PASS.

## Verification Commands

```bash
pnpm --filter @spyglass/agent-contracts test
pnpm --filter @spyglass/agent-contracts type-check
pnpm --filter @spyglass/agent-contracts lint
pnpm schema:lint
pnpm --filter @spyglass/agent-contracts dev-run:f07a
```
