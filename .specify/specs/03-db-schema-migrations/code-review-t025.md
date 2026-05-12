# F03 T025 — Code review report

**Date:** 2026-05-12
**Reviewer:** /speckit-implement built-in code-review pass
**Scope:** commit `f8364b7` (F03 implementation) — lint script, test
harness, governance docs, schema module edits, CI workflow patch

## Summary

| Severity | Count | Action |
|---|---|---|
| 🔴 CRITICAL | 0 | — |
| 🟠 HIGH | 0 | — |
| 🟡 MEDIUM | 0 | — |
| 🔵 LOW | 4 | Documented for follow-up; non-blocking |
| ⚪ INFO | 3 | Notes only |

**Verdict: ✅ APPROVED for PR.** No blocking issues. The 4 LOW findings are
hardening opportunities for a v2 of the lint, not gates on this merge.

---

## LOW findings (non-blocking)

### L-1: Hardcoded carve-out filenames in lint
**Location:** `scripts/check-schema-conventions.sh:51`, `:155`
**Finding:** Two filenames hardcoded:
- `TEXT_PK_CARVE_OUT="signing-keys.ts"` — exempts kid-style text PKs from R1
- `audit-events-buffer.ts` — exempts append-only tables from R2-updated_at

**Risk:** If a future table adopts the same pattern (text PK or
append-only), it won't get the same exemption without editing the
lint.

**Mitigation in place:** The skip mechanism (`// schema-lint: skip-*`)
already gives any new file an opt-out path. Conventions doc §3 names
the text-PK exception as an ADR-gated decision; §2 names append-only
as a category.

**Recommended v2:** Promote both carve-outs to config — e.g. a leading
file-comment `// schema-lint: table-kind=append-only` or
`// schema-lint: pk-style=text`. Deferred to a future feature when a
second such table actually exists.

### L-2: R4 enum-column name list is implicit
**Location:** `scripts/check-schema-conventions.sh:174`
**Finding:** The case statement enumerating "enum-shaped" column names
(`kind|status|side|reason_code|purpose|tier|role|algorithm|principal_kind`)
is the lint's only signal. A future table with a different
enum-shaped name (e.g. `category`, `state`) would silently pass R4.

**Mitigation:** Schema-conventions.md §5 names the convention
(text + CHECK for bounded value spaces). Reviewers can still catch
violations on PR.

**Recommended v2:** Externalize the list to a config file, or detect
"low-cardinality" empirically via the existence of an adjacent CHECK
expression (i.e., flip the rule: any text column adjacent to a CHECK
on it is presumed enum-shaped — flag text columns *missing* CHECKs
only when the convention applies more broadly).

### L-3: Skip-comment placement is file-level, not column-level
**Location:** Schema modules (e.g. `agent-credentials.ts:31`)
**Finding:** Skip comments are placed at the top of each affected
file rather than adjacent to the offending column. The conventions
doc §9 says "Adjacent to the column or table definition" — both
satisfy the rule for table-level violations (R1, R2), but column-level
rules (R4) would want column-adjacent placement.

**Mitigation:** Only R1 and R2 currently produce skips on F02 schemas;
both are table-level concerns where file-top placement is semantically
correct.

**Recommended v2:** When R4 skips arise (none today), adjust
guidance to require column-adjacent placement; lint can verify
proximity (within 3 lines of the column declaration).

### L-4: AUDIT_TABLES env-var splitting tolerates spaces but not commas in names
**Location:** `scripts/check-schema-conventions.sh:226–229`
**Finding:** `IFS=',' read -r -a AUDIT_TBL_ARR <<<"$AUDIT_TABLES"` plus
`tr -d ' '` handles whitespace but no escaping. A table name with a
comma in it would split incorrectly.

**Risk:** Zero — PostgreSQL identifiers cannot contain unquoted commas
and the conventions doc forbids quoted identifiers.

**Recommended v2:** Document the constraint inline in the script
header. Already implicit via the conventions doc.

---

## INFO notes (no action)

### I-1: `set -u` without `-e`
**Location:** `scripts/check-schema-conventions.sh:34`
**Note:** Intentional. The lint is built around grep returning
non-zero when no match is found (normal flow). `set -e` would cause
early exit on every clean line. The script tracks failures via the
`VIOLATIONS` array and exits non-zero at the end.

### I-2: F02 schema modules now carry F03 skip comments
**Files:** 6 schema modules
**Note:** This is the documented resolution path (path b in spec
§EC-5). Skip-comments are functional metadata, not stylistic noise;
each carries a Reason and a doc reference. F02 reviewers should not
read these as F02 quality regressions.

### I-3: F02 regression check ran against tip
**Run:** `pnpm -r run test` → 242 + 142 = 384 passing on commit
`f8364b7`. Captured in `back-check-findings.md`. M-6 satisfied.

---

## Surface-by-surface notes

### `scripts/check-schema-conventions.sh`
- ✅ Idiomatic bash with portable patterns
- ✅ Output format consistent and grep-friendly
- ✅ Coverage footer easy to parse for downstream tooling
- ✅ Test harness exercises every rule + skip semantics + footer
- ⚠ See L-1, L-2 for v2 hardening

### `scripts/__tests__/check-schema-conventions.test.sh`
- ✅ 11/11 GREEN
- ✅ Fixtures isolate single rule per file
- ✅ Negative tests assert rule-id appears in output (not just exit code)
- ✅ Uses `assert_pass`/`assert_fail_with`/`assert_contains` for readable diagnostics
- ✅ R6 test creates ephemeral migrations dir to avoid polluting real `packages/db/migrations/`

### Governance docs (4 files)
- ✅ Consistent frontmatter (version, owner, last_reviewed, counsel_review status)
- ✅ Cross-references between artifacts use relative paths
- ✅ Constitutional anchors named per-section
- ✅ Changelog entries on every doc
- ✅ `data-classification.yaml` validates against the JSON-Schema contract

### Schema module skip-comments
- ✅ Every skip carries a Reason
- ✅ Every reason points back at `schema-conventions.md §2`
- ✅ No skips on R3, R4, R5, R6, R7 (only R1, R2 as expected)

### `.github/workflows/ci.yml`
- ✅ New job follows the `principal-coverage` pattern exactly
- ✅ Two steps: lint + self-tests (defense-in-depth)
- ✅ No `needs:` chain — runs in parallel with other CI jobs
- ✅ Name carries spec reference: `schema-conventions (F03 FR-6)`

### `package.json`
- ✅ Two new scripts (`schema:lint`, `schema:lint:test`) in correct alpha-ish order
- ✅ Doesn't disturb existing turbo-routed scripts

---

## OWASP / security checklist (defense-in-depth)

| Category | Applicable? | Status |
|---|---|---|
| Injection | partial — bash variable expansion | ✅ All user-supplied variables (env vars) are scoped to CI; not exposed to untrusted input. Quoting reviewed. |
| Auth/AuthZ | N/A | F03 adds no auth surface |
| Secrets | N/A | No secrets touched |
| XSS / CSRF / SSRF | N/A | No web surface |
| Dependency vuln | N/A | F03 adds zero dependencies |
| Logging | N/A | Lint output is structural, no credential exposure path |
| Crypto | N/A | F03 adds no crypto |

---

## Sign-off

- ✅ Tests pass (lint self-tests + F02 regression)
- ✅ CI gate wired
- ✅ Documentation complete + cross-linked
- ✅ Constitutional alignment maintained
- ✅ Zero CRITICAL/HIGH/MEDIUM findings
- 4 LOW findings deferred to v2 hardening (tracked here)

**Approved for T026 (open PR).**
