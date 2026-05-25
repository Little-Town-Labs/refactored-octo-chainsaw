# Spyglass agents.md

Spyglass is a two-sided AI hiring platform. The seeker product is conversation-first:
seekers work with a Spyglass-hosted advocate through Telegram, email, and Clerk-authenticated
web chat. The public web surface is limited to account setup, profile/account management,
public discovery, and agent-readable instructions.

## Human Entry Points

- Landing page: `/`
- Seeker sign up: `/sign-up`
- Seeker sign in: `/sign-in`
- Seeker account/profile management: `/profile`

## Agent Entry Points

- LLM-readable site summary: `/llms.txt`
- A2A card index: `/.well-known/a2a/index.json`
- A2A card: `/.well-known/a2a/seeker-intake.json`
- A2A card: `/.well-known/a2a/employer-intake.json`
- A2A card: `/.well-known/a2a/match-coordinator.json`
- A2A card: `/.well-known/a2a/negotiation-participant.json`
- A2A card: `/.well-known/a2a/dossier-reader.json`

## A2A Status

F21 publishes A2A discovery cards for future interop. Runtime A2A protocol handlers are
not live in v0 and are not required for the v0 customer flow. Cards describe availability,
auth posture, unsupported actions, and documentation pointers.

## Unsupported Actions

Spyglass does not provide a seeker dashboard, ticket-list web UI, analytics view,
recommended-jobs grid, job-browsing surface, public seeker profile, raw transcript view,
hidden run-state view, direct employer messaging, or external agent replacement for the
Spyglass-hosted seeker advocate in v0.

## Governance References

The public source of product scope is the landing page plus this file and `/llms.txt`.
Detailed governance lives in repository specs and the constitution; public discovery files
do not expose private tickets, dossiers, transcripts, scoring internals, secrets, or
operational runbooks.
