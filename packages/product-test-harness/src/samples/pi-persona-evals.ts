import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_PI_PERSONA_ENCOUNTERS } from "../persona-evals/matrix.js";
import { runDefaultPiPersonaEvalSuite } from "../persona-evals/runner.js";
import { LocalFileProductResultStore } from "../results/local-file-store.js";

export async function runPiPersonaEvalScenarioSample(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-pi-persona-eval-"));
  const store = new LocalFileProductResultStore({ directory });
  const suite = await runDefaultPiPersonaEvalSuite({ store });
  const summaries = await store.listRuns({ mode: "eval" });

  return JSON.stringify(
    {
      summary: suite.summary,
      result_store_directory: directory,
      encounter_count: DEFAULT_PI_PERSONA_ENCOUNTERS.length,
      persisted_eval_runs: summaries.length,
      outcomes: suite.results.reduce<Record<string, number>>((outcomes, result) => {
        const outcome = result.driver_result.evaluator_summary.outcome;
        outcomes[outcome] = (outcomes[outcome] ?? 0) + 1;
        return outcomes;
      }, {}),
      encounters: suite.results.map((result) => ({
        encounter_id: result.encounter.encounter_id,
        status: result.run.status,
        seeker_persona_id: result.encounter.seeker_persona_id,
        employer_persona_id: result.encounter.employer_persona_id,
        outcome: result.driver_result.evaluator_summary.outcome,
        tool_traces: result.driver_result.tool_traces.length,
        cost_usd: result.driver_result.cost_usd,
        latency_ms: result.driver_result.latency_ms,
        agent_invocations: result.agent_invocations.length,
      })),
    },
    null,
    2,
  );
}
