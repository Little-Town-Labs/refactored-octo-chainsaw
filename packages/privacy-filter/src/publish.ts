import { randomUUID } from "node:crypto";

import type { PrivacyRepository } from "./repo.js";
import { PRIVACY_FILTER_SCOPES, requirePrivacyScope } from "./scopes.js";
import type {
  NewPrivacyRulesetVersion,
  PrivacyPrincipal,
  PrivacyReasonCode,
  PrivacyRulesetRef,
  PrivacyRulesetVersion,
} from "./types.js";
import { contentHash } from "./validation.js";

export interface PublishPrivacyRulesetInput {
  readonly repository: PrivacyRepository;
  readonly principal: PrivacyPrincipal;
  readonly ruleset: Omit<
    NewPrivacyRulesetVersion,
    "status" | "content_hash" | "published_at" | "created_at"
  > & {
    readonly audit_event_id?: string | null;
  };
}

export async function publishPrivacyRuleset(
  input: PublishPrivacyRulesetInput,
): Promise<PrivacyRulesetVersion> {
  requirePrivacyScope(input.principal.scopes, PRIVACY_FILTER_SCOPES.publish);
  const existing = await input.repository.getRuleset(input.ruleset);
  if (existing)
    throw new Error(
      `privacy ruleset already exists: ${input.ruleset.ruleset_id}@${input.ruleset.version}`,
    );
  if (input.ruleset.disclosure_stages.length === 0)
    throw new Error("privacy ruleset needs disclosure stages");
  if (input.ruleset.max_input_chars <= 0)
    throw new Error("privacy ruleset needs positive max_input_chars");
  return input.repository.insertRuleset({
    ...input.ruleset,
    privacy_ruleset_version_id: input.ruleset.privacy_ruleset_version_id ?? randomUUID(),
    status: "published",
    content_hash: contentHash({
      ruleset_id: input.ruleset.ruleset_id,
      version: input.ruleset.version,
      audience: input.ruleset.audience,
      disclosure_stages: input.ruleset.disclosure_stages,
      allowed_fields: input.ruleset.allowed_fields,
      redaction_rules: input.ruleset.redaction_rules,
      refusal_rules: input.ruleset.refusal_rules,
      max_input_chars: input.ruleset.max_input_chars,
    }),
    audit_event_id: input.ruleset.audit_event_id ?? null,
    published_at: new Date(),
    deprecated_at: null,
  });
}

export async function deprecatePrivacyRuleset(input: {
  readonly repository: PrivacyRepository;
  readonly principal: PrivacyPrincipal;
  readonly ref: PrivacyRulesetRef;
  readonly deprecatedAt?: Date;
}): Promise<PrivacyRulesetVersion> {
  requirePrivacyScope(input.principal.scopes, PRIVACY_FILTER_SCOPES.deprecate);
  const existing = await input.repository.getRuleset(input.ref);
  if (!existing)
    throw new Error(`privacy ruleset missing: ${input.ref.ruleset_id}@${input.ref.version}`);
  return input.repository.updateRulesetDeprecated({
    privacyRulesetVersionId: existing.privacy_ruleset_version_id,
    deprecatedAt: input.deprecatedAt ?? new Date(),
  });
}

export function privacyPublishReasonCode(outcome: "published" | "deprecated"): PrivacyReasonCode {
  return outcome === "published" ? "privacy_allowed" : "privacy_refused";
}
