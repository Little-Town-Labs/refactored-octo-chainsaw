import type { ContractRef } from "@spyglass/agent-contracts";
import {
  FakeGatewayAdapter,
  MemoryAiRepository,
  publishModelProfileVersion,
  publishPromptVersion,
  publishRuntimeManifest,
} from "@spyglass/ai";
import type {
  AiRuntimeManifest,
  ModelProfileVersion,
  PromptVersion,
  ScopedAiPrincipal,
} from "@spyglass/ai";
import { computeRuntimeManifestHash } from "@spyglass/ai";
import type { NegotiationContext } from "@spyglass/parley";
import type { PrivacyRulesetRef } from "@spyglass/privacy-filter";
import type { RubricVersion } from "@spyglass/rubrics";
import type { ToolSurfaceRef } from "@spyglass/tool-dispatcher";

import type {
  FilteredCounterpartyProjection,
  EmployerAdvocateFrozenRefs,
  EmployerAdvocatePrincipalView,
  EmployerAdvocateRunInput,
  EmployerAdvocateRuntime,
  EmployerAdvocateScoreDraft,
  EmployerAdvocateScoringInput,
  SeekerAdvocateFrozenRefs,
  SeekerAdvocateRunInput,
  SeekerAdvocateRuntime,
  SeekerAdvocateScoreDraft,
  SeekerAdvocateScoringInput,
  SeekerAdvocatePrincipalView,
} from "./types.js";

export const SEEKER_AGENT_ID = "22222222-2222-4222-8222-222222222222";
export const OPERATOR_ID = "11111111-1111-4111-8111-111111111111";
export const AUDIT_ID = "33333333-3333-4333-8333-333333333333";

export const seekerAgent: ScopedAiPrincipal = {
  principal_id: SEEKER_AGENT_ID,
  principal_kind: "agent",
  scopes: ["ai:invoke"],
};

export function promptFixture(overrides: Partial<PromptVersion> = {}): PromptVersion {
  return {
    prompt_version_id: "44444444-4444-4444-8444-444444444444",
    prompt_id: "seeker-advocate",
    version: "1.0.0",
    status: "published",
    purpose: "seeker_advocate",
    template_ref: "prompts/seeker-advocate.md",
    template: "Assess this seeker-side match context: {{candidate_context}}",
    content_hash: "f13-prompt-hash",
    variable_contract: [
      {
        name: "candidate_context",
        value_type: "string",
        required: true,
        trust_class: "untrusted_candidate",
        sentinel_required: false,
      },
    ],
    allowed_scopes: ["ai:invoke"],
    rubric_boundary: "no_rubric_weights",
    release_manifest_ref: "manifest:f13-runtime@1.0.0",
    signature_ref: "sigstore://f13/prompt",
    published_by: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
    ...overrides,
  };
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
    release_manifest_ref: "manifest:f13-runtime@1.0.0",
    signature_ref: "sigstore://f13/model",
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
    manifest_id: "f13-runtime",
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
    signature_ref: "sigstore://f13/manifest",
    published_by: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
  } satisfies AiRuntimeManifest;
  const merged = { ...base, ...overrides };
  return { ...merged, content_hash: overrides.content_hash ?? computeRuntimeManifestHash(merged) };
}

export function rubricFixture(overrides: Partial<RubricVersion> = {}): RubricVersion {
  return {
    rubric_version_id: "77777777-7777-4777-8777-777777777777",
    rubric_id: "seeker-standard",
    version: "1.0.0",
    side: "seeker",
    status: "published",
    dimensions: [
      {
        dimension_id: "role_fit",
        label: "Role fit",
        description: "How well the role matches the seeker's goals.",
        min_score: 0,
        max_score: 10,
        weight: 0.6,
        required: true,
      },
      {
        dimension_id: "constraints_fit",
        label: "Constraints fit",
        description: "How well the employer constraints match seeker preferences.",
        min_score: 0,
        max_score: 10,
        weight: 0.4,
        required: true,
      },
    ],
    aggregation_policy: {
      kind: "weighted_sum",
      weight_normalization: "sum_to_one",
      rounding: "half_away_from_zero_4dp",
    },
    bias_test_ref: { bias_test_artifact_id: "bias-test-f13" },
    content_hash: "rubric-hash",
    description: "Seeker standard rubric",
    author_principal_id: OPERATOR_ID,
    reviewer_principal_id: OPERATOR_ID,
    published_at: new Date("2026-05-21T12:00:00.000Z"),
    deprecated_after: null,
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-21T12:00:00.000Z"),
    ...overrides,
  };
}

