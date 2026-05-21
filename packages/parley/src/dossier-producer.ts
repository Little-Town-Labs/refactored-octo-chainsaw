import { buildDossier, type DossierRepository, signDossier } from "@spyglass/dossiers";

import type { ParleyRunRepository } from "./repo.js";
import type {
  DossierProductionRequest,
  DossierProductionResult,
  ParleyTerminalEvent,
} from "./types.js";

export type DossierSigningKey = Parameters<typeof signDossier>[0]["key"];

export async function produceParleyDossier(input: {
  readonly request: DossierProductionRequest;
  readonly dossierRepository: DossierRepository;
  readonly runRepository: ParleyRunRepository;
  readonly signingKey: DossierSigningKey;
}): Promise<DossierProductionResult> {
  const built = await buildDossier({
    repository: input.dossierRepository,
    dossier: {
      run_id: input.request.run.run_id,
      match_id: input.request.run.match_ticket_id,
      status: input.request.status,
      contract_refs: {
        seeker: input.request.run.seeker_contract_ref,
        employer: input.request.run.employer_contract_ref,
      },
      harness_version: input.request.run.harness_version,
      model_invocation_refs: input.request.model_invocation_refs,
      rubric_breakdowns: input.request.rubric_breakdowns,
      rationales: input.request.rationales,
      reconciled_flags: input.request.flags.map((flag) => ({ flag })),
      inconclusive_flags: input.request.inconclusive_flags,
      projections: input.request.projections,
    },
  });
  const dossier = await signDossier({
    repository: input.dossierRepository,
    dossier: built,
    key: input.signingKey,
  });
  const terminalState = input.request.status === "conclusive" ? "complete" : "inconclusive";
  await input.runRepository.transitionRun({
    run_id: input.request.run.run_id,
    from_state: "producing_dossier",
    to_state: terminalState,
    reason_code: terminalState === "complete" ? "dossier_complete" : "dossier_inconclusive",
    dossier_id: dossier.dossier_id,
  });
  const terminal_event: ParleyTerminalEvent = {
    event_name: "negotiation.run.terminated",
    event_version: 1,
    run_id: input.request.run.run_id,
    match_ticket_id: input.request.run.match_ticket_id,
    terminal_state: terminalState,
    reason_code: terminalState === "complete" ? "dossier_complete" : "dossier_inconclusive",
    dossier_id: dossier.dossier_id,
    produced_at: dossier.created_at.toISOString(),
  };
  return {
    dossier,
    terminal_event,
    dossier_event: {
      ...terminal_event,
      event_name: "dossier.produced",
    },
  };
}
