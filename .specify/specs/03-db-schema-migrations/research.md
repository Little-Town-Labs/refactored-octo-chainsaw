# Phase 0 — Research notes for F03

**Spec:** v1.1 · **Plan:** v1.0 · **Date:** 2026-05-12 · **Owner:** Gary

F03 inherits its stack entirely from F01 (Neon + Drizzle + Drizzle-Kit
+ pnpm/Turborepo + Next.js) and F02 (`@spyglass/db` package with
9 schema modules and 5 migrations already shipped). No
language/framework/database choice is open. This research file records
the three implementation-shape decisions that were open at plan time.

---

## R-1 — Schema-lint implementation language

### Options

**A. Bash + grep/awk against TypeScript schema files**
- Pattern-matches `pgTable(`, `.default(sql\`uuidv7()\`)`, `references(`, etc.
- Precedent: `scripts/check-principal-coverage.sh` (F02 NFR-11 gate) uses the same approach.
- No new dependencies.
- Trivial to read and modify.

**B. Node.js script using `ts-morph` or the TypeScript Compiler API**
- Real AST walk; immune to comment-spelling false positives.
- Adds a build dependency (`ts-morph` ~30MB) and a TS compile step before lint runs.
- Strictly more correct on edge cases.

**C. Drizzle-Kit introspection against a live Postgres**
- Runs against an actual DB; checks reality, not source.
- Requires Postgres in CI (Neon ephemeral branch or Docker).
- Highest latency (~30–60s for branch spin-up).
- Could double as a drift detector (schema source vs. running DB).

### Decision: **A (bash + grep)** with reserved upgrade path to B.

### Rationale
- F02 set the precedent and the existing principal-coverage script
  works well. Reviewers can read bash; reviewers cannot easily review
  a 200-line ts-morph script.
- Every rule in v1 (R1–R7) is pattern-shaped and within bash's reach.
- Live-DB introspection (C) is the right tool for drift detection (a
  separate problem) — not for source-convention enforcement.
- If a future rule needs type-level reasoning (e.g., "every FK target
  must be a non-nullable column"), upgrade is a contained refactor.

### Tradeoff
False positives on commented-out code or oddly-formatted definitions.
Mitigation: skip-comment escape hatch (EC-4); skip is reported so
reviewers audit.

---

## R-2 — Register file format

### Options

**A. Single `data-classification.yaml` covering all tables**
**B. Per-table YAMLs under `data-classification/<table>.yaml`**
**C. JSON instead of YAML**

### Decision: **A (single YAML).**

### Rationale
- 8 tables × ~10 columns is ~80 entries. Comfortably one file.
- Auditors and counsel reviewers want one file to read end-to-end.
- YAML supports inline comments; JSON does not.
- A single file produces a single PR diff, ideal for the
  reviewer-attention-on-classification-changes discipline (NFR-5).
- Re-evaluate at ~30 tables (Plan §5 Tradeoff 3).

### Tradeoff
Single file grows. Mitigation: documented split point.

---

## R-3 — Sentinel for non-fixed retention horizons

### Options

**A. String sentinel `transitional:<endpoint>`**
**B. ISO-8601 null + separate `transitional_endpoint` field**
**C. Structured object `{ transitional: { endpoint: "f05" } }`**

### Decision: **A (string sentinel).**

### Rationale
- Per CL-3, currently only one transitional case (`audit_events_buffer`
  → `transitional:f05`). Over-engineering for one case is gratuitous.
- A string sentinel is the most legible to counsel reading the policy
  prose. Future shapes are obvious by analogy
  (`legal-hold:<case-id>`, `tombstone-driven:<class>+<grace>`).
- Sweepers parse with `startsWith("transitional:")` — simple, fast.

### Tradeoff
Less typed than a structured object. Mitigation: the register's
documented schema (NFR-3) names the grammar; the lint validates
sentinel shape.

---

## R-4 — Mermaid vs. ASCII vs. external tool for ER diagram (added during planning)

### Options

**A. Mermaid `erDiagram` inline in `data-model.md`**
**B. ASCII-art diagram**
**C. External tool (dbdiagram.io, draw.io) with embedded image**

### Decision: **A (Mermaid).**

### Rationale
- Diff-able in PRs; GitHub renders inline.
- Updatable without a tool round-trip.
- F01/F02 used Mermaid for state-machine and sequence diagrams; F03
  follows the precedent.
- ASCII is hard to keep readable past ~5 tables.
- External tools introduce a non-text source-of-truth, against the
  spec-as-text principle.

---

## References checked
- F01 spec (`.specify/specs/01-monorepo-scaffold/`) — confirms
  Drizzle-Kit selection and pnpm/Turborepo conventions.
- F02 spec (`.specify/specs/02-identity-auth-aaa/spec.md`) and
  data-model.md — primary source for the column inventory in F03's
  register.
- Constitution §I.2, §I.4.1–§I.4.4 — drives the register, retention
  policy, and tombstone references.
- `scripts/check-principal-coverage.sh` — pattern source for the
  schema-lint script.
- GDPR Arts. 5, 6, 17 — lawful basis and retention horizon framing.
- NIST SP 800-92 — log retention; informs `audit_record` horizon.
- NYC LL 144 §5-301 — AEDT audit retention floor; informs the 7-year
  `audit_record` horizon.
