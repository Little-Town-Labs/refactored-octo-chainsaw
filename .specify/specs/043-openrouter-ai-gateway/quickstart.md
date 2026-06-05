# Quickstart: F12 Follow-up OpenRouter AI Gateway

## Local Setup

Add the OpenRouter key to `.env.local` when live testing is needed:

```bash
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_APP_URL=https://spyglass-bay.vercel.app
OPENROUTER_APP_TITLE=Spyglass
```

`OPENROUTER_BASE_URL`, `OPENROUTER_APP_URL`, and `OPENROUTER_APP_TITLE` are optional. The adapter defaults the base URL to `https://openrouter.ai/api/v1`.

## Model Profile Guidance

Use provider `openrouter` in F12 model profiles and include `openrouter` in runtime manifest provider allowlists. Use OpenRouter model slugs exactly as they appear in the OpenRouter catalog, for example `openai/gpt-5.2` or another approved model selected by operations.

## Verification

Run these commands from the repository root:

```bash
pnpm --filter @spyglass/ai test
pnpm --filter @spyglass/ai type-check
pnpm --filter @spyglass/ai lint
pnpm --filter @spyglass/ai dev-run:f12
pnpm gen:env-example
git diff --exit-code .env.example
```

## Deployment

Set the production Vercel secret:

```bash
cd apps/web
vercel env add OPENROUTER_API_KEY production
```

Optional production attribution secrets:

```bash
vercel env add OPENROUTER_APP_URL production
vercel env add OPENROUTER_APP_TITLE production
```

Redeploy after setting or rotating provider secrets.
