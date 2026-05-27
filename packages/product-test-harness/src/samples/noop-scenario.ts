import { runScenario } from "../runner.js";
import { renderJsonReport } from "../reports/json.js";
import { renderMarkdownReport } from "../reports/markdown.js";
import type { ProductScenario } from "../contracts.js";

export const noopScenario: ProductScenario = {
  scenario_id: "pth.sample.noop",
  version: "1.0.0",
  title: "Product harness no-op sample",
  description: "Synthetic sample scenario used to verify PTH01 contracts and reports.",
  mode: "gate",
  owner: "product-readiness",
  tags: ["sample", "synthetic"],
  steps: [
    {
      step_id: "prepare-synthetic-context",
      name: "Prepare synthetic context",
      run: () => ({
        status: "passed",
        evidence_refs: ["evidence://sample/context"],
        assertions: [
          {
            assertion_id: "synthetic-only",
            name: "Sample data is synthetic",
            severity: "blocker",
            status: "passed",
            expected: "sample run uses synthetic fixture data",
            actual: "sample run uses synthetic fixture data",
          },
        ],
        artifacts: [
          {
            artifact_id: "sample-context",
            label: "Synthetic context",
            type: "json",
            uri: "artifact://sample/context.json",
            redaction_status: "not_required",
          },
        ],
      }),
    },
  ],
};

export async function runNoopScenario(): Promise<string> {
  const result = await runScenario(noopScenario, {
    run_id: "pth-sample-noop",
    environment: { label: "local-sample" },
    git: { ref: "local" },
    now: fixedClock(),
  });
  return `${renderJsonReport(result)}\n${renderMarkdownReport(result)}`;
}

function fixedClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 12, 0, tick++));
}
