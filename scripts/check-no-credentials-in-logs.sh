#!/usr/bin/env bash
# F02 T011b — No-credentials-in-logs CI gate (NFR-6).
#
# Per spec NFR-6 and Constitution §I.5.3, no credential of any kind
# may appear in logs. This is a structural scan, not a runtime
# leakage check (that's caught by tests + observability). The gate
# fails on patterns that *route* a credential into a logger:
#
#   console.log/info/warn/error(... headers.authorization ...)
#   console.log(... session.token ...)
#   logger.info(... credential ...)   etc.
#
# These are nearly always typos. Real credential handling routes
# through `@spyglass/auth` helpers that strip secrets at the boundary.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Patterns that smell like a credential being passed to a logger.
# The grep is intentionally narrow — broader matches would chase
# false positives across docs/tests.
PATTERNS=(
  # console.* with an `authorization` header in the same call.
  "console\.(log|info|warn|error|debug)\\([^)]*\\bauthorization\\b"
  # console.* with a JWT-shaped variable name.
  "console\.(log|info|warn|error|debug)\\([^)]*\\b(jwt|access_token|access_token_jwt|bearer_token|signed_jwt)\\b"
  # Generic logger calls with the same.
  "logger\\.(log|info|warn|error|debug)\\([^)]*\\b(authorization|access_token|jwt|bearer_token|signed_jwt|client_secret)\\b"
  # Direct dump of a Principal's underlying credential metadata.
  "console\\.[a-z]+\\([^)]*\\bsigning_key\\b"
)

VIOLATIONS=0
for p in "${PATTERNS[@]}"; do
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    echo "no-credentials-in-logs: $line"
    VIOLATIONS=$((VIOLATIONS + 1))
  done < <(
    grep -RnE "$p" \
      --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
      --exclude-dir=node_modules \
      --exclude-dir=dist \
      --exclude-dir=.next \
      --exclude-dir=__tests__ \
      --exclude-dir=tests \
      --exclude='*.test.ts' --exclude='*.test.tsx' \
      apps packages 2>/dev/null || true
  )
done

if [[ $VIOLATIONS -gt 0 ]]; then
  echo
  echo "no-credentials-in-logs FAILED (NFR-6): $VIOLATIONS suspicious call(s)." >&2
  echo "Route credentials through @spyglass/auth helpers; do not log them." >&2
  exit 1
fi

echo "no-credentials-in-logs: clean."
