# Project Spyglass — Constitution

**Version:** 1.1.0
**Status:** Draft (pending counsel review before Phase 1)
**Ratified:** 2026-05-06
**Last Amended:** 2026-05-06
**Owner:** Gary
**Reviewers:** Austin

> This constitution governs Project Spyglass — the two-sided AI hiring
> platform built on the Parley agent-negotiation harness. It defines the
> non-negotiable foundations every spec, plan, and implementation must
> conform to. Companion documents: `PRD.md`, `docs/COMPLIANCE_ARCHITECTURE.md`.
>
> Standards alignment is cited inline. Where a section asserts a control,
> the citation in parentheses identifies the well-accepted source the
> control derives from (NIST, ISO, OWASP, GDPR, CISA, etc.). Citations
> are normative — the cited standard is the tie-breaker when constitution
> wording is ambiguous.

---

## How to read this document

Articles are tiered:

- **Foundational (Articles I, I.A–I.D, II, III)** — load-bearing.
  Violations halt a feature. Changing them requires a constitutional
  amendment (see Article V).
- **Disciplinary (Article IV)** — guiding principles. Violations are
  allowed with explicit, recorded justification in the affected spec.
- **Procedural (Article V)** — governs how this document itself changes.

`/speckit-analyze` and `/code-review` MUST treat foundational articles as
review-blocking and disciplinary articles as advisory.

---

## Article I — Information Security Foundations

The classical **C.I.A. triad** (Confidentiality, Integrity, Availability —
NIST SP 800-12; ISO/IEC 27000) is the bedrock, extended with Privacy,
Authentication/Authorization/Accountability, and Defense-in-Depth to match
modern infosec practice (NIST CSF 2.0; SOC 2 Trust Services Criteria;
NIST SP 800-207 Zero Trust; CISA Secure-by-Design 2023). These precede
product, performance, and convenience.

### I.1 Confidentiality

- The **privacy filter is non-bypassable** (PRD §4.4). No code path may
  emit seeker PII to the employer side, or employer-confidential context
  to the seeker side, outside an explicitly unlocked introduction.
- **Demographic data is segregated** from operational data and accessible
  only via an explicit, consented bias-audit pipeline (cf. ISO/IEC 27701
  PIMS).
- **Cross-side leakage is treated as a sev-1 incident**, triggering the
  response procedure in Article I.D.

### I.2 Integrity

- **Rubrics, prompts, and scores are versioned.** Every dossier records
  the exact rubric version, prompt version, and per-dimension scores used
  (Processing Integrity — SOC 2 TSC PI-series).
- **Dossiers are signed.** Once delivered, a dossier's content is
  cryptographically attestable using algorithms named in Article I.C.
- **The audit log is hash-chained and append-only.** Every match-ticket
  state transition writes to it. Mutation or deletion of prior entries is
  prohibited except via the redaction-by-tombstone procedure in
  Article I.4.3 (NIST SP 800-92 log management; ISO/IEC 27037 evidence
  integrity).
- **Bias-audit-ready dossier shape is mandatory from day one** — joinable
  to consented demographic data even before any audit is actually run
  (cf. NIST AI RMF Measure 2.11).

### I.3 Availability

- **Geographic kill switches must flip without a deploy.** New regulation,
  60-day clock, kill switch off — same day, no release cycle.
- **Per-jurisdiction policy gate failure produces a structured failure
  dossier**, never a silent skip and never a soft-pass (fail-safe defaults
  — Saltzer & Schroeder 1975; OWASP ASVS V1).
- **Ticket lifecycle survives advocate outage.** A single agent failure
  must not orphan a ticket or lose its audit trail (NIST CSF 2.0 RC.RP —
  Recover/Recovery Planning).

### I.4 Privacy

Privacy is distinct from Confidentiality (SOC 2 TSC P-series; GDPR
Art. 5; ISO/IEC 27701). Confidentiality is "the data did not leak."
Privacy is "we collected only what was necessary, used it only for the
stated purpose, retained it only as long as needed, and honor data-subject
rights."

#### I.4.1 Data minimization & purpose limitation

