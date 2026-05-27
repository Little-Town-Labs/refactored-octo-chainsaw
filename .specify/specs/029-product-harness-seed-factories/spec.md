# Feature Specification: Product Harness Seed Factories

**Feature Branch**: `029-product-harness-seed-factories`

**Created**: 2026-05-27

**Status**: Draft

**Input**: User description: "PTH04: Deterministic seed factories using slug 029-product-harness-seed-factories"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build a Deterministic Alpha Seed Bundle (Priority: P1)

An engineer can generate a named synthetic seed bundle for an Alpha gate scenario that includes principals, organizations, seekers, employers, tickets, policies, consents, agent contracts, rubrics, bias evidence, signing keys, notification templates, and webhook endpoints with stable ids and no production data.

**Why this priority**: PTH05-PTH08 cannot run trustworthy product gates until scenarios can create complete, realistic, repeatable product state.

**Independent Test**: Generate the same seed bundle twice with the same scenario id, seed version, and fixture name, then verify that entity ids, references, and safe metadata are identical.

**Acceptance Scenarios**:

1. **Given** a gate scenario requests a seed bundle by fixture name and version, **When** the factory runs, **Then** it returns a complete bundle with stable ids for all required entity categories.
2. **Given** the same fixture input is used twice, **When** both bundles are compared, **Then** all deterministic ids, relationship references, and seed records match exactly.
3. **Given** a seed bundle is generated, **When** the result-store seed records are produced, **Then** every seeded entity is traceable by seed id, entity type, entity ref, scenario id, and seed version.

---

### User Story 2 - Validate Relationships and Compliance Defaults (Priority: P1)

A compliance reviewer can trust that synthetic seeds are internally consistent and default to Alpha-safe, consent-aware, jurisdiction-aware, privacy-preserving state.

**Why this priority**: Incorrect fixture relationships can produce false readiness signals, especially for consent, jurisdiction, human review, privacy, and rubric/bias evidence paths.

**Independent Test**: Generate representative valid and invalid seed bundles, then verify validation accepts complete compliant bundles and rejects missing consent, missing bias evidence, dangling references, unsafe jurisdiction posture, or absent Alpha posture metadata.

**Acceptance Scenarios**:

1. **Given** a bundle with seeker and employer tickets, **When** validation runs, **Then** every ticket references existing principals, organizations, policies, and consent state.
2. **Given** a bundle includes an agent contract and rubric, **When** validation runs, **Then** the rubric has a bias-test evidence reference and the contract resolves the rubric and policy versions.
3. **Given** a jurisdiction kill-switch or missing-consent fixture, **When** validation runs, **Then** the bundle remains valid only if the denial posture is explicit and traceable.

---

### User Story 3 - Apply Seeds Through the Existing Lifecycle (Priority: P2)

An engineer can attach deterministic seed generation to the PTH02 database lifecycle callback and receive seed records that PTH03 can persist with the run.

**Why this priority**: Seed factories must integrate with the existing product harness lifecycle instead of remaining standalone fixtures.

**Independent Test**: Run an offline sample with fake database application that generates seed records, returns safe seed metadata through the lifecycle, and persists the records in a result-store snapshot without external services.

**Acceptance Scenarios**:

1. **Given** the lifecycle runner invokes a seed callback, **When** a seed bundle is generated, **Then** the callback returns seed version and seed refs without leaking credential-bearing database URLs.
2. **Given** a result-store snapshot is created after seeding, **When** it is saved, **Then** the snapshot includes all generated seed records.
3. **Given** a seed application fails, **When** the lifecycle handles the error, **Then** scenario execution is skipped, cleanup is still attempted, and the failure is reported with safe metadata.

### Edge Cases

