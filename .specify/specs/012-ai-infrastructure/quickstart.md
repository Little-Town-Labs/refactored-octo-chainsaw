# Quickstart: F12 AI Infrastructure

## Purpose

Validate that F12 can publish immutable prompt/model versions, create and verify a signed runtime manifest, render a prompt through a variable contract, enforce cost and allowlist controls, invoke a deterministic fake gateway adapter, and reconstruct AI runtime evidence through scoped review reads.

## Commands

```bash
pnpm --filter @spyglass/ai test
pnpm --filter @spyglass/ai type-check
pnpm --filter @spyglass/ai lint
pnpm --filter @spyglass/ai build
pnpm --filter @spyglass/ai dev-run:f12
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Expected staged run

1. Publish a seeker-advocate prompt version with a variable contract and rubric-boundary evidence.
2. Publish an employer-advocate model profile version with provider/model identity, cost metadata, and supply-chain evidence.
3. Create a signed AI runtime manifest that pins the prompt/model versions and enables no-hot-reload posture.
4. Render a prompt with trusted and untrusted variables while preserving sentinel boundaries.
5. Refuse an invocation for a missing prompt/model/manifest ref.
6. Refuse an invocation for an unallowlisted model profile.
7. Refuse or downgrade an invocation that exceeds the configured preflight budget.
8. Accept a valid invocation through the fake gateway adapter and record request hash, response hash, usage metadata, cost evidence, and audit refs.
9. Publish newer prompt/model versions and verify the original invocation still reports the original frozen refs.
10. Read prompt/model/manifest/invocation evidence through a scoped reviewer and verify unscoped review fails closed.

## Expected evidence

- Prompt and model versions are immutable and audit-linked.
- Runtime manifest signature/hash verification gates invocation.
- No-hot-reload posture preserves dispatch-time refs after newer versions publish.
- Prompt rendering rejects missing, unexpected, unsafe, or rubric-policy variables.
- Cost and provider allowlist failures return stable reason codes.
- Direct model-provider imports outside `@spyglass/ai` fail boundary verification.
- Scoped review reconstructs AI posture without exposing unauthorized prompt content or private run data.
