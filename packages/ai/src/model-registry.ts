import { canonicalHash } from "./hash.js";
import type { AiRepository } from "./repo.js";
import type { ModelProfileVersion, NewModelProfileVersion } from "./types.js";

export class ModelProfileMutationError extends Error {
  constructor(modelProfileId: string, version: string) {
    super(
      `Model profile "${modelProfileId}" version "${version}" already exists with different material.`,
    );
    this.name = "ModelProfileMutationError";
  }
}

export async function publishModelProfileVersion(
  repository: AiRepository,
  input: NewModelProfileVersion,
): Promise<ModelProfileVersion> {
  const contentHash = computeModelProfileHash(input);
  const existing = await repository.getModelProfileVersion({
    model_profile_id: input.model_profile_id,
    version: input.version,
  });
  if (existing) {
    if (computeModelProfileHash(existing) !== contentHash) {
      throw new ModelProfileMutationError(input.model_profile_id, input.version);
    }
    return existing;
  }
  return repository.insertModelProfileVersion(input);
}

export function computeModelProfileHash(
  input: Pick<
    ModelProfileVersion,
    | "model_profile_id"
    | "version"
    | "provider"
    | "model"
    | "capability_class"
    | "risk_tier"
    | "cost_metadata"
    | "supply_chain_evidence"
  >,
): string {
  return canonicalHash({
    model_profile_id: input.model_profile_id,
    version: input.version,
    provider: input.provider,
    model: input.model,
    capability_class: input.capability_class,
    risk_tier: input.risk_tier,
    cost_metadata: input.cost_metadata,
    supply_chain_evidence: input.supply_chain_evidence,
  });
}
