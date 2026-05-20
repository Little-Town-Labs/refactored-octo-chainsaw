import type { NotificationRepository } from "./repo.js";
import { isTimingEligible } from "./timing.js";
import type {
  CandidateNotificationArtifact,
  NotificationGateEvaluation,
  NotificationGateReasonCode,
  NoticeTemplateVersion,
  PolicyRef,
} from "./types.js";

export async function evaluateNotificationGate(input: {
  readonly repository: NotificationRepository;
  readonly match_id: string;
  readonly artifact: CandidateNotificationArtifact | null;
  readonly template?: NoticeTemplateVersion | null;
  readonly policy_ref: PolicyRef;
  readonly evaluated_at?: Date;
  readonly audit_event_id?: string | null;
}): Promise<NotificationGateEvaluation> {
  const evaluatedAt = input.evaluated_at ?? new Date();
  const reasonCode = gateReason({
    artifact: input.artifact,
    template: input.template ?? null,
    evaluated_at: evaluatedAt,
  });
  return input.repository.appendGateEvent({
    artifact_id: input.artifact?.artifact_id ?? null,
    match_id: input.match_id,
    decision: reasonCode === "notice_ready" ? "allowed" : "refused",
    reason_code: reasonCode,
    evaluated_at: evaluatedAt,
    policy_ref: input.policy_ref,
    audit_event_id: input.audit_event_id ?? null,
  });
}

function gateReason(input: {
  readonly artifact: CandidateNotificationArtifact | null;
  readonly template: NoticeTemplateVersion | null;
  readonly evaluated_at: Date;
}): NotificationGateReasonCode {
  if (!input.artifact) return "missing_artifact";
  if (!input.artifact.candidate_principal_id) return "missing_recipient";
  if (input.artifact.status !== "ready" && input.artifact.status !== "delivered_intent_created") {
    return "artifact_blocked";
  }
  if (input.template && input.template.status !== "published") {
    return input.template.status === "superseded"
      ? "template_superseded"
      : "template_not_published";
  }
  if (!isTimingEligible(input.artifact.timing, input.evaluated_at)) return "not_yet_eligible";
  return "notice_ready";
}
