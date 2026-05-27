import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { DEFAULT_API_WEBHOOK_GATES } from "../api-webhooks/gates.js";
import { runDefaultApiWebhookGateSuite } from "../api-webhooks/runner.js";
import { LocalFileProductResultStore } from "../results/local-file-store.js";

export async function runApiWebhookGateScenarioSample(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "spyglass-api-webhook-gate-"));
  const store = new LocalFileProductResultStore({ directory });
  const suite = await runDefaultApiWebhookGateSuite({ store });
  const summaries = await store.listRuns({ mode: "gate" });

  return JSON.stringify(
    {
      summary: suite.summary,
      result_store_directory: directory,
      gate_count: DEFAULT_API_WEBHOOK_GATES.length,
      persisted_gate_runs: summaries.length,
      gates: suite.results.map((result) => ({
        gate_id: result.gate.gate_id,
        status: result.run.status,
        operations: result.operations.length,
        webhook_captures: result.webhook_captures.length,
        denied_operations: result.operations.filter((operation) => operation.status === "denied")
          .length,
        duplicate_captures: result.webhook_captures.filter(
          (capture) => capture.idempotency_status === "duplicate",
        ).length,
        failed_captures: result.webhook_captures.filter(
          (capture) => capture.delivery_status === "failed",
        ).length,
      })),
    },
    null,
    2,
  );
}
