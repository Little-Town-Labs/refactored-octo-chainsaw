#!/usr/bin/env bash
# Best-effort cleanup of orphaned Neon test branches.
#
# Scenarios create branches via @spyglass/test-harness; a crash before
# `afterAll` can leak branches. CI runs this in its `always()` step
# so leftovers don't accumulate.
#
# Branches matching the `test-` prefix older than 1 hour are deleted.
# Branches younger than 1h are left alone (could be an in-flight run).

set -euo pipefail

: "${NEON_API_KEY:?NEON_API_KEY not set}"
: "${NEON_PROJECT_ID:?NEON_PROJECT_ID not set}"

api="https://console.neon.tech/api/v2"
auth="Authorization: Bearer ${NEON_API_KEY}"

# List branches → filter to test-* older than 1 hour → delete each.
# `set -e` + bare `curl -fsS` means an auth/network failure aborts the
# script and surfaces in CI as a real failure (the workflow already
# wraps this step in `continue-on-error: true` so cleanup failures
# don't mask test results).
now_epoch=$(date -u +%s)
cutoff=$((now_epoch - 3600))

export CUTOFF="$cutoff" API="$api"

# Use python for JSON parsing (always available on ubuntu-24.04).
# Pagination: Neon's branches list endpoint returns at most ~250 rows
# per page and exposes a `cursor` for the next page. We loop until the
# cursor is absent so the sweeper never silently leaves the *oldest*
# (most-likely-orphaned) branches behind.
python3 - <<'PY'
import json, os, sys, urllib.request, urllib.error, urllib.parse, datetime

cutoff = int(os.environ["CUTOFF"])
api = os.environ["API"]
project = os.environ["NEON_PROJECT_ID"]
key = os.environ["NEON_API_KEY"]
auth_headers = {"Authorization": f"Bearer {key}", "Accept": "application/json"}

def fetch_page(cursor):
    qs = urllib.parse.urlencode({"cursor": cursor} if cursor else {})
    url = f"{api}/projects/{project}/branches" + (f"?{qs}" if qs else "")
    req = urllib.request.Request(url, headers=auth_headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())

deleted = scanned = pages = 0
cursor = None
while True:
    page = fetch_page(cursor)
    pages += 1
    for b in page.get("branches", []):
        scanned += 1
        name = b.get("name", "")
        if not name.startswith("test-"):
            continue
        created = b.get("created_at")
        if not created:
            continue
        try:
            ts = datetime.datetime.fromisoformat(created.replace("Z", "+00:00")).timestamp()
        except ValueError:
            continue
        if ts > cutoff:
            continue
        bid = b["id"]
        req = urllib.request.Request(
            f"{api}/projects/{project}/branches/{bid}",
            method="DELETE",
            headers=auth_headers,
        )
        try:
            urllib.request.urlopen(req, timeout=10).read()
            deleted += 1
            print(f"deleted {name} ({bid})")
        except urllib.error.HTTPError as e:
            print(f"skip {name}: HTTP {e.code}", file=sys.stderr)

    cursor = (page.get("pagination") or {}).get("cursor") or page.get("cursor")
    if not cursor:
        break

print(f"orphan cleanup: scanned {scanned} branches across {pages} page(s); {deleted} removed")
PY
