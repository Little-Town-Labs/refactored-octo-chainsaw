import type {
  AiRuntimeManifest,
  CostControlPolicy,
  CostEvidence,
  ModelInvocationDecision,
  ModelProfileVersion,
  UsageMetadata,
} from "./types.js";

export interface CostEvaluation {
  readonly allowed: boolean;
  readonly decision: ModelInvocationDecision;
  readonly evidence: CostEvidence;
}

export function evaluatePreflightCost(input: {
  readonly manifest: AiRuntimeManifest;
  readonly model: ModelProfileVersion;
  readonly estimatedUnits: number;
}): CostEvaluation {
  const policy = firstPolicy(input.manifest);
  const estimatedCost = estimateCost(input.model, input.estimatedUnits);
  if (!policy) {
    return allowedEvidence(input.model, estimatedCost, null);
  }
  if (estimatedCost > policy.ceiling) {
    return {
      allowed: false,
      decision: policy.on_preflight_exceeded === "downgrade" ? "downgraded" : "refused",
      evidence: {
        estimated_cost: estimatedCost,
        actual_cost: null,
        pricing_ref: input.model.cost_metadata.pricing_ref,
        ceiling: policy.ceiling,
        decision: policy.on_preflight_exceeded === "downgrade" ? "downgraded" : "refused",
      },
    };
  }
  return allowedEvidence(input.model, estimatedCost, policy.ceiling);
}

export function finalizeCostEvidence(input: {
  readonly model: ModelProfileVersion;
  readonly usage: UsageMetadata | null;
  readonly existing: CostEvidence;
}): CostEvidence {
  if (!input.usage) return input.existing;
  const actualUnits = input.usage.total_tokens ?? input.usage.requests ?? 0;
  return {
    ...input.existing,
    actual_cost: estimateCost(input.model, actualUnits),
  };
}

function estimateCost(model: ModelProfileVersion, units: number): number {
  const unitCost =
    model.cost_metadata.request_unit_cost ??
    model.cost_metadata.input_unit_cost ??
    model.cost_metadata.output_unit_cost ??
    0;
  return Number((unitCost * units).toFixed(6));
}

function firstPolicy(manifest: AiRuntimeManifest): CostControlPolicy | null {
  return manifest.cost_controls[0] ?? null;
}

function allowedEvidence(
  model: ModelProfileVersion,
  estimatedCost: number,
  ceiling: number | null,
): CostEvaluation {
  return {
    allowed: true,
    decision: "allowed",
    evidence: {
      estimated_cost: estimatedCost,
      actual_cost: null,
      pricing_ref: model.cost_metadata.pricing_ref,
      ceiling,
      decision: "allowed",
    },
  };
}
