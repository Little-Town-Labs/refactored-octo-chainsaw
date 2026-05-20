import { createHash } from "node:crypto";

import { z } from "zod";

import type { RubricAggregationPolicy, RubricDimension } from "./types.js";

const dimensionSchema = z
  .object({
    dimension_id: z.string().trim().min(1),
    label: z.string().trim().min(1),
    description: z.string().trim().min(1),
    min_score: z.number().finite(),
    max_score: z.number().finite(),
    weight: z.number().finite().nonnegative(),
    evidence_expectations: z.string().trim().min(1).optional(),
    required: z.boolean(),
  })
  .strict()
  .refine((dimension) => dimension.max_score > dimension.min_score, {
    message: "dimension max_score must be greater than min_score",
  });

const aggregationPolicySchema = z
  .object({
    kind: z.literal("weighted_sum"),
    weight_normalization: z.literal("sum_to_one"),
    rounding: z.literal("half_away_from_zero_4dp"),
  })
  .strict();

export const rubricMaterialSchema = z
  .object({
    rubric_id: z.string().trim().min(1),
    version: z.string().trim().min(1),
    side: z.enum(["seeker", "employer", "both"]),
    dimensions: z.array(dimensionSchema).min(1),
    aggregation_policy: aggregationPolicySchema,
    description: z.string().trim().min(1),
  })
  .strict()
  .superRefine((material, ctx) => {
    const seen = new Set<string>();
    let totalWeight = 0;
    for (const dimension of material.dimensions) {
      if (seen.has(dimension.dimension_id)) {
        ctx.addIssue({
          code: "custom",
          message: `duplicate dimension_id "${dimension.dimension_id}"`,
        });
      }
      seen.add(dimension.dimension_id);
      totalWeight += dimension.weight;
    }
    if (totalWeight <= 0) {
      ctx.addIssue({ code: "custom", message: "dimension weights must have a non-zero total" });
    }
  });

export interface RubricMaterial {
  readonly rubric_id: string;
  readonly version: string;
  readonly side: "seeker" | "employer" | "both";
  readonly dimensions: readonly RubricDimension[];
  readonly aggregation_policy: RubricAggregationPolicy;
  readonly description: string;
}

export type ValidatedRubricMaterial = RubricMaterial;

export class RubricSchemaInvalidError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Rubric material is invalid: ${issues.join("; ")}`);
    this.name = "RubricSchemaInvalidError";
  }
}

export function validateRubricMaterial(input: RubricMaterial): ValidatedRubricMaterial {
  const result = rubricMaterialSchema.safeParse(input);
  if (!result.success) {
    throw new RubricSchemaInvalidError(result.error.issues.map((issue) => issue.message));
  }
  return result.data as ValidatedRubricMaterial;
}

export function computeRubricContentHash(input: RubricMaterial): string {
  const material = validateRubricMaterial(input);
  return createHash("sha256").update(canonicalize(material)).digest("hex");
}

export function canonicalize(input: unknown): string {
  return JSON.stringify(sortForCanonicalJson(input));
}

function sortForCanonicalJson(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(sortForCanonicalJson);
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([key, value]) => [key, sortForCanonicalJson(value)]));
  }
  return input;
}
