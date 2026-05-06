# @spyglass/shared

**Status:** alpha — F01 placeholder; populated incrementally from F01 onward.

Cross-cutting utilities consumed by every other package: typed env
manifest (Zod schema), shared error types, common type aliases.

## Public API

- `./` — index entry. Currently exports a marker constant only.
- `./env` — typed environment-variable schema (added in F01 task T019).

## Stability tier

Alpha until F03 lands. Public-API breaking changes follow Constitution
§III.3 (semver, N-2 backwards-compat once stable).
