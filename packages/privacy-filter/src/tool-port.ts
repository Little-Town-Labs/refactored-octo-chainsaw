import { filterForCounterparty } from "./filter.js";
import type { PrivacyRepository } from "./repo.js";
import type { JsonObject, PrivacyAudience, PrivacyRulesetRef } from "./types.js";

export interface PrivacyFilterPort {
  filterToolOutput(input: {
    readonly run_id: string;
    readonly tool_ref: { readonly name: string; readonly version: string };
    readonly output: JsonObject;
  }): Promise<{ readonly ref: string; readonly output: JsonObject }>;
}

export interface CreateToolPrivacyFilterPortInput {
  readonly repository: PrivacyRepository;
  readonly ruleset_ref: PrivacyRulesetRef;
  readonly audience: PrivacyAudience;
  readonly disclosure_stage?: string;
}

export function createToolPrivacyFilterPort(
  input: CreateToolPrivacyFilterPortInput,
): PrivacyFilterPort {
  return {
    async filterToolOutput(toolInput) {
      const request = {
        run_id: toolInput.run_id,
        ruleset_ref: input.ruleset_ref,
        audience: input.audience,
        input_class: "tool_returned" as const,
        source_ref: `${toolInput.tool_ref.name}@${toolInput.tool_ref.version}`,
        content: toolInput.output,
        ...(input.disclosure_stage ? { disclosure_stage: input.disclosure_stage } : {}),
      };
      const result = await filterForCounterparty({
        repository: input.repository,
        request,
      });
      if (!result.projection) {
        throw new Error(`privacy filter refused tool output: ${result.decision.reason_code}`);
      }
      return { ref: result.projection.filtered_view_ref, output: result.projection.output };
    },
  };
}
