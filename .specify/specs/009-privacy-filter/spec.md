# Feature Specification: F09 Privacy Filter

**Feature Branch**: `009-privacy-filter`

**Created**: 2026-05-20

**Status**: Draft

**Input**: User description: "F09 is the other standalone Stage 4 P0 blocker before the full F08 Parley runner. Build the no-model, sentinel-wrapped, CI-gated privacy filter so F08.5 counterparty_filtered outputs and future Parley side runners have a non-bypassable privacy boundary."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Filter Counterparty Views Without Model Calls (Priority: P1)

As the Parley harness, I need counterparty-visible text to be produced only by a deterministic privacy filter, so seeker PII, employer-confidential context, and negotiating posture cannot leak through model judgment or direct side-runner access.

**Why this priority**: Constitution I.1 makes the privacy filter non-bypassable, and F08.5 now fails closed for `counterparty_filtered` tool outputs until F09 supplies the boundary.

**Independent Test**: Submit seeker, employer, tool-returned, ATS-imported, and A2A-received text through the filter and verify allowed fields pass, prohibited fields are redacted or refused, and no AI gateway/model path is reachable.

**Acceptance Scenarios**:

1. **Given** untrusted seeker text contains contact details, salary history, or direct outreach instructions, **When** an employer-facing view is requested, **Then** the filter removes or refuses those fields with stable reason codes.
2. **Given** employer-confidential req notes contain budget, internal scoring posture, or hidden constraints, **When** a seeker-facing view is requested, **Then** the filter removes or refuses those fields with stable reason codes.
3. **Given** the filter call graph is scanned in CI, **When** any model gateway import is reachable from the privacy-filter package, **Then** the gate fails before merge.

---

### User Story 2 - Wrap and Validate Untrusted Input Sentinels (Priority: P1)

As prompt construction policy, I need every untrusted free-text field wrapped with a per-run sentinel nonce, so malicious payloads cannot forge closing sentinels or escape their untrusted context.

**Why this priority**: Parley requires sentinel wrapping for untrusted inputs before prompt construction, and F09 must ship sentinel-injection tests before the runner.

**Independent Test**: Wrap all enumerated untrusted input classes with a per-run nonce, inject forged sentinel strings into payloads, and verify parsing refuses forged or mismatched sentinel boundaries.

**Acceptance Scenarios**:

1. **Given** untrusted resume text, employer JD text, ATS-imported content, tool-returned text, or A2A content, **When** prompt construction requests wrapped text, **Then** the output includes opening and closing sentinels bound to the run nonce and input class.
2. **Given** a payload includes a forged closing sentinel, **When** sentinel validation runs, **Then** validation fails closed with `sentinel_injection_detected`.
3. **Given** a payload is wrapped with the wrong run nonce or input class, **When** validation runs, **Then** validation fails closed with a stable reason code.

---

### User Story 3 - Enforce Counterparty Access Boundaries (Priority: P1)

As platform security policy, I need side runners to access counterparty data only through filter outputs or `counterparty_filtered` tool results, so direct counterparty access cannot bypass the privacy ruleset.

**Why this priority**: Parley §9.4 and §10.3 require counterparty access to be CI-gated before the full runner is implemented.

**Independent Test**: Attempt direct counterparty imports/reads from side-runner fixtures and verify the CI gate fails, while sanctioned filter and F08.5 privacy-filter-port access succeeds.

**Acceptance Scenarios**:

1. **Given** side-runner code attempts to read raw counterparty ticket data, **When** the access-boundary gate runs, **Then** the build fails with `counterparty_access_bypass_detected`.
2. **Given** F08.5 sends a `counterparty_filtered` tool output to the privacy-filter port, **When** filtering succeeds, **Then** the result returns a filtered view reference and audit evidence.
3. **Given** the privacy filter encounters an unsupported input class, invalid ruleset, or parsing error, **When** filtering runs, **Then** the result fails closed and no raw output is returned.

---

### User Story 4 - Review Ruleset, Projection, and Refusal Evidence (Priority: P2)

As compliance staff or counsel, I need scoped reads for privacy rulesets, filtered projections, sentinel failures, and access-boundary findings, so I can reconstruct how the platform prevented cross-side disclosure.

**Why this priority**: Privacy filtering is compliance and incident evidence. Review reads must show policy refs and reason codes without exposing raw sensitive payloads by default.

**Independent Test**: Query ruleset versions, filter decisions, redaction summaries, sentinel failures, and bypass findings with and without review scope.

**Acceptance Scenarios**:

