#!/usr/bin/env bash
# Spyglass developer bootstrap.
#
# Single-command setup for a fresh clone. Idempotent on re-run.
#
#   bash scripts/bootstrap.sh
#
# Targets per spec:
#   NFR-1: cold ≤ 30 minutes on a typical machine + residential network.
#   NFR-2: warm ≤ 2 minutes.
#   NFR-9: robust to network hiccups (retries with backoff are the
#          tool's responsibility — pnpm, vercel CLI handle their own).
#
# Failure mode: each step prints a single actionable error and exits
# non-zero per Constitution §I.6 fail-safe defaults. Never bypasses
# a missing prerequisite silently.

set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────

bold()    { printf '\033[1m%s\033[0m\n' "$*"; }
green()   { printf '\033[32m%s\033[0m\n' "$*"; }
yellow()  { printf '\033[33m%s\033[0m\n' "$*"; }
red()     { printf '\033[31m%s\033[0m\n' "$*" >&2; }

step() {
  printf '\n'
  bold "▶ $*"
}

fail() {
  red "✖ $*"
  exit 1
}

skip() {
  yellow "  (skipped: $*)"
}

ok() {
  green "  ✓ $*"
}

# Resolve repo root by walking up from this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# ── 1. Node version ──────────────────────────────────────────────────

step "Verifying Node version"

if ! command -v node >/dev/null; then
  fail "Node is not installed. Install Node 24 LTS:
    nvm install 24 && nvm use 24
  or download from https://nodejs.org/"
fi

NVMRC=$(tr -d '[:space:]' < .nvmrc)
NVMRC_MAJOR=$(echo "$NVMRC" | sed 's/^v//' | cut -d. -f1)
ACTUAL=$(node -v | sed 's/^v//' | cut -d. -f1)

if [ "$ACTUAL" != "$NVMRC_MAJOR" ]; then
  fail "Node $ACTUAL detected; .nvmrc requires Node $NVMRC_MAJOR.
    nvm use $NVMRC_MAJOR     (if nvm installed)
    nvm install $NVMRC_MAJOR (if not)"
fi
ok "Node $(node -v)"

# ── 2. Corepack + pnpm ───────────────────────────────────────────────

step "Activating Corepack and pnpm"

if ! command -v corepack >/dev/null; then
  fail "Corepack not available. Re-install Node ≥ 16 via nvm or
   download from https://nodejs.org/."
fi

# Read pinned pnpm version from package.json — keeps this script in
# sync with the workspace pin.
PNPM_PIN=$(node -e "const v = require('./package.json').packageManager; if (!v?.startsWith('pnpm@')) { process.exit(1); } process.stdout.write(v.replace('pnpm@', ''));")
if [ -z "$PNPM_PIN" ]; then
  fail "Could not determine pnpm version from package.json#packageManager."
fi

corepack enable >/dev/null
corepack prepare "pnpm@$PNPM_PIN" --activate >/dev/null
ok "pnpm $(pnpm -v)"

# ── 3. Optional CLIs (vercel, lefthook, gitleaks) ────────────────────

step "Verifying optional developer CLIs"

if command -v vercel >/dev/null; then
  ok "vercel CLI present ($(vercel --version 2>&1 | head -1))"
else
  yellow "  vercel CLI missing. Install when you need cloud env management:
    npm install -g vercel@latest
  Skipping vercel-related steps below."
fi

if command -v lefthook >/dev/null; then
  ok "lefthook present"
else
  yellow "  lefthook missing system-wide; will use the workspace dev-dep via pnpm exec."
fi

if command -v gitleaks >/dev/null; then
  ok "gitleaks present"
else
  yellow "  gitleaks not installed — pre-commit secret scan will soft-skip.
    Install (recommended):
      macOS:   brew install gitleaks
      Linux:   download from https://github.com/gitleaks/gitleaks/releases
    CI gate (Constitution §I.6 layer 3) is the authoritative defense."
fi

# ── 4. pnpm install ──────────────────────────────────────────────────

step "Installing dependencies"

pnpm install --frozen-lockfile

ok "Dependencies installed"

# ── 5. Vercel link + env pull (only if vercel CLI present) ───────────

if command -v vercel >/dev/null; then
  step "Vercel link + env pull"

  if [ -f .vercel/project.json ]; then
    ok ".vercel/project.json exists — already linked"
    LINKED=1
  else
    yellow "  No .vercel/project.json. 'vercel link' is interactive and"
    yellow "  not safe to auto-confirm in a script — run it manually:"
    yellow "    vercel link"
    yellow "  Then re-run bootstrap. Skipping vercel-dependent steps."
    LINKED=0
  fi

  # Only pull env if linked AND (.env.local missing or older than 1 hour).
  # This keeps warm-bootstrap fast and avoids redundant network calls.
  if [ "$LINKED" = "1" ]; then
    if [ ! -f .env.local ] || [ "$(find .env.local -mmin +60 -print 2>/dev/null)" = ".env.local" ]; then
      yellow "  Pulling environment variables…"
      if ! vercel env pull .env.local --yes; then
        yellow "  vercel env pull failed (network? expired auth?). Continuing — populate .env.local manually if needed."
      fi
    else
      ok ".env.local present and recent — skipping env pull"
    fi
  fi
else
  step "Vercel-related steps skipped (CLI not installed)"
fi

# ── 6. Lefthook install ──────────────────────────────────────────────

step "Installing lefthook git hooks"

pnpm exec lefthook install >/dev/null
ok "lefthook hooks registered (pre-commit, commit-msg)"

# ── 7. Smoke test ────────────────────────────────────────────────────

step "Running smoke test (build + test, via turbo cache)"

# `pnpm turbo run` uses Turborepo's task graph + cache; on re-runs
# with no input changes, this is a near-instant cache hit (NFR-2).
# `pnpm -r run` bypasses the cache and reruns every script — wrong
# tool for an idempotent bootstrap.
pnpm turbo run build test

# ── 8. Summary ───────────────────────────────────────────────────────

printf '\n'
bold "════════════════════════════════════════════════════════════════"
green " ✓ Spyglass bootstrap complete"
bold "════════════════════════════════════════════════════════════════"
cat <<EOF

Next steps:

  • Start the dev server:    pnpm dev
  • Run tests:               pnpm test
  • Type-check workspace:    pnpm type-check
  • Lint:                    pnpm lint
  • Format:                  pnpm format
  • Regenerate .env.example: pnpm gen:env-example

Read CONTRIBUTING.md for branch naming, conventional commits, and the
hook bypass policy.

EOF
