# F03 Quickstart — Governance artifacts & schema-lint

**Spec:** v1.1 · **Plan:** v1.0 · **Date:** 2026-05-12

Scenarios that demonstrate F03 is in place. Each scenario is a manual
walkthrough; together they are the operator-run gate for F03 closure.

---

## Scenario 1 — A platform engineer adds a new table (US-1)

**Pre:** F03 has merged; F04 is starting. Engineer adds a new table.

**Steps:**
1. Open `docs/data-governance/schema-conventions.md`. Verify the required
   elements are listed (naming, timestamp triple, UUIDv7 PK, FK rules,
   enum CHECK, lint skip mechanism).
2. Create a new Drizzle schema module under
   `packages/db/src/schema/`. Omit `created_at`/`updated_at` (deliberate
   violation).
3. Run `pnpm schema:lint` locally.
4. Expect: non-zero exit; output names the missing rule and the
   offending file/line.
5. Add the timestamp triple. Re-run; expect a *different* error: the
   table isn't in `data-classification.yaml` yet.
6. Add the table + columns to `docs/data-governance/data-classification.yaml`.
7. Re-run; expect 0 violations.

**Pass criteria:** Every rule violation is caught and surfaces a usable
remediation hint. Adding the register entry unblocks the gate.

---

## Scenario 2 — An operator answers an erasure request (US-2)

**Pre:** Subject S has submitted a GDPR Art. 17 request.

**Steps:**
1. Open `docs/data-governance/data-classification.yaml`.
2. Find every column whose `class` is `identity_humanref` and trace
   the `data_subject_linkage` path back to `principal_id`.
3. Compile the list of (table, columns) tuples to tombstone.
4. Cross-reference the per-column `erasure` field for each — confirm
   `tombstone` vs `hard_delete` vs `redact_in_place` per column.
5. Execute the tombstone procedure (per F05 once landed; per the
   manual placeholder until then — see NFR-6 link in spec).

**Pass criteria:** The operator's worklist is reconstructible
mechanically from the register alone, no source-code reading required.

---

## Scenario 3 — An auditor reviews retention posture (US-3)

**Pre:** External auditor or counsel reviewing Spyglass for Phase 1.

**Steps:**
1. Open `docs/data-governance/retention-policy.md`.
2. For each data class in the document, confirm horizon (human + ISO-8601)
   and lawful basis are present.
3. Confirm no class has an indefinite horizon. Transitional sentinels
   (`transitional:<endpoint>`) name a concrete endpoint.
4. Cross-reference each class against
   `docs/data-governance/data-classification.yaml` to confirm coverage
   (every class referenced in the register has a policy entry).

**Pass criteria:** Single doc; complete coverage; counsel can sign off
without reading code.

---

## Scenario 4 — An engineer writes a migration (US-4)

**Pre:** Engineer needs to add a column to an existing F02 table.

**Steps:**
1. Open `docs/data-governance/schema-conventions.md` §8 (Migrations).
2. Identify the change category (additive). Confirm review gate is
   "default" (no special path).
3. Edit `packages/db/src/schema/<table>.ts`. Add the column.
4. Run `pnpm db:generate`. Drizzle-Kit creates
   `migrations/0005_f<N>_<slug>.sql`.
5. Run `pnpm schema:lint`. Expect failure if (a) new column is text +
   enum-shaped without CHECK, (b) new column is not classified in the
   register.
6. Add the column to `data-classification.yaml`. Re-run lint.

**Pass criteria:** Engineer cannot ship the migration without
classifying the new column and (where required) adding a CHECK.

---

## Scenario 5 — CI gates the schema-lint (US-5)

**Pre:** Engineer pushes a PR that adds a violation.

**Steps:**
1. Engineer pushes a branch with a new column lacking classification.
2. GitHub Actions runs the schema-lint job.
3. The job fails; status check `schema-lint` shows red on the PR.
4. The job's logs name the violating column.

**Pass criteria:** PR cannot merge until the engineer fixes the
violation. The lint is a required status check on the `main` branch
protection rule.

---

## Scenario 6 — Destructive change is rejected (FR-5, EC-5)

**Pre:** Engineer attempts a `DROP COLUMN` migration on
`audit_events_buffer`.

**Steps:**
1. Engineer authors `0006_<feature>_drop_audit_payload.sql` containing
   `ALTER TABLE audit_events_buffer DROP COLUMN payload;`.
2. Engineer pushes the PR.
3. Schema-lint rule R6 fires: destructive change on an
   audit-relevant table.
4. The PR cannot merge.

**Pass criteria:** The audit-table protection is mechanical, not
conventional. The engineer is steered to the tombstone procedure
(documented in F05 once landed; placeholder otherwise).

---

## Out-of-band (operator-run) gates for F03 closure

- **G-1.** Counsel review of `retention-policy.md` (the
  `$counsel_review: pending` flag flips to `reviewed_at: <date>`).
- **G-2.** Reviewer (Austin) pass on `schema-conventions.md` —
  the conventions document binds future contributors and deserves
  explicit reviewer approval.
- **G-3.** Walk Scenarios 1–6 end-to-end against the merged branch.
