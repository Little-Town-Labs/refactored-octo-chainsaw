# F12 Quickstart Run: 2026-05-21

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

## Staged Run Evidence

`pnpm --filter @spyglass/ai dev-run:f12` required elevated execution because
`tsx` attempted to create an IPC socket under `/tmp` and the sandbox returned
`listen EPERM`.

```json
{
  "prompt": "seeker-advocate@1.0.0",
  "model": "advocate-reasoning@1.0.0",
  "manifest": "f12-runtime@1.0.0",
  "refused": "missing_required_ref",
  "accepted": "completed",
  "request_hash": "sha256:a3f5937e3d2243a8cdc9eb55c06e5d69564f4f2303555fca3e0d69b4ef6f44ea",
  "response_hash": "sha256:157c8d9650946b9cb6f28e8731844d936456d86b911c4be44994fb630509141d",
  "frozen_prompt_ref": {
    "prompt_id": "seeker-advocate",
    "version": "1.0.0"
  },
  "frozen_model_ref": {
    "model_profile_id": "advocate-reasoning",
    "version": "1.0.0"
  },
  "review_prompts": 2
}
```

## Result

The staged run published immutable prompt/model versions, published a signed
runtime manifest, refused a missing-ref invocation, accepted a governed fake
gateway invocation, preserved frozen prompt/model refs after newer versions
published, and reconstructed evidence through scoped review.
