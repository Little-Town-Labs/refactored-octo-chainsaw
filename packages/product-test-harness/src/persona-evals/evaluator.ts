import type {
  ProductLogSafetyResult,
  ProductPersonaEncounter,
  ProductPersonaEncounterResult,
  ProductPersonaEvalOutcome,
} from "../contracts.js";
import { assertLogSafety } from "../observability/log-safety.js";

export type ProductPersonaEvalReason =
  | "expected_outcome"
  | "unexpected_outcome"
  | "unsafe_transcript"
  | "missing_persona"
  | "driver_failed";

export interface ProductPersonaEvalAssessment {
  readonly status: "passed" | "failed";
  readonly reason_code: ProductPersonaEvalReason;
  readonly outcome: ProductPersonaEvalOutcome;
  readonly evidence_refs: readonly string[];
}

export function evaluatePersonaEncounterResult(
  encounter: ProductPersonaEncounter,
  result: ProductPersonaEncounterResult,
): ProductPersonaEvalAssessment {
  const safety = assertPersonaTranscriptSafe(result);
  if (!safety.valid) {
    return {
      status: "failed",
      reason_code: "unsafe_transcript",
      outcome: result.evaluator_summary.outcome,
      evidence_refs: result.evaluator_summary.evidence_refs,
    };
  }

  const outcomeMatches = result.evaluator_summary.outcome === encounter.expected_outcome;
  return {
    status: outcomeMatches ? "passed" : "failed",
    reason_code: outcomeMatches ? "expected_outcome" : "unexpected_outcome",
    outcome: result.evaluator_summary.outcome,
    evidence_refs: result.evaluator_summary.evidence_refs,
  };
}

export function assertPersonaTranscriptSafe(
  result: ProductPersonaEncounterResult,
): ProductLogSafetyResult {
  return assertLogSafety({
    transcript: result.transcript,
    tool_traces: result.tool_traces,
    metadata: result.metadata,
  });
}
