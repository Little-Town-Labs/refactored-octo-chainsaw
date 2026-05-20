import { contentHash } from "./canonicalize.js";
import type { NotificationRepository } from "./repo.js";
import type {
  CandidateNotificationArtifact,
  ChannelIntent,
  NotificationDeliveryCommand,
  NotificationGateEvaluation,
} from "./types.js";

export async function createDeliveryCommand(input: {
  readonly repository: NotificationRepository;
  readonly artifact: CandidateNotificationArtifact;
  readonly gate: NotificationGateEvaluation;
  readonly channel_intent: ChannelIntent;
  readonly audit_event_id?: string | null;
}): Promise<NotificationDeliveryCommand> {
  if (input.gate.decision !== "allowed") throw new Error(input.gate.reason_code);
  const idempotencyKey = deliveryIdempotencyKey({
    artifact_id: input.artifact.artifact_id,
    candidate_principal_id: input.artifact.candidate_principal_id,
    notice_category: input.artifact.notice_category,
    channel_intent: input.channel_intent,
  });
  const existing = await input.repository.getDeliveryCommandByIdempotencyKey(idempotencyKey);
  if (existing) return existing;
  const command = await input.repository.insertDeliveryCommand({
    artifact_id: input.artifact.artifact_id,
    candidate_principal_id: input.artifact.candidate_principal_id,
    notice_category: input.artifact.notice_category,
    channel_intent: input.channel_intent,
    idempotency_key: idempotencyKey,
    content_hash: input.artifact.content_hash,
    delivery_window: {
      earliest_delivery_at: input.artifact.timing.earliest_delivery_at,
      latest_delivery_at: input.artifact.timing.required_notice_by,
    },
    status: "pending",
    audit_event_id: input.audit_event_id ?? null,
  });
  await input.repository.updateArtifactStatus({
    artifactId: input.artifact.artifact_id,
    status: "delivered_intent_created",
  });
  return command;
}

export function deliveryIdempotencyKey(input: {
  readonly artifact_id: string;
  readonly candidate_principal_id: string;
  readonly notice_category: string;
  readonly channel_intent: string;
}): string {
  return contentHash(input);
}
