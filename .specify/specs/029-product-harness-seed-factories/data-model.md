# Data Model: Product Harness Seed Factories

## Seed Factory Input

- `scenario_id`: Product scenario requesting seeds.
- `scenario_version`: Scenario version for traceability.
- `seed_version`: Version of fixture data and generation rules.
- `fixture_name`: Named fixture such as `alpha-happy-path`, `missing-consent`, or `jurisdiction-kill-switch`.
- `mode`: Gate or eval.
- `namespace`: Optional deterministic namespace for collision-free local runs.
- `base_time`: Optional deterministic timestamp used for created/updated fields.

Validation:
- Required scenario, seed version, and fixture name must be non-empty.
- Base time, when provided, must be an ISO timestamp.
- Fixture name must resolve to a known fixture.

## Seed Bundle

- `bundle_id`: Deterministic bundle identity.
- `input`: The factory input used to produce the bundle.
- `entities`: Generated seed entity records.
- `relationships`: Typed references between entities.
- `seed_records`: Result-store-compatible seed records.
- `metadata`: Safe summary of fixture posture and coverage.

Validation:
- Bundle id must be stable for the same input.
- Required entity categories must be present for complete fixtures.
- Metadata must not include raw secrets or production identifiers.

## Seed Entity Record

- `entity_type`: Product entity category.
- `entity_id`: Deterministic synthetic id.
- `entity_ref`: Stable external reference used by seed records.
- `attributes`: Safe synthetic attributes.
- `posture`: Optional posture such as active consent, denied consent, killed jurisdiction, or human review required.

Validation:
- Entity ids must be unique within a bundle.
- Entity refs must be non-empty and safe for reports.
- Attributes must remain synthetic and secret-free.

## Seed Relationship

- `relationship_id`: Deterministic relationship id.
- `from_entity_ref`: Source entity reference.
- `to_entity_ref`: Target entity reference.
- `relationship_type`: Relationship semantic such as owns, belongs_to, consent_for, contract_uses_rubric, or ticket_requires_policy.

Validation:
- Source and target refs must exist in the same bundle.
- Relationship type must be recognized.

## Seed Application Result

- `seed_version`: Version returned to the lifecycle runner.
- `seed_refs`: Entity refs returned as lifecycle seed refs.
- `seed_records`: Seed records for result-store persistence.
- `applied_entities`: Ordered evidence of application attempts.
- `status`: Applied, dry-run, or failed.

Validation:
- Failed application must include a safe error.
- Successful application must include every generated entity ref.

## Fixture Definition

- `fixture_name`: Stable name used by scenarios.
- `description`: Human-readable fixture purpose.
- `required_categories`: Entity categories the fixture must generate.
- `posture`: Summary of happy path or denial path.
- `build`: Deterministic generation routine.

Initial fixtures:
- `alpha-happy-path`: Complete matching path with active consent and allowed jurisdiction.
- `missing-consent`: Explicit consent denial path.
- `jurisdiction-kill-switch`: Explicit jurisdiction denial path.