- **Data minimization** (GDPR Art. 5(1)(c); CCPA §1798.100): collect only
  the data necessary for the declared purpose of the match ticket.
  Speculative or "might be useful later" collection is prohibited.
- **Purpose limitation** (GDPR Art. 5(1)(b)): data collected for matching
  may not be repurposed for marketing, model training, analytics, or any
  other use without an additional, specific, freely-given consent.
- **Lawful basis recorded** for every personal-data processing operation
  (GDPR Art. 6).

#### I.4.2 Retention

- **Retention limits are declared per data class** (GDPR Art. 5(1)(e))
  and enforced automatically.
- Default retention horizon for an unmatched ticket: tracked in the
  data-lifecycle spec, never indefinite.
- Retention extensions require a recorded lawful basis (legal hold,
  active dispute, etc.).

#### I.4.3 Right to erasure — redaction by tombstone

GDPR Art. 17 (and analogues: CCPA §1798.105, CPRA, various state laws)
grants data subjects the right to erasure. This collides with the
append-only audit log requirement in Article I.2. The constitutional
resolution is **redaction by tombstone**:

1. **Underlying personal data is purged** from the audit log entry,
   storage tables, vector indexes, embeddings, model fine-tune sets,
   backups (within the documented backup-rotation horizon), and any
   downstream sink.
2. **A cryptographically-bound tombstone replaces the entry**, recording:
   the original entry's hash (pre-redaction), the redaction timestamp,
   the lawful basis for redaction, the operator/principal who executed
   it, and a hash chain link that preserves the integrity of the log
   sequence (NIST SP 800-92; cf. RFC 6962 Certificate Transparency
   Merkle-tree redaction patterns).
3. **The tombstone itself is an audited event** — irreversible, signed,
   and visible to bias auditors as evidence the entry existed.
4. **Bias-audit joinability survives redaction in aggregate form only.**
   Demographic statistics computed *before* redaction remain valid;
   re-derivation after redaction is impossible by design.
5. **Redaction does not propagate retroactively to dossiers already
   delivered to employers** outside the platform's control. Spyglass'
   obligation ends at its own data perimeter; downstream obligations are
   the employer's, recorded in the DPA.
6. **The redaction procedure is itself versioned** and counsel-reviewed
   before Phase 2 (NYC), per Article V.4.

This pattern satisfies both the integrity requirement (the chain remains
verifiable) and the erasure requirement (the personal data is gone). It
is the *only* permitted form of audit-log mutation.

#### I.4.4 Data-subject rights

Spyglass must support, with declared SLAs in the data-lifecycle spec,
the standard data-subject rights (GDPR Arts. 12–22; CCPA §1798.100–.130):
access, rectification, erasure (per I.4.3), restriction of processing,
portability, and objection — including objection to automated decisions
(GDPR Art. 22, directly relevant to AEDT posture).

### I.5 Authentication, Authorization & Accountability (AAA)

The CIA triad is necessary but not sufficient. AAA is a co-equal
foundational requirement (NIST SP 800-53 IA/AC families;
NIST SP 800-207 Zero Trust; OWASP ASVS V2/V3/V4).

#### I.5.1 Authentication

- **Every principal is authenticated** before any action: human users,
  agents (seeker advocates, employer advocates), services, and operators.
  No anonymous mutating actions.
- **Agent identity is cryptographically verifiable.** A claimed agent
  principal must produce evidence (signed JWT, mTLS client cert, or
  equivalent) that ties the action to a registered identity.
- **BYO seeker agents (PRD §3.3) federate via verifiable credentials.**
  External agent identity is established via standards-based federation
  (OIDC, OAuth 2.0 with DPoP/mTLS, or W3C Verifiable Credentials), not
  shared secrets.
- **Multi-factor authentication is required** for human operator and
  employer-admin surfaces (NIST SP 800-63B AAL2 or higher).

#### I.5.2 Authorization

- **Least privilege** (NIST SP 800-53 AC-6; ISO/IEC 27002 §8.3): every
  principal operates with the minimum privileges necessary for the
  operation in progress.
