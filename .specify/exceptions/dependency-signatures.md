# Dependency Signature Exceptions Register

**Purpose:** Per Constitution v2.0.0 §I.C.2, Spyglass verifies upstream
provenance attestations (npm CLI 10.5+) for production dependencies
where they exist. Packages without published provenance are recorded
here with a one-line rationale.

**Reviewed:** at every release; promote-to-required is a MINOR
constitution amendment when ecosystem coverage is sufficient.

**Format:** one Markdown table row per package. Columns:

- **Package** — npm name (`@scope/name`).
- **Version range** — semver expression matching the range we tolerate
  unsigned. Tighten over time; don't blanket allow all versions.
- **Reason** — why upstream doesn't publish provenance. Common values:
  - `pre-provenance` — package predates npm provenance and hasn't
    re-released since.
  - `not-yet-adopted` — maintainer hasn't added provenance to their
    publish workflow.
  - `transitive-only` — we don't direct-depend; transitive via X.
- **First added** — date the exception was filed.
- **Reviewer** — who approved the exception.

**Hard rule:** signature **mismatches** (not "no signature") are
**never** allowlisted. A mismatch is a real attack signal and fails
the build unconditionally per the revised FR-14.

---

## Active exceptions

| Package | Version range | Reason | First added | Reviewer |
|---|---|---|---|---|
| _(none yet — F01 baseline; populated as `npm audit signatures` runs surface unsigned deps)_ | | | | |

---

## How to add an entry

1. CI's `dep-signatures` step fails with the package name and reason.
2. Investigate: is there a signed alternative? A newer version with
   provenance? If yes, prefer the signed path.
3. If not, add a row to the table above with rationale and reviewer
   name. Commit alongside the `pnpm install` change that introduced
   the dep.
4. The PR that adds the exception is reviewed against §I.C.2 — the
   reviewer is attesting that the unsigned dep is acceptable for the
   current jurisdictional posture.

## Removing an entry

When a package starts publishing provenance:

1. Remove the row.
2. Re-run CI; if `npm audit signatures` now passes for that package,
   the exception is no longer needed.
3. If it doesn't pass (mismatch), that's an attack signal — investigate
   immediately, do **not** restore the exception.

## Escalation

Sustained growth in this register is itself a signal. If we accumulate
> 20 exceptions, escalate at next release planning: are we using
ecosystem-fringe packages? Should we replace any?
