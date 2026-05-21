import type { RubricBreakdown } from "@spyglass/dossiers";
import { computeWeightedScore, type RubricVersion } from "@spyglass/rubrics";

import type { ParleySide, SideScoringOutput } from "./types.js";

export function scoringOutputToDossierBreakdown(input: {
  readonly side: ParleySide;
  readonly rubric: RubricVersion;
  readonly output: SideScoringOutput;
}): RubricBreakdown {
  const weightedInput = {
    rubric: input.rubric,
    dimensionScores: input.output.dimension_scores.map((score) => ({
      dimension_id: score.dimension_id,
      score: score.score,
    })),
    ...(input.output.model_holistic_score === undefined
      ? {}
      : { modelHolisticScore: input.output.model_holistic_score }),
  };
  const weighted = computeWeightedScore(weightedInput);
  return {
    side: input.side,
    rubric_id: weighted.rubric_id,
    rubric_version: weighted.rubric_version,
    dimensions: input.output.dimension_scores.map((score) => {
      const weight =
        weighted.normalized_weights.find((entry) => entry.dimension_id === score.dimension_id)
          ?.weight ?? 0;
      return {
        dimension_id: score.dimension_id,
        score: score.score,
        weight,
        weighted_score: round(score.score * weight),
        reason_ref: score.rationale,
      };
    }),
    total: weighted.total_score,
  };
}

function round(input: number): number {
  return Math.round(input * 1000000) / 1000000;
}