export const contractRef: ContractRef = { contract_id: "seeker-advocate", version: "1.0.0" };
export const privacyRulesetRef: PrivacyRulesetRef = {
  ruleset_id: "phase0-seeker",
  version: "1.0.0",
};
export const toolSurfaceRef: ToolSurfaceRef = { id: "seeker-tools", version: "1.0.0" };

export function frozenRefs(): SeekerAdvocateFrozenRefs {
  return {
    contract_ref: contractRef,
    prompt_ref: { prompt_id: "seeker-advocate", version: "1.0.0" },
    model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
    manifest_ref: { manifest_id: "f13-runtime", version: "1.0.0" },
    rubric_ref: { rubric_id: "seeker-standard", version: "1.0.0" },
    privacy_ruleset_ref: privacyRulesetRef,
    tool_surface_ref: toolSurfaceRef,
  };
}

export function principalView(): SeekerAdvocatePrincipalView {
  return {
    seeker_ticket_id: "seek_123",
    profile_summary: "Senior TypeScript engineer seeking agentic product work.",
    preferences: ["remote", "small team", "high agency"],
    threshold: 5,
  };
}

export function counterpartyProjection(
  payload: Record<string, unknown> = {
    role: "Senior platform engineer",
    remote: true,
    team_stage: "early",
  },
): FilteredCounterpartyProjection {
  return { projection_ref: "projection_f13", filtered: true, payload };
}

export function contextFixture(overrides: Partial<NegotiationContext> = {}): NegotiationContext {
  return {
    run_id: "run_f13",
    side: "seeker",
    principal_view: { ...principalView() },
    counterparty_view: counterpartyProjection().payload,
    prompt_history: [],
    tool_call_log: [],
    rubric_scratch: {
      role_fit: { score: 8, rationale: "The role aligns with the seeker's stated goals." },
      constraints_fit: { score: 7, rationale: "The work model matches seeker preferences." },
    },
    projection_refs: ["projection_f13"],
    released: false,
    ...overrides,
  };
}

export async function seededRuntime(
  options: { readonly manifest?: Partial<AiRuntimeManifest> } = {},
): Promise<SeekerAdvocateRuntime> {
  const repository = new MemoryAiRepository();
  await publishPromptVersion(repository, promptFixture());
  await publishModelProfileVersion(repository, modelFixture());
  await publishRuntimeManifest(repository, manifestFixture(options.manifest ?? {}));
  return {
    repository,
    gateway: new FakeGatewayAdapter(),
    caller: seekerAgent,
    caller_scope: "ai:invoke",
  };
}

export async function runInputFixture(
  overrides: Partial<Omit<SeekerAdvocateRunInput, "runtime">> & {
    readonly runtime?: SeekerAdvocateRuntime;
  } = {},
): Promise<SeekerAdvocateRunInput> {
  const runtime = overrides.runtime ?? (await seededRuntime());
  return {
    run_id: "run_f13",
    match_ticket_id: "match_f13",
    operation: "turn",
    round: 1,
    refs: frozenRefs(),
    principal_view: principalView(),
    counterparty_projection: counterpartyProjection(),
    context: contextFixture(),
    allowed_tool_names: ["read_seeker_profile", "read_filtered_employer_projection"],
    runtime,
    ...overrides,
  };
}

export async function scoringInputFixture(
  overrides: Partial<Omit<SeekerAdvocateScoringInput, "runtime">> & {
    readonly runtime?: SeekerAdvocateRuntime;
  } = {},
): Promise<SeekerAdvocateScoringInput> {
  const runtime = overrides.runtime ?? (await seededRuntime());
  return {
    ...(await runInputFixture({ runtime })),
    operation: "score",
    rubric: rubricFixture(),
    score_draft: scoreDraftFixture(),
    ...overrides,
  };
}

export function scoreDraftFixture(
  overrides: Partial<SeekerAdvocateScoreDraft> = {},
): SeekerAdvocateScoreDraft {
  return {
    dimension_scores: [
      {
        dimension_id: "role_fit",
        score: 8,
        rationale: "The role is aligned with seeker goals.",
      },
      {
        dimension_id: "constraints_fit",
        score: 7,
        rationale: "The working model matches seeker preferences.",
      },
    ],
    headline_rationale: "The role appears useful from the seeker's perspective.",
    flag_proposals: [],
    ...overrides,
  };
}

