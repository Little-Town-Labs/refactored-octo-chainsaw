import {
  PRODUCT_SEED_BUNDLE_SCHEMA_VERSION,
  type ProductSeedBundle,
  type ProductSeedEntityRecord,
  type ProductSeedEntityType,
  type ProductSeedFactoryInput,
  type ProductSeedPosture,
  type ProductSeedRelationship,
  type ProductSeedRelationshipType,
  type ProductSeedRecord,
  type SafeMetadata,
} from "../contracts.js";
import {
  deterministicEntityId,
  deterministicEntityRef,
  deterministicSeedId,
} from "./deterministic.js";

export class ProductSeedFactoryError extends Error {
  constructor(
    message: string,
    readonly code: "unknown_fixture" | "validation_failed" | "application_failed",
  ) {
    super(message);
    this.name = "ProductSeedFactoryError";
  }
}

export function buildProductSeedBundle(input: {
  readonly factory_input: ProductSeedFactoryInput;
  readonly entities: readonly ProductSeedEntityRecord[];
  readonly relationships: readonly ProductSeedRelationship[];
  readonly metadata?: SafeMetadata;
}): ProductSeedBundle {
  const bundle: ProductSeedBundle = {
    schema_version: PRODUCT_SEED_BUNDLE_SCHEMA_VERSION,
    bundle_id: deterministicSeedId([
      input.factory_input.namespace ?? "default",
      input.factory_input.scenario_id,
      input.factory_input.scenario_version,
      input.factory_input.seed_version,
      input.factory_input.fixture_name,
    ]),
    input: input.factory_input,
    entities: input.entities,
    relationships: input.relationships,
    seed_records: input.entities.map((entity) => toProductSeedRecord(input.factory_input, entity)),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
  return bundle;
}

export function buildSeedEntity(input: {
  readonly factory_input: ProductSeedFactoryInput;
  readonly entity_type: ProductSeedEntityType;
  readonly key: string;
  readonly attributes: SafeMetadata;
  readonly posture?: ProductSeedPosture;
}): ProductSeedEntityRecord {
  return {
    entity_type: input.entity_type,
    entity_id: deterministicEntityId(input.factory_input, input.entity_type, input.key),
    entity_ref: deterministicEntityRef(input.factory_input, input.entity_type, input.key),
    attributes: input.attributes,
    ...(input.posture ? { posture: input.posture } : {}),
  };
}

export function buildSeedRelationship(input: {
  readonly factory_input: ProductSeedFactoryInput;
  readonly from: ProductSeedEntityRecord;
  readonly to: ProductSeedEntityRecord;
  readonly relationship_type: ProductSeedRelationshipType;
}): ProductSeedRelationship {
  return {
    relationship_id: deterministicSeedId([
      input.factory_input.seed_version,
      input.factory_input.fixture_name,
      input.from.entity_ref,
      input.relationship_type,
      input.to.entity_ref,
    ]),
    from_entity_ref: input.from.entity_ref,
    to_entity_ref: input.to.entity_ref,
    relationship_type: input.relationship_type,
  };
}

export function toProductSeedRecord(
  input: ProductSeedFactoryInput,
  entity: ProductSeedEntityRecord,
): ProductSeedRecord {
  return {
    seed_id: deterministicSeedId([input.seed_version, entity.entity_type, entity.entity_ref]),
    seed_version: input.seed_version,
    entity_type: entity.entity_type,
    entity_ref: entity.entity_ref,
    scenario_id: input.scenario_id,
    metadata: {
      fixture_name: input.fixture_name,
      entity_id: entity.entity_id,
      ...(entity.posture ? { posture: entity.posture } : {}),
    },
  };
}
