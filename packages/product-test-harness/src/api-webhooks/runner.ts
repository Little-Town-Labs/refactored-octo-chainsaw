import type {
  EmployerApiOperationResult,
  ProductResultStore,
  ProductResultStoreSnapshot,
  ProductWebhookCaptureRecord,
  ScenarioAssertion,
  ScenarioEnvironment,
  ScenarioRunResult,
} from "../contracts.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { runScenario } from "../runner.js";
import type { ApiWebhookGateConfig } from "./gates.js";
import {
  DEFAULT_API_WEBHOOK_GATES,
  evaluateEmployerApiOperation,
  toApiWebhookProductScenario,
} from "./gates.js";
import { SyntheticWebhookReceiver } from "./receiver.js";

export interface ApiWebhookGateRun {
  readonly gate: ApiWebhookGateConfig;
  readonly operations: readonly EmployerApiOperationResult[];
  readonly webhook_captures: readonly ProductWebhookCaptureRecord[];
  readonly run: ScenarioRunResult;
  readonly snapshot: ProductResultStoreSnapshot;
}

export interface RunApiWebhookGateOptions {
  readonly run_id?: string;
  readonly environment?: ScenarioEnvironment;
  readonly store?: ProductResultStore;
}

export interface ApiWebhookGateSuiteResult {
  readonly results: readonly ApiWebhookGateRun[];
  readonly summary: string;
}

export async function runApiWebhookGate(
  gate: ApiWebhookGateConfig,
  options: RunApiWebhookGateOptions = {},
): Promise<ApiWebhookGateRun> {
  const runId = options.run_id ?? `api-webhook-gate-${gate.gate_id}`;
  const operations: EmployerApiOperationResult[] = [];
  const webhookCaptures: ProductWebhookCaptureRecord[] = [];
  const receiver = new SyntheticWebhookReceiver({
    run_id: runId,
    scenario_id: gate.scenario_id,
  });

  const scenario = {
    ...toApiWebhookProductScenario(gate),
    steps: [
      {
        step_id: "employer-api-operations",
        name: "Evaluate scoped employer API operations",
        run: () => {
          operations.push(...gate.operations.map(evaluateEmployerApiOperation));
          return {
            status: operationStepPassed(gate, operations)
              ? ("passed" as const)
              : ("failed" as const),
            assertions: operationAssertions(gate, operations),
            evidence_refs: operations.flatMap((operation) => operation.emitted_event_refs),
            metadata: {
              operation_count: operations.length,
              denied_count: operations.filter((operation) => operation.status === "denied").length,
            },
          };
        },
      },
      {
        step_id: "webhook-receiver-captures",
        name: "Capture signed webhook deliveries",
        run: () => {
          webhookCaptures.push(...gate.deliveries.map((delivery) => receiver.receive(delivery)));
          return {
            status: webhookStepPassed(gate, webhookCaptures)
              ? ("passed" as const)
              : ("failed" as const),
            assertions: webhookAssertions(gate, webhookCaptures),
            evidence_refs: webhookCaptures.flatMap((capture) => capture.artifact_refs ?? []),
            metadata: {
              delivery_count: gate.deliveries.length,
              capture_count: webhookCaptures.length,
              duplicate_count: webhookCaptures.filter(
                (capture) => capture.idempotency_status === "duplicate",
              ).length,
            },
          };
        },
      },
    ],
  };

  const run = await runScenario(scenario, {
    run_id: runId,
    environment: options.environment ?? { label: "local-api-webhook-gate" },
    metadata: {
      gate_id: gate.gate_id,
      operation_count: gate.operations.length,
      delivery_count: gate.deliveries.length,
    },
    now: deterministicClock(),
  });

  const snapshot = createProductResultStoreSnapshot({
    run,
    webhook_captures: webhookCaptures,
    created_at: "2026-05-27T13:00:00.000Z",
  });

  if (options.store) await options.store.saveRun(snapshot);

  return {
    gate,
    operations,
    webhook_captures: webhookCaptures,
    run,
    snapshot,
  };
}

export async function runDefaultApiWebhookGateSuite(
  options: RunApiWebhookGateOptions = {},
): Promise<ApiWebhookGateSuiteResult> {
  const results: ApiWebhookGateRun[] = [];
  for (const gate of DEFAULT_API_WEBHOOK_GATES) {
    results.push(
      await runApiWebhookGate(gate, {
        ...options,
        run_id: `api-webhook-gate-${gate.gate_id}`,
      }),
    );
  }
  const passed = results.filter((result) => result.run.status === "passed").length;
  return {
    results,
    summary: `${passed}/${results.length} API/webhook gate(s) passed`,
  };
}

function operationStepPassed(
  gate: ApiWebhookGateConfig,
  operations: readonly EmployerApiOperationResult[],
): boolean {
  if (gate.gate_id === "missing-scope-denial") {
    return operations.length === 1 && operations[0]?.reason_code === "missing_scope";
  }
  return operations.every((operation) => operation.status === "authorized");
}

function webhookStepPassed(
  gate: ApiWebhookGateConfig,
  captures: readonly ProductWebhookCaptureRecord[],
): boolean {
  if (gate.gate_id === "duplicate-webhook-idempotency") {
    return (
      captures.some((capture) => capture.idempotency_status === "accepted") &&
      captures.some((capture) => capture.idempotency_status === "duplicate")
    );
  }
  if (gate.gate_id === "webhook-failure-evidence") {
    return captures.length === 1 && captures[0]?.delivery_status === "failed";
  }
  if (gate.gate_id === "forbidden-payload-boundary") {
    return captures.length === 1 && captures[0]?.payload_boundary_valid === false;
  }
  return captures.every(
    (capture) =>
      capture.signature_valid &&
      capture.payload_boundary_valid &&
      capture.idempotency_status === "accepted" &&
      capture.delivery_status === "delivered",
  );
}

function operationAssertions(
  gate: ApiWebhookGateConfig,
  operations: readonly EmployerApiOperationResult[],
): readonly ScenarioAssertion[] {
  return [
    {
      assertion_id: `${gate.scenario_id}.api-auth`,
      name: "Employer API credential scope behaved deterministically",
      severity: "blocker",
      status: operationStepPassed(gate, operations) ? "passed" : "failed",
      expected:
        gate.gate_id === "missing-scope-denial"
          ? "missing scope is denied"
          : "required operations are authorized",
      actual:
        operations.map((operation) => operation.reason_code ?? operation.status).join(",") ||
        "none",
    },
  ];
}

function webhookAssertions(
  gate: ApiWebhookGateConfig,
  captures: readonly ProductWebhookCaptureRecord[],
): readonly ScenarioAssertion[] {
  return [
    {
      assertion_id: `${gate.scenario_id}.webhook-captures`,
      name: "Webhook captures preserve signature, boundary, idempotency, and status evidence",
      severity: "major",
      status: webhookStepPassed(gate, captures) ? "passed" : "failed",
      expected: "captures match gate expectation",
      actual:
        captures
          .map(
            (capture) =>
              `${capture.signature_valid}:${capture.payload_boundary_valid}:${capture.idempotency_status}:${capture.delivery_status}`,
          )
          .join(",") || "none",
    },
  ];
}

function deterministicClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 13, 0, tick++));
}
