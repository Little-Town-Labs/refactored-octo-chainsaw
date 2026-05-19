# Implementation Plan — F04 Ticket Store + State Machines

**Feature ID:** F04
**Branch:** `04-ticket-store-state-machines`
**Plan version:** v1.0 (2026-05-12)
**Owner:** Gary
**Spec:** `.specify/specs/04-ticket-store-state-machines/spec.md` v1.1
**Constitution:** v2.0.0
**Stack baseline:** Next.js 16 (App Router) + Drizzle ORM 0.45 + Drizzle-Kit 0.31
+ PostgreSQL on Neon + pnpm/Turborepo monorepo (F01); `@spyglass/db`
already exists with F02's schema modules + F03's governance
conventions enforced at CI.

---

## 1. Executive summary

F04 produces three new tables (`seeker_tickets`, `employer_req_tickets`,
`match_tickets`) under F03's governance umbrella, each with a typed
state machine, and the supporting infrastructure for transition events
and identifier allocation.

**New packages.** Zero. F04 extends `@spyglass/db` (schema modules +
migrations) and creates a new domain package `@spyglass/tickets` for
the state-machine + transition validators + read primitives.
Tickets-related server actions / tRPC procedures live in `apps/web`
behind `withPrincipal` per F02 NFR-11.

**New CI gates.** Two:
1. `tickets-state-machine-coverage` — verifies every named transition
   in the typed graph has a corresponding test (M-1).
2. `tickets-audit-payload-shape` — verifies every emitted audit event
   matches a documented payload schema (NFR-4).

**Estimated effort:** ~80–120 hours across 9 phases (B1–B9).
Complexity-L estimate (4–6 weeks).

---

## 2. Phase -1 — Constitutional gates

| Article | Requirement | F04 compliance |
|---|---|---|
| **§I.1 Confidentiality** | Privacy filter is non-bypassable | Read primitives enforce cross-side isolation (NFR-9); F09 owns projection rules; F04 owns the no-leak default |
| **§I.2 Integrity** | State transitions versioned & auditable | FR-2 (named transitions) + FR-5 (event emission) + FR-14 (Mermaid artifact) |
| **§I.2 Append-only audit** | No destructive change on audit-relevant tables | F04 adds 0 destructive SQL; ticket rows soft-delete via `disabled_at` (F03 §2) |
| **§I.4.1 Lawful basis** | Per-personal-data-column basis | F04 extends F03's register with new entries; lawful basis declared per column |
| **§I.4.2 Retention** | Per-class horizons, never indefinite | New classes (`ticket_intent`, `ticket_match`) added to F03 policy with horizons |
| **§I.4.3 Tombstone** | Erasure honors data-subject rights | Personal-data columns on tickets carry `erasure: tombstone`; redaction follows F02 T069 pattern |
| **§I.5.1 Authentication** | Every mutation authenticated | FR-4 (`withPrincipal` on every action; principal-coverage gate enforces) |
| **§I.5.2 Authorization** | Least privilege | Two new scopes: `tickets.match.advance`, `tickets.transition.operator` |
| **§I.5.3 Accountability** | Every action attributable | FR-5 transition events carry `principal_id` + `correlation_id` |
| **§I.6 DiD** | Multiple layers reject illegal transitions | Type system (NFR-5) + runtime validator (FR-3) + CHECK constraints (FR-11) + schema-lint (NFR-8) |
| **§I.A.1 Jurisdiction** | Captured at ticket creation | FR-6 + dedicated `jurisdictions` column on every ticket-kind row |
| **§II Agent-Native** | Agents read canonical tickets, never invent | Read primitives (FR-9) + scope wall (only service principal w/ `tickets.match.advance` can mutate `match_tickets.round`) |
| **§III Simplicity** | Max 3 projects initially | F04 adds 1 new domain package (`@spyglass/tickets`); 0 new services; 0 new infra |
| **§IV.A Test-first** | Tests precede implementation | B3 ships transition validator tests RED before B4 ships the validator |

**No constitutional exceptions requested.**

