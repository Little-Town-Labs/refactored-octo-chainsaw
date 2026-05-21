import type {
  AiRuntimeManifest,
  ModelProfileVersion,
  PromptVersion,
  ScopedAiPrincipal,
} from "../types.js";
import { computeRuntimeManifestHash } from "../manifest.js";
import { computePromptContentHash } from "../prompt-registry.js";

export const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
export const AGENT_ID = "22222222-2222-4222-8222-222222222222";
export const AUDIT_ID = "33333333-3333-4333-8333-333333333333";

export const operator: ScopedAiPrincipal = {
  principal_id: OPERATOR_ID,
  principal_kind: "human",
  scopes: ["ai:publish", "ai:review"],
};

export const agent: ScopedAiPrincipal = {
  principal_id: AGENT_ID,
  principal_kind: "agent",
  scopes: ["ai:invoke"],
};

export function promptFixture(overrides: Partial<PromptVersion> = {}): PromptVersion {
  const base = {
    prompt_version_id: "44444444-4444-4444-8444-444444444444",
    prompt_id: "seeker-advocate",
    version: "1.0.0",
    status: "published" as const,
    purpose: "seeker_advocate_turn",
    template_ref: "prompts/seeker-advocate.md",
    template: "Assess this candidate context: {{candidate_context}}",
    content_hash: "",
    variable_contract: [
      {
        name: "candidate_context",
        value_type: "string" as const,
        required: true,
        trust_class: "untrusted_candidate" as const,
        sentinel_required: true,
      },
    ],
    allowed_scopes: ["ai:invoke"],
    rubric_boundary: "no_rubric_weights" as const,
    release_manifest_ref: "manifest:f12-runtime@1.0.0",
    signature_ref: "sigstore://f12/prompt",
    published_by: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
  } satisfies PromptVersion;
  const merged = { ...base, ...overrides };
  return { ...merged, content_hash: overrides.content_hash ?? computePromptContentHash(merged) };
}

export function modelFixture(overrides: Partial<ModelProfileVersion> = {}): ModelProfileVersion {
  return {
    model_profile_version_id: "55555555-5555-4555-8555-555555555555",
    model_profile_id: "advocate-reasoning",
    version: "1.0.0",
    status: "published",
    provider: "openai",
    model: "gpt-5.4-mini",
    capability_class: "reasoning",
    risk_tier: "medium",
    allowed_scopes: ["ai:invoke"],
    cost_metadata: {
      pricing_ref: "pricing://openai/gpt-5.4-mini/2026-05-21",
      unit: "token",
      input_unit_cost: 0.000001,
      output_unit_cost: 0.000001,
      captured_at: new Date("2026-05-21T12:00:00.000Z"),
    },
    supply_chain_evidence: ["model-card://openai/gpt-5.4-mini"],
    release_manifest_ref: "manifest:f12-runtime@1.0.0",
    signature_ref: "sigstore://f12/model",
    published_by: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
    ...overrides,
  };
}

export function manifestFixture(overrides: Partial<AiRuntimeManifest> = {}): AiRuntimeManifest {
  const base = {
    runtime_manifest_id: "66666666-6666-4666-8666-666666666666",
    manifest_id: "f12-runtime",
    version: "1.0.0",
    status: "active" as const,
    deployment_scope: "phase-0",
    prompt_refs: [{ prompt_id: "seeker-advocate", version: "1.0.0" }],
    model_refs: [{ model_profile_id: "advocate-reasoning", version: "1.0.0" }],
    caller_scopes: ["ai:invoke"],
    provider_allowlist: ["openai"],
    cost_controls: [
      {
        scope: "run" as const,
        ceiling: 1,
        unit: "usd",
        on_preflight_exceeded: "refuse" as const,
      },
    ],
    fallback_policy: "refuse" as const,
    no_hot_reload: true as const,
    content_hash: "",
    signature_ref: "sigstore://f12/manifest",
    published_by: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
  } satisfies AiRuntimeManifest;
  const merged = { ...base, ...overrides };
  return { ...merged, content_hash: overrides.content_hash ?? computeRuntimeManifestHash(merged) };
}

export function sentinelText(text = "Senior TypeScript engineer"): string {
  return `<SPYGLASS_UNTRUSTED nonce="test">${text}</SPYGLASS_UNTRUSTED>`;
}
