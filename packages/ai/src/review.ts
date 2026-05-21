import type { AiRepository } from "./repo.js";
import { AI_REVIEW_SCOPE, type AiOperationRefusal, type ScopedAiPrincipal } from "./types.js";

export async function reviewAiRuntimeEvidence(
  repository: AiRepository,
  reviewer: ScopedAiPrincipal,
): Promise<
  | {
      readonly ok: true;
      readonly prompts: Awaited<ReturnType<AiRepository["listPromptVersions"]>>;
      readonly models: Awaited<ReturnType<AiRepository["listModelProfileVersions"]>>;
      readonly manifests: Awaited<ReturnType<AiRepository["listRuntimeManifests"]>>;
      readonly invocations: Awaited<ReturnType<AiRepository["listInvocationRecords"]>>;
    }
  | { readonly ok: false; readonly refusal: AiOperationRefusal }
> {
  if (!reviewer.scopes.includes(AI_REVIEW_SCOPE)) {
    return {
      ok: false,
      refusal: {
        operation: "review_read",
        reason_code: "unscoped_review",
        message: "AI runtime evidence review requires ai:review scope.",
      },
    };
  }
  return {
    ok: true,
    prompts: await repository.listPromptVersions(),
    models: await repository.listModelProfileVersions(),
    manifests: await repository.listRuntimeManifests(),
    invocations: await repository.listInvocationRecords(),
  };
}