---

## 3. Phase 0 — Research & technology decisions

The clarifications in spec.md §8 already pinned three high-level
decisions. Phase 0 research records the four implementation-shape
decisions that remained open after spec finalization.

### R-1 — Typed state-machine implementation (CL-1 follow-through)

**Decision: TypeScript discriminated unions + a single
`assertTransition` function, package-internal to `@spyglass/tickets`.**

**Shape:**
```
// public type
type SeekerState = 'draft' | 'submitted' | 'screening' | 'matching'
                 | 'matched' | 'closed' | 'withdrawn';

// transition map (compile-time enforcement)
type SeekerTransition =
  | { from: 'draft', to: 'submitted' }
  | { from: 'submitted', to: 'screening' | 'withdrawn' }
  | { from: 'screening', to: 'matching' | 'closed' }
  | { from: 'matching', to: 'matched' | 'withdrawn' | 'closed' };

// runtime gate
assertTransition<K extends TicketKind>(
  kind: K,
  current: StateOf<K>,
  next: StateOf<K>,
  ctx: { principal, invariants, reason_code? }
): void;  // throws on rejection
```

**Why not XState:** library surface > problem surface for flat machines;
F02 patterns don't use it; adds a dep without earning the visualizer
benefit (Mermaid artifact in FR-14 already serves that purpose).

**Why not DB transition table:** would lose compile-time enforcement
(NFR-5), add a join on every mutation hot path, and split rule
authoring across TS + SQL.

### R-2 — Audit emission: in-transaction or outbox? (NFR-4 follow-through)

**Decision: in-transaction.**

The audit-event insert occurs in the same DB transaction as the row
mutation. Rollback of either rolls back both. Mirrors F02's existing
`auditEventsBuffer` write pattern (F02 T059a).

**Why not outbox:**
- Outbox pattern adds operational complexity (relay process, retry
  semantics, exactly-once concerns) that we don't need at v0 scale.
- F02 already proved in-transaction works on top of `audit_events_buffer`.
- F05 (hash-chained log) cutover is a sink-target rename; the
  in-transaction pattern composes cleanly when F05 swaps the sink.

**Tradeoff:** a hot audit-write contention scenario could throttle
the mutation. Acceptable at v0; revisit if observed.

### R-3 — Identifier allocation: implementation detail (CL-3 follow-through)

**Decision: one PostgreSQL sequence per (kind × year), bootstrapped
by migration; annual rollover by Inngest cron at `00:00 UTC` on Jan 1.**

**Migration shape:**
```
CREATE SEQUENCE seeker_tickets_2026_seq START 1 OWNED BY NONE;
CREATE SEQUENCE employer_req_tickets_2026_seq START 1 OWNED BY NONE;
CREATE SEQUENCE match_tickets_2026_seq START 1 OWNED BY NONE;
```

**Identifier-build helper (server-side):**
```
const seq = await db.execute(sql`SELECT nextval('seeker_tickets_2026_seq')`);
const id = `ST-2026-${String(seq).padStart(5, '0')}`;
```

**Annual rollover Inngest fn:**
- Schedule: cron `0 0 1 1 *` UTC.
- Body: `CREATE SEQUENCE IF NOT EXISTS <kind>_<YYYY+1>_seq START 1`.
- Emits audit event `identifier_sequences.rolled_over`.

**EC-9 (collision) becomes practically unreachable** — `nextval()` is
atomic and a unique constraint on `identifier` is defense-in-depth.

### R-4 — Package layout

**Decision: new domain package `@spyglass/tickets`** at
`packages/tickets/` with these exports:

```
@spyglass/tickets
├── src/
│   ├── index.ts                    # public API surface
│   ├── states.ts                   # SeekerState, EmployerReqState, MatchState
│   ├── transitions.ts              # transition maps + assertTransition
│   ├── errors.ts                   # typed errors
│   ├── identifiers.ts              # nextIdentifier(kind)
│   ├── audit.ts                    # emitTransitionEvent
│   ├── repo/
│   │   ├── seeker.ts               # Drizzle-backed seeker repo
│   │   ├── employer-req.ts
│   │   ├── match.ts
│   │   └── read.ts                 # cross-kind read primitives
│   └── __tests__/...
```

