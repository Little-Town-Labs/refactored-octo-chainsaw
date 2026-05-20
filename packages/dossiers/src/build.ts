import { randomUUID } from "node:crypto";

import { signingContentHash } from "./canonicalize.js";
import {
  buildProjectionRefs,
  missingProjectionAudiences,
  prepareProjection,
  uniquePrivacyRulesets,
} from "./projections.js";
import type { DossierRepository } from "./repo.js";
import {
  DOSSIER_AUDIENCES,
  type DossierArtifact,
  type DossierBuildInput,
  type InconclusiveFlag,
  type RubricBreakdown,
} from "./types.js";

export async function buildDossier(input: {
  readonly repository: DossierRepository;
  readonly dossier: DossierBuildInput;
}): Promise<DossierArtifact> {
  validateRubricBreakdowns(input.dossier.rubric_breakdowns);
  const missing = missingProjectionAudiences(input.dossier.projections);
  const inconclusiveFlags = [...(input.dossier.inconclusive_flags ?? [])];
  if (input.dossier.status === "conclusive" && missing.length > 0) {
    throw new Error(`missing_projection:${missing.join(",")}`);
  }
  if (input.dossier.status === "inconclusive" && missing.length > 0) {
    inconclusiveFlags.push(
      ...missing.map(
        (audience): InconclusiveFlag => ({
          reason_code: "projection_missing",
          source_ref: `projection:${audience}`,
          resolution_hint: `Provide ${audience} projection before conclusive delivery.`,
        }),
      ),
    );
  }
  if (input.dossier.status === "inconclusive" && inconclusiveFlags.length === 0) {
    throw new Error("inconclusive dossier requires at least one flag");
  }
  const dossierId = randomUUID();
  const projections = input.dossier.projections.map((projection) =>
    prepareProjection(dossierId, projection),
  );
  const projectionRefs = buildProjectionRefs(projections);
  const unsigned = {
    dossier_id: dossierId,
    run_id: input.dossier.run_id,
    match_id: input.dossier.match_id,
    status: input.dossier.status,
    contract_refs: input.dossier.contract_refs,
    privacy_ruleset_refs: uniquePrivacyRulesets(input.dossier.projections),
    harness_version: input.dossier.harness_version,
    model_invocation_refs: input.dossier.model_invocation_refs,
    rubric_breakdowns: input.dossier.rubric_breakdowns,
    rationales: input.dossier.rationales,
    reconciled_flags: input.dossier.reconciled_flags,
    inconclusive_flags: inconclusiveFlags,
    projection_refs: projectionRefs,
    signature: null,
  };
  const dossier = await input.repository.insertDossier({
    ...unsigned,
    content_hash: signingContentHash(unsigned),
    audit_event_id: input.dossier.audit_event_id ?? null,
    created_at: new Date(),
  });
  for (const projection of projections) {
    await input.repository.insertProjection(projection);
  }
  return dossier;
}

function validateRubricBreakdowns(breakdowns: readonly RubricBreakdown[]): void {
  for (const breakdown of breakdowns) {
    const total = breakdown.dimensions.reduce((sum, dimension) => {
      if (dimension.weight < 0) throw new Error("invalid_payload: negative rubric weight");
      return sum + dimension.weighted_score;
    }, 0);
    if (Math.abs(total - breakdown.total) > 0.000001) {
      throw new Error(`invalid_payload: rubric total mismatch for ${breakdown.side}`);
    }
  }
  const sides = new Set(breakdowns.map((breakdown) => breakdown.side));
  for (const side of ["seeker", "employer"] as const) {
    if (!sides.has(side)) throw new Error(`invalid_payload: missing ${side} rubric breakdown`);
  }
}

export function requiredDossierAudiences() {
  return DOSSIER_AUDIENCES;
}