- **Need-to-know** for human operators accessing match-ticket data.
- **Scoped, short-lived credentials** for agents. Agents do not hold
  ambient long-lived secrets; tokens are scope-limited (OAuth 2.0
  scopes or equivalent), time-bounded, and revocable.
- **Zero-trust posture** (NIST SP 800-207): every request is authorized
  on its own merits regardless of network location; trust is not
  inherited from prior requests or network position.

#### I.5.3 Accountability & non-repudiation

- **Every privileged action is attributable** to an identified principal.
- **Non-repudiation** is achieved via the signed, hash-chained audit log
  (Article I.2). Agents cannot plausibly deny actions logged under their
  signed identity.
- **Credential rotation, revocation, and compromise response** are
  documented procedures, not ad-hoc operations.

### I.6 Defense in Depth & Secure-by-Default

- **Defense in Depth** (NIST SP 800-53 SC family; NSA IATF). The privacy
  filter is *one* layer. Tenancy isolation, scope-limited tokens, egress
  controls, anomaly detection, and audit are co-equal layers. A single
  bypass must not compromise the system.
- **Secure-by-Design / Secure-by-Default** (CISA *Shifting the Balance*
  joint guidance, 2023). Security is not an opt-in. Defaults are the
  most restrictive option that satisfies the requirement. Insecure modes
  require explicit, audited opt-in, never silent enablement.
- **Fail-safe defaults** (Saltzer & Schroeder 1975): access decisions
  default to deny; policy-gate failures default to halt; missing data
  defaults to refuse, never permit.

---

## Article I.A — Regulatory Foundations (Parley-derived)

Compliance is harness policy, not bolt-on features (PRD §4.8). The
following primitives are first-class harness concepts and cannot be
removed, weakened, or deferred without a constitutional amendment:

1. **Jurisdiction tagging on every match ticket** — seeker work
   jurisdiction, employer hiring jurisdiction, and decision locus,
   captured at ticket creation.
2. **Per-jurisdiction policy gates** — checked before any
   negotiating→delivered transition and before any dossier delivery.
3. **Bias-audit-ready dossier shape** — recording rubric version,
   prompt version, per-dimension scores, and joinable to consented
   demographic data (NIST AI RMF Measure 2.11; NYC DCWP Local Law 144
   §5-301).
4. **Candidate notification artifacts** — structured, timestamped,
   versioned, tied to the match ticket (NYC LL 144 10-business-day
   notice; IL HB 3773; EU AI Act Art. 86 transparency obligations).
5. **Geographic kill switches** — per-jurisdiction toggles flippable
   without a deploy.

The governing rule (PRD §4.8): **Compliance is harness policy, not
bolt-on features.** Any proposal to satisfy a compliance obligation by
layering a separate system on top of Parley violates this article by
default.

### I.A.1 AI-specific standards alignment

Spyglass is an automated employment decision tool (AEDT). The following
AI-governance standards are normative references and Spyglass MUST
support conformity assessment against them:

- **NIST AI Risk Management Framework (AI RMF 1.0)** —
  Govern / Map / Measure / Manage functions.
- **ISO/IEC 42001:2023** — AI Management System standard.
- **OWASP LLM Top 10** and **OWASP AI Security & Privacy Guide** —
  application-layer AI risks (prompt injection, data leakage, model
  poisoning, etc.).
- **EU AI Act** (Reg. 2024/1689) — high-risk AI obligations applicable
  from Phase 4 onward; design must not preclude conformity now.

### I.A.2 Bias audit cadence

- **At minimum annually** for every active AEDT jurisdiction (NYC LL 144
  §5-301 sets the floor; other jurisdictions may require shorter).
- **On material change** to rubric, prompt, scoring model, or training
  data, regardless of calendar cadence.
- **Audit results are retained** for the longer of 7 years or the
  retention period of the regulating jurisdiction.
- **Audit vendor independence** is required (NYC LL 144 §5-301(c)).

---

## Article I.B — Phased Jurisdictional Posture

Geographic phasing is the launch model, not a marketing plan. Spyglass
operates only in jurisdictions whose preconditions are met.