export const EMPLOYER_AGENT_ID = "88888888-8888-4888-8888-888888888888";

export const employerAgent: ScopedAiPrincipal = {
  principal_id: EMPLOYER_AGENT_ID,
  principal_kind: "agent",
  scopes: ["ai:invoke"],
};

export function employerPromptFixture(overrides: Partial<PromptVersion> = {}): PromptVersion {
  return promptFixture({
    prompt_version_id: "84444444-4444-4444-8444-444444444444",
    prompt_id: "employer-advocate",
    purpose: "employer_advocate",
    template_ref: "prompts/employer-advocate.md",
    template: "Assess this employer-side match context: {{candidate_context}}",
    content_hash: "f14-prompt-hash",
    release_manifest_ref: "manifest:f14-runtime@1.0.0",
    signature_ref: "sigstore://f14/prompt",
    published_at: new Date("2026-05-22T12:00:00.000Z"),
    created_at: new Date("2026-05-22T12:00:00.000Z"),
    ...overrides,
  });
}

export function employerModelFixture(
  overrides: Partial<ModelProfileVersion> = {},
): ModelProfileVersion {
  return modelFixture({
    model_profile_version_id: "85555555-5555-4555-8555-555555555555",
    release_manifest_ref: "manifest:f14-runtime@1.0.0",
    signature_ref: "sigstore://f14/model",
    published_at: new Date("2026-05-22T12:00:00.000Z"),
    created_at: new Date("2026-05-22T12:00:00.000Z"),
    ...overrides,
  });
}

export function employerManifestFixture(
  overrides: Partial<AiRuntimeManifest> = {},
): AiRuntimeManifest {
  const base = manifestFixture({
    runtime_manifest_id: "86666666-6666-4666-8666-666666666666",
    manifest_id: "f14-runtime",
    prompt_refs: [{ prompt_id: "employer-advocate", version: "1.0.0" }],
    signature_ref: "sigstore://f14/manifest",
    published_at: new Date("2026-05-22T12:00:00.000Z"),
    created_at: new Date("2026-05-22T12:00:00.000Z"),
    ...overrides,
  });
  return { ...base, content_hash: overrides.content_hash ?? computeRuntimeManifestHash(base) };
}

export function employerRubricFixture(overrides: Partial<RubricVersion> = {}): RubricVersion {
  return {
    rubric_version_id: "87777777-7777-4777-8777-777777777777",
    rubric_id: "employer-standard",
    version: "1.0.0",
    side: "employer",
    status: "published",
    dimensions: [
      {
        dimension_id: "skills_fit",
        label: "Skills fit",
        description: "How well the seeker matches role skills.",
        min_score: 0,
        max_score: 10,
        weight: 0.55,
        required: true,
      },
      {
        dimension_id: "role_constraints_fit",
        label: "Role constraints fit",
        description: "How well constraints match the employer's role needs.",
        min_score: 0,
        max_score: 10,
        weight: 0.45,
        required: true,
      },
    ],
    aggregation_policy: {
      kind: "weighted_sum",
      weight_normalization: "sum_to_one",
      rounding: "half_away_from_zero_4dp",
    },
    bias_test_ref: { bias_test_artifact_id: "bias-test-f14" },
    content_hash: "employer-rubric-hash",
    description: "Employer standard rubric",
    author_principal_id: OPERATOR_ID,
    reviewer_principal_id: OPERATOR_ID,
    published_at: new Date("2026-05-22T12:00:00.000Z"),
    deprecated_after: null,
    audit_event_id: AUDIT_ID,
    created_at: new Date("2026-05-22T12:00:00.000Z"),
    ...overrides,
  };
}

export const employerContractRef: ContractRef = {
  contract_id: "employer-advocate",
  version: "1.0.0",
};
export const employerPrivacyRulesetRef: PrivacyRulesetRef = {
  ruleset_id: "phase0-employer",
  version: "1.0.0",
};
export const employerToolSurfaceRef: ToolSurfaceRef = {
  id: "employer-tools",
  version: "1.0.0",
};

