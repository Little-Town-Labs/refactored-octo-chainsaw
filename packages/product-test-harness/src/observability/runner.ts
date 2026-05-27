import type {
  ProductLogSafetyResult,
  ProductObservabilityAssertionRecord,
  ProductObservabilityEvaluation,
  ProductResultStore,
  ProductResultStoreSnapshot,
  ScenarioAssertion,
  ScenarioEnvironment,
  ScenarioRunResult,
} from "../contracts.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { runScenario } from "../runner.js";
import {
  DEFAULT_OBSERVABILITY_GATES,
  toObservabilityProductScenario,
  type ObservabilityGateConfig,
} from "./gates.js";
import { evaluateIncidentEvidence, evaluateSentryConfig } from "./incidents.js";
import { assertLogSafety } from "./log-safety.js";
import { evaluateMonitoringSignal } from "./monitoring.js";
import { createObservabilityEvaluation, evaluateAuditCoverage } from "./signals.js";

export interface ObservabilityGateRun {
  readonly gate: ObservabilityGateConfig;
  readonly evaluations: readonly ProductObservabilityEvaluation[];
  readonly log_safety_results: readonly ProductLogSafetyResult[];
  readonly observability_assertions: readonly ProductObservabilityAssertionRecord[];
  readonly run: ScenarioRunResult;
  readonly snapshot: ProductResultStoreSnapshot;
}

export interface RunObservabilityGateOptions {
  readonly run_id?: string;
  readonly environment?: ScenarioEnvironment;
  readonly store?: ProductResultStore;
}

export interface ObservabilityGateSuiteResult {
  readonly results: readonly ObservabilityGateRun[];
  readonly summary: string;
}

export async function runObservabilityGate(
  gate: ObservabilityGateConfig,
  options: RunObservabilityGateOptions = {},
): Promise<ObservabilityGateRun> {
  const runId = options.run_id ?? `observability-gate-${gate.gate_id}`;
  const evaluations: ProductObservabilityEvaluation[] = [];
  const logSafetyResults: ProductLogSafetyResult[] = [];

  const scenario = {
    ...toObservabilityProductScenario(gate),
    steps: [
      {
        step_id: "observability-signal-assertions",
        name: "Evaluate deterministic observability signals",
        run: () => {
          const evaluated = evaluateGate(gate, logSafetyResults);
          evaluations.push(...evaluated);
          return {
            status: gateStepPassed(evaluated) ? ("passed" as const) : ("failed" as const),
            assertions: scenarioAssertions(gate, evaluated),
            evidence_refs: evaluated.flatMap((evaluation) => evaluation.evidence_refs),
            metadata: {
              gate_id: gate.gate_id,
              evaluation_count: evaluated.length,
              failed_count: evaluated.filter((evaluation) => evaluation.status === "failed").length,
            },
          };
        },
      },
    ],
  };

  const run = await runScenario(scenario, {
    run_id: runId,
    environment: options.environment ?? { label: "local-observability-gate" },
    metadata: {
      gate_id: gate.gate_id,
      signal_count: signalCount(gate),
    },
    now: deterministicClock(),
  });

  const observabilityAssertions = evaluations.map((evaluation) =>
    toObservabilityAssertion(runId, gate.scenario_id, evaluation),
  );
  const snapshot = createProductResultStoreSnapshot({
    run,
    observability_assertions: observabilityAssertions,
    created_at: "2026-05-27T14:00:00.000Z",
  });

  if (options.store) await options.store.saveRun(snapshot);

  return {
    gate,
    evaluations,
    log_safety_results: logSafetyResults,
    observability_assertions: observabilityAssertions,
    run,
    snapshot,
  };
}

export async function runDefaultObservabilityGateSuite(
  options: RunObservabilityGateOptions = {},
): Promise<ObservabilityGateSuiteResult> {
  const results: ObservabilityGateRun[] = [];
  for (const gate of DEFAULT_OBSERVABILITY_GATES) {
    results.push(
      await runObservabilityGate(gate, {
        ...options,
        run_id: `observability-gate-${gate.gate_id}`,
      }),
    );
  }
  const passed = results.filter((result) => result.run.status === "passed").length;
  return {
    results,
    summary: `${passed}/${results.length} observability gate(s) passed`,
  };
}

