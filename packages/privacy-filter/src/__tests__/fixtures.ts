import type {
  NewPrivacyRulesetVersion,
  PrivacyPrincipal,
  PrivacyRulesetVersion,
} from "../types.js";

export function operator(): PrivacyPrincipal {
  return {
    principal_id: "00000000-0000-7000-8000-000000000001",
    scopes: ["privacy_filter:publish", "privacy_filter:deprecate", "privacy_filter:review"],
  };
}

export function unscoped(): PrivacyPrincipal {
  return { principal_id: "00000000-0000-7000-8000-000000000002", scopes: [] };
}

export function seedRuleset(): Omit<
  NewPrivacyRulesetVersion,
  "status" | "content_hash" | "published_at" | "created_at"
> {
  return {
    ruleset_id: "default-seeker-to-employer",
    version: "1.0.0",
    audience: "employer",
    disclosure_stages: [
      { stage: "intro_guarded", order: 0, allowed_fields: ["summary", "headline"] },
      { stage: "post_intro", order: 1, allowed_fields: ["summary", "headline", "availability"] },
    ],
    allowed_fields: ["summary", "headline"],
    redaction_rules: [
      { category: "email", pattern: "email" },
      { category: "phone", pattern: "phone" },
    ],
    refusal_rules: [{ category: "oversized", reason_code: "privacy_payload_oversized" }],
    max_input_chars: 4000,
    audit_event_id: null,
    deprecated_at: null,
  };
}

export function seekerRuleset(): PrivacyRulesetVersion {
  return {
    privacy_ruleset_version_id: "00000000-0000-7000-8000-000000000010",
    ...seedRuleset(),
    status: "published",
    content_hash: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    published_at: new Date("2026-05-20T00:00:00Z"),
    deprecated_at: null,
    created_at: new Date("2026-05-20T00:00:00Z"),
  };
}
