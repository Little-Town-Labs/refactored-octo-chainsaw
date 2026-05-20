import type { DossierRepository } from "./repo.js";
import { DOSSIER_SCOPES, requireDossierScope } from "./scopes.js";
import type {
  DossierArtifact,
  DossierPrincipal,
  DossierProjection,
  VerificationResult,
} from "./types.js";

export interface DossierReviewBundle {
  readonly dossiers: readonly DossierArtifact[];
  readonly projections: readonly DossierProjection[];
  readonly verification_events: readonly VerificationResult[];
}

export async function readDossierReviewBundle(input: {
  readonly repository: DossierRepository;
  readonly principal: DossierPrincipal;
  readonly dossier_id?: string;
}): Promise<DossierReviewBundle> {
  requireDossierScope(input.principal.scopes, DOSSIER_SCOPES.review);
  const dossiers = input.dossier_id
    ? [await input.repository.getDossier(input.dossier_id)].filter(
        (dossier): dossier is DossierArtifact => Boolean(dossier),
      )
    : await input.repository.listDossiers();
  const projections = (
    await Promise.all(
      dossiers.map((dossier) => input.repository.listProjections(dossier.dossier_id)),
    )
  ).flat();
  const verification_events = (
    await Promise.all(
      dossiers.map((dossier) => input.repository.listVerificationEvents(dossier.dossier_id)),
    )
  ).flat();
  return { dossiers, projections, verification_events };
}
