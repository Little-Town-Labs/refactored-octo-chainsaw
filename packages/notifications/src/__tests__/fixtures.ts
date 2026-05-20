import { randomUUID } from "node:crypto";

import type {
  CandidateNotificationArtifact,
  NotificationArtifactInput,
  NotificationPrincipal,
  NoticeTemplateVersion,
  PolicyRef,
} from "../types.js";
import { InMemoryNotificationRepository } from "../repo.js";
import { NOTIFICATION_SCOPES } from "../scopes.js";
import { noticeTiming } from "../timing.js";

export function operator(): NotificationPrincipal {
  return {
    principal_id: "00000000-0000-7000-8000-000000000011",
    scopes: [
      NOTIFICATION_SCOPES.publish,
      NOTIFICATION_SCOPES.build,
      NOTIFICATION_SCOPES.gate,
      NOTIFICATION_SCOPES.deliver,
      NOTIFICATION_SCOPES.review,
    ],
  };
}

export function unscoped(): NotificationPrincipal {
  return { principal_id: "00000000-0000-7000-8000-000000000012", scopes: [] };
}

export function policyRef(): PolicyRef {
  return { policy_id: "nyc-aedt-notice", version: "2026.05" };
}

export function template(overrides: Partial<NoticeTemplateVersion> = {}): NoticeTemplateVersion {
  return {
    notice_template_version_id: randomUUID(),
    template_id: "candidate-aedt-advance",
    version: "1.0.0",
    status: "published",
    notice_category: "advance_aedt_notice",
    jurisdiction_scope: ["US-NY-NYC"],
    content_ref: "notice-content:f11:advance:1",
    content_hash: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    effective_from: new Date("2026-05-20T00:00:00Z"),
    effective_until: null,
    published_at: new Date("2026-05-20T00:00:00Z"),
    audit_event_id: null,
    created_at: new Date("2026-05-20T00:00:00Z"),
    ...overrides,
  };
}

export function artifactInput(
  overrides: Partial<NotificationArtifactInput> = {},
): NotificationArtifactInput {
  return {
    match_id: "00000000-0000-7000-8000-000000000201",
    run_id: "run-f11",
    dossier_id: "00000000-0000-7000-8000-000000000301",
    candidate_principal_id: "00000000-0000-7000-8000-000000000401",
    notice_category: "advance_aedt_notice",
    template: template(),
    jurisdiction_refs: ["US-NY-NYC"],
    policy_ref: policyRef(),
    timing: noticeTiming({
      basis: "advance_notice",
      produced_at: new Date("2026-05-20T00:00:00Z"),
      earliest_delivery_at: new Date("2026-06-03T00:00:00Z"),
      business_days_required: 10,
      calendar_ref: "calendar:nyc-business-days:test",
    }),
    content_refs: ["notice-content:f11:advance:1"],
    ...overrides,
  };
}

export async function seededArtifact(): Promise<{
  repository: InMemoryNotificationRepository;
  artifact: CandidateNotificationArtifact;
  template: NoticeTemplateVersion;
}> {
  const repository = new InMemoryNotificationRepository();
  const baseTemplate = await repository.insertTemplate(template());
  const { createNotificationArtifact } = await import("../artifacts.js");
  const artifact = await createNotificationArtifact({
    repository,
    artifact: artifactInput({ template: baseTemplate }),
  });
  return { repository, artifact, template: baseTemplate };
}