Schema modules + migrations live in `@spyglass/db` (parity with F02);
the domain package consumes the Drizzle tables. Same boundary
discipline F02 used between `@spyglass/auth` and `@spyglass/db`.

---

## 4. Phase 1 — Design & contracts

### 4.1 Data model

See `data-model.md` for the canonical ER diagram + the three state-machine
Mermaid diagrams. The three new tables:

#### `seeker_tickets`
| Column | Type | Constraints | Class | Erasure |
|---|---|---|---|---|
| `seeker_ticket_id` | uuid | PK, `uuidv7()` | ticket_intent | tombstone |
| `principal_id` | uuid | FK → principals, NOT NULL | identity_principal (linkage) | tombstone |
| `identifier` | text | UNIQUE NOT NULL, CHECK shape `ST-YYYY-NNNNN` | ticket_intent | tombstone |
| `state` | text | CHECK in seeker enum | ticket_intent | hard_delete |
| `role_family` | text | NOT NULL | ticket_intent | tombstone |
| `comp_band_min` | integer | NOT NULL ≥0 | ticket_intent | tombstone |
| `comp_band_max` | integer | NOT NULL ≥ `comp_band_min` | ticket_intent | tombstone |
| `currency` | text | NOT NULL CHECK ISO-4217 | ticket_intent | hard_delete |
| `jurisdictions` | jsonb | NOT NULL non-empty array | ticket_intent | tombstone |
| `work_mode` | text | NOT NULL CHECK in {`remote`,`hybrid`,`onsite`} | ticket_intent | hard_delete |
| `flags` | jsonb | NOT NULL default `[]` (lowercase strings) | ticket_intent | tombstone |
| `created_at` / `updated_at` / `disabled_at` | timestamptz | F03 standard | ticket_intent | tombstone |

#### `employer_req_tickets`
| Column | Type | Constraints | Class | Erasure |
|---|---|---|---|---|
| `employer_req_ticket_id` | uuid | PK, `uuidv7()` | ticket_intent | tombstone |
| `principal_id` | uuid | FK → principals, NOT NULL | identity_principal | tombstone |
| `org_id` | uuid | FK → organizations, NOT NULL | identity_principal | tombstone |
| `identifier` | text | UNIQUE NOT NULL, CHECK `ER-YYYY-NNNNN` | ticket_intent | tombstone |
| `state` | text | CHECK in employer-req enum | ticket_intent | hard_delete |
| `role_title` | text | NOT NULL | ticket_intent | tombstone |
| `role_level` | text | NOT NULL CHECK in level enum | ticket_intent | hard_delete |
| `comp_band_min` / `comp_band_max` / `currency` | as above | as above | ticket_intent | tombstone |
| `jurisdictions` | jsonb | NOT NULL non-empty | ticket_intent | tombstone |
| `work_mode` | text | as above | ticket_intent | hard_delete |
| `headcount_total` | integer | NOT NULL ≥1 | ticket_intent | tombstone |
| `headcount_filled` | integer | NOT NULL default 0; CHECK 0 ≤ filled ≤ total | ticket_intent | tombstone |
| `flags` | jsonb | NOT NULL default `[]` | ticket_intent | tombstone |
| `created_at` / `updated_at` / `disabled_at` | as F03 | | ticket_intent | tombstone |