- Unknown fixture names must fail with a typed, actionable error.
- Missing required entity categories must fail validation before any database write is attempted.
- Duplicate generated ids within one bundle must fail validation.
- Dangling references between principals, organizations, tickets, rubrics, policies, consents, webhooks, and keys must fail validation.
- Synthetic email, phone, URL, and name values must remain clearly non-production and safe for reports.
- Seed output must not include raw credential-bearing database URLs, private key material, live webhook secrets, or production identifiers.
- Version changes must be explicit; changing fixture data without changing the seed version must be detectable by tests.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST define a deterministic seed factory contract for generating named product harness seed bundles.
- **FR-002**: System MUST support seed bundle inputs for scenario id, scenario version, seed version, fixture name, mode, and optional deterministic namespace.
- **FR-003**: System MUST generate stable synthetic records for human principals, service principals, agent principals, seekers, employers, organizations, job requirements, seeker tickets, employer requirement tickets, match tickets, jurisdiction policies, consent records, human review decisions, agent contracts, rubrics, bias-test evidence, privacy rulesets, notification templates, webhook endpoints, and signing keys.
- **FR-004**: System MUST produce `ProductSeedRecord` entries compatible with the PTH03 result-store contract for every seeded entity.
- **FR-005**: System MUST validate generated bundles for required categories, duplicate ids, dangling references, unsafe metadata, missing consent posture, missing jurisdiction posture, missing Alpha posture metadata, and missing bias-test evidence for rubric-backed contracts.
- **FR-006**: System MUST provide at least one complete Alpha happy-path fixture and at least two denial-path fixtures for missing consent and jurisdiction kill switch.
- **FR-007**: System MUST expose deterministic id and timestamp helpers so fixture generation does not depend on wall-clock time or random values.
- **FR-008**: System MUST provide an offline seed application adapter for tests and samples that records intended writes without connecting to a live database.
- **FR-009**: System MUST integrate seed bundle generation with the existing product database lifecycle seed callback shape.
- **FR-010**: System MUST include tests proving deterministic replay, relationship validation, unsafe metadata rejection, result-store seed-record compatibility, fixture coverage, and lifecycle integration.
- **FR-011**: System MUST expose seed factory contracts, validation helpers, fixture builders, and sample entry points through the product harness package public API.
- **FR-012**: System MUST keep production data and production secrets out of fixture definitions, generated bundles, seed records, reports, and sample output.

### Key Entities *(include if feature involves data)*

- **Seed Factory Input**: Scenario, fixture, version, mode, namespace, and deterministic clock data used to generate a bundle.
- **Seed Bundle**: A complete synthetic product state graph and its traceability metadata.
- **Seed Entity Record**: One generated synthetic entity with type, id, relationships, safe attributes, and application status.
- **Seed Relationship**: A typed reference between generated entities that validation can verify.
- **Seed Application Result**: Evidence of which generated entities would be or were applied to a database.
- **Fixture Definition**: Named reusable scenario seed shape such as Alpha happy path, missing consent, or jurisdiction kill switch.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Re-running the same fixture input produces byte-stable seed records and deterministic entity ids in tests.
- **SC-002**: The complete Alpha happy-path fixture generates all required entity categories and at least one traceable seed record per category.
- **SC-003**: Validation rejects bundles with duplicate ids, dangling references, missing consent posture, missing bias evidence, or unsafe secret-like metadata before application.
- **SC-004**: An offline lifecycle sample can generate, apply, persist, and reload seed records without Neon credentials or external services.
- **SC-005**: Package tests cover seed factory contracts, fixture generation, validation, application adapter behavior, and lifecycle/result-store integration.

## Assumptions

- This feature is PTH04 from `docs/testing/product-harness/roadmap.md`.
- PTH04 creates synthetic fixtures and application interfaces first; live database insert coverage can begin with a small repository adapter and broaden in PTH05 scenario work.
- Existing PTH01 scenario contracts, PTH02 lifecycle hooks, and PTH03 result-store snapshots remain stable integration points.
- Gate fixtures must use deterministic drivers and synthetic data only.
- Pi persona, browser journeys, API/webhook assertions, and observability assertions remain later roadmap slices, but PTH04 must seed enough state for them to build on.
