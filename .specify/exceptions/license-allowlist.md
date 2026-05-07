# License Allowlist

**Purpose:** Per research D11, Spyglass restricts production
dependencies to licenses that are clearly compatible with our
distribution model. CI fails on any production dep using a license
not on this list, unless an explicit exception is recorded below.

**Source of truth:** the `ALLOWED_LICENSES` array in
`.github/workflows/ci.yml` license job. Keep both in sync — drift is
its own bug.

## Allowed licenses (production dependencies)

These are permissive and pose no integration risk:

- `MIT`
- `Apache-2.0`
- `BSD-2-Clause`
- `BSD-3-Clause`
- `ISC`
- `0BSD`
- `Unlicense`
- `CC0-1.0`
- `BlueOak-1.0.0`
- `CC-BY-4.0` (documentation/data only — flag if a code dep declares this)

## Not allowed

These are blocked because they impose terms we don't want to inherit:

- `GPL-*` — copyleft; cannot bundle into a closed SaaS.
- `AGPL-*` — even stronger copyleft; would require open-sourcing
  Spyglass on network use.
- `LGPL-*` — only allowable with dynamic linking; for npm deps this is
  rarely viable. Flag for review.
- `BUSL-*` — Business Source License; flag for review per-package.
- `SSPL-*` — Server Side Public License; cannot use as a SaaS service.

## Active exceptions

| Package | Version range | License | Reason | First added | Reviewer |
|---|---|---|---|---|---|
| _(none yet — F01 baseline)_ | | | | | |

## How to add an exception

If a critical dep uses a license not on the allowlist:

1. **First** — look for a permissively-licensed alternative.
2. If none exists, justify in writing here:
   - Why this specific package is necessary.
   - Why no alternative is acceptable.
   - Counsel review (if AGPL/SSPL/BUSL).
3. Add the row above and the matching `--excludePackages` flag in
   the CI license-checker step. Both must change together.

## Dev dependencies

Dev deps are not subject to the strict allowlist (they don't ship to
production). However, GPL/AGPL dev deps still warrant review — if our
build pipeline embeds GPL output, that output may be distributable.
The CI license job covers `--production` only by default; tighten if
the threat model changes.
