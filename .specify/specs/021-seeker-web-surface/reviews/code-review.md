# Code Review: Seeker Web Surface

## Scope

Reviewed F21 implementation changes for the public landing page, Clerk-backed
profile/account target, public `agents.md`/`llms.txt`, and A2A discovery card
data/routes.

## Findings

- No blocking findings.

## Notes

- Public landing content is static and intentionally omits dashboard, job
  browsing, match feed, ticket-list, analytics, transcript, and public profile
  surfaces.
- `@spyglass/a2a` owns the canonical card data; web route helpers only serialize
  that data with cache/content-type headers.
- Explicit static card routes are used for each `/.well-known/a2a/*.json` URL so
  production Next routing matches the public contract exactly.
- Local production validation requires Clerk-tolerant behavior when
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is absent. The layout, proxy, and profile
  route preserve Clerk-backed behavior when config is present while allowing
  secret-free validation of public routes.

## Verification

- `pnpm --filter @spyglass/web test -- --runInBand src/seeker-web/__tests__`
- `pnpm --filter @spyglass/web test -- --runInBand`
- `pnpm --filter @spyglass/web type-check`
- `pnpm --filter @spyglass/web lint`
- `pnpm --filter @spyglass/web build`
- `pnpm --filter @spyglass/a2a type-check`
- `pnpm --filter @spyglass/a2a test`
- `pnpm type-check`
- `pnpm lint`
- `pnpm test`
- Production HTTP validation against `next start` on `127.0.0.1:3022`