#### `match_tickets`
| Column | Type | Constraints | Class | Erasure |
|---|---|---|---|---|
| `match_ticket_id` | uuid | PK, `uuidv7()` | ticket_match | tombstone |
| `identifier` | text | UNIQUE NOT NULL, CHECK `MT-YYYY-NNNNN` | ticket_match | tombstone |
| `seeker_ticket_id` | uuid | FK → seeker_tickets, NOT NULL | ticket_match | tombstone |
| `employer_req_ticket_id` | uuid | FK → employer_req_tickets, NOT NULL | ticket_match | tombstone |
| `state` | text | CHECK in match enum | ticket_match | hard_delete |
| `round` | integer | NOT NULL ≥0, CHECK `round <= round_cap` | ticket_match | hard_delete |
| `round_cap` | integer | NOT NULL ≥1 | ticket_match | hard_delete |
| `run_id` | uuid | NULL until `negotiating` | ticket_match | tombstone |
| `attempt` | integer | NOT NULL ≥1 default 1 | ticket_match | hard_delete |
| `seeker_contract_id` / `seeker_contract_version` | text | NOT NULL | ticket_match | hard_delete |
| `employer_contract_id` / `employer_contract_version` | text | NOT NULL | ticket_match | hard_delete |
| `privacy_ruleset_id` / `privacy_ruleset_version` | text | NOT NULL | ticket_match | hard_delete |
| `decision_locus_jurisdiction` | text | NOT NULL ISO-3166-2 | ticket_match | tombstone |
| `flags` | jsonb | NOT NULL default `[]` | ticket_match | tombstone |
| `dossier_id` | uuid | NULL until `delivered` (no FK until F10 — per CL-2) | ticket_match | tombstone |
| `created_at` / `updated_at` / `disabled_at` | as F03 | | ticket_match | tombstone |

**Idempotency constraint** (FR-8): `UNIQUE (seeker_ticket_id, employer_req_ticket_id, attempt)`.
**Hot-path partial index:** `(state) WHERE state IN ('matching','negotiating')` per kind.

### 4.2 State machines (Mermaid summary — full in `data-model.md`)

**Seeker:**
`draft → submitted → screening → matching → {matched | withdrawn | closed}`
plus `submitted → withdrawn`, `screening → closed`.

**Employer-req:**
`draft → submitted → open → matching → {filled | closed}` plus
`matching → matching` (multi-headcount), `open → closed`,
`submitted → withdrawn`.

**Match:**
`created → negotiating → delivered → {accepted | rejected}` plus
`negotiating → expired`, `created → rejected`, `delivered → negotiating`
(re-negotiation per EC-7, only allowed when `attempt` is bumped and
`run_id`/`dossier_id` are cleared in the same transaction).

### 4.3 Transition contract (TypeScript)

`@spyglass/tickets` public API:

```typescript
// Typed states + transitions (compile-time enforcement).
export type TicketKind = 'seeker' | 'employer_req' | 'match';
export type StateOf<K extends TicketKind> = …; // distrim. union per kind

export interface TransitionContext<K extends TicketKind> {
  principal: Principal;
  current: StateOf<K>;
  next: StateOf<K>;
  reason_code?: ReasonCode;
  invariants?: Record<string, unknown>;
}

// Runtime gate. Throws typed errors on rejection.
export function assertTransition<K extends TicketKind>(
  kind: K, ctx: TransitionContext<K>
): asserts ctx is ValidTransitionContext<K>;

// Typed errors
export class IllegalTransitionError extends Error {}
export class MissingScopeError extends Error {}
export class InvariantViolationError extends Error {}
export class MissingReasonCodeError extends Error {}
export class IdempotencyConflictError extends Error {}
```

### 4.4 Audit-event payload contract (FR-5)

JSON Schema at `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`:

```yaml
$id: spyglass/ticket-transition-event.v1
type: object
required: [event_name, principal_id, correlation_id, payload]
properties:
  event_name:
    type: string
    pattern: "^(seeker|employer_req|match)_ticket\\.[a-z_]+$"
  principal_id: { type: string, format: uuid }
  correlation_id: { type: string }
  payload:
    type: object
    required: [ticket_id, ticket_identifier, ticket_kind, from_state, to_state]
    properties:
      ticket_id: { type: string, format: uuid }
      ticket_identifier: { type: string }
      ticket_kind: { enum: [seeker, employer_req, match] }
      from_state: { type: string }
      to_state: { type: string }
      reason_code: { type: string }     # only on operator transitions
      notes_present: { type: boolean }  # never the raw notes (T069 pattern)
      run_id: { type: [string, "null"], format: uuid }    # match only
      dossier_id: { type: [string, "null"], format: uuid } # match only
      attempt: { type: integer, minimum: 1 }              # match only
```

