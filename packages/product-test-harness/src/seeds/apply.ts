import type {
  ProductDatabaseBranchContext,
  ProductSeedApplicationResult,
  ProductSeedAppliedEntity,
  ProductSeedBundle,
  ProductSeedFactoryInput,
  ProductSeedOutput,
} from "../contracts.js";
import { ProductSeedFactoryError } from "./factories.js";
import { createProductSeedBundle } from "./fixtures.js";
import { assertValidProductSeedBundle } from "./validation.js";

export interface ApplyProductSeedBundleOptions {
  readonly bundle: ProductSeedBundle;
  readonly database?: ProductDatabaseBranchContext;
  readonly dry_run?: boolean;
}

export async function applyProductSeedBundleOffline(
  options: ApplyProductSeedBundleOptions,
): Promise<ProductSeedApplicationResult> {
  try {
    assertValidProductSeedBundle(options.bundle);
    const appliedEntities: ProductSeedAppliedEntity[] = options.bundle.entities.map((entity) => ({
      entity_ref: entity.entity_ref,
      entity_type: entity.entity_type,
      status: options.dry_run === false ? "applied" : "dry_run",
    }));
    return {
      status: options.dry_run === false ? "applied" : "dry_run",
      seed_version: options.bundle.input.seed_version,
      seed_refs: options.bundle.entities.map((entity) => entity.entity_ref),
      seed_records: options.bundle.seed_records,
      applied_entities: appliedEntities,
      metadata: {
        fixture_name: options.bundle.input.fixture_name,
        entity_count: options.bundle.entities.length,
        database_ref: options.database?.safe_database_ref ?? "offline",
      },
    };
  } catch (err) {
    return {
      status: "failed",
      seed_version: options.bundle.input.seed_version,
      seed_refs: [],
      seed_records: [],
      applied_entities: [],
      error: err instanceof Error ? err.message : "Seed application failed",
    };
  }
}

export function createProductSeedLifecycleCallback(
  input: ProductSeedFactoryInput,
): (database: ProductDatabaseBranchContext) => Promise<ProductSeedOutput> {
  return async (database) => {
    const bundle = createProductSeedBundle(input);
    const application = await applyProductSeedBundleOffline({
      bundle,
      database,
      dry_run: true,
    });
    if (application.status === "failed") {
      throw new ProductSeedFactoryError(
        application.error ?? "Seed application failed",
        "application_failed",
      );
    }
    return {
      seed_version: application.seed_version,
      seed_refs: application.seed_refs,
      ...(application.metadata ? { metadata: application.metadata } : {}),
    };
  };
}
