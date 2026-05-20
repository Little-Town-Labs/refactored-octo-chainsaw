# Quickstart: F11 Candidate Notification Artifact System

## Purpose

Validate that F11 can publish an immutable notice template, create a candidate notification artifact from a produced dossier ref, evaluate delivery readiness, generate a channel-agnostic delivery command, and read the evidence through a scoped review path.

## Commands

```bash
pnpm --filter @spyglass/notifications test
pnpm --filter @spyglass/notifications type-check
pnpm --filter @spyglass/notifications lint
pnpm --filter @spyglass/notifications build
pnpm --filter @spyglass/notifications dev-run:f11
pnpm --filter @spyglass/db build
pnpm schema:lint
```

## Expected staged run

1. Publish an `advance_aedt_notice` template version.
2. Create a candidate notification artifact from seeded `dossier.produced` evidence.
3. Verify rebuilding the same canonical content yields the same content hash.
4. Evaluate a refused gate before `earliest_delivery_at`.
5. Evaluate an allowed gate at or after `earliest_delivery_at`.
6. Generate a deterministic delivery command without invoking a channel adapter.
7. Read templates, artifacts, gate events, and commands through a scoped reviewer.

## Expected evidence

- Notice template version is immutable and pinned by artifact.
- Artifact stores candidate, match, run, dossier, jurisdiction, policy, timing, content hash, and audit refs.
- Missing or not-yet-eligible notice evidence refuses delivery with stable reason codes.
- Delivery command idempotency key is deterministic.
- Unscoped review reads fail closed.