This contract is what F05's hash-chained log adopts unchanged at cutover.

### 4.5 Read-primitives contract (FR-9)

`@spyglass/tickets/src/repo/read.ts` exports:

```typescript
listByPrincipal(principal_id, kind?, opts): Promise<Page<TicketRow>>
listByOrg(org_id, kind, opts): Promise<Page<EmployerReqTicketRow>>
listByState(kind, state, opts): Promise<Page<TicketRow>>
listByJurisdiction(juris, kind?, opts): Promise<Page<TicketRow>>
fetchById(kind, ticket_id): Promise<TicketRow | null>
fetchByIdentifier(kind, identifier): Promise<TicketRow | null>
fetchMatchJoinGraph(match_ticket_id): Promise<MatchJoinGraph | null>
```

Each accepts a `Principal` and rejects access that would leak across
the seeker / employer boundary (NFR-9). Service principals (with
appropriate scope) bypass tier-side filtering for read access only;
mutations still require scope + transition validator.

### 4.6 F03 governance amendments

A single PR-internal commit (or first commit of F04) amends:

- `docs/data-governance/data-classification.yaml`:
  - new classes: `ticket_intent` (high), `ticket_match` (high)
  - new tables: `seeker_tickets`, `employer_req_tickets`, `match_tickets`,
    `identifier_sequences` (the table backing rollover audit) if any
- `docs/data-governance/retention-policy.md`:
  - `ticket_intent`: 7 years from `disabled_at` (matches employer audit retention)
  - `ticket_match`: 7 years from terminal-state entry
- `docs/data-governance/integrity-invariants.md`:
  - all new CHECK/UNIQUE/PARTIAL/FK rows per the §4.1 schema

**These changes pass the schema-lint** before any F04 code lands.

### 4.7 New CI gates

#### Gate A — `tickets-state-machine-coverage`
- Script: `scripts/check-tickets-state-machine.sh`.
- Reads the transition map in `packages/tickets/src/transitions.ts`.
- Asserts every named transition has a positive test in
  `packages/tickets/src/__tests__/transitions.test.ts`.
- Asserts every illegal pair (cartesian product minus legal pairs)
  has a negative test.
- Exits non-zero on mismatch.
- Required CI status check.

#### Gate B — `tickets-audit-payload-shape`
- Script: validate every `emitTransitionEvent` call's static payload
  shape against the JSON-Schema contract at
  `.specify/specs/04-ticket-store-state-machines/contracts/transition-event.schema.yaml`.
- Implementation: a Jest unit test exercising every transition that
  asserts the emitted payload validates against the schema.
- Surfaces in the existing `test` CI job (no new job needed); a
  failure surfaces as a normal test failure.

### 4.8 Test strategy

| Surface | Test type | Location | Article |
|---|---|---|---|
| Typed transition map | TS compile (`tsc --noEmit`) | `@spyglass/tickets` | NFR-5 |
| `assertTransition` runtime | Jest unit | `packages/tickets/src/__tests__/transitions.test.ts` | NFR-1 |
| Repository (Drizzle) | Jest integration against pg-proxy | `packages/tickets/src/__tests__/repo/*.test.ts` | FR-1..FR-3 |
| Audit emission shape | Jest unit (JSON-Schema validator) | `…/audit.test.ts` | FR-5, NFR-4 |
| Read primitives + cross-side isolation | Jest unit + integration | `…/repo/read.test.ts` | NFR-9 |
| Server-action / tRPC wiring | Jest in `apps/web` | `apps/web/src/tickets/__tests__/` | FR-4 |
| F02 regression | `pnpm -r run test` on PR head | CI | M-4 |
| State-machine coverage gate | bash + grep | `scripts/check-tickets-state-machine.sh` | M-1 |
| Schema-lint | F03's lint | CI | NFR-8 |