1. **Given** a scoped reviewer requests a privacy ruleset version, **When** review reads run, **Then** they return metadata, disclosure stages, content hash, status, and audit refs.
2. **Given** a scoped reviewer requests filter decisions for a run, **When** review reads run, **Then** they return filtered-view refs, redaction counts, reason codes, stage, and audit refs without raw sensitive payloads.
3. **Given** an unscoped actor requests filter evidence, **When** authorization runs, **Then** access is denied by default.

### Edge Cases

- A payload includes a forged closing sentinel using the correct nonce.
- A payload includes nested sentinel-looking strings for a different input class.
- A ruleset is deprecated while a historical run needs reconstruction.
- A `counterparty_filtered` tool output is valid JSON but contains raw contact details.
- A side runner reaches raw counterparty data through a transitive helper module.
- The filter receives content larger than the configured deterministic scan limit.
- A filter rule redacts all content, making the counterparty view empty.
- The privacy ruleset has no active disclosure stage for the requested audience.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a deterministic privacy filter that performs no model or AI gateway invocation.
- **FR-002**: System MUST include a CI no-gateway-reachability gate for the privacy-filter package and side-runner access path.
- **FR-003**: System MUST define immutable privacy ruleset versions addressed by `(ruleset_id, version)`.
- **FR-004**: System MUST support disclosure stages on each ruleset and record the active stage on every filtered projection.
- **FR-005**: System MUST enumerate untrusted input classes: seeker resume text, employer JD/req text, ATS-imported content, tool-returned text, and A2A-received content.
- **FR-006**: System MUST wrap each untrusted free-text field with sentinels containing a per-run nonce and input class.
- **FR-007**: System MUST fail closed when sentinels are forged, mismatched, missing, duplicated, or otherwise invalid.
- **FR-008**: System MUST redact or refuse prohibited PII, employer-confidential data, hidden scoring posture, direct outreach instructions, and unsupported payload classes according to the active ruleset.
- **FR-009**: System MUST expose an F08.5-compatible privacy-filter port for `counterparty_filtered` tool outputs.
- **FR-010**: System MUST return stable reason codes for allowed, redacted, refused, sentinel-invalid, ruleset-invalid, oversized, and bypass-detected outcomes.
- **FR-011**: System MUST emit canonical audit evidence for ruleset publication/deprecation, filter decisions, sentinel failures, and access-boundary findings.
- **FR-012**: System MUST enforce that side runners read counterparty data only through filtered views or F08.5-filtered tool outputs.
- **FR-013**: System MUST provide scoped review reads for rulesets, filter decisions, sentinel failures, and bypass findings while denying unscoped reads by default.
- **FR-014**: System MUST keep F09 boundaries clear: full runner orchestration belongs to F08, dossier projection/signing belongs to F10, and demographic segregation belongs to F20.

### Key Entities

- **Privacy Ruleset Version**: Immutable policy artifact containing audience, disclosure stages, redaction/refusal rules, allowed fields, content hash, publication state, and audit refs.
- **Untrusted Input Envelope**: Sentinel-wrapped input payload bound to run id, nonce, input class, and source ref.
- **Filtered Projection**: Deterministic counterparty-safe output, redaction summary, active disclosure stage, ruleset ref, and audit refs.
- **Filter Decision**: Allow, redact, or refuse outcome with stable reason code and evidence refs.
- **Sentinel Failure**: Evidence of forged, mismatched, missing, or duplicated sentinel boundaries.
- **Counterparty Access Finding**: CI/type-check evidence that side-runner code attempted to bypass filtered views.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Privacy-filter tests prove the package has no reachable model gateway import.
- **SC-002**: Sentinel-injection tests fail closed for forged, mismatched, missing, and duplicated sentinel boundaries.
- **SC-003**: Counterparty access bypass fixtures fail the CI/type-check gate while sanctioned filter paths pass.
- **SC-004**: `counterparty_filtered` F08.5 tool output can produce a filtered view ref without exposing raw output.
- **SC-005**: Oversized, unsupported, invalid-ruleset, and all-redacted content fail closed or return stable redacted outcomes without raw leakage.
- **SC-006**: Scoped review reads reconstruct rulesets, filter decisions, sentinel failures, and bypass findings without raw sensitive payload exposure by default.
- **SC-007**: Initial package verification passes unit tests, type-check, lint, schema-lint, no-gateway-reachability, access-boundary guard, and an F09 staged quickstart run.

## Assumptions

- F08.5 is merged and provides the privacy-filter port boundary for `counterparty_filtered` tool outputs.
- F09 will define deterministic filtering and sentinel handling but will not implement the full Parley runner.
- Initial rules can use conservative pattern and field allowlist logic; production policy can evolve through immutable ruleset versions.
- Filter evidence stores redaction summaries and hashes/refs, not raw sensitive payloads by default.
- F09 is backend/compliance infrastructure and does not add user-facing pages.
