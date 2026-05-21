import { filterForCounterparty, type PrivacyRepository } from "@spyglass/privacy-filter";

import type { ParleyRun, ParleySide, ProjectedCounterpartyView } from "./types.js";

export interface FilterCrossSideMessageInput {
  readonly run: ParleyRun;
  readonly from_side: ParleySide;
  readonly content: string;
  readonly repository?: PrivacyRepository;
  readonly disclosure_stage?: string;
}

export async function filterCrossSideMessage(
  input: FilterCrossSideMessageInput,
): Promise<ProjectedCounterpartyView> {
  if (!input.repository) {
    return {
      projection_ref: `privacy-filter/${input.run.run_id}/${input.from_side}`,
      payload: { message: input.content },
    };
  }
  const result = await filterForCounterparty({
    repository: input.repository,
    request: {
      run_id: input.run.run_id,
      ruleset_ref: input.run.privacy_ruleset_ref,
      audience: input.from_side === "seeker" ? "employer" : "seeker",
      input_class: "tool_returned",
      source_ref: `${input.from_side}:turn`,
      content: { message: input.content },
      ...(input.disclosure_stage ? { disclosure_stage: input.disclosure_stage } : {}),
    },
  });
  if (!result.projection) throw new Error(`privacy_filter_refused:${result.decision.reason_code}`);
  return {
    projection_ref: result.projection.filtered_view_ref,
    payload: result.projection.output,
  };
}
