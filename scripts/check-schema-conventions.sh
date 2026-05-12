#!/usr/bin/env bash
# F03 T017 — Schema-conventions CI gate (FR-6, NFR-2).
#
# Validates packages/db/src/schema/*.ts against the conventions
# codified in docs/data-governance/schema-conventions.md, and
# cross-checks docs/data-governance/data-classification.yaml for
# coverage.
#
# Rules (v1):
#   R1: every pgTable has a uuid PK with .default(sql`uuidv7()`)
#       (signing_keys.kid is the documented text-PK carve-out).
#   R2: every mutable table has created_at + updated_at.
#   R3: every table in SCHEMA_DIR appears in REGISTER_FILE.
#   R4: text columns named kind|status|side|reason_code|purpose|tier
#       carry a CHECK constraint.
#   R5: every references() has explicit on-update/on-delete behavior.
#       v1: warn-only (F02-shipped FKs are grandfathered).
#   R6: no DELETE/DROP COLUMN/DROP TABLE on audit-relevant tables
#       (currently: audit_events_buffer) in any migration.
#   R7: `// schema-lint: skip-<rule>` comments are honored AND
#       reported in the footer.
#
# Environment overrides (for tests + CI flexibility):
#   SCHEMA_DIR        — default packages/db/src/schema
#   SCHEMA_INCLUDE    — comma-separated filename allowlist (default: all *.ts)
#   REGISTER_FILE     — default docs/data-governance/data-classification.yaml
#   MIGRATIONS_DIR    — default packages/db/migrations
#   AUDIT_TABLES      — default: audit_events_buffer
#   GRANDFATHER_R5    — default 1 (warn-only); set 0 to block on R5.
#
# Output format: one line per violation:
#   <file>:<line> <rule-id> <hint>
# Footer:
#   tables checked: N
#   violations: M
#   skips honored: K (each listed)

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SCHEMA_DIR="${SCHEMA_DIR:-packages/db/src/schema}"
SCHEMA_INCLUDE="${SCHEMA_INCLUDE:-}"
REGISTER_FILE="${REGISTER_FILE:-docs/data-governance/data-classification.yaml}"
MIGRATIONS_DIR="${MIGRATIONS_DIR:-packages/db/migrations}"
AUDIT_TABLES="${AUDIT_TABLES:-audit_events_buffer}"
GRANDFATHER_R5="${GRANDFATHER_R5:-1}"

# kid is the documented carve-out from R1 (schema-conventions.md §3).
TEXT_PK_CARVE_OUT="signing-keys.ts"

# ---------- discover schema files ----------
SCHEMA_FILES=()
if [[ -d "$SCHEMA_DIR" ]]; then
  while IFS= read -r f; do
    base="$(basename "$f")"
    [[ "$base" == "index.ts" ]] && continue
    if [[ -n "$SCHEMA_INCLUDE" ]]; then
      case ",$SCHEMA_INCLUDE," in
        *",$base,"*) SCHEMA_FILES+=("$f") ;;
      esac
    else
      SCHEMA_FILES+=("$f")
    fi
  done < <(find "$SCHEMA_DIR" -maxdepth 1 -name '*.ts' 2>/dev/null | sort)
fi

