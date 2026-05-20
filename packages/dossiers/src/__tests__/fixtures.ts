import { randomUUID } from "node:crypto";

import type {
  DossierBuildInput,
  DossierPrincipal,
  DossierProjectionInput,
  RubricBreakdown,
} from "../types.js";

export function operator(): DossierPrincipal {
  return {
    principal_id: "00000000-0000-7000-8000-000000000001",
    scopes: ["dossier:build", "dossier:sign", "dossier:verify", "dossier:review"],
  };
}

export function unscoped(): DossierPrincipal {
  return { principal_id: "00000000-0000-7000-8000-000000000002", scopes: [] };
}

export function projections(): readonly DossierProjectionInput[] {
  return [
    projection("seeker", { summary: "Seeker view" }),
    projection("employer", { summary: "Employer view" }),
    projection("auditor", { summary: "Auditor view", evidence_refs: ["audit:1"] }),
    projection("a2a_receiver", { summary: "A2A view" }),
  ];
}

export function dossierInput(overrides: Partial<DossierBuildInput> = {}): DossierBuildInput {
  return {
    run_id: "run-f10",
    match_id: randomUUID(),
    status: "conclusive",
    contract_refs: {
      seeker: { contract_id: "seeker-contract", version: "1.0.0" },
      employer: { contract_id: "employer-contract", version: "1.0.0" },
    },
    harness_version: "f10-test-harness",
    model_invocation_refs: ["model:seeker:1", "model:employer:1"],
    rubric_breakdowns: [rubric("seeker"), rubric("employer")],
    rationales: {
      seeker: "The seeker side found strong alignment with guarded caveats.",
      employer: "The employer side found the role requirements mostly satisfied.",
    },
    reconciled_flags: [{ reason_code: "human_attention", source_ref: "flag:1" }],
    projections: projections(),
    ...overrides,
  };
}

export function rubric(side: "seeker" | "employer"): RubricBreakdown {
  return {
    side,
    rubric_id: `${side}-rubric`,
    rubric_version: "1.0.0",
    dimensions: [
      { dimension_id: "fit", score: 4, weight: 0.6, weighted_score: 2.4 },
      { dimension_id: "risk", score: 3, weight: 0.4, weighted_score: 1.2 },
    ],
    total: 3.6,
  };
}

function projection(
  audience: DossierProjectionInput["audience"],
  payload: DossierProjectionInput["payload"],
): DossierProjectionInput {
  return {
    audience,
    disclosure_stage: "intro_guarded",
    ruleset_ref: { ruleset_id: `${audience}-ruleset`, version: "1.0.0" },
    payload,
  };
}
