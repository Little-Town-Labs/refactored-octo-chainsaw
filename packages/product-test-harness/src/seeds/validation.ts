import type {
  ProductSeedBundle,
  ProductSeedEntityRecord,
  ProductSeedEntityType,
} from "../contracts.js";
import { containsDatabaseUrl } from "../db/redaction.js";
import { HarnessValidationError } from "../validation.js";
import { REQUIRED_PRODUCT_SEED_ENTITY_TYPES } from "./fixtures.js";

export function assertValidProductSeedBundle(bundle: ProductSeedBundle): void {
  const issues = validateProductSeedBundle(bundle);
  if (issues.length > 0) throw new HarnessValidationError(issues);
}

export function validateProductSeedBundle(bundle: ProductSeedBundle): string[] {
  const issues: string[] = [];
  requireNonEmpty("bundle_id", bundle.bundle_id, issues);
  requireNonEmpty("input.scenario_id", bundle.input.scenario_id, issues);
  requireNonEmpty("input.scenario_version", bundle.input.scenario_version, issues);
  requireNonEmpty("input.seed_version", bundle.input.seed_version, issues);
  if (bundle.input.base_time && Number.isNaN(Date.parse(bundle.input.base_time))) {
    issues.push("input.base_time must be an ISO date-time");
  }
  validateEntities(bundle.entities, issues);
  validateRelationships(bundle, issues);
  validatePosture(bundle.entities, issues);
  validateSeedRecords(bundle, issues);
  rejectUnsafeValues(bundle, issues);
  return issues;
}

function validateEntities(entities: readonly ProductSeedEntityRecord[], issues: string[]): void {
  const ids = new Set<string>();
  const refs = new Set<string>();
  for (const required of REQUIRED_PRODUCT_SEED_ENTITY_TYPES) {
    if (!entities.some((entity) => entity.entity_type === required)) {
      issues.push(`entities must include ${required}`);
    }
  }
  entities.forEach((entity, index) => {
    requireNonEmpty(`entities[${index}].entity_id`, entity.entity_id, issues);
    requireNonEmpty(`entities[${index}].entity_ref`, entity.entity_ref, issues);
    if (ids.has(entity.entity_id)) issues.push(`entities[${index}].entity_id is duplicated`);
    if (refs.has(entity.entity_ref)) issues.push(`entities[${index}].entity_ref is duplicated`);
    ids.add(entity.entity_id);
    refs.add(entity.entity_ref);
  });
}

function validateRelationships(bundle: ProductSeedBundle, issues: string[]): void {
  const refs = new Set(bundle.entities.map((entity) => entity.entity_ref));
  bundle.relationships.forEach((relationship, index) => {
    requireNonEmpty(
      `relationships[${index}].relationship_id`,
      relationship.relationship_id,
      issues,
    );
    if (!refs.has(relationship.from_entity_ref)) {
      issues.push(`relationships[${index}].from_entity_ref is dangling`);
    }
    if (!refs.has(relationship.to_entity_ref)) {
      issues.push(`relationships[${index}].to_entity_ref is dangling`);
    }
  });
  requireRelationship(bundle, "contract_uses_rubric", issues);
  requireRelationship(bundle, "rubric_has_bias_evidence", issues);
}

function validatePosture(entities: readonly ProductSeedEntityRecord[], issues: string[]): void {
  const consent = firstEntity(entities, "consent_record");
  const jurisdiction = firstEntity(entities, "jurisdiction_policy");
  const review = firstEntity(entities, "human_review_decision");
  if (!consent?.posture) issues.push("consent_record posture is required");
  if (!jurisdiction?.posture) issues.push("jurisdiction_policy posture is required");
  if (!review?.posture) issues.push("human_review_decision posture is required");
}

function validateSeedRecords(bundle: ProductSeedBundle, issues: string[]): void {
  const entityRefs = new Set(bundle.entities.map((entity) => entity.entity_ref));
  for (const entity of bundle.entities) {
    if (!bundle.seed_records.some((record) => record.entity_ref === entity.entity_ref)) {
      issues.push(`seed_records must include ${entity.entity_ref}`);
    }
  }
  bundle.seed_records.forEach((record, index) => {
    requireNonEmpty(`seed_records[${index}].seed_id`, record.seed_id, issues);
    if (record.seed_version !== bundle.input.seed_version) {
      issues.push(`seed_records[${index}].seed_version must match bundle input`);
    }
    if (record.scenario_id !== bundle.input.scenario_id) {
      issues.push(`seed_records[${index}].scenario_id must match bundle input`);
    }
    if (!entityRefs.has(record.entity_ref)) {
      issues.push(`seed_records[${index}].entity_ref is not in entities`);
    }
  });
}

function requireRelationship(
  bundle: ProductSeedBundle,
  relationshipType: string,
  issues: string[],
): void {
  if (
    !bundle.relationships.some(
      (relationship) => relationship.relationship_type === relationshipType,
    )
  ) {
    issues.push(`relationships must include ${relationshipType}`);
  }
}

function firstEntity(
  entities: readonly ProductSeedEntityRecord[],
  entityType: ProductSeedEntityType,
): ProductSeedEntityRecord | undefined {
  return entities.find((entity) => entity.entity_type === entityType);
}

function rejectUnsafeValues(value: unknown, issues: string[], path = "bundle"): void {
  if (typeof value === "string") {
    if (containsDatabaseUrl(value)) issues.push(`${path} must not contain a database URL`);
    if (/(?:api[_-]?key|secret|token|password)=/i.test(value)) {
      issues.push(`${path} must not contain credential-bearing values`);
    }
    if (/PRIVATE KEY/.test(value)) issues.push(`${path} must not contain private key material`);
    return;
  }
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectUnsafeValues(entry, issues, `${path}[${index}]`));
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    rejectUnsafeValues(entry, issues, `${path}.${key}`);
  });
}

function requireNonEmpty(path: string, value: string, issues: string[]): void {
  if (value.trim() === "") issues.push(`${path} must be non-empty`);
}
