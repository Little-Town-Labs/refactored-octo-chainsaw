import { canonicalHash } from "./hash.js";
import { evaluatePreflightCost, finalizeCostEvidence } from "./cost-controls.js";
import type { GatewayAdapter } from "./gateway.js";
import { manifestAllowsModel, manifestAllowsPrompt, verifyManifest } from "./manifest.js";
import { renderPrompt } from "./prompt-renderer.js";
import type { AiRepository } from "./repo.js";
import type {
  AiOperationRefusal,
  ManifestRef,
  ModelInvocationRecord,
  ModelRef,
  PromptRef,
  ScopedAiPrincipal,
} from "./types.js";

export interface InvokeModelInput {
  readonly caller: ScopedAiPrincipal;
  readonly caller_scope: string;
  readonly run_ref: string;
  readonly purpose: string;
  readonly prompt_ref: PromptRef;
  readonly model_ref: ModelRef;
  readonly manifest_ref: ManifestRef;
  readonly variables: Record<string, unknown>;
  readonly audit_event_id?: string | null;
}

export type InvokeModelResult =
  | { readonly ok: true; readonly record: ModelInvocationRecord; readonly content: string }
  | {
      readonly ok: false;
      readonly record: ModelInvocationRecord;
      readonly refusal: AiOperationRefusal;
    };

export async function invokeModel(
  repository: AiRepository,
  gateway: GatewayAdapter,
  input: InvokeModelInput,
): Promise<InvokeModelResult> {
  const startedAt = new Date();
  const missingRef = validateInvocationInput(input);
  if (missingRef) return refused(repository, input, missingRef, startedAt);
  if (!input.caller.scopes.includes(input.caller_scope)) {
    return refused(
      repository,
      input,
      refusal("unauthorized_caller", "Caller lacks invocation scope."),
      startedAt,
    );
  }

  const prompt = await repository.getPromptVersion(input.prompt_ref);
  if (!prompt || prompt.status !== "published") {
    return refused(
      repository,
      input,
      refusal("prompt_not_published", "Prompt is not published."),
      startedAt,
    );
  }
  const model = await repository.getModelProfileVersion(input.model_ref);
  if (!model || model.status !== "published") {
    return refused(
      repository,
      input,
      refusal("model_not_published", "Model profile is not published."),
      startedAt,
    );
  }
  const manifest = await repository.getRuntimeManifest(input.manifest_ref);
  if (!manifest) {
    return refused(
      repository,
      input,
      refusal("manifest_not_active", "Manifest is not active."),
      startedAt,
    );
  }

  const preflightRefusal =
    verifyManifest(manifest) ??
    manifestAllowsPrompt(manifest, prompt) ??
    manifestAllowsModel(manifest, model);
  if (preflightRefusal) return refused(repository, input, preflightRefusal, startedAt);

  const rendered = renderPrompt(prompt, input.variables);
  if ("reason_code" in rendered) return refused(repository, input, rendered, startedAt);

  const estimatedUnits = rendered.rendered.length;
  const cost = evaluatePreflightCost({ manifest, model, estimatedUnits });
  if (!cost.allowed) {
    return refused(
      repository,
      input,
      refusal(
        cost.decision === "downgraded"
          ? "budget_fallback_unavailable"
          : "budget_preflight_exceeded",
        "Budget preflight refused the invocation.",
      ),
      startedAt,
      cost.evidence,
    );
  }

  const base = await repository.appendInvocationRecord({
    status: "accepted",
    caller_principal_id: input.caller.principal_id,
    caller_scope: input.caller_scope,
    run_ref: input.run_ref,
    purpose: input.purpose,
    prompt_ref: input.prompt_ref,
    model_ref: input.model_ref,
    manifest_ref: input.manifest_ref,
    request_hash: canonicalHash({ input, rendered_prompt_hash: rendered.rendered_prompt_hash }),
    rendered_prompt_hash: rendered.rendered_prompt_hash,
    response_hash: null,
    usage_metadata: null,
    cost_evidence: cost.evidence,
    decision: "allowed",
    reason_code: "missing_required_ref",
    started_at: startedAt,
    completed_at: null,
    audit_event_id: input.audit_event_id ?? null,
  });

  const response = await gateway.invoke({
    rendered_prompt: rendered.rendered,
    provider: model.provider,
    model: model.model,
  });
  const completed = await repository.updateInvocationRecord({
    ...base,
    status: response.usage_metadata ? "completed" : "usage_incomplete",
    response_hash: response.response_hash,
    usage_metadata: response.usage_metadata,
    cost_evidence: finalizeCostEvidence({
      model,
      usage: response.usage_metadata,
      existing: cost.evidence,
    }),
    reason_code: response.usage_metadata ? "invocation_completed" : "usage_metadata_missing",
    completed_at: new Date(),
  });
  return { ok: true, record: completed, content: response.content };
}

function validateInvocationInput(input: InvokeModelInput): AiOperationRefusal | null {
  if (!input.caller.principal_id || !input.caller_scope || !input.run_ref || !input.purpose) {
    return refusal(
      "missing_required_ref",
      "Invocation requires caller, scope, run ref, and purpose.",
    );
  }
  if (
    !input.prompt_ref.prompt_id ||
    !input.model_ref.model_profile_id ||
    !input.manifest_ref.manifest_id
  ) {
    return refusal("missing_required_ref", "Invocation requires prompt, model, and manifest refs.");
  }
  return null;
}

async function refused(
  repository: AiRepository,
  input: InvokeModelInput,
  aiRefusal: AiOperationRefusal,
  startedAt: Date,
  costEvidence: ModelInvocationRecord["cost_evidence"] = null,
): Promise<InvokeModelResult> {
  const record = await repository.appendInvocationRecord({
    status: "refused",
    caller_principal_id: input.caller.principal_id || "00000000-0000-4000-8000-000000000000",
    caller_scope: input.caller_scope || "missing",
    run_ref: input.run_ref || "missing",
    purpose: input.purpose || "missing",
    prompt_ref: input.prompt_ref,
    model_ref: input.model_ref,
    manifest_ref: input.manifest_ref,
    request_hash: canonicalHash({ input, refusal: aiRefusal.reason_code }),
    rendered_prompt_hash: null,
    response_hash: null,
    usage_metadata: null,
    cost_evidence: costEvidence,
    decision: "refused",
    reason_code: aiRefusal.reason_code,
    started_at: startedAt,
    completed_at: new Date(),
    audit_event_id: input.audit_event_id ?? aiRefusal.audit_event_id ?? null,
  });
  return { ok: false, record, refusal: aiRefusal };
}

function refusal(
  reason_code: AiOperationRefusal["reason_code"],
  message: string,
): AiOperationRefusal {
  return { operation: "invoke_model", reason_code, message };
}
