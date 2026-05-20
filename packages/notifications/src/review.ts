import type { NotificationRepository } from "./repo.js";
import { NOTIFICATION_SCOPES, requireNotificationScope } from "./scopes.js";
import type {
  CandidateNotificationArtifact,
  NotificationDeliveryCommand,
  NotificationGateEvaluation,
  NotificationPrincipal,
  NoticeTemplateVersion,
} from "./types.js";

export interface NotificationReviewBundle {
  readonly templates: readonly NoticeTemplateVersion[];
  readonly artifacts: readonly CandidateNotificationArtifact[];
  readonly gate_events: readonly NotificationGateEvaluation[];
  readonly delivery_commands: readonly NotificationDeliveryCommand[];
}

export async function readNotificationReviewBundle(input: {
  readonly repository: NotificationRepository;
  readonly principal: NotificationPrincipal;
  readonly match_id?: string;
}): Promise<NotificationReviewBundle> {
  requireNotificationScope(input.principal.scopes, NOTIFICATION_SCOPES.review);
  const artifacts = await input.repository.listArtifacts(input.match_id);
  const gateEvents = (
    await Promise.all(
      artifacts.map((artifact) => input.repository.listGateEvents(artifact.artifact_id)),
    )
  ).flat();
  const commands = (
    await Promise.all(
      artifacts.map((artifact) => input.repository.listDeliveryCommands(artifact.artifact_id)),
    )
  ).flat();
  return {
    templates: await input.repository.listTemplates(),
    artifacts,
    gate_events: gateEvents,
    delivery_commands: commands,
  };
}
