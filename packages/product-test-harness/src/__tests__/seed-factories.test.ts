import {
  applyProductSeedBundleOffline,
  buildProductSeedBundle,
  buildSeedEntity,
  createProductResultStoreSnapshot,
  createProductSeedBundle,
  createProductSeedLifecycleCallback,
  HarnessValidationError,
  LocalFileProductResultStore,
  REQUIRED_PRODUCT_SEED_ENTITY_TYPES,
  validateProductSeedBundle,
  type ProductSeedBundle,
  type ProductSeedFactoryInput,
  type ScenarioRunResult,
} from "../index.js";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("product seed factories", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("generates byte-stable seed bundles for identical inputs", () => {
    const first = createProductSeedBundle(seedInput());
    const second = createProductSeedBundle(seedInput());

    expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
    expect(first.entities.map((entity) => entity.entity_id)).toEqual(
      second.entities.map((entity) => entity.entity_id),
    );
  });

  it("generates all required Alpha happy-path entity categories", () => {
    const bundle = createProductSeedBundle(seedInput({ fixture_name: "alpha-happy-path" }));
    const generatedTypes = new Set(bundle.entities.map((entity) => entity.entity_type));

    for (const entityType of REQUIRED_PRODUCT_SEED_ENTITY_TYPES) {
      expect(generatedTypes.has(entityType)).toBe(true);
    }
    expect(bundle.seed_records).toHaveLength(bundle.entities.length);
  });

  it("creates result-store compatible seed records", () => {
    const bundle = createProductSeedBundle(seedInput());

    expect(bundle.seed_records[0]).toMatchObject({
      seed_version: "pth04-test-v1",
      scenario_id: "scenario.alpha",
    });
    expect(bundle.seed_records.every((record) => record.entity_ref.startsWith("seed://"))).toBe(
      true,
    );
  });

  it("rejects duplicate ids and dangling relationships", () => {
    const input = seedInput();
    const first = buildSeedEntity({
      factory_input: input,
      entity_type: "human_principal",
      key: "duplicate",
      attributes: { synthetic: true },
    });
    const duplicate = { ...first, entity_ref: "seed://duplicate-ref" };
    const bundle = buildProductSeedBundle({
      factory_input: input,
      entities: [first, duplicate],
      relationships: [
        {
          relationship_id: "rel-dangling",
          from_entity_ref: first.entity_ref,
          to_entity_ref: "seed://missing",
          relationship_type: "owns",
        },
      ],
    });

    expect(validateProductSeedBundle(bundle)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("entity_id is duplicated"),
        expect.stringContaining("to_entity_ref is dangling"),
      ]),
    );
  });

  it("rejects missing consent, jurisdiction, alpha posture, bias evidence, and unsafe metadata", () => {
    const bundle = withoutTypes(createProductSeedBundle(seedInput()), [
      "consent_record",
      "jurisdiction_policy",
      "bias_test_evidence",
    ]);
    const unsafeBundle = {
      ...bundle,
      metadata: { database_url: "postgres://user:pass@example.test/db" },
    } satisfies ProductSeedBundle;

    const issues = validateProductSeedBundle(unsafeBundle);
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("entities must include consent_record"),
        expect.stringContaining("entities must include jurisdiction_policy"),
        expect.stringContaining("relationships must include rubric_has_bias_evidence"),
        expect.stringContaining("must not contain a database URL"),
      ]),
    );
    expect(() => createProductSeedBundle({ ...seedInput(), base_time: "not-a-date" })).toThrow(
      HarnessValidationError,
    );
  });

  it("validates explicit denial fixtures", () => {
    const missingConsent = createProductSeedBundle(seedInput({ fixture_name: "missing-consent" }));
    const killedJurisdiction = createProductSeedBundle(
      seedInput({ fixture_name: "jurisdiction-kill-switch" }),
    );

    expect(validateProductSeedBundle(missingConsent)).toEqual([]);
    expect(validateProductSeedBundle(killedJurisdiction)).toEqual([]);
    expect(postureFor(missingConsent, "consent_record")).toBe("missing_consent");
    expect(postureFor(killedJurisdiction, "jurisdiction_policy")).toBe("jurisdiction_killed");
  });

  it("records offline application evidence", async () => {
    const bundle = createProductSeedBundle(seedInput());

    await expect(applyProductSeedBundleOffline({ bundle, dry_run: true })).resolves.toMatchObject({
      status: "dry_run",
      seed_version: "pth04-test-v1",
      seed_refs: bundle.entities.map((entity) => entity.entity_ref),
    });
  });

  it("integrates with lifecycle seed callback", async () => {
    const callback = createProductSeedLifecycleCallback(seedInput());

    await expect(
      callback({
        branch_id: "br_test",
        branch_name: "test-branch",
        parent_branch_id: "br_parent",
        database_url: "postgres://user:pass@example.test/db",
        safe_database_ref: "neon://br_test",
      }),
    ).resolves.toMatchObject({
      seed_version: "pth04-test-v1",
      metadata: { database_ref: "neon://br_test" },
    });
  });

  it("persists generated seed records through the local result store", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });
    const bundle = createProductSeedBundle(seedInput());
    const snapshot = createProductResultStoreSnapshot({
      run: runResult(),
      seed_records: bundle.seed_records,
      created_at: "2026-05-27T12:00:03.000Z",
    });

    await store.saveRun(snapshot);
    await expect(store.getRun("run-seeds")).resolves.toMatchObject({
      seed_records: bundle.seed_records,
    });
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "product-seed-test-"));
    directories.push(directory);
    return directory;
  }
});

