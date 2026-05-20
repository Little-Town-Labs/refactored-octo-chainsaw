import { contentHash } from "./canonicalize.js";
import type { NotificationRepository } from "./repo.js";
import { isTemplatePublished } from "./templates.js";
import type {
  CandidateNotificationArtifact,
  NotificationArtifactInput,
  NotificationReasonCode,
} from "./types.js";

export async function createNotificationArtifact(input: {
  readonly repository: NotificationRepository;
  readonly artifact: NotificationArtifactInput;
}): Promise<CandidateNotificationArtifact> {
  const artifact = input.artifact;
  validateArtifactInput(artifact);
  if (!isTemplatePublished(artifact.template)) throw new Error("template_not_published");
  if (!artifact.candidate_principal_id) throw new Error("missing_required_ref");
  const reasonCode: NotificationReasonCode =
    artifact.reason_code ??
    (artifact.notice_category === "inconclusive_outcome"
      ? "inconclusive_notice"
      : "artifact_ready");
  const canonical = {
    match_id: artifact.match_id,
    run_id: artifact.run_id,
    dossier_id: artifact.dossier_id,
    candidate_principal_id: artifact.candidate_principal_id,
    notice_category: artifact.notice_category,
    template_id: artifact.template.template_id,
    template_version: artifact.template.version,
    jurisdiction_refs: artifact.jurisdiction_refs,
    policy_ref: artifact.policy_ref,
    timing: artifact.timing,
    content_refs: artifact.content_refs,
    reason_code: reasonCode,
  };
  return input.repository.insertArtifact({
    ...canonical,
    candidate_principal_id: artifact.candidate_principal_id,
    status: "ready",
    content_hash: contentHash(canonical),
    audit_event_id: artifact.audit_event_id ?? null,
  });
}

function validateArtifactInput(input: NotificationArtifactInput): void {
  if (
    input.match_id.length === 0 ||
    input.run_id.length === 0 ||
    input.dossier_id.length === 0 ||
    input.template.template_id.length === 0 ||
    input.template.version.length === 0 ||
    input.jurisdiction_refs.length === 0 ||
    input.content_refs.length === 0
  ) {
    throw new Error("invalid_payload");
  }
  if (input.notice_category === "inconclusive_outcome" && input.content_refs.length === 0) {
    throw new Error("invalid_payload");
  }
}