# ---------- load register table names ----------
REGISTER_TABLES=()
if [[ -f "$REGISTER_FILE" ]]; then
  while IFS= read -r line; do REGISTER_TABLES+=("$line"); done < <(
    awk '
      /^tables:/ { in_tables=1; next }
      in_tables && /^[^[:space:]]/ { in_tables=0 }
      in_tables && /^[[:space:]]+-[[:space:]]+name:/ {
        sub(/^[[:space:]]+-[[:space:]]+name:[[:space:]]*/, "")
        gsub(/["'\'']/, "")
        print
      }
    ' "$REGISTER_FILE"
  )
fi

is_registered() {
  local tbl="$1"
  for r in "${REGISTER_TABLES[@]}"; do
    [[ "$r" == "$tbl" ]] && return 0
  done
  return 1
}

# ---------- counters ----------
VIOLATIONS=()
SKIPS=()
TABLES_CHECKED=0

emit() {
  # $1 = file, $2 = line, $3 = rule, $4 = hint
  VIOLATIONS+=("$1:$2 $3 $4")
}

# ---------- per-file checks ----------
for f in "${SCHEMA_FILES[@]}"; do
  base="$(basename "$f")"
  TABLES_CHECKED=$((TABLES_CHECKED + 1))

  # Collect skip directives for this file.
  file_skips=()
  while IFS= read -r skip; do
    [[ -n "$skip" ]] && file_skips+=("$skip")
  done < <(grep -oE 'schema-lint:[[:space:]]*skip-[a-z0-9-]+' "$f" | sed 's/.*skip-//')
  for s in "${file_skips[@]}"; do
    SKIPS+=("$f: skip-$s")
  done

  has_skip() {
    local rule="$1"
    for s in "${file_skips[@]}"; do
      [[ "$s" == "$rule" ]] && return 0
    done
    return 1
  }

  # Extract the pgTable name (first match).
  tbl_name="$(grep -oE 'pgTable\("[a-z_][a-z0-9_]*"' "$f" | head -1 | sed -E 's/pgTable\("([^"]+)".*/\1/')"

  # --- R1: UUIDv7 primary key ---
  if ! has_skip "r1-uuidv7-pk"; then
    # Carve-out for documented text-PK files.
    if [[ "$base" != "$TEXT_PK_CARVE_OUT" ]]; then
      pk_line="$(grep -nE '\.primaryKey\(\)' "$f" | head -1)"
      if [[ -n "$pk_line" ]]; then
        ln="${pk_line%%:*}"
        # Look at this line + 1 line before for the type.
        ctx="$(sed -n "$((ln-1)),${ln}p" "$f")"
        if ! echo "$ctx" | grep -qE 'uuid\('; then
          emit "$f" "$ln" "r1-uuidv7-pk" "primary key is not uuid; expected uuid().primaryKey().default(sql\`uuidv7()\`)"
        elif ! grep -qE 'uuidv7\(\)' "$f"; then
          emit "$f" "$ln" "r1-uuidv7-pk" "uuid PK missing .default(sql\`uuidv7()\`)"
        fi
      else
        emit "$f" "1" "r1-uuidv7-pk" "no primaryKey() declaration found"
      fi
    fi
  fi

  # --- R2: created_at + updated_at ---
  if ! has_skip "r2-timestamps"; then
    if ! grep -qE '"created_at"' "$f"; then
      emit "$f" "1" "r2-timestamps" "missing created_at column"
    fi
    if ! grep -qE '"updated_at"' "$f"; then
      # audit-events-buffer is append-only — append-only is its own carve-out.
      if [[ "$base" != "audit-events-buffer.ts" ]]; then
        emit "$f" "1" "r2-timestamps" "missing updated_at column"
      fi
    fi
  fi

  # --- R3: register coverage ---
  if ! has_skip "r3-register-coverage" && [[ -n "$tbl_name" ]]; then
    if ! is_registered "$tbl_name"; then
      emit "$f" "1" "r3-register-coverage" "table '$tbl_name' is not declared in $REGISTER_FILE"
    fi
  fi

  # --- R4: enum-shaped text column without CHECK ---
  if ! has_skip "r4-enum-check"; then
    while IFS= read -r match; do
      ln="${match%%:*}"
      col="$(echo "$match" | sed -nE 's/.*text\("([^"]+)".*/\1/p')"
      # Pattern match for enum-shaped names.
      case "$col" in
        kind|status|side|reason_code|purpose|tier|role|algorithm|principal_kind)
          if ! grep -qE "${col}_check|${col}_invariant|${col} IN" "$f"; then
            emit "$f" "$ln" "r4-enum-check" "text column '$col' looks enum-shaped but no CHECK constraint found"
          fi
          ;;
      esac
    done < <(grep -nE 'text\("[a-z_]+"' "$f")
  fi

  # --- R5: FK on-update/on-delete (warn-only by default) ---
  if ! has_skip "r5-fk-behavior"; then
    while IFS= read -r match; do
      ln="${match%%:*}"
      # Read this line + next 2 to capture multiline references() calls.
      ctx="$(sed -n "${ln},$((ln+2))p" "$f")"
      if ! echo "$ctx" | grep -qE 'onUpdate|onDelete'; then
        if [[ "$GRANDFATHER_R5" -eq 1 ]]; then
          # Suppress for v1 — F02 shipped without these.
          :
        else
          emit "$f" "$ln" "r5-fk-behavior" "references() lacks explicit onUpdate/onDelete"
        fi
      fi
    done < <(grep -nE '\.references\(' "$f")
  fi
done

# ---------- R6: destructive on audit-relevant tables in migrations ----------
IFS=',' read -r -a AUDIT_TBL_ARR <<<"$AUDIT_TABLES"
if [[ -d "$MIGRATIONS_DIR" ]]; then
  while IFS= read -r sql_file; do
    for tbl in "${AUDIT_TBL_ARR[@]}"; do
      tbl_trim="$(echo "$tbl" | tr -d ' ')"
      # Look for DROP TABLE / DROP COLUMN / DELETE FROM / TRUNCATE on
      # any line that also references the audit-relevant table name
      # (table may appear before or after the verb).
      while IFS= read -r match; do
        ln="${match%%:*}"
        emit "$sql_file" "$ln" "r6-destructive" "destructive statement against audit-relevant table '$tbl_trim' is forbidden outside the tombstone procedure"
      done < <(grep -inE "(DROP[[:space:]]+TABLE|DROP[[:space:]]+COLUMN|DELETE[[:space:]]+FROM|TRUNCATE)" "$sql_file" 2>/dev/null | grep -iE "${tbl_trim}" || true)
    done
  done < <(find "$MIGRATIONS_DIR" -maxdepth 1 -name '*.sql' 2>/dev/null | sort)
fi

# ---------- footer + exit ----------
for v in "${VIOLATIONS[@]:-}"; do
  [[ -n "$v" ]] && echo "$v"
done

echo ""
echo "tables checked: $TABLES_CHECKED"
echo "violations: ${#VIOLATIONS[@]}"
echo "skips honored: ${#SKIPS[@]}"
for s in "${SKIPS[@]:-}"; do
  [[ -n "$s" ]] && echo "  $s"
done

if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  exit 1
fi
exit 0
