# Bootstrap Timing Validation

How we validate that `scripts/bootstrap.sh` meets spec NFR-1 (cold ≤
30 min) and NFR-2 (warm ≤ 2 min).

## Targets

| Scenario | NFR | Target |
|---|---|---|
| Cold (fresh clone, no caches) | NFR-1 | ≤ 30 min |
| Warm (working checkout, re-run) | NFR-2 | ≤ 2 min |

## Validation procedure

T052 calls for timing on **at least 2 contributor machines**. Until
that's done at organization scale, the developer who lands the
script is responsible for these baseline measurements:

1. **Cold scenario** — on a machine without prior pnpm content-
   addressable cache:

   ```bash
   # Wipe pnpm + npm caches
   rm -rf ~/.pnpm-store ~/.npm
   git clone <repo>
   cd refactored-octo-chainsaw
   time bash scripts/bootstrap.sh
   ```

   Record `real` time. Should be ≤ 30 min on a residential
   connection.

2. **Warm scenario** — same machine, immediately after the cold
   run:

   ```bash
   time bash scripts/bootstrap.sh
   ```

   Should be ≤ 2 min. If > 2 min, the `bootstrap-idempotency` CI
   gate will fail on PRs that touch the script.

3. **Record results** in this file under "Recorded measurements"
   below. Append; do not overwrite — drift over time is a useful
   signal.

## Recorded measurements

| Date | Machine | Cold (real) | Warm (real) | Notes |
|---|---|---|---|---|
| 2026-05-06 | F01 author's WSL2 (Windows 11; pnpm content cache present) | _not measured_ | 7.6 s | Fully-warm with turbo cache |
| 2026-05-06 | F01 author's WSL2 | _not measured_ | 1m 45s | First run after lockfile change (turbo build cache cold) |

## Gotchas

- **Network variance dominates the cold case.** A typical WSL2 +
  residential connection downloads pnpm-store packages in 1–3
  minutes. CI runners on github.com/codespaces are typically
  faster.
- **Vercel CLI not installed → bootstrap skips vercel-related
  steps.** That's intentional; bootstrap doesn't fail when a
  contributor hasn't set up Vercel auth yet. They can add it
  later via `npm i -g vercel && vercel link && bash scripts/bootstrap.sh`.
- **Gitleaks not installed → pre-commit secret-scan soft-skips.**
  CI gate is the authoritative defense (Constitution §I.6 Defense
  in Depth, layer 3).
- **Turbo cache misses on first run.** The first time after any
  source change, the build/test smoke is full ~1m45s. After that,
  re-runs are seconds. NFR-2 measures the "no-source-change"
  case.

## CI enforcement

`.github/workflows/ci.yml` defines a `bootstrap-idempotency` job
that runs the script twice and asserts the second run is ≤ 120s.
The job is paths-filtered to only run on PRs touching
`scripts/bootstrap.sh`, `package.json`, `pnpm-workspace.yaml`, or
`turbo.json` — files whose changes plausibly affect bootstrap
behavior. This avoids paying ~2 min on every PR while still
catching regressions.
