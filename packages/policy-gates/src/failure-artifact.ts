import type { GateDecisionRecord, JurisdictionGateReasonCode } from "./types.js";

export type FailureArtifactReasonCode = Exclude<JurisdictionGateReasonCode, "all_allowed">;

export interface JurisdictionFailureArtifact {
  readonly failure_artifact_id: string;
  readonly gate_decision_id: string;
  readonly subject_kind: GateDecisionRecord["subject_kind"];
  readonly subject_id: string;
  readonly decision: "deny";
  readonly reason_code: FailureArtifactReasonCode;
  readonly jurisdiction_codes: readonly string[];
  readonly policy_version: string;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: Date;
}

export class FailureArtifactRequiresDenyError extends Error {
  constructor(gateDecisionId: string) {
    super(
      `Gate decision "${gateDecisionId}" is not a denial and cannot produce a failure artifact.`,
    );
    this.name = "FailureArtifactRequiresDenyError";
  }
}

export function projectFailureArtifact(decision: GateDecisionRecord): JurisdictionFailureArtifact {
  if (decision.decision !== "deny" || decision.reason_code === "all_allowed") {
    throw new FailureArtifactRequiresDenyError(decision.gate_decision_id);
  }

  return {
    failure_artifact_id: `jurisdiction-failure:${decision.gate_decision_id}`,
    gate_decision_id: decision.gate_decision_id,
    subject_kind: decision.subject_kind,
    subject_id: decision.subject_id,
    decision: "deny",
    reason_code: decision.reason_code,
    jurisdiction_codes: [...decision.jurisdiction_codes],
    policy_version: decision.policy_version,
    correlation_id: decision.correlation_id,
    audit_event_id: decision.audit_event_id,
    created_at: decision.created_at,
  };
}

export function serializeFailureArtifact(artifact: JurisdictionFailureArtifact): {
  readonly failure_artifact_id: string;
  readonly gate_decision_id: string;
  readonly subject_kind: GateDecisionRecord["subject_kind"];
  readonly subject_id: string;
  readonly decision: "deny";
  readonly reason_code: FailureArtifactReasonCode;
  readonly jurisdiction_codes: readonly string[];
  readonly policy_version: string;
  readonly correlation_id: string;
  readonly audit_event_id: string;
  readonly created_at: string;
} {
  return {
    ...artifact,
    created_at: artifact.created_at.toISOString(),
  };
}
