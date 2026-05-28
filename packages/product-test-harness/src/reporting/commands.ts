import type { ProductHarnessCommandName, ProductHarnessCommandPlan } from "../contracts.js";

export const DEFAULT_PRODUCT_HARNESS_COMMANDS: readonly ProductHarnessCommandPlan[] = [
  {
    command: "product:gate",
    mode: "ci",
    description: "Run deterministic Alpha-readiness product gates and emit suite reports.",
    scenario_refs: [
      "PTH05 Alpha gate scenarios A1-A5",
      "PTH06 browser journeys",
      "PTH07 employer API and webhook gates",
      "PTH08 observability gates",
    ],
    required_env: ["NEON_API_KEY", "NEON_PROJECT_ID", "NEON_PARENT_BRANCH_ID"],
    output_artifacts: ["product-harness-report.json", "product-harness-report.md"],
  },
  {
    command: "product:eval",
    mode: "ci",
    description:
      "Run persona encounter evals and emit informational cost, latency, outcome, and drift reports.",
    scenario_refs: ["PTH09 persona eval encounter matrix", "PTH15 eval trend monitoring"],
    required_env: ["PI_API_KEY"],
    output_artifacts: ["product-harness-eval-report.json", "product-harness-eval-report.md"],
  },
  {
    command: "product:canary",
    mode: "canary",
    description: "Run deployed preview or production canaries and verify observable evidence.",
    scenario_refs: [
      "PTH06 deployed browser journeys",
      "PTH08 observability canary",
      "PTH10 trend summary",
      "PTH13 Browserbase replay driver",
    ],
    required_env: [
      "PRODUCT_CANARY_URL",
      "BROWSERBASE_PROJECT_ID",
      "BROWSERBASE_API_KEY",
      "PRODUCT_HARNESS_DATABASE_URL",
      "PRODUCT_ARTIFACT_STORE_PROVIDER",
      "PRODUCT_ARTIFACT_STORE_BUCKET",
      "PRODUCT_ARTIFACT_STORE_PREFIX",
      "PRODUCT_ARTIFACT_STORE_CREDENTIAL_REF",
    ],
    output_artifacts: ["product-harness-canary-report.json", "product-harness-canary-report.md"],
  },
];

export function getProductHarnessCommandPlan(
  command: ProductHarnessCommandName,
): ProductHarnessCommandPlan {
  const plan = DEFAULT_PRODUCT_HARNESS_COMMANDS.find((entry) => entry.command === command);
  if (!plan) throw new Error(`Unknown product harness command: ${command}`);
  return plan;
}
