#!/usr/bin/env bash
# F04 T012 — Tickets-state-machine-coverage CI gate (FR-2, M-1).
#
# Asserts that every named transition in
# packages/tickets/src/transitions.ts is covered by at least one
# positive test in packages/tickets/src/__tests__/transitions.test.ts.
#
# Coverage model:
#   - The transitions module exports three catalog arrays:
#       SEEKER_TRANSITIONS, EMPLOYER_REQ_TRANSITIONS, MATCH_TRANSITIONS.
#     Each element is `{ from: "<state>", to: "<state>", ... }`.
#   - The test file's `*_LEGAL` constants (mirrors of the catalogs)
#     drive table-driven positive tests via `test.each(...)`. The gate
#     asserts every (from, to) pair declared in the source catalogs
#     also appears in the test catalog.
#
# Why not parse Jest output? — The Jest run already covers RED → GREEN
# correctness. This gate is a *static* drift guard: it fails fast when
# a developer adds a transition to the source map but forgets to add a
# corresponding positive test entry. It does not duplicate Jest.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

TRANSITIONS_TS="packages/tickets/src/transitions.ts"
TESTS_TS="packages/tickets/src/__tests__/transitions.test.ts"

if [[ ! -f "$TRANSITIONS_TS" ]]; then
  echo "tickets-state-machine: FAIL — missing $TRANSITIONS_TS" >&2
  exit 1
fi
if [[ ! -f "$TESTS_TS" ]]; then
  echo "tickets-state-machine: FAIL — missing $TESTS_TS" >&2
  exit 1
fi

# Extract `{ from: "X", to: "Y" }` pairs from a file, scoped to a named
# const block. We use a Python helper for robust multi-line parsing
# rather than fragile grep/sed.
python3 - "$TRANSITIONS_TS" "$TESTS_TS" <<'PY'
import re
import sys

src_path, test_path = sys.argv[1], sys.argv[2]

CATALOGS = [
    ("SEEKER_TRANSITIONS", "SEEKER_LEGAL"),
    ("EMPLOYER_REQ_TRANSITIONS", "EMPLOYER_REQ_LEGAL"),
    ("MATCH_TRANSITIONS", "MATCH_LEGAL"),
]

PAIR_RE = re.compile(r'\{\s*from:\s*"([^"]+)"\s*,\s*to:\s*"([^"]+)"')

def extract(path, const_name):
    text = open(path).read()
    # Find the const block: from `const NAME` up to the closing `];`.
    m = re.search(rf'{const_name}[^=]*=\s*\[(.+?)\];', text, re.DOTALL)
    if not m:
        return None
    block = m.group(1)
    return set(PAIR_RE.findall(block))

failed = False
for src_const, test_const in CATALOGS:
    src_pairs = extract(src_path, src_const)
    test_pairs = extract(test_path, test_const)
    if src_pairs is None:
        print(f"FAIL — source catalog {src_const} not found in {src_path}", file=sys.stderr)
        failed = True
        continue
    if test_pairs is None:
        print(f"FAIL — test catalog {test_const} not found in {test_path}", file=sys.stderr)
        failed = True
        continue

    missing_in_tests = src_pairs - test_pairs
    missing_in_source = test_pairs - src_pairs

    if missing_in_tests:
        for p in sorted(missing_in_tests):
            print(
                f"FAIL — {src_const} declares {p[0]} → {p[1]} but "
                f"{test_const} does not (add to positive table-driven test)",
                file=sys.stderr,
            )
        failed = True
    if missing_in_source:
        for p in sorted(missing_in_source):
            print(
                f"FAIL — {test_const} expects {p[0]} → {p[1]} but "
                f"{src_const} does not declare it",
                file=sys.stderr,
            )
        failed = True

    if not missing_in_tests and not missing_in_source:
        print(f"ok — {src_const}: {len(src_pairs)} edges covered")

if failed:
    sys.exit(1)
PY

echo "tickets-state-machine: all transition catalogs covered."
