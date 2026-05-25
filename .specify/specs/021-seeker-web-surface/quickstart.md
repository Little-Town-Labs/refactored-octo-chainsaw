# Quickstart: Seeker Web Surface

## Scope

F21 validates the public seeker web surface, agent-readable docs, and A2A discovery cards.

## Expected Validation Commands

```bash
pnpm --filter @spyglass/web test
pnpm --filter @spyglass/web type-check
pnpm --filter @spyglass/web lint
pnpm --filter @spyglass/web build
pnpm type-check
pnpm lint
pnpm test
```

## Manual / Browser Validation

1. Start the web app locally.
2. Open `/` at desktop and mobile widths.
3. Confirm signup/login/profile entry points are reachable.
4. Confirm no links or rendered sections for dashboard, tickets, matches, analytics, recommended jobs, browse jobs, or public seeker profiles.
5. Fetch `/agents.md` and `/llms.txt`.
6. Fetch the A2A card index and each card:
   - `/.well-known/a2a/index.json`
   - `/.well-known/a2a/seeker-intake.json`
   - `/.well-known/a2a/employer-intake.json`
   - `/.well-known/a2a/match-coordinator.json`
   - `/.well-known/a2a/negotiation-participant.json`
   - `/.well-known/a2a/dossier-reader.json`
7. Verify cards state discovery/future interop status and do not imply live runtime protocol handlers.
8. Check keyboard navigation, landmarks, headings, focus visibility, and responsive text fit.

## Evidence Log

- `pnpm --filter @spyglass/web test -- --runInBand src/seeker-web/__tests__` — PASS
  (6 suites, 23 tests).
- `pnpm --filter @spyglass/web test -- --runInBand` — PASS
  (27 suites, 182 tests).
- `pnpm --filter @spyglass/web type-check` — PASS.
- `pnpm --filter @spyglass/web lint` — PASS.
- `pnpm --filter @spyglass/web build` — PASS. Production build includes `/`,
  `/profile`, `/.well-known/a2a/index.json`, and all five static A2A card routes.
- `pnpm --filter @spyglass/a2a type-check` — PASS.
- `pnpm --filter @spyglass/a2a test` — PASS with no tests found.
- `pnpm type-check` — PASS (41 tasks successful).
- `pnpm lint` — PASS (24 tasks successful).
- `pnpm test` — PASS (41 tasks successful). Web suite: 27 suites / 182 tests.
- Production HTTP validation via `next start --hostname 127.0.0.1 --port 3022`:
  `/`, `/agents.md`, `/llms.txt`, `/.well-known/a2a/index.json`, and all five
  concrete A2A card URLs returned HTTP 200. A2A responses returned
  `application/json; charset=utf-8`; public docs returned text/markdown or
  text/plain as expected.
- Playwright screenshot validation was not run because the local Python
  Playwright module is not installed. Responsive and landmark coverage is
  represented by Jest render smoke tests plus production HTTP validation.
