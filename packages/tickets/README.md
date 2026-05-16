# @spyglass/tickets

**Status:** alpha — F04 implementation in progress. B1–B5 are landed
on branch `04-ticket-store-state-machines`; B6+ read primitives and
web wiring remain.

The ticket spine. Three ticket types — `seeker_ticket`,
`employer_req_ticket`, `match_ticket` — each with its own state
machine and transition guards (PRD §5.1).

## Public API

- State-machine definitions and `assertTransition`.
- Identifier allocation and annual sequence rollover helpers.
- Repositories for seeker tickets, employer requisitions, and match
  tickets.
- In-transaction audit event helpers and a Drizzle-backed store adapter.

## Dependencies

Depends on `@spyglass/auth`, `@spyglass/db`, and `drizzle-orm`.

## Stability tier

Alpha until F04 ships. Public-API breaking changes follow
Constitution §III.3.
