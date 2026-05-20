import { randomUUID } from "node:crypto";

import { contentHash } from "./canonicalize.js";
import {
  DOSSIER_AUDIENCES,
  type DossierAudience,
  type DossierProjection,
  type DossierProjectionInput,
} from "./types.js";

export function buildProjectionRefs(
  projections: readonly Pick<DossierProjection, "audience" | "projection_id">[],
): Record<DossierAudience, string> {
  return Object.fromEntries(
    DOSSIER_AUDIENCES.map((audience) => [
      audience,
      projections.find((projection) => projection.audience === audience)?.projection_id ?? "",
    ]),
  ) as Record<DossierAudience, string>;
}

export function missingProjectionAudiences(
  projections: readonly Pick<DossierProjectionInput, "audience">[],
): readonly DossierAudience[] {
  return DOSSIER_AUDIENCES.filter(
    (audience) => !projections.some((projection) => projection.audience === audience),
  );
}

export function prepareProjection(
  dossierId: string,
  input: DossierProjectionInput,
): DossierProjection {
  return {
    projection_id: randomUUID(),
    dossier_id: dossierId,
    audience: input.audience,
    disclosure_stage: input.disclosure_stage,
    ruleset_ref: input.ruleset_ref,
    payload: input.payload,
    payload_hash: contentHash(input.payload),
    created_at: new Date(),
  };
}

export function uniquePrivacyRulesets(
  projections: readonly Pick<DossierProjectionInput, "ruleset_ref">[],
) {
  const refs = new Map<string, { ruleset_id: string; version: string }>();
  for (const projection of projections) {
    refs.set(
      `${projection.ruleset_ref.ruleset_id}@${projection.ruleset_ref.version}`,
      projection.ruleset_ref,
    );
  }
  return [...refs.values()];
}
