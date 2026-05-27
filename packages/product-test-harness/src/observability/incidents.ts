import type {
  ProductIncidentEvidenceSignal,
  ProductObservabilityEvaluation,
  ProductSentryConfigSignal,
} from "../contracts.js";
import { assertLogSafety } from "./log-safety.js";
import { createObservabilityEvaluation } from "./signals.js";

export function evaluateSentryConfig(
  signal: ProductSentryConfigSignal,
): ProductObservabilityEvaluation {
  const missingRequired =
    signal.release.trim() === "" ||
    signal.environment.trim() === "" ||
    signal.dsn_ref.trim() === "" ||
    !signal.enabled;
  const sampleRateInvalid = signal.traces_sample_rate < 0 || signal.traces_sample_rate > 1;
  const dsnUnsafe = !assertLogSafety(signal.dsn_ref).valid || /^https?:\/\//i.test(signal.dsn_ref);
  const passed = !missingRequired && !sampleRateInvalid && !dsnUnsafe;

  return createObservabilityEvaluation({
    assertion_id: `${signal.signal_id}.config`,
    signal_type: "sentry",
    status: passed ? "passed" : "failed",
    reason_code: passed ? "passed" : "invalid_sentry_config",
    evidence_refs: signal.evidence_refs,
    metadata: {
      release: signal.release,
      environment: signal.environment,
      dsn_ref: signal.dsn_ref,
      enabled: signal.enabled,
      traces_sample_rate: signal.traces_sample_rate,
    },
  });
}

export function evaluateIncidentEvidence(
  signal: ProductIncidentEvidenceSignal,
): ProductObservabilityEvaluation {
  const passed =
    signal.incident_ref.trim() !== "" &&
    signal.owner_ref.trim() !== "" &&
    signal.trigger_refs.length > 0 &&
    signal.response_status.trim() !== "" &&
    signal.evidence_refs.length > 0;

  return createObservabilityEvaluation({
    assertion_id: `${signal.signal_id}.readiness`,
    signal_type: "incident",
    status: passed ? "passed" : "failed",
    reason_code: passed ? "passed" : "missing_required_field",
    evidence_refs: signal.evidence_refs,
    metadata: {
      incident_ref: signal.incident_ref,
      incident_severity: signal.incident_severity,
      owner_ref: signal.owner_ref,
      trigger_refs: signal.trigger_refs,
      response_status: signal.response_status,
    },
  });
}
