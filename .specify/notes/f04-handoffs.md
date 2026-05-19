# F04 Handoffs

**Created:** 2026-05-19
**Source feature:** `04-ticket-store-state-machines`
**Purpose:** Capture the stable seams downstream feature owners should consume after F04 merged to `main`.

## F05 — Audit Log + Transcript Store + Tombstone

- Ticket transition events now use `spyglass/ticket-transition-event.v1` at `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`.
- F04 writes transition events through the same payload shape F05 should ingest into the hash-chained audit log. A `.v2` schema requires a coordinated F04 + F05 change.
- `audit_events_buffer` remains the pre-F05 buffer and should be migrated or replayed into the canonical F05 log during cutover.
- F04 repository transitions emit audit events inside the same transaction as the ticket mutation. F05 should preserve no-loss semantics for ticket state transitions.

## F06 — Jurisdiction Gates + Kill Switches

- `seeker_tickets.jurisdictions` and `employer_req_tickets.jurisdictions` are available as non-empty jurisdiction arrays.
- `match_tickets.decision_locus_jurisdiction` is available and indexed for policy-gate joins.
- Jurisdiction-gate failures should reference the match ticket and source ticket identifiers rather than re-deriving jurisdiction from untrusted request input.

## F08 — Parley Runner

- `tickets.match.advance` is the stable service scope for match creation, advancement, delivery, acceptance/rejection, expiration, and renegotiation surfaces.
- `fetchMatchJoinGraph` is available for scoped service callers that need the match ticket plus source ticket references and decision locus.
- Match ticket round, attempt, run id, and dossier id bookkeeping are represented on the F04 match record; F08 should mutate them only through F04 procedures.

## F09 — Privacy Filter

- `TicketProjection<K extends TicketKind>` is exported from `@spyglass/tickets`.
- F04 ships the default projection that exposes owned fields and hides cross-side fields.
- F09 should replace the default with ruleset-driven projections and preserve the F04 no-leak baseline as the fail-closed behavior.
