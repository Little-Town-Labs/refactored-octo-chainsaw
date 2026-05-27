import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ProductScenario } from "../contracts.js";
import { runScenario } from "../runner.js";
import { LocalFileProductResultStore } from "../results/local-file-store.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { applyProductSeedBundleOffline } from "../seeds/apply.js";
import { createProductSeedBundle } from "../seeds/fixtures.js";

export const seedFactoryScenario: ProductScenario = {
  scenario_id: "pth.sample.seed-factory",
  version: "1.0.0",
  title: "Product harness seed factory sample",
  description: "Synthetic sample scenario used to verify PTH04 deterministic seed factories.",
  mode: "gate",
  owner: "product-readiness",
  tags: ["sample", "synthetic", "seeds"],
  steps: [
    {
      step_id: "generate-alpha-seeds",
      name: "Generate deterministic Alpha seed bundle",
      run: () => ({
        status: "passed",
        evidence_refs: ["artifact://sample/seed-bundle.json"],
        assertions: [
          {
            assertion_id: "seed-factory-synthetic-only",
            name: "Seed factory output is synthetic",
            severity: "blocker",
            status: "passed",
            expected: "generated entities use synthetic fixture data",
            actual: "generated entities use synthetic fixture data",
          },
        ],
        artifacts: [
          {
            artifact_id: "seed-bundle-summary",
            label: "Seed bundle summary",
            type: "json",
            uri: "artifact://sample/seed-bundle.json",
            redaction_status: "not_required",
          },
        ],
      }),
    },
  ],
};

export async function runSeedFactoryScenario(): Promise<string> {
  const seedInput = {
    scenario_id: seedFactoryScenario.scenario_id,
    scenario_version: seedFactoryScenario.version,
    seed_version: "pth04-alpha-v1",
    fixture_name: "alpha-happy-path" as const,
    mode: "gate" as const,
    namespace: "sample",
    base_time: "2026-05-27T12:00:00.000Z",
  };
  const bundle = createProductSeedBundle(seedInput);
  const application = await applyProductSeedBundleOffline({ bundle, dry_run: true });
  const result = await runScenario(seedFactoryScenario, {
    run_id: "pth-sample-seed-factory",
    environment: { label: "local-sample" },
    git: { ref: "local" },
    metadata: {
      seed_bundle_id: bundle.bundle_id,
      seed_fixture_name: bundle.input.fixture_name,
    },
    now: fixedClock(),
  });
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-product-seeds-"));
  const store = new LocalFileProductResultStore({ directory });
  const snapshot = createProductResultStoreSnapshot({
    run: result,
    created_at: new Date(Date.UTC(2026, 4, 27, 12, 0, 10)).toISOString(),
    seed_records: application.seed_records,
  });

  await store.saveRun(snapshot);
  const loaded = await store.getRun(result.run_id);

  return JSON.stringify(
    {
      directory,
      bundle_id: bundle.bundle_id,
      fixture_name: bundle.input.fixture_name,
      entity_count: bundle.entities.length,
      seed_record_count: loaded?.seed_records.length,
      application_status: application.status,
    },
    null,
    2,
  );
}

function fixedClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, tick++));
}
