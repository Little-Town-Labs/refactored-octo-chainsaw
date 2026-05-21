import { canonicalHash } from "./hash.js";
import type { AiRepository } from "./repo.js";
import type { NewPromptVersion, PromptVersion } from "./types.js";

export class PromptVersionMutationError extends Error {
  constructor(promptId: string, version: string) {
    super(`Prompt "${promptId}" version "${version}" already exists with different material.`);
    this.name = "PromptVersionMutationError";
  }
}

export async function publishPromptVersion(
  repository: AiRepository,
  input: Omit<NewPromptVersion, "content_hash"> & { readonly content_hash?: string },
): Promise<PromptVersion> {
  assertNoRubricPolicy(input.template);
  const contentHash = input.content_hash ?? computePromptContentHash(input);
  const existing = await repository.getPromptVersion({
    prompt_id: input.prompt_id,
    version: input.version,
  });
  if (existing) {
    if (existing.content_hash !== contentHash) {
      throw new PromptVersionMutationError(input.prompt_id, input.version);
    }
    return existing;
  }
  return repository.insertPromptVersion({ ...input, content_hash: contentHash });
}

export function computePromptContentHash(
  input: Pick<NewPromptVersion, "prompt_id" | "version" | "template" | "variable_contract">,
): string {
  return canonicalHash({
    prompt_id: input.prompt_id,
    version: input.version,
    template: input.template,
    variable_contract: input.variable_contract,
  });
}

export function assertNoRubricPolicy(template: string): void {
  const lowered = template.toLowerCase();
  const forbidden = ["rubric weight", "weighted total", "score weight", "dimension weight"];
  if (forbidden.some((term) => lowered.includes(term))) {
    throw Object.assign(new Error("Prompt template embeds rubric scoring policy."), {
      reason_code: "rubric_policy_in_prompt",
    });
  }
}