### I.B.1 Phase 0 — Private Alpha

**No production hiring decisions in Phase 0.** Friends-and-design-partners
only, explicit consent that the system is a shakedown and not a hiring
tool. Spyglass output in Phase 0 is informational; any actual hire
between a Phase 0 employer and a Phase 0 seeker must stand on its own
outside the system. The purpose of Phase 0 is to prove the protocol,
exercise the privacy filter and audit log, and find the bugs — not to
certify anyone for employment.

### I.B.2 Phase 1 onward — Production Hiring, Fenced

From Phase 1 onward, production hiring is permitted **only within the
active jurisdiction set**, and adding a jurisdiction requires its
preconditions to be met first. Examples:

- **Phase 1 (Beta)** — 3–5 US states with no AEDT-specific law, federal
  EEOC standards met (EEOC 2023 AI guidance; Title VII / ADA / ADEA
  disparate-impact framework), employer attests hiring jurisdiction,
  seeker attests work jurisdiction.
- **NYC** — requires a published independent bias audit (LL 144) and
  the 10-business-day candidate-notification flow live before NYC joins
  the active set.
- **Colorado / California / Illinois / EU** — each on its own timeline,
  preconditions per `docs/COMPLIANCE_ARCHITECTURE.md` (Colorado SB 205;
  CA FEHA ADS regulations; IL HB 3773; EU AI Act Reg. 2024/1689).

**Counsel review is required and documented** before any phase
transition, per Article V.2. Quietly expanding the active jurisdiction
set is a constitutional violation, not a release-management decision.

---

## Article I.C — Cryptographic & Supply-Chain Standards

### I.C.1 Cryptography

- **NIST-approved algorithms only** (FIPS 140-3 validated modules where
  available; NIST SP 800-131A for transition guidance).
- **Crypto-agility is mandatory.** Algorithms, key sizes, and hash
  functions are configurable; protocol changes are not required to
  rotate them.
- **Key management** follows NIST SP 800-57 (key lifecycle, rotation,
  storage, escrow). Long-term signing keys are stored in HSMs or
  equivalent FIPS-validated key custodians.
- **Post-quantum readiness.** New protocol designs MUST be reviewed for
  PQC migration paths (NIST PQC standards: ML-KEM/ML-DSA/SLH-DSA, 2024).

### I.C.2 Supply-chain integrity

- **Signed dependencies** for all production code (Sigstore / cosign or
  equivalent; NIST SSDF SP 800-218 PS.3).
- **SBOM generation** for every release (CycloneDX or SPDX; EO 14028
  §4(e); NTIA minimum SBOM elements).
- **SLSA build provenance** at level 3 or higher for production
  artifacts (slsa.dev).
- **AI supply chain** — prompts, rubrics, fine-tuned models, and any
  model artifacts are versioned, signed, and SBOM-equivalent (model
  cards per Mitchell et al. 2019; data cards where applicable).
  Prompt/model/rubric changes are release events, not configuration
  edits.

---

## Article I.D — Incident Response & Breach Notification

Aligned to NIST SP 800-61r2 (Computer Security Incident Handling) and
ISO/IEC 27035.

### I.D.1 Capability

- **Detection** — logging, anomaly detection, and alerting cover the
  privacy filter, audit log integrity, authentication anomalies, and
  cross-side data flows.
- **Response** — documented runbooks for sev-1/2/3, named on-call
  responsibility, evidence preservation procedures.
- **Recovery** — restoration procedures aligned with NIST CSF 2.0 RC
  function; tested at least annually.
- **Post-incident review** — every sev-1 produces a written post-mortem
  with corrective actions tracked to closure.

### I.D.2 Breach notification

- **GDPR Art. 33** — supervisory authority within 72 hours of awareness
  of a personal-data breach.
- **GDPR Art. 34** — data subjects "without undue delay" when high risk
  to rights and freedoms.
- **US state breach laws** — per-state timelines (varies; CA, NY, others
  have ≤30/45/60-day clocks). Counsel determines applicable jurisdictions
  per incident.
- **Contractual notification** to employer-side counterparties per DPA.

