import { randomUUID } from "node:crypto";

import type {
  DimensionScore,
  NormalizedWeight,
  RubricVersion,
  WeightedScoreResult,
} from "./types.js";

export class RubricScoringError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RubricScoringError";
  }
}

export interface ComputeWeightedScoreInput {
  readonly rubric: RubricVersion;
  readonly dimensionScores: readonly DimensionScore[];
  readonly modelHolisticScore?: number;
}

export function computeWeightedScore(input: ComputeWeightedScoreInput): WeightedScoreResult {
  const scoreByDimension = new Map(
    input.dimensionScores.map((score) => [score.dimension_id, score.score]),
  );
  const normalizedWeights = normalizeWeights(input.rubric);
  let total = 0;

  for (const dimension of input.rubric.dimensions) {
    const score = scoreByDimension.get(dimension.dimension_id);
    if (score === undefined) {
      if (dimension.required) {
        throw new RubricScoringError(`missing required dimension score: ${dimension.dimension_id}`);
      }
      continue;
    }
    if (score < dimension.min_score || score > dimension.max_score) {
      throw new RubricScoringError(`dimension score out of range: ${dimension.dimension_id}`);
    }
    const weight = normalizedWeights.find((entry) => entry.dimension_id === dimension.dimension_id);
    total += score * (weight?.weight ?? 0);
  }

  const ignored = input.modelHolisticScore !== undefined;
  return {
    rubric_id: input.rubric.rubric_id,
    rubric_version: input.rubric.version,
    dimension_scores: input.dimensionScores,
    normalized_weights: normalizedWeights,
    total_score: roundHalfAwayFromZero4dp(total),
    rounding_policy: "half_away_from_zero_4dp",
    model_holistic_score_ignored: ignored,
    ...(ignored ? { regression_signal_ref: `holistic-score:${randomUUID()}` } : {}),
  };
}

export function normalizeWeights(rubric: RubricVersion): readonly NormalizedWeight[] {
  const total = rubric.dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  if (total <= 0) throw new RubricScoringError("dimension weights must have a non-zero total");
  return rubric.dimensions.map((dimension) => ({
    dimension_id: dimension.dimension_id,
    weight: dimension.weight / total,
  }));
}

function roundHalfAwayFromZero4dp(input: number): number {
  const scaled = input * 10000;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  return rounded / 10000;
}
