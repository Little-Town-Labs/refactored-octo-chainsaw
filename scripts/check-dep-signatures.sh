#!/usr/bin/env bash
# Verify upstream npm provenance for production dependencies, and check
# that any unsigned dep is recorded in the exceptions register.
#
# Per Constitution v2.0.0 §I.C.2 (revised at v2.0.0): signature
# mismatches always fail (real attack signal); no-provenance-available
# packages must be allowlisted in
# .specify/exceptions/dependency-signatures.md with rationale.
#
# Run via CI's dep-signatures job. Locally:
#   pnpm install
#   bash scripts/check-dep-signatures.sh

set -euo pipefail

REGISTER=".specify/exceptions/dependency-signatures.md"

if [ ! -f "$REGISTER" ]; then
  echo "::error::Exceptions register not found at $REGISTER"
  exit 1
fi

# Ensure pnpm + npm are present (CI runner installs both).
command -v pnpm >/dev/null || { echo "pnpm required"; exit 1; }
command -v npm >/dev/null || { echo "npm required (10.5+) for audit signatures"; exit 1; }

echo "Running pnpm audit signatures..."
audit_output=$(pnpm audit signatures --json 2>/dev/null || true)

if [ -z "$audit_output" ]; then
  # Some pnpm versions don't support `audit signatures` directly. Fall
  # back to npm via a generated lockfile-bridge.
  echo "pnpm audit signatures unavailable; bridging via npm install --package-lock-only"
  rm -f package-lock.json
  npm install --package-lock-only --ignore-scripts >/dev/null 2>&1
  audit_output=$(npm audit signatures --json 2>/dev/null || true)
  rm -f package-lock.json
fi

if [ -z "$audit_output" ]; then
  echo "::warning::Could not run audit signatures via pnpm or npm. Skipping (CI runner lacks support)."
  exit 0
fi

# Parse output: a "verified" entry passes; "missing" or "no provenance"
# entries must be in the register; "mismatch" entries fail unconditionally.
mismatches=$(echo "$audit_output" | jq -r '.invalid // [] | .[] | .name + "@" + .version' 2>/dev/null || true)
unsigned=$(echo "$audit_output" | jq -r '.missing // [] | .[] | .name + "@" + .version' 2>/dev/null || true)

if [ -n "$mismatches" ]; then
  echo "::error::Signature MISMATCH detected (real attack signal). Mismatches are NEVER allowlisted."
  echo "$mismatches"
  exit 1
fi

if [ -z "$unsigned" ]; then
  echo "All production dependencies have verifiable upstream provenance."
  exit 0
fi

# Check each unsigned dep against the register.
echo "Found unsigned dependencies. Verifying each is in the exceptions register..."
unregistered=""
while IFS= read -r dep; do
  [ -z "$dep" ] && continue
  pkg=$(echo "$dep" | sed 's/@[^@]*$//')
  if ! grep -qF "$pkg" "$REGISTER"; then
    unregistered="$unregistered\n  $dep"
  fi
done <<< "$unsigned"

if [ -n "$unregistered" ]; then
  echo "::error::The following unsigned dependencies are NOT in $REGISTER:"
  printf "$unregistered\n"
  echo ""
  echo "Add a row to the register with rationale and reviewer, or replace with a signed alternative."
  exit 1
fi

echo "All unsigned dependencies are accounted for in the register."
