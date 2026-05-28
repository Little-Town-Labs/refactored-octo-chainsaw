import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_OBSERVABILITY_GATES } from "../observability/gates.js";
import { runDefaultObservabilityGateSuite } from "../observability/runner.js";
import { LocalFileProductResultStore } from "../results/local-file-store.js";

export async function runObservabilityGateScenarioSample(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-observability-gate-"));
  const store = new LocalFileProductResultStore({ directory });
  const suite = await runDefaultObservabilityGateSuite({ store });
  const summaries = await store.listRuns({ mode: "gate" });

  return JSON.stringify(
    {
      summary: suite.summary,
      result_store_directory: directory,
      gate_count: DEFAULT_OBSERVABILITY_GATES.length,
      persisted_gate_runs: summaries.length,
      gates: suite.results.map((result) => ({
        gate_id: result.gate.gate_id,
        status: result.run.status,
        evaluations: result.evaluations.length,
        observability_assertions: result.observability_assertions.length,
        failed_evaluations: result.evaluations.filter(
          (evaluation) => evaluation.status === "failed",
        ).length,
        unsafe_log_results: result.log_safety_results.filter((entry) => !entry.valid).length,
      })),
    },
    null,
    2,
  );
}
