# @spyglass/tickets

**Status:** alpha — F01 placeholder; populated in F04 (Ticket store +
state machines).

The ticket spine. Three ticket types — `seeker_ticket`,
`employer_req_ticket`, `match_ticket` — each with its own state
machine and transition guards (PRD §5.1).

## Public API

To be defined in F04. Will export the ticket types, state-machine
definitions, transition guards, and the read/write store interface.

## Dependencies

Will depend on `@spyglass/shared` and `@spyglass/db`.

## Stability tier

Alpha until F04 ships. Public-API breaking changes follow
Constitution §III.3.