function evaluateGate(
  gate: ObservabilityGateConfig,
  logSafetyResults: ProductLogSafetyResult[],
): readonly ProductObservabilityEvaluation[] {
  const evaluations: ProductObservabilityEvaluation[] = [];

  if (gate.audit_signals || gate.audit_expectations) {
    evaluations.push(
      evaluateAuditCoverage(
        `${gate.scenario_id}.audit-coverage`,
        gate.audit_signals ?? [],
        gate.audit_expectations ?? [],
      ),
    );
  }
  evaluations.push(...(gate.monitoring_signals ?? []).map(evaluateMonitoringSignal));
  if (gate.sentry_config) evaluations.push(evaluateSentryConfig(gate.sentry_config));
  if (gate.incident_evidence) evaluations.push(evaluateIncidentEvidence(gate.incident_evidence));

  for (const logSignal of gate.log_signals ?? []) {
    const safety = assertLogSafety(logSignal);
    logSafetyResults.push(safety);
    const expectedUnsafe = gate.unsafe_log_expected === true;
    const passed = expectedUnsafe ? !safety.valid : safety.valid;
    evaluations.push(
      createObservabilityEvaluation({
        assertion_id: `${logSignal.signal_id}.log-safety`,
        signal_type: "log",
        status: passed ? "passed" : "failed",
        reason_code: logSafetyReasonCode(safety),
        evidence_refs: logSignal.evidence_refs,
        metadata: {
          valid: safety.valid,
          forbidden_paths: safety.forbidden_paths,
        },
      }),
    );
  }

  return evaluations.length > 0
    ? evaluations
    : [
        createObservabilityEvaluation({
          assertion_id: `${gate.scenario_id}.signals`,
          signal_type: "other",
          status: "failed",
          reason_code: "missing_signal",
        }),
      ];
}

function gateStepPassed(evaluations: readonly ProductObservabilityEvaluation[]): boolean {
  return (
    evaluations.length > 0 && evaluations.every((evaluation) => evaluation.status === "passed")
  );
}

function scenarioAssertions(
  gate: ObservabilityGateConfig,
  evaluations: readonly ProductObservabilityEvaluation[],
): readonly ScenarioAssertion[] {
  return [
    {
      assertion_id: `${gate.scenario_id}.observability`,
      name: "Observability gate produced expected deterministic evidence",
      severity: "blocker",
      status: gateStepPassed(evaluations) ? "passed" : "failed",
      expected: "all gate evaluations pass",
      actual:
        evaluations
          .map((evaluation) => `${evaluation.signal_type}:${evaluation.reason_code}`)
          .join(",") || "none",
    },
  ];
}

function toObservabilityAssertion(
  runId: string,
  scenarioId: string,
  evaluation: ProductObservabilityEvaluation,
): ProductObservabilityAssertionRecord {
  return {
    assertion_id: evaluation.assertion_id,
    run_id: runId,
    scenario_id: scenarioId,
    signal_type: evaluation.signal_type,
    status: evaluation.status,
    ...(evaluation.evidence_refs.length > 0 ? { evidence_refs: evaluation.evidence_refs } : {}),
    metadata: {
      reason_code: evaluation.reason_code,
      ...(evaluation.metadata ?? {}),
    },
  };
}

function signalCount(gate: ObservabilityGateConfig): number {
  return (
    (gate.audit_signals?.length ?? 0) +
    (gate.monitoring_signals?.length ?? 0) +
    (gate.sentry_config ? 1 : 0) +
    (gate.incident_evidence ? 1 : 0) +
    (gate.log_signals?.length ?? 0)
  );
}

function logSafetyReasonCode(
  safety: ProductLogSafetyResult,
): ProductObservabilityEvaluation["reason_code"] {
  if (safety.valid) return "passed";
  if (safety.reason_code === "safe") return "passed";
  return safety.reason_code;
}

function deterministicClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 27, 14, 0, tick++));
}
