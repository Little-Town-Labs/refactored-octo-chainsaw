import type { ProductMonitoringSignal, ProductObservabilityEvaluation } from "../contracts.js";
import { createObservabilityEvaluation } from "./signals.js";

export function evaluateMonitoringSignal(
  signal: ProductMonitoringSignal,
): ProductObservabilityEvaluation {
  const passed =
    signal.comparison === "max" ? signal.value <= signal.budget : signal.value >= signal.budget;

  return createObservabilityEvaluation({
    assertion_id: `${signal.signal_id}.budget`,
    signal_type: "monitoring",
    status: passed ? "passed" : "failed",
    reason_code: passed ? "passed" : "budget_exceeded",
    evidence_refs: signal.evidence_refs,
    metadata: {
      metric_name: signal.metric_name,
      value: signal.value,
      unit: signal.unit,
      budget: signal.budget,
      comparison: signal.comparison,
    },
  });
}