### I.D.3 Cross-side leakage as the named sev-1

A cross-side privacy-filter bypass (seeker PII to employer or vice
versa) is automatically sev-1, triggers the full response procedure,
and produces a public post-mortem (redacted as needed).

---

## Article II — Agent-Native Architecture

Spyglass is an Agent-Native application. Agents are first-class
principals, not bolted-on assistants.

- The **primary actors** mediating both sides of the marketplace are
  autonomous agents (seeker advocate, employer advocate). Humans
  supervise thresholds, rubrics, and escalations — they are not in the
  inner loop.
- **APIs, data contracts, identity, audit, and lifecycle are designed
  for agents first.** Human UIs are the secondary surface, not the
  reference implementation.
- **Agent identity is explicit and verifiable** per Article I.5.1.
  Every action attributable to an agent carries a verifiable principal
  — for audit, for the privacy filter, and for compliance.
- **Agent capabilities are declared.** Each agent publishes a
  machine-readable manifest of the actions it can take, the scopes it
  holds, and the contracts it implements. Undeclared capabilities are
  unauthorized by default (fail-safe per Article I.6).

---

## Article III — Dual-Audience Surfaces

Every surface has two audiences with different needs.

### III.1 Humans need clear UI

Legible, low-chrome, surfacing only what a human must decide or know
(PRD §3.4 — no seeker dashboard, no analytics views; the seeker's
product is the conversation).

**Accessibility is not optional.** Human-facing surfaces conform to
**WCAG 2.2 Level AA** (W3C, 2023) at minimum, with Level AAA preferred
where it does not conflict with usability. US ADA / Section 508 and EU
EAA (Directive 2019/882, applicable June 2025) compliance follow from
WCAG conformance.

### III.2 Agents need clear semantics

Unambiguous, versioned, machine-readable: typed schemas, stable
identifiers, explicit state transitions, deterministic error shapes,
and documented capabilities (OpenAPI 3.1 / JSON Schema 2020-12 /
AsyncAPI / W3C DID where applicable).

### III.3 Contract evolution & deprecation policy

Agent-facing contracts evolve under semantic versioning (semver.org
2.0.0):

- **N-2 backwards compatibility** — the current major version and the
  previous two are simultaneously supported.
- **Minimum 6-month deprecation window** between deprecation
  announcement and removal of any contract surface.
- **Machine-readable deprecation signals** — `Deprecation` and `Sunset`
  HTTP headers (RFC 8594, RFC 9745) on REST surfaces; equivalent
  metadata fields on non-HTTP surfaces.
- **Breaking changes require a major version bump** and a migration
  guide published with the deprecation announcement.

### III.4 Completeness rule

A surface that is pretty for humans but ambiguous for agents — or
precise for agents but unusable for humans — is **incomplete, not
shipped.**

---

## Article IV — Engineering Discipline

Advisory principles. Exceptions allowed when justified, but the
justification must be recorded inline in the affected spec or PR.

- **Separation of Concerns (SoC)** — divide the system into modules
  with minimal overlap; UI changes should not require touching business
  logic and vice versa.
- **Don't Repeat Yourself (DRY)** — each piece of knowledge has a
  single authoritative representation. Balance against SoC: do not
  deduplicate things that merely *look* alike but represent
  semantically different concerns.
- **Single Responsibility Principle (SRP)** — a module has one reason
  to change.
- **KISS** — prefer the simplest design that satisfies the requirement.
- **YAGNI** — do not implement functionality before it is actually
  needed.
- **No premature optimization** — optimize only after profiling shows a
  bottleneck (Knuth 1974).
- **Law of Demeter** — modules talk to immediate neighbors;
  reach-through coupling is a smell.
- **Principle of Least Astonishment** — APIs and behaviors should match
  what an informed reader expects.
- **Fail-safe defaults** — see Article I.6; this principle is
  duplicated here as a reminder that secure defaults and unsurprising
  defaults are the same instinct applied at different layers.

### IV.1 Carve-out: agent-facing semantics

