# Quickstart Run: F12 Follow-up OpenRouter AI Gateway

**Date**: 2026-05-29
**Branch**: `043-openrouter-ai-gateway`

## Commands

```bash
pnpm gen:env-example
pnpm --filter @spyglass/ai test
pnpm --filter @spyglass/ai type-check
pnpm --filter @spyglass/ai lint
pnpm --filter @spyglass/ai dev-run:f12
pnpm format:check
pnpm --filter @spyglass/ai exec tsx -e '<live OpenRouter adapter smoke>'
```

## Results

- `pnpm gen:env-example`: pass after rerun outside the sandboxed `tsx` IPC restriction; wrote `.env.example` with 20 variables.
- `pnpm --filter @spyglass/ai test`: pass, 14 suites and 31 tests.
- `pnpm --filter @spyglass/ai type-check`: pass.
- `pnpm --filter @spyglass/ai lint`: pass.
- `pnpm --filter @spyglass/ai dev-run:f12`: pass after rerun outside the sandboxed `tsx` IPC restriction.
- `pnpm format:check`: pass after formatting `packages/ai/src/__tests__/gateway.test.ts`.
- Live OpenRouter adapter smoke: pass with local `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`, and `OPENROUTER_DEFAULT_MODEL=google/gemma-4-31b-it`. Response produced content length 22, usage metadata `{ input_tokens: 24, output_tokens: 8, total_tokens: 32, requests: 1 }`, and a `sha256:` response hash.

## Notes

`git diff --exit-code .env.example` is expected to show a diff before this feature is committed because the env manifest intentionally changed to include OpenRouter variables and legacy AI Gateway wording. The drift check should pass after these changes are committed and `pnpm gen:env-example` is rerun without changing the file.

Vercel production did not yet list `OPENROUTER_API_KEY` at smoke-test time; add the same key to the linked `apps/web` Vercel project before production provider traffic.
