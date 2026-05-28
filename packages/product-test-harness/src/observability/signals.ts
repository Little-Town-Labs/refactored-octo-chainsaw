import type {
  ProductAuditSignal,
  ProductObservabilityEvaluation,
  ProductObservabilitySignal,
  ProductObservabilitySignalType,
  SafeMetadata,
} from "../contracts.js";
import { assertLogSafety } from "./log-safety.js";

export interface AuditCoverageExpectation {
  readonly action: string;
  readonly subject_ref?: string;
  readonly outcome?: ProductAuditSignal["outcome"];
}

export function createObservabilityEvaluation(input: {
  readonly assertion_id: string;
  readonly signal_type: ProductObservabilitySignalType;
  readonly status: ProductObservabilityEvaluation["status"];
  readonly reason_code: ProductObservabilityEvaluation["reason_code"];
  readonly evidence_refs?: readonly string[];
  readonly metadata?: SafeMetadata;
}): ProductObservabilityEvaluation {
  const evaluation: ProductObservabilityEvaluation = {
    assertion_id: input.assertion_id,
    signal_type: input.signal_type,
    status: input.status,
    reason_code: input.reason_code,
    evidence_refs: input.evidence_refs ?? [],
    ...(input.metadata ? { metadata: sanitizeMetadata(input.metadata) } : {}),
  };
  return evaluation;
}

export function evaluateAuditCoverage(
  assertionId: string,
  signals: readonly ProductAuditSignal[],
  expectations: readonly AuditCoverageExpectation[],
): ProductObservabilityEvaluation {
  const missing = expectations.filter(
    (expected) =>
      !signals.some(
        (signal) =>
          signal.action === expected.action &&
          (!expected.subject_ref || signal.subject_ref === expected.subject_ref) &&
          (!expected.outcome || signal.outcome === expected.outcome) &&
          signal.actor_ref.trim() !== "" &&
          signal.evidence_refs.length > 0,
      ),
  );

  return createObservabilityEvaluation({
    assertion_id: assertionId,
    signal_type: "audit",
    status: missing.length === 0 ? "passed" : "failed",
    reason_code: missing.length === 0 ? "passed" : "missing_signal",
    evidence_refs: signals.flatMap((signal) => signal.evidence_refs),
    metadata: {
      expected_actions: expectations.map((expected) => expected.action),
      missing_actions: missing.map((expected) => expected.action),
    },
  });
}

export function signalBase(input: ProductObservabilitySignal): ProductObservabilitySignal {
  return {
    ...input,
    ...(input.metadata ? { metadata: sanitizeMetadata(input.metadata) } : {}),
  };
}

export function sanitizeMetadata(metadata: SafeMetadata): SafeMetadata {
  const safety = assertLogSafety(metadata);
  if (!safety.valid) {
    return {
      unsafe_metadata_rejected: true,
      reason_code: safety.reason_code,
      forbidden_paths: safety.forbidden_paths,
    };
  }
  return metadata;
}
