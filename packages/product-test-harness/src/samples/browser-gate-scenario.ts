import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalFileProductResultStore } from "../results/local-file-store.js";
import { DEFAULT_BROWSER_JOURNEYS } from "../browser/journeys.js";
import { runDefaultBrowserJourneySuite } from "../browser/runner.js";

export async function runBrowserGateScenarioSample(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-browser-gate-"));
  const store = new LocalFileProductResultStore({ directory });
  const suite = await runDefaultBrowserJourneySuite({
    store,
    app_url: "http://127.0.0.1:3000",
  });
  const summaries = await store.listRuns({ mode: "gate", status: "passed" });

  return JSON.stringify(
    {
      summary: suite.summary,
      result_store_directory: directory,
      journey_count: DEFAULT_BROWSER_JOURNEYS.length,
      persisted_gate_runs: summaries.length,
      journeys: suite.results.map((result) => ({
        journey_id: result.journey.journey_id,
        status: result.run.status,
        category: result.journey.category,
        routes: result.journey.routes.length,
        viewports: result.journey.viewports.length,
        browser_artifacts: result.browser_artifacts.length,
      })),
    },
    null,
    2,
  );
}