**Target coverage:** ≥80% per the global testing rule. Transitions are
**100%** covered (positive + negative tests for every pair).

---

## 5. Implementation phases (B1–B9)

| Phase | Scope | Effort |
|---|---|---|
| **B1 — Skeleton + governance amendments** | `packages/tickets/` scaffold; F03 register/policy/invariants amendments; CI gate scaffolding (red) | 4h |
| **B2 — Schema + migrations** | 3 new schema modules in `@spyglass/db`; migration `0005_f04_ticket_store.sql`; identifier sequences; partial indexes | 8h |
| **B3 — State + transitions (TDD)** | `states.ts`, `transitions.ts`, `errors.ts`; transition-map tests RED → GREEN; state-machine coverage gate green | 12h |
| **B4 — Identifier allocator** | `identifiers.ts` (server-side nextval); annual-rollover Inngest fn; tests | 6h |
| **B5 — Repository + audit emission** | Drizzle-backed repos per kind; in-transaction audit emission to `audit_events_buffer`; payload-shape tests | 16h |
| **B6 — Read primitives + cross-side isolation** | `repo/read.ts`; tier-side filtering; service-principal carve-out; NFR-9 tests | 10h |
| **B7 — Server actions / tRPC wiring** | `apps/web/src/tickets/` actions: submit-seeker, submit-employer-req, create-match, operator-transition, withdraw, amend (EC-8), Parley-advance; `withPrincipal` on every action; principal-coverage gate green | 16h |
| **B8 — Quickstart + integration scenarios** | Quickstart §1..§N walkthroughs; staged dev-run scenario covering 100/100/50/25 (M-2) | 12h |
| **B9 — Analyze + review + PR** | `/speckit-analyze` clean; `/code-review` clean; back-check resolves; PR + merge | 6h |

**Total:** ~90h (≈4 weeks at 22h/week). Matches complexity-L estimate.
(88h plan baseline + 2h for T035b amendment surface added by
`/speckit-analyze` to cover EC-8.)

---

## 6. Tradeoffs & risks

### Tradeoff 1 — Server actions vs tRPC
Spyglass already mixes Next 16 server actions (operator console flows
shipped in F02 B6) and tRPC (auth surfaces). F04 uses **server actions
for human-initiated mutations** (`submit-seeker`, `submit-employer-req`,
`withdraw`, `operator-transition`) and **tRPC procedures for
service-principal calls** (`create-match` from a future matcher,
`advance` from Parley). Boundary matches the principal kind that
authorizes the call.

### Tradeoff 2 — `match_tickets` width
The match-ticket table is wide (~22 columns) because Parley §4.1.1
demands several frozen contract/ruleset refs. Splitting into
`match_tickets` + `match_ticket_refs` was considered; rejected because
every read of a match ticket needs the refs and the split adds a join
on the hot path. Accept the width.

### Risk 1 — Re-negotiation atomicity (EC-7)
Bumping `attempt`, clearing `run_id`+`dossier_id`, and transitioning
state back to `negotiating` must be one transaction or partial states
become observable. Mitigation: `renegotiate(match_ticket_id)` repo
function performs the multi-column update in a single statement guarded
by `assertTransition` for the `delivered → negotiating` (or `expired →
negotiating`) edge.

### Risk 2 — Sequence year-rollover at midnight
The Inngest cron fires at exactly `00:00 UTC` Jan 1. A burst of
ticket creates at `23:59:59` Dec 31 might land just before the new
sequence exists. Mitigation: bootstrap the *next* year's sequences in
the prior year's December — Inngest cron `0 0 1 12 *` creates
sequences with year `<current+1>` so they exist 1 month before
needed. EC-9 unique constraint catches anything that slips through.

### Risk 3 — `dossier_id` non-FK invariant (CL-2 follow-through)
Without a DB FK, an application bug could set `dossier_id` to a value
that doesn't exist in `dossiers` (when F10 ships). Mitigation: F10's
migration adds the FK with `NOT VALID` first, runs a backfill check,
then validates — catches orphans at the gate, doesn't break F04 code.

