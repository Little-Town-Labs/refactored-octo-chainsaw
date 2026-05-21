import { canonicalHash } from "./hash.js";
import type { AiRepository } from "./repo.js";
import type {
  AiOperationRefusal,
  AiRuntimeManifest,
  ManifestRef,
  ModelProfileVersion,
  ModelRef,
  NewAiRuntimeManifest,
  PromptRef,
  PromptVersion,
} from "./types.js";

export async function publishRuntimeManifest(
  repository: AiRepository,
  input: Omit<NewAiRuntimeManifest, "content_hash"> & { readonly content_hash?: string },
): Promise<AiRuntimeManifest> {
  await assertManifestRefsPublished(repository, input);
  const contentHash = input.content_hash ?? computeRuntimeManifestHash(input);
  const existing = await repository.getRuntimeManifest({
    manifest_id: input.manifest_id,
    version: input.version,
  });
  if (existing) {
    if (existing.content_hash !== contentHash) {
      throw new Error(
        `AI runtime manifest "${input.manifest_id}" version "${input.version}" mutated.`,
      );
    }
    return existing;
  }
  return repository.insertRuntimeManifest({ ...input, content_hash: contentHash });
}

async function assertManifestRefsPublished(
  repository: AiRepository,
  input: Pick<NewAiRuntimeManifest, "status" | "prompt_refs" | "model_refs">,
): Promise<void> {
  if (input.status !== "active") return;
  for (const ref of input.prompt_refs) {
    const prompt = await repository.getPromptVersion(ref);
    if (!prompt || prompt.status !== "published") {
      throw Object.assign(new Error(`Prompt ${ref.prompt_id}@${ref.version} is not published.`), {
        reason_code: "prompt_not_published",
      });
    }
  }
  for (const ref of input.model_refs) {
    const model = await repository.getModelProfileVersion(ref);
    if (!model || model.status !== "published") {
      throw Object.assign(
        new Error(`Model profile ${ref.model_profile_id}@${ref.version} is not published.`),
        { reason_code: "model_not_published" },
      );
    }
  }
}

export function computeRuntimeManifestHash(
  input: Pick<
    NewAiRuntimeManifest,
    | "manifest_id"
    | "version"
    | "deployment_scope"
    | "prompt_refs"
    | "model_refs"
    | "caller_scopes"
    | "provider_allowlist"
    | "cost_controls"
    | "fallback_policy"
    | "no_hot_reload"
  >,
): string {
  return canonicalHash({
    manifest_id: input.manifest_id,
    version: input.version,
    deployment_scope: input.deployment_scope,
    prompt_refs: input.prompt_refs,
    model_refs: input.model_refs,
    caller_scopes: input.caller_scopes,
    provider_allowlist: input.provider_allowlist,
    cost_controls: input.cost_controls,
    fallback_policy: input.fallback_policy,
    no_hot_reload: input.no_hot_reload,
  });
}

export function verifyManifest(manifest: AiRuntimeManifest): AiOperationRefusal | null {
  if (manifest.status !== "active") {
    return refusal("manifest_not_active", manifest);
  }
  if (!manifest.signature_ref || manifest.content_hash !== computeRuntimeManifestHash(manifest)) {
    return refusal("manifest_signature_invalid", manifest);
  }
  return null;
}

export function freezeRuntimeRefs(input: {
  readonly manifest: AiRuntimeManifest;
  readonly prompt: PromptVersion;
  readonly model: ModelProfileVersion;
}): {
  readonly manifest_ref: ManifestRef;
  readonly prompt_ref: PromptRef;
  readonly model_ref: ModelRef;
} {
  return {
    manifest_ref: { manifest_id: input.manifest.manifest_id, version: input.manifest.version },
    prompt_ref: { prompt_id: input.prompt.prompt_id, version: input.prompt.version },
    model_ref: { model_profile_id: input.model.model_profile_id, version: input.model.version },
  };
}

export function manifestAllowsModel(
  manifest: AiRuntimeManifest,
  model: ModelProfileVersion,
): AiOperationRefusal | null {
  if (!manifest.provider_allowlist.includes(model.provider))
    return refusal("provider_not_allowed", manifest);
  if (!hasModelRef(manifest.model_refs, model)) return refusal("model_not_allowed", manifest);
  return null;
}

export function manifestAllowsPrompt(
  manifest: AiRuntimeManifest,
  prompt: PromptVersion,
): AiOperationRefusal | null {
  if (!hasPromptRef(manifest.prompt_refs, prompt)) {
    return {
      operation: "invoke_model",
      reason_code: "prompt_not_published",
      message: "Prompt version is not included in the runtime manifest.",
      refs: { prompt_id: prompt.prompt_id, version: prompt.version },
    };
  }
  return null;
}

function hasPromptRef(refs: readonly PromptRef[], prompt: PromptVersion): boolean {
  return refs.some((ref) => ref.prompt_id === prompt.prompt_id && ref.version === prompt.version);
}

function hasModelRef(refs: readonly ModelRef[], model: ModelProfileVersion): boolean {
  return refs.some(
    (ref) => ref.model_profile_id === model.model_profile_id && ref.version === model.version,
  );
}

function refusal(
  reason_code:
    | "manifest_not_active"
    | "manifest_signature_invalid"
    | "provider_not_allowed"
    | "model_not_allowed",
  manifest: AiRuntimeManifest,
): AiOperationRefusal {
  return {
    operation: "invoke_model",
    reason_code,
    message: `AI runtime manifest ${manifest.manifest_id}@${manifest.version} failed ${reason_code}.`,
    refs: { manifest_id: manifest.manifest_id, version: manifest.version },
  };
}
