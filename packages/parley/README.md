# @spyglass/parley

**Status:** alpha — F01 placeholder; populated in F08 (Parley runner),
F08.5 (Tool surface & dispatcher), F09 (privacy filter), F10 (dossier
builder + signer), F11 (notification artifacts).

The Parley negotiation harness — runner, privacy filter, rubric
registry interface, audit log writes, dossier builder + signer.
Implements `/mnt/f/parley/SPEC.md`.

## Public API

To be defined in F08+. The match-ticket run container is the unit
this package owns.

## Dependencies

Will depend on `@spyglass/shared`, `@spyglass/tickets`,
`@spyglass/agents`, `@spyglass/ai` once those packages land.

## Stability tier

Alpha until Phase 0 alpha launch. Public-API breaking changes follow
Constitution §III.3.
