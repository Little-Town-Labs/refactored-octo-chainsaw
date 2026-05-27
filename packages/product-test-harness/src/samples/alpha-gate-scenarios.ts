import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalFileProductResultStore } from "../results/local-file-store.js";
import { runAlphaGateSuite } from "../scenarios/alpha-gates.js";

export async function runAlphaGateScenarioSample(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-alpha-gate-"));
  const store = new LocalFileProductResultStore({ directory });
  const suite = await runAlphaGateSuite({ store });
  const summaries = await store.listRuns({ mode: "gate", status: "passed" });

  return JSON.stringify(
    {
      summary: suite.summary,
      result_store_directory: directory,
      scenarios: suite.results.map((result) => ({
        scenario_id: result.run.scenario.scenario_id,
        status: result.run.status,
        decision: result.outcome.decision,
        block_reason: result.outcome.block_reason ?? null,
        seed_records: result.snapshot.seed_records.length,
        audit_signals: result.snapshot.observability_assertions.length,
      })),
      persisted_gate_runs: summaries.length,
    },
    null,
    2,
  );
}
