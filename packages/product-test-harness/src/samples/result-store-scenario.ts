import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ProductScenario } from "../contracts.js";
import { runScenario } from "../runner.js";
import { LocalFileProductResultStore } from "../results/local-file-store.js";
import { createProductResultStoreSnapshot } from "../results/store.js";

export const resultStoreScenario: ProductScenario = {
  scenario_id: "pth.sample.result-store",
  version: "1.0.0",
  title: "Product harness result-store sample",
  description: "Synthetic sample scenario used to verify PTH03 local result persistence.",
  mode: "gate",
  owner: "product-readiness",
  tags: ["sample", "synthetic", "results"],
  steps: [
    {
      step_id: "capture-alpha-evidence",
      name: "Capture Alpha gate evidence",
      run: () => ({
        status: "passed",
        evidence_refs: ["artifact://sample/result-store-context.json"],
        assertions: [
          {
            assertion_id: "result-store-synthetic-only",
            name: "Result store evidence is synthetic",
            severity: "blocker",
            status: "passed",
            expected: "stored evidence uses synthetic fixture data",
            actual: "stored evidence uses synthetic fixture data",
          },
        ],
        artifacts: [
          {
            artifact_id: "result-store-context",
            label: "Result store context",
            type: "json",
            uri: "artifact://sample/result-store-context.json",
            redaction_status: "not_required",
          },
        ],
      }),
    },
  ],
};

export async function runResultStoreScenario(): Promise<string> {
  const result = await runScenario(resultStoreScenario, {
    run_id: "pth-sample-result-store",
    environment: { label: "local-sample" },
    git: { ref: "local" },
    now: fixedClock(),
  });
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-product-results-"));
  const store = new LocalFileProductResultStore({ directory });
  const snapshot = createProductResultStoreSnapshot({
    run: result,
    created_at: new Date(Date.UTC(2026, 4, 27, 12, 0, 10)).toISOString(),
    seed_records: [
      {
        seed_id: "seed-alpha-001",
        seed_version: "sample-v1",
        entity_type: "alpha_gate_fixture",
        entity_ref: "fixture://alpha/sample",
        scenario_id: result.scenario.scenario_id,
      },
    ],
  });

  const save = await store.saveRun(snapshot);
  const loaded = await store.getRun(result.run_id);
  const gateRuns = await store.listRuns({ mode: "gate", status: "passed" });

  return JSON.stringify(
    {
      directory,
      save,
      loaded_run_id: loaded?.run.run_id,
      listed_runs: gateRuns.map((run) => run.run_id),
      artifact_count: gateRuns[0]?.artifact_count,
    },
    null,
    2,
  );
}

function fixedClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, tick++));
}
