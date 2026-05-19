# Phase 0 — Research notes for F04

**Spec:** v1.1 · **Plan:** v1.0 · **Date:** 2026-05-12 · **Owner:** Gary

F04 inherits its stack from F01–F03. Three high-level decisions (CL-1,
CL-2, CL-3) were resolved in `/speckit-clarify`. This file records the
four implementation-shape decisions Phase 0 opened.

---

## R-1 — Typed state-machine implementation

### Options

**A. TypeScript discriminated unions + `assertTransition` function**
- Single typed transition map per kind; compile-time enforcement.
- F02 already uses typed errors + HOF guards (`withPrincipal`).
- Zero new dependencies.

**B. XState library**
- Hierarchical / parallel state support; visualizer.
- Adds runtime dep; framework lock-in.
- Spyglass state machines are flat; library surface > problem surface.

**C. Database-driven transitions table**
- Centralizes rules in a queryable form.
- Loses compile-time enforcement (NFR-5).
- Adds a join on every mutation.

### Decision: **A.**

### Rationale
- Compile-time enforcement satisfies NFR-5.
- Mirrors F02's pattern; reviewers don't learn a new framework.
- Mermaid artifact (FR-14) serves the visualization need.
- Upgrade path to XState exists if hierarchical states become needed.

### Tradeoff
Adding a new state requires touching both the type union AND the
transition map AND the test list — three places. Mitigation: the
state-machine coverage gate (Plan §4.7 Gate A) catches drift.

---

## R-2 — Audit emission: in-transaction vs outbox

### Options

**A. In-transaction (F02 pattern)**
- Audit insert in same DB transaction as row mutation.
- Failed emit rolls back the mutation.
- Simple; F02 already proved it on `audit_events_buffer`.

**B. Outbox pattern**
- Mutation writes the audit row to an outbox table.
- Relay process reads outbox and forwards to sink.
- At-least-once delivery guarantees.
- Adds operational complexity.

### Decision: **A.**

### Rationale
- F02 set precedent and the pattern works.
- F05 (hash-chained log) cutover is a sink rename; composes cleanly.
- v0 scale doesn't justify outbox complexity.

### Tradeoff
A hot-write contention scenario could throttle. Revisit if observed.

---

## R-3 — Identifier allocator implementation detail

CL-3 resolved the *strategy* (PostgreSQL sequences per kind per year).
This research entry records the implementation detail.

### Decision: bootstrap *next year's* sequences a month early.

### Rationale
The naive year-rollover at exactly Jan 1 00:00 UTC creates a
practically-unreachable but theoretically possible window where a
burst of ticket creates at 23:59:59 Dec 31 might race against the
Inngest fn that creates the new sequence. Pre-creating one month
early eliminates the race entirely.

### Implementation
- Inngest cron `0 0 1 12 *` (Dec 1 each year, UTC).
- Body: `CREATE SEQUENCE IF NOT EXISTS <kind>_<NEXT_YYYY>_seq START 1;`
  for each of 3 kinds.
- Idempotent; safe to re-run.
- Emits audit event `identifier_sequences.bootstrapped` per
  successful create.

### Alternatives rejected
- **Pre-create at deploy time only:** loses annual automation; requires
  ops to remember.
- **Lazy create on first ticket of new year:** introduces a startup
  race; complicates the hot path.

---

## R-4 — Package layout: extend `@spyglass/db` vs new `@spyglass/tickets`

### Options

**A. Single new package `@spyglass/tickets`** + extend `@spyglass/db`
schema modules
- Domain logic separates from persistence (parity with
  `@spyglass/auth` vs `@spyglass/db`).
- Clear public API; testable in isolation.

**B. Inline in `apps/web`**
- Faster to start; less ceremony.
- Couples domain logic to the Next app; hard to share with future
  Inngest functions or service workers.

**C. Inline in `@spyglass/db`**
- Co-locates schema + domain logic.
- Violates F03's "schema modules are persistence-only" boundary
  (currently maintained by F02's `@spyglass/auth` carrying auth logic).

### Decision: **A.**

### Rationale
- F02 already shaped the precedent: schema in `@spyglass/db`,
  domain logic in `@spyglass/auth` / `@spyglass/tickets`.
- Inngest functions (annual rollover, future re-negotiation timer)
  will import from `@spyglass/tickets`; if it lived in `apps/web` they
  couldn't.
- Future BYO seeker-agent path (PRD §3.3, F-TBD) may import the
  ticket repos directly outside the web app.

### Tradeoff
One more package to maintain (build, lint, test config). Cost is
small; the boundary clarity earns it.

---

## R-5 — Audit-event payload schema versioning

(Added during planning; minor detail.)

The transition-event JSON Schema (`contracts/transition-event.schema.yaml`)
is versioned by `$id` (`spyglass/ticket-transition-event.v1`).
Breaking schema changes increment to `.v2` and the spec records the
migration path.

F05's hash-chained log MUST accept `.v1` payloads unchanged; any
future payload-shape change is a coordinated F04+F05 deliverable.

---

## References checked

- Parley SPEC `/mnt/f/parley/SPEC.md` §4.1.1 (Match Ticket fields),
  §4.1.4 (Negotiation Run), §4.2 (Stable Identifiers), §7 (Run State
  Machine), §13 (audit-log + transcript separation).
- F02 spec (`.specify/specs/02-identity-auth-aaa/spec.md`) — Principal
  model, audit sink pattern, withPrincipal HOF.
- F03 spec + governance docs — register, retention policy, conventions,
  invariants catalog.
- F03 schema-lint (`scripts/check-schema-conventions.sh`) — rules
  F04's new tables must satisfy.
- PRD §3 (users + intents), §11.5 (data spine is "first spec"), §13
  (audit log scope).
- Constitution v2.0.0 — §I.2, §I.4, §I.5, §I.6, §I.A.1, §II, §III, §IV.A.
