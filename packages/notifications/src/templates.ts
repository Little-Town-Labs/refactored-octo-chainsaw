import { contentHash } from "./canonicalize.js";
import type { NotificationRepository } from "./repo.js";
import type { NewNoticeTemplateVersion, NoticeCategory, NoticeTemplateVersion } from "./types.js";

export async function publishNoticeTemplate(input: {
  readonly repository: NotificationRepository;
  readonly template_id: string;
  readonly version: string;
  readonly notice_category: NoticeCategory;
  readonly jurisdiction_scope: readonly string[];
  readonly content_ref: string;
  readonly content?: unknown;
  readonly effective_from?: Date;
  readonly audit_event_id?: string | null;
}): Promise<NoticeTemplateVersion> {
  validateTemplateRef(input.template_id, input.version);
  if (input.jurisdiction_scope.length === 0) throw new Error("invalid_payload");
  if (input.content_ref.length === 0) throw new Error("invalid_payload");
  const template: NewNoticeTemplateVersion = {
    template_id: input.template_id,
    version: input.version,
    status: "published",
    notice_category: input.notice_category,
    jurisdiction_scope: input.jurisdiction_scope,
    content_ref: input.content_ref,
    content_hash: contentHash(input.content ?? { content_ref: input.content_ref }),
    effective_from: input.effective_from ?? new Date(),
    effective_until: null,
    published_at: new Date(),
    audit_event_id: input.audit_event_id ?? null,
  };
  return input.repository.insertTemplate(template);
}

export async function supersedeNoticeTemplate(input: {
  readonly repository: NotificationRepository;
  readonly template: NoticeTemplateVersion;
  readonly effective_until?: Date;
}): Promise<NoticeTemplateVersion> {
  return input.repository.updateTemplateStatus({
    templateId: input.template.template_id,
    version: input.template.version,
    status: "superseded",
    effectiveUntil: input.effective_until ?? new Date(),
  });
}

export function isTemplatePublished(template: NoticeTemplateVersion): boolean {
  return template.status === "published";
}

function validateTemplateRef(templateId: string, version: string): void {
  if (templateId.length === 0 || version.length === 0) throw new Error("invalid_payload");
}