export function employerFrozenRefs(): EmployerAdvocateFrozenRefs {
  return {
    contract_ref: employerContractRef,
    prompt_ref: { prompt_id: "employer-advocate", version: "1.0.0" },
    model_ref: { model_profile_id: "advocate-reasoning", version: "1.0.0" },
    manifest_ref: { manifest_id: "f14-runtime", version: "1.0.0" },
    rubric_ref: { rubric_id: "employer-standard", version: "1.0.0" },
    privacy_ruleset_ref: employerPrivacyRulesetRef,
    tool_surface_ref: employerToolSurfaceRef,
  };
}

export function employerPrincipalView(): EmployerAdvocatePrincipalView {
  return {
    employer_ticket_id: "emp_123",
    role_summary: "Senior TypeScript platform engineer for agentic hiring infrastructure.",
    requirements: ["TypeScript", "distributed systems", "security-minded delivery"],
    constraints: ["remote", "US time zones", "startup pace"],
    threshold: 6,
  };
}

export function seekerProjection(
  payload: Record<string, unknown> = {
    skills: ["TypeScript", "Node.js", "agent systems"],
    work_mode: "remote",
    experience_level: "senior",
  },
): FilteredCounterpartyProjection {
  return { projection_ref: "projection_f14", filtered: true, payload };
}

export function employerContextFixture(
  overrides: Partial<NegotiationContext> = {},
): NegotiationContext {
  return {
    run_id: "run_f14",
    side: "employer",
    principal_view: { ...employerPrincipalView() },
    counterparty_view: seekerProjection().payload,
    prompt_history: [],
    tool_call_log: [],
    rubric_scratch: {
      skills_fit: { score: 8, rationale: "The seeker matches core TypeScript needs." },
      role_constraints_fit: { score: 7, rationale: "The seeker constraints match role needs." },
    },
    projection_refs: ["projection_f14"],
    released: false,
    ...overrides,
  };
}

export async function seededEmployerRuntime(
  options: { readonly manifest?: Partial<AiRuntimeManifest> } = {},
): Promise<EmployerAdvocateRuntime> {
  const repository = new MemoryAiRepository();
  await publishPromptVersion(repository, employerPromptFixture());
  await publishModelProfileVersion(repository, employerModelFixture());
  await publishRuntimeManifest(repository, employerManifestFixture(options.manifest ?? {}));
  return {
    repository,
    gateway: new FakeGatewayAdapter(),
    caller: employerAgent,
    caller_scope: "ai:invoke",
  };
}

export async function employerRunInputFixture(
  overrides: Partial<Omit<EmployerAdvocateRunInput, "runtime">> & {
    readonly runtime?: EmployerAdvocateRuntime;
  } = {},
): Promise<EmployerAdvocateRunInput> {
  const runtime = overrides.runtime ?? (await seededEmployerRuntime());
  return {
    run_id: "run_f14",
    match_ticket_id: "match_f14",
    operation: "turn",
    round: 1,
    refs: employerFrozenRefs(),
    principal_view: employerPrincipalView(),
    counterparty_projection: seekerProjection(),
    context: employerContextFixture(),
    allowed_tool_names: ["read_employer_req", "read_filtered_seeker_projection"],
    runtime,
    ...overrides,
  };
}

export async function employerScoringInputFixture(
  overrides: Partial<Omit<EmployerAdvocateScoringInput, "runtime">> & {
    readonly runtime?: EmployerAdvocateRuntime;
  } = {},
): Promise<EmployerAdvocateScoringInput> {
  const runtime = overrides.runtime ?? (await seededEmployerRuntime());
  return {
    ...(await employerRunInputFixture({ runtime })),
    operation: "score",
    rubric: employerRubricFixture(),
    score_draft: employerScoreDraftFixture(),
    ...overrides,
  };
}

export function employerScoreDraftFixture(
  overrides: Partial<EmployerAdvocateScoreDraft> = {},
): EmployerAdvocateScoreDraft {
  return {
    dimension_scores: [
      {
        dimension_id: "skills_fit",
        score: 8,
        rationale: "The seeker has strong TypeScript and agent-system experience.",
      },
      {
        dimension_id: "role_constraints_fit",
        score: 7,
        rationale: "The seeker's work model fits the employer constraints.",
      },
    ],
    headline_rationale: "The seeker appears useful from the employer's perspective.",
    flag_proposals: [],
    ...overrides,
  };
}
