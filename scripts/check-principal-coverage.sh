#!/usr/bin/env bash
# F02 T011a — Principal-coverage CI gate (NFR-11, M-1).
#
# Per Constitution §I.5.1 and spec FR-36/FR-37, every Spyglass route
# handler, server action, tRPC procedure, and Inngest function MUST
# pass through `withPrincipal(...)` (or the explicit
# `withAnonymous(...)` opt-out) before performing any business logic.
# The type system catches most violations; this script catches the
# gaps where TypeScript can't see — handlers discovered by App Router
# filesystem conventions (`route.ts`, `page.tsx` actions, etc.).
#
# Until apps/web ships its first real handlers in B2, this script
# is an additive scanner: it finds candidate files and, if any are
# present, asserts they import from `@spyglass/auth`. The script
# exits 0 on an empty surface (no candidate files yet) so B1 lands
# without false positives.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Shapes that must pass through @spyglass/auth before mutating state.
# - apps/web App Router route handlers: app/**/route.ts(x)
# - apps/web server actions: any "use server" file under app/
# - Inngest functions: packages/agents/**/*.inngest.ts
CANDIDATES=()
while IFS= read -r f; do CANDIDATES+=("$f"); done < <(
  find apps -type f \( -name "route.ts" -o -name "route.tsx" \) 2>/dev/null || true
)
while IFS= read -r f; do CANDIDATES+=("$f"); done < <(
  grep -rl --include='*.ts' --include='*.tsx' "use server" apps 2>/dev/null || true
)
while IFS= read -r f; do CANDIDATES+=("$f"); done < <(
  find packages -type f -name "*.inngest.ts" 2>/dev/null || true
)

if [[ ${#CANDIDATES[@]} -eq 0 ]]; then
  echo "principal-coverage: no candidate handlers found yet (B1 surface)."
  exit 0
fi

VIOLATIONS=()
for f in "${CANDIDATES[@]}"; do
  # Allowlist: files whose name ends with `.anonymous.ts(x)` are
  # explicitly exempted (FR-36 explicit-not-implicit). They MUST
  # import `withAnonymous` from `@spyglass/auth`.
  if [[ "$f" == *.anonymous.ts || "$f" == *.anonymous.tsx ]]; then
    if ! grep -q "withAnonymous" "$f"; then
      VIOLATIONS+=("$f (anonymous file does not import withAnonymous)")
    fi
    continue
  fi

  if ! grep -q -E "withPrincipal|withAnonymous" "$f"; then
    VIOLATIONS+=("$f (missing withPrincipal/withAnonymous)")
  fi
done

if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  echo "principal-coverage FAILED (NFR-11):"
  for v in "${VIOLATIONS[@]}"; do
    echo "  ✗ $v"
  done
  echo
  echo "Every mutating handler must wrap its body in withPrincipal(...)" >&2
  echo "from @spyglass/auth, or be explicitly named *.anonymous.ts(x)" >&2
  echo "and use withAnonymous(...) instead. See spec FR-36, FR-37." >&2
  exit 1
fi

echo "principal-coverage: ${#CANDIDATES[@]} handler(s) checked, all green."
