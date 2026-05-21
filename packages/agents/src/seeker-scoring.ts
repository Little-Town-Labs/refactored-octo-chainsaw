import { invokeModel } from "@spyglass/ai";
import type { RubricVersion } from "@spyglass/rubrics";

import { mapAiReason, refusal, validateSeekerAdvocateInput } from "./seeker-advocate.js";
import { auditRefsFromRecord } from "./types.js";
import type {
  SeekerAdvocateScoringInput,
  SeekerAdvocateScoringResult,
  SeekerAdvocateScoreDraft,
  SeekerDimensionScore,
  SeekerScoringDecision,
} from "./types.js";

export async function runSeekerAdvocateScoring(
  input: SeekerAdvocateScoringInput,
): Promise<SeekerScoringDecision> {
  const boundary = validateSeekerAdvocateInput(input, "score");
  if (boundary) return { ok: false, refusal: boundary };

  const invocation = await invokeModel(input.runtime.repository, input.runtime.gateway, {
    caller: input.runtime.caller,
    caller_scope: input.runtime.caller_scope,
    run_ref: input.run_id,
    purpose: "seeker_advocate_scoring",
    prompt_ref: input.refs.prompt_ref,
    model_ref: input.refs.model_ref,
    manifest_ref: input.refs.manifest_ref,
    variables: {
      candidate_context: JSON.stringify({
        seeker: input.principal_view,
        counterparty: input.counterparty_projection.payload,
        rubric_dimensions: input.rubric.dimensions.map((dimension) => dimension.dimension_id),
      }),
    },
  });

  if (!invocation.ok) {
    return {
      ok: false,
      refusal: refusal(
        input,
        "score",
        mapAiReason(invocation.refusal.reason_code),
        invocation.refusal.message,
        {
          ai_reason_code: invocation.refusal.reason_code,
        },
      ),
    };
  }

  const draft = input.score_draft ?? draftFromRubricScratch(input);
  const validation = validateSeekerDimensionScores(input.rubric, draft.dimension_scores);
  if (!validation.ok) {
    return {
      ok: false,
      refusal: refusal(input, "score", "scoring_dimensions_invalid", validation.message),
    };
  }

  const result: SeekerAdvocateScoringResult = {
    run_id: input.run_id,
    side: "seeker",
    rubric_ref: input.refs.rubric_ref,
    dimension_scores: draft.dimension_scores,
    headline_rationale: draft.headline_rationale,
    flag_proposals: draft.flag_proposals,
    ignored_holistic_score: draft.model_holistic_score ?? null,
    invocation_ref: invocation.record.invocation_id,
    frozen_refs: input.refs,
    audit_refs: auditRefsFromRecord(invocation.record),
  };
  return { ok: true, result };
}

export function validateSeekerDimensionScores(
  rubric: RubricVersion,
  scores: readonly SeekerDimensionScore[],
): { readonly ok: true } | { readonly ok: false; readonly message: string } {
  const expected = new Map(
    rubric.dimensions.map((dimension) => [dimension.dimension_id, dimension]),
  );
  const seen = new Set<string>();
  for (const score of scores) {
    const dimension = expected.get(score.dimension_id);
    if (!dimension) return { ok: false, message: `Unexpected dimension ${score.dimension_id}.` };
    if (seen.has(score.dimension_id)) {
      return { ok: false, message: `Duplicate dimension ${score.dimension_id}.` };
    }
    seen.add(score.dimension_id);
    if (score.score < dimension.min_score || score.score > dimension.max_score) {
      return { ok: false, message: `Score out of range for ${score.dimension_id}.` };
    }
    if (score.rationale.trim().length === 0) {
      return { ok: false, message: `Missing rationale for ${score.dimension_id}.` };
    }
  }
  for (const dimension of expected.keys()) {
    if (!seen.has(dimension)) return { ok: false, message: `Missing dimension ${dimension}.` };
  }
  return { ok: true };
}

function draftFromRubricScratch(input: SeekerAdvocateScoringInput): SeekerAdvocateScoreDraft {
  const dimension_scores = input.rubric.dimensions.flatMap((dimension) => {
    const scratch = input.context.rubric_scratch[dimension.dimension_id];
    if (!scratch || scratch.score === null || scratch.rationale === null) return [];
    return [
      { dimension_id: dimension.dimension_id, score: scratch.score, rationale: scratch.rationale },
    ];
  });
  const missing = input.rubric.dimensions
    .filter(
      (dimension) =>
        !dimension_scores.some((score) => score.dimension_id === dimension.dimension_id),
    )
    .map((dimension) => `insufficient_evidence:${dimension.dimension_id}`);
  return {
    dimension_scores,
    headline_rationale:
      missing.length > 0
        ? "Insufficient evidence to score every seeker-side dimension."
        : "Seeker-side dimensions scored from available evidence.",
    flag_proposals: missing,
  };
}