function seedInput(overrides: Partial<ProductSeedFactoryInput> = {}): ProductSeedFactoryInput {
  return {
    scenario_id: "scenario.alpha",
    scenario_version: "1.0.0",
    seed_version: "pth04-test-v1",
    fixture_name: "alpha-happy-path",
    mode: "gate",
    namespace: "test",
    base_time: "2026-05-27T12:00:00.000Z",
    ...overrides,
  };
}

function withoutTypes(
  bundle: ProductSeedBundle,
  entityTypes: readonly string[],
): ProductSeedBundle {
  const entities = bundle.entities.filter((entity) => !entityTypes.includes(entity.entity_type));
  return {
    ...bundle,
    entities,
    relationships: bundle.relationships.filter(
      (relationship) =>
        entities.some((entity) => entity.entity_ref === relationship.from_entity_ref) &&
        entities.some((entity) => entity.entity_ref === relationship.to_entity_ref),
    ),
    seed_records: bundle.seed_records.filter((record) =>
      entities.some((entity) => entity.entity_ref === record.entity_ref),
    ),
  };
}

function postureFor(bundle: ProductSeedBundle, entityType: string): string | undefined {
  return bundle.entities.find((entity) => entity.entity_type === entityType)?.posture;
}

function runResult(): ScenarioRunResult {
  return {
    run_id: "run-seeds",
    scenario: {
      scenario_id: "scenario.alpha",
      version: "1.0.0",
      title: "Alpha readiness scenario",
      mode: "gate",
    },
    environment: { label: "local" },
    started_at: "2026-05-27T12:00:00.000Z",
    ended_at: "2026-05-27T12:00:01.000Z",
    duration_ms: 1000,
    status: "passed",
    steps: [
      {
        step_id: "step-1",
        order: 1,
        name: "Exercise workflow",
        status: "passed",
        started_at: "2026-05-27T12:00:00.000Z",
        ended_at: "2026-05-27T12:00:01.000Z",
        duration_ms: 1000,
      },
    ],
    assertions: [
      {
        assertion_id: "assertion-1",
        name: "Outcome is captured",
        severity: "blocker",
        status: "passed",
        expected: "workflow evidence exists",
        actual: "workflow evidence exists",
      },
    ],
    artifacts: [],
    summary: "seed run passed",
  };
}
