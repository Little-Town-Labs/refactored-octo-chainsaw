import type {
  ProductAuditSignal,
  ProductIncidentEvidenceSignal,
  ProductLogSignal,
  ProductMonitoringSignal,
  ProductScenario,
  ProductSentryConfigSignal,
} from "../contracts.js";
import type { AuditCoverageExpectation } from "./signals.js";

export type ObservabilityGateId =
  | "audit-signal-coverage"
  | "monitoring-latency-cost"
  | "sentry-config-readiness"
  | "incident-readiness"
  | "unsafe-log-rejection";

export interface ObservabilityGateConfig {
  readonly gate_id: ObservabilityGateId;
  readonly scenario_id: string;
  readonly title: string;
  readonly audit_signals?: readonly ProductAuditSignal[];
  readonly audit_expectations?: readonly AuditCoverageExpectation[];
  readonly monitoring_signals?: readonly ProductMonitoringSignal[];
  readonly sentry_config?: ProductSentryConfigSignal;
  readonly incident_evidence?: ProductIncidentEvidenceSignal;
  readonly log_signals?: readonly ProductLogSignal[];
  readonly unsafe_log_expected?: boolean;
}

export const PTH08_SCENARIO_VERSION = "1.0.0";
export const PTH08_BASE_TIME = "2026-05-27T14:00:00.000Z";

export const OBSERVABILITY_GATE_IDS: readonly ObservabilityGateId[] = [
  "audit-signal-coverage",
  "monitoring-latency-cost",
  "sentry-config-readiness",
  "incident-readiness",
  "unsafe-log-rejection",
];

export const DEFAULT_OBSERVABILITY_GATES: readonly ObservabilityGateConfig[] = [
  auditSignalCoverageGate(),
  monitoringLatencyCostGate(),
  sentryConfigReadinessGate(),
  incidentReadinessGate(),
  unsafeLogRejectionGate(),
];

export function toObservabilityProductScenario(config: ObservabilityGateConfig): ProductScenario {
  return {
    scenario_id: config.scenario_id,
    version: PTH08_SCENARIO_VERSION,
    title: config.title,
    description: "Deterministic observability and incident gate scenario.",
    mode: "gate",
    owner: "product-test-harness",
    tags: ["PTH08", "observability", "incident"],
    steps: [],
  };
}

function auditSignalCoverageGate(): ObservabilityGateConfig {
  return {
    gate_id: "audit-signal-coverage",
    scenario_id: "observability.audit-signal-coverage",
    title: "Audit signal coverage",
    audit_expectations: [
      { action: "alpha.gate.started", subject_ref: "ticket://alpha/pth08", outcome: "emitted" },
      { action: "alpha.gate.completed", subject_ref: "ticket://alpha/pth08", outcome: "allowed" },
      {
        action: "privacy.boundary.checked",
        subject_ref: "ticket://alpha/pth08",
        outcome: "allowed",
      },
    ],
    audit_signals: [
      auditSignal("audit-pth08-started", "alpha.gate.started", "emitted"),
      auditSignal("audit-pth08-completed", "alpha.gate.completed", "allowed"),
      auditSignal("audit-pth08-privacy", "privacy.boundary.checked", "allowed"),
    ],
  };
}

function monitoringLatencyCostGate(): ObservabilityGateConfig {
  return {
    gate_id: "monitoring-latency-cost",
    scenario_id: "observability.monitoring-latency-cost",
    title: "Monitoring latency and cost bounds",
    monitoring_signals: [
      monitoringSignal("monitoring-pth08-latency", "alpha_gate_latency_ms", 480, "ms", 500),
      monitoringSignal("monitoring-pth08-cost", "alpha_gate_cost_usd", 0.42, "usd", 1),
    ],
  };
}

function sentryConfigReadinessGate(): ObservabilityGateConfig {
  return {
    gate_id: "sentry-config-readiness",
    scenario_id: "observability.sentry-config-readiness",
    title: "Sentry-style config readiness",
    sentry_config: {
      ...baseSignal("sentry-pth08-config", "sentry", "major"),
      release: "spyglass-product-harness@pth08",
      environment: "preview",
      dsn_ref: "sentry-dsn://redacted/alpha-preview",
      traces_sample_rate: 0.2,
      enabled: true,
    },
  };
}

function incidentReadinessGate(): ObservabilityGateConfig {
  return {
    gate_id: "incident-readiness",
    scenario_id: "observability.incident-readiness",
    title: "Incident readiness evidence",
    incident_evidence: {
      ...baseSignal("incident-pth08-sev1", "incident", "blocker"),
      incident_ref: "incident://synthetic/pth08-sev1",
      incident_severity: "sev1",
      owner_ref: "operator://oncall/alpha",
      trigger_refs: ["monitoring://alpha/pth08/latency", "audit://alpha/pth08/privacy"],
      response_status: "acknowledged",
    },
  };
}

function unsafeLogRejectionGate(): ObservabilityGateConfig {
  return {
    gate_id: "unsafe-log-rejection",
    scenario_id: "observability.unsafe-log-rejection",
    title: "Unsafe log rejection",
    unsafe_log_expected: true,
    log_signals: [
      {
        ...baseSignal("log-pth08-unsafe", "log", "blocker"),
        message: "synthetic log rejected before persistence",
        metadata: {
          nested: {
            token: "synthetic-secret-value",
          },
        },
      },
    ],
  };
}

function auditSignal(
  signalId: string,
  action: string,
  outcome: ProductAuditSignal["outcome"],
): ProductAuditSignal {
  return {
    ...baseSignal(signalId, "audit", "major"),
    action,
    actor_ref: "service-principal://product-harness/pth08",
    subject_ref: "ticket://alpha/pth08",
    outcome,
  };
}

function monitoringSignal(
  signalId: string,
  metricName: string,
  value: number,
  unit: ProductMonitoringSignal["unit"],
  budget: number,
): ProductMonitoringSignal {
  return {
    ...baseSignal(signalId, "monitoring", "major"),
    metric_name: metricName,
    value,
    unit,
    budget,
    comparison: "max",
  };
}

function baseSignal<
  T extends
    | ProductAuditSignal["signal_type"]
    | ProductMonitoringSignal["signal_type"]
    | ProductSentryConfigSignal["signal_type"]
    | ProductIncidentEvidenceSignal["signal_type"]
    | ProductLogSignal["signal_type"],
>(signalId: string, signalType: T, severity: "blocker" | "major") {
  return {
    signal_id: signalId,
    signal_type: signalType,
    status: "passed" as const,
    severity,
    observed_at: PTH08_BASE_TIME,
    evidence_refs: [`${signalType}://alpha/pth08/${signalId}`],
  };
}
