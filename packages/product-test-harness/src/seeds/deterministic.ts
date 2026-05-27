import type { ProductSeedFactoryInput, ProductSeedEntityType } from "../contracts.js";

export const DEFAULT_PRODUCT_SEED_BASE_TIME = "2026-05-27T12:00:00.000Z";

export function deterministicSeedId(parts: readonly string[]): string {
  return `seed_${hashParts(parts)}`;
}

export function deterministicEntityId(
  input: ProductSeedFactoryInput,
  entityType: ProductSeedEntityType,
  key: string,
): string {
  return `${entityType}_${hashParts(seedParts(input, entityType, key))}`;
}

export function deterministicEntityRef(
  input: ProductSeedFactoryInput,
  entityType: ProductSeedEntityType,
  key: string,
): string {
  return `seed://${input.seed_version}/${input.fixture_name}/${entityType}/${key}`;
}

export function deterministicTimestamp(input: ProductSeedFactoryInput, offsetSeconds = 0): string {
  const base = Date.parse(input.base_time ?? DEFAULT_PRODUCT_SEED_BASE_TIME);
  return new Date(base + offsetSeconds * 1000).toISOString();
}

function seedParts(
  input: ProductSeedFactoryInput,
  entityType: ProductSeedEntityType,
  key: string,
): readonly string[] {
  return [
    input.namespace ?? "default",
    input.scenario_id,
    input.scenario_version,
    input.seed_version,
    input.fixture_name,
    entityType,
    key,
  ];
}

function hashParts(parts: readonly string[]): string {
  let hash = 2166136261;
  for (const value of parts.join("|")) {
    hash ^= value.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36).padStart(7, "0");
}
