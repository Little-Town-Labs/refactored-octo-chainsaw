#!/usr/bin/env bash
# Verify .nvmrc and root package.json#engines.node agree on the Node
# major version. Drift between the two confuses CI, contributors, and
# Vercel; this gate keeps them in sync.

set -euo pipefail

if [ ! -f .nvmrc ]; then
  echo "::error::.nvmrc not found at repo root"
  exit 1
fi

NVMRC=$(tr -d '[:space:]' < .nvmrc)
NVMRC_MAJOR=$(echo "$NVMRC" | sed 's/^v//' | cut -d. -f1)

# Extract engines.node major. Expects format ">=24.0.0 <25" or "24" etc.
ENGINES=$(node -e "process.stdout.write(JSON.parse(require('fs').readFileSync('package.json','utf-8')).engines?.node ?? '')")
if [ -z "$ENGINES" ]; then
  echo "::error::package.json#engines.node is not set"
  exit 1
fi

# First number we encounter in the spec.
ENGINES_MAJOR=$(echo "$ENGINES" | grep -oE '[0-9]+' | head -1)

if [ "$NVMRC_MAJOR" != "$ENGINES_MAJOR" ]; then
  echo "::error::.nvmrc says Node $NVMRC_MAJOR but package.json#engines.node implies $ENGINES_MAJOR"
  echo "  .nvmrc:           $NVMRC"
  echo "  engines.node:     $ENGINES"
  exit 1
fi

echo ".nvmrc and engines.node agree on Node $NVMRC_MAJOR."