### Risk 4 — Cross-side read leakage (NFR-9)
The biggest correctness risk. Mitigation: read primitives accept a
typed `Principal`; type-narrowed branches per kind enforce the
filter. Tests cover every (caller-tier × target-table) combination.

---

## 7. Security considerations

| Concern | Mitigation |
|---|---|
| Unauthorized mutation | FR-4 + `withPrincipal`; principal-coverage CI gate (F02 NFR-11) |
| Privilege escalation via operator transition | Operator transitions require `tickets.transition.operator` scope AND a `reason_code` from a closed set (EC-4); no operator backdoor |
| Audit-event omission | NFR-4 in-transaction emission; failed emit rolls back the row mutation |
| PII in audit payloads | T069/MEDIUM-3 pattern: `notes_present` boolean, never raw notes; jurisdictions in payload are codes not addresses |
| Cross-side leakage | NFR-9 + dedicated repo functions for tier-filtered reads; service-principal carve-out is the only bypass |
| Race conditions on match creation | FR-8 UNIQUE constraint + idempotency error |
| Round counter manipulation | Only Parley service principal w/ `tickets.match.advance` may mutate; CHECK `round ≤ round_cap`; type system enforces caller side too |

**OWASP Top-10 applicability:** Injection (parameterized queries via
Drizzle), Broken Auth (covered by F02), Sensitive Data (covered by
F03 register + redaction), SSRF / XXE / CSRF (N/A — server-side only).

---

## 8. Performance strategy

| Target | Method |
|---|---|
| NFR-2 fetch-by-id <50ms p90 | PK is uuid; partial index on `(identifier)` ensures secondary lookup is index-only |
| NFR-2 list-by-state <200ms p90 (10k rows) | Partial index per kind: `(state) WHERE state IN ('matching','negotiating')` for hot states; full index on `(state)` for cold states |
| NFR-3 match-create <500ms p90 | Single transaction with 3 row updates + 3 audit events; B-tree FK lookups; expected ~10ms at 10k scale |
| Audit emission | In-transaction, batched if Drizzle supports multi-row insert; <5ms per emit |

Benchmarks captured in B8 quickstart scenario at 10k rows / kind.

---

## 9. Deployment strategy

- F04 ships as one PR (~88h, ≈4 weeks of work) against `main`.
- Migration `0005_f04_ticket_store.sql` is **additive** (3 new tables
  + 3 new sequences + indexes); no destructive change.
- Inngest annual-rollover cron is added in B4; idempotent (`CREATE
  SEQUENCE IF NOT EXISTS`).
- No env-var changes required.
- After merge: roadmap update (v1.4.0) ticking F04 complete in Stage 2.

---

## 10. Constitutional compliance summary

| Article | Status |
|---|---|
| §I.1 Confidentiality | ✅ Read primitives enforce isolation |
| §I.2 Integrity | ✅ Transitions versioned + audited |
| §I.4.1 Lawful basis | ✅ Per-column in register |
| §I.4.2 Retention | ✅ New classes declared |
| §I.4.3 Tombstone | ✅ Personal-data columns tombstone-mode |
| §I.5.1/2/3 AAA | ✅ withPrincipal + scopes + audit |
| §I.6 DiD | ✅ Type + runtime + CHECK + lint |
| §I.A.1 Jurisdiction | ✅ Column on every ticket-kind |
| §II Agent-Native | ✅ Read primitives + scope wall |
| §III Simplicity | ✅ 1 new package, 0 new services |
| §IV.A Test-first | ✅ B3 tests RED before B4 ships validator |

**No exceptions requested.**

---

## 11. Sign-off

- **Plan author:** Gary (2026-05-12)
- **Constitutional review:** Pending Austin (Constitution §V — plans
  inherit constitution review state)
- **Counsel review:** Not required for F04 (no new personal-data
  collection beyond what PRD authorizes; retention horizons inherit
  F03's review-pending posture and are documented as such)
