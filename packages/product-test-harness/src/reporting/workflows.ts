import type { ProductHarnessWorkflowPlan } from "../contracts.js";

export const DEFAULT_PRODUCT_HARNESS_WORKFLOWS: readonly ProductHarnessWorkflowPlan[] = [
  {
    workflow_id: "product-gate",
    workflow_file: ".github/workflows/product-gate.yml",
    command: "product:gate",
    triggers: ["workflow_dispatch", "pull_request_label"],
    environment: "ci",
    artifact_name: "product-harness-report",
  },
  {
    workflow_id: "persona-eval",
    workflow_file: ".github/workflows/persona-eval.yml",
    command: "product:eval",
    triggers: ["workflow_dispatch", "schedule"],
    environment: "ci",
    artifact_name: "product-harness-eval-report",
  },
  {
    workflow_id: "alpha-canary",
    workflow_file: ".github/workflows/alpha-canary.yml",
    command: "product:canary",
    triggers: ["workflow_dispatch", "schedule", "deployment_status"],
    environment: "production",
    artifact_name: "product-harness-canary-report",
  },
];
