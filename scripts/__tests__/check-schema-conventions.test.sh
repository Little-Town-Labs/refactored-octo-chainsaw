#!/usr/bin/env bash
# F03 T016 — Unit tests for scripts/check-schema-conventions.sh.
#
# RED phase: tests fail before T017 implements the lint.
# GREEN phase: tests pass after T017.
#
# Each test isolates one rule (R1–R7) and asserts the lint:
#   - exits 0 on good fixtures
#   - exits non-zero on bad fixtures
#   - emits the expected rule id in its output

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && cd .. && pwd)"
LINT="$ROOT/scripts/check-schema-conventions.sh"
FIXTURES="$ROOT/scripts/__tests__/schema-fixtures"
REGISTER="$FIXTURES/register-fixture.yaml"

PASS=0
FAIL=0
FAIL_NAMES=()

assert_pass() {
  local name="$1"; shift
  local out
  out="$("$@" 2>&1)"
  local rc=$?
  if [[ $rc -eq 0 ]]; then
    echo "ok   $name"
    PASS=$((PASS+1))
  else
    echo "FAIL $name (exit=$rc, expected 0)"
    echo "$out" | sed 's/^/     /'
    FAIL=$((FAIL+1))
    FAIL_NAMES+=("$name")
  fi
}

assert_fail_with() {
  local name="$1"; local needle="$2"; shift 2
  local out
  out="$("$@" 2>&1)"
  local rc=$?
  if [[ $rc -ne 0 ]] && echo "$out" | grep -q "$needle"; then
    echo "ok   $name"
    PASS=$((PASS+1))
  else
    echo "FAIL $name (exit=$rc, output missing '$needle')"
    echo "$out" | sed 's/^/     /'
    FAIL=$((FAIL+1))
    FAIL_NAMES+=("$name")
  fi
}

assert_contains() {
  local name="$1"; local needle="$2"; shift 2
  local out
  out="$("$@" 2>&1)"
  if echo "$out" | grep -q "$needle"; then
    echo "ok   $name"
    PASS=$((PASS+1))
  else
    echo "FAIL $name (output missing '$needle')"
    echo "$out" | sed 's/^/     /'
    FAIL=$((FAIL+1))
    FAIL_NAMES+=("$name")
  fi
}

if [[ ! -x "$LINT" ]]; then
  echo "FAIL setup: lint script $LINT not executable (RED phase expected pre-T017)"
  exit 1
fi

# --- R1: UUIDv7 primary key ---
assert_pass "R1 good (uuidv7 PK)" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="good-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"
assert_fail_with "R1 bad (serial PK)" "r1-uuidv7-pk" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="bad-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

# --- R2: timestamp triple ---
assert_pass "R2 good (created_at + updated_at)" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="good-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"
assert_fail_with "R2 bad (no timestamps)" "r2-timestamps" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="bad-r2.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

# --- R3: register coverage ---
# A fixture that exists on disk but is not in the register fixture YAML should fail R3.
assert_fail_with "R3 bad (table missing from register)" "r3-register-coverage" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="bad-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

# --- R4: enum-shaped CHECK ---
assert_pass "R4 good (kind column + CHECK)" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="good-r4.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"
assert_fail_with "R4 bad (kind column, no CHECK)" "r4-enum-check" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="bad-r4.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

# --- R7: skip mechanism ---
# skip-r2 fixture has no timestamps but carries a skip comment.
assert_pass "R7 skip honored (skip-r2-timestamps)" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="skip-r2.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"
assert_contains "R7 skip reported in output" "skip-r2-timestamps" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="skip-r2.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

# --- R6: destructive on audit-relevant table ---
# Construct an ephemeral migration directory containing a forbidden statement.
TMPDIR_R6="$(mktemp -d)"
trap 'rm -rf "$TMPDIR_R6"' EXIT
cat >"$TMPDIR_R6/0099_bad.sql" <<EOF
ALTER TABLE audit_events_buffer DROP COLUMN payload;
EOF
# Need a SCHEMA_DIR that exists; reuse fixtures but include only one good file.
assert_fail_with "R6 bad (DROP COLUMN on audit_events_buffer)" "r6-destructive" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="good-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$TMPDIR_R6" "$LINT"

# --- Coverage report on clean baseline ---
assert_contains "coverage footer present" "tables checked" \
  env SCHEMA_DIR="$FIXTURES" SCHEMA_INCLUDE="good-r1.ts" REGISTER_FILE="$REGISTER" MIGRATIONS_DIR="$FIXTURES" "$LINT"

echo ""
echo "==== test summary ===="
echo "pass: $PASS · fail: $FAIL"
if [[ $FAIL -gt 0 ]]; then
  printf '  - %s\n' "${FAIL_NAMES[@]}"
  exit 1
fi
exit 0