KISS-as-minimalism does not override Article II. Typed schemas,
explicit state machines, versioned contracts, and structured error
shapes are **required** for agent surfaces even when a simpler
human-facing representation would suffice. When KISS and Article II
conflict, Article II wins.

---

## Article V — Governance & Amendments

### V.1 Versioning

This constitution follows semantic versioning (semver.org 2.0.0):

- **MAJOR** — backwards-incompatible change: removing or weakening a
  foundational article (I, I.A–I.D, II, III) or any Parley primitive
  in I.A.
- **MINOR** — backwards-compatible addition: adding new articles or
  strengthening existing ones.
- **PATCH** — clarifications, typos, non-substantive edits.

The current version is recorded at the top of this file and in commit
history. Every amendment commits a version bump.

### V.2 Amendment process

- **Foundational amendments** (MAJOR/MINOR touching Articles I–III)
  require written rationale, reviewer sign-off, and — for anything
  touching Articles I.A or I.B — counsel review before merge.
- **Counsel review evidence is mandatory and retained.** A signed,
  dated counsel memo is filed in `.specify/memory/counsel-reviews/`
  for every counsel-required event (phase transition, jurisdiction
  addition, foundational amendment touching I.A/I.B, redaction-procedure
  approval). Procurement, regulators, and auditors will request these.
- **Disciplinary exceptions** (Article IV) are recorded inline in the
  spec or PR that takes the exception. They do not require a
  constitution edit.
- **Phase transitions** (advancing Phase 0→1, adding a jurisdiction)
  require counsel review evidence per above and an explicit
  constitutional note in the change log below.

### V.3 Conformance gates

- `/speckit-specify`, `/speckit-plan`, and `/speckit-tasks` MUST
  validate against foundational articles.
- `/speckit-analyze` MUST flag any drift from foundational articles as
  blocking and any unjustified Article IV deviation as a warning.
- `/code-review` MUST treat Article I findings as CRITICAL severity by
  default.
- `/security-review` is **MANDATORY** for any change that touches
  Articles I, I.A, I.C, or I.D — not advisory, not severity-gated, not
  skippable.
- **Threat modeling is required** for any feature touching Articles I
  or II. STRIDE (Microsoft, 2002) for security; LINDDUN (KU Leuven)
  for privacy. The threat model is a deliverable of `/speckit-plan` for
  qualifying features and is reviewed at `/speckit-analyze`.

### V.4 Open questions tracked elsewhere

The following are unresolved and tracked in
`docs/COMPLIANCE_ARCHITECTURE.md` rather than this constitution. They
MUST be resolved before the relevant phase transition:

- Demographic data consent UX and storage segregation (before Phase 2).
- Joint controllership and DPA templates (before any EU-adjacent
  engagement; GDPR Art. 26).
- Audit cadence covering all active jurisdictions, beyond the I.A.2
  floor (before Phase 2).
- Candidate appeal / human-review sufficiency (before EU phase;
  GDPR Art. 22, EU AI Act Art. 14 human oversight).
- Cross-border data flow mechanism — SCCs, adequacy decisions, or
  equivalent (before any cross-border ticket).
- Redaction-by-tombstone procedure detailed spec and counsel sign-off
  (before Phase 2, per Article I.4.3).

---

## Change Log

| Version | Date       | Change                                                                                                                                 |
|---------|------------|----------------------------------------------------------------------------------------------------------------------------------------|
| 1.0.0   | 2026-05-06 | Initial ratification. Articles I (CIA), I.A (Parley primitives), I.B (Phased jurisdictional posture), II–V.                            |
| 1.1.0   | 2026-05-06 | Added I.4 Privacy (incl. tombstone-redaction procedure), I.5 AAA, I.6 Defense-in-Depth, I.A.1 AI standards, I.A.2 bias-audit cadence, I.C Cryptographic & Supply-Chain Standards, I.D Incident Response. Expanded III.1 (WCAG 2.2 AA), III.3 (contract evolution). Tightened V.2 (counsel-review evidence retention) and V.3 (mandatory `/security-review`, mandatory threat modeling). Inline standards citations throughout. MINOR — additions and strengthenings only, no removals. |
