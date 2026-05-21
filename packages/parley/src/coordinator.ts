import type { DossierRepository, InconclusiveFlag } from "@spyglass/dossiers";
import type { RubricVersion } from "@spyglass/rubrics";

import type { NegotiationContextManager } from "./context.js";
import { produceParleyDossier, type DossierSigningKey } from "./dossier-producer.js";
import { filterCrossSideMessage } from "./filter-worker.js";
import type { ParleyRunRepository } from "./repo.js";
import { scoringOutputToDossierBreakdown } from "./scoring.js";
import { validateScoringOutput, validateTurnOutput } from "./side-runner.js";
import type {
  DossierProductionResult,
  ParleyRun,
  ParleySide,
  SideAgentDriver,
  SideScoringOutput,
  SideTurnOutput,
} from "./types.js";

export interface CoordinateParleyRunInput {
  readonly run: ParleyRun;
  readonly runRepository: ParleyRunRepository;
  readonly contextManager: NegotiationContextManager;
  readonly sideAgentDriver: SideAgentDriver;
  readonly dossierRepository: DossierRepository;
  readonly signingKey: DossierSigningKey;
  readonly seeker_rubric: RubricVersion;
  readonly employer_rubric: RubricVersion;
  readonly initial_principal_views?: Partial<Record<ParleySide, Record<string, unknown>>>;
}

export async function coordinateParleyRun(
  input: CoordinateParleyRunInput,
): Promise<DossierProductionResult> {
  let run = await input.runRepository.transitionRun({
    run_id: input.run.run_id,
    from_state: "pending",
    to_state: "seeker_turn",
    reason_code: "contracts_resolved",
    round: 1,
  });
  initializeContexts(input, run);

  const turns: Record<ParleySide, SideTurnOutput[]> = { seeker: [], employer: [] };
  const modelRefs: string[] = [];
  const flags = new Set<string>();

  for (let round = 1; round <= run.round_cap; round += 1) {
    run = await executeTurn(input, run, "seeker", round, turns, modelRefs, flags);
    run = await input.runRepository.transitionRun({
      run_id: run.run_id,
      from_state: "seeker_filtering",
      to_state: "employer_turn",
      reason_code: "seeker_projection_complete",
      round,
      side: "seeker",
    });
    run = await executeTurn(input, run, "employer", round, turns, modelRefs, flags);

    const bothDone =
      turns.seeker.at(-1)?.done_signal === true && turns.employer.at(-1)?.done_signal === true;
    const reachedCap = round >= run.round_cap;
    run = await input.runRepository.transitionRun({
      run_id: run.run_id,
      from_state: "employer_filtering",
      to_state: bothDone || reachedCap ? "scoring" : "round_complete",
      reason_code: bothDone
        ? "both_sides_done"
        : reachedCap
          ? "round_cap_reached"
          : "round_complete",
      round,
      side: "employer",
    });
    if (run.status === "scoring") break;
    run = await input.runRepository.transitionRun({
      run_id: run.run_id,
      from_state: "round_complete",
      to_state: "seeker_turn",
      reason_code: "advance_round",
      round: round + 1,
    });
  }

  let seekerScore: SideScoringOutput;
  let employerScore: SideScoringOutput;
  const inconclusiveFlags: InconclusiveFlag[] = [];
  try {
    seekerScore = await input.sideAgentDriver.score({
      run,
      context: input.contextManager.get(run.run_id, "seeker"),
      side: "seeker",
      rubric: input.seeker_rubric,
    });
    employerScore = await input.sideAgentDriver.score({
      run,
      context: input.contextManager.get(run.run_id, "employer"),
      side: "employer",
      rubric: input.employer_rubric,
    });
    validateScoringOutput(seekerScore);
    validateScoringOutput(employerScore);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "scoring_gap";
    inconclusiveFlags.push({
      reason_code: "scoring_gap",
      source_ref: "side_runner:scoring",
      resolution_hint: reason,
    });
    seekerScore = fallbackScore(input.seeker_rubric, "seeker");
    employerScore = fallbackScore(input.employer_rubric, "employer");
  }

  modelRefs.push(
    ...(seekerScore.model_invocation_ref ? [seekerScore.model_invocation_ref] : []),
    ...(employerScore.model_invocation_ref ? [employerScore.model_invocation_ref] : []),
  );
  seekerScore.flag_proposals.forEach((flag) => flags.add(flag));
  employerScore.flag_proposals.forEach((flag) => flags.add(flag));

  const status = inconclusiveFlags.length > 0 ? "inconclusive" : "conclusive";
  run = await input.runRepository.transitionRun({
    run_id: run.run_id,
    from_state: "scoring",
    to_state: "producing_dossier",
    reason_code: "scoring_complete",
  });
  const result = await produceParleyDossier({
    request: {
      run,
      status,
      rubric_breakdowns: [
        scoringOutputToDossierBreakdown({
          side: "seeker",
          rubric: input.seeker_rubric,
          output: seekerScore,
        }),
        scoringOutputToDossierBreakdown({
          side: "employer",
          rubric: input.employer_rubric,
          output: employerScore,
        }),
      ],
      rationales: {
        seeker: seekerScore.headline_rationale,
        employer: employerScore.headline_rationale,
      },
      model_invocation_refs: modelRefs,
      flags: [...flags],
      inconclusive_flags: inconclusiveFlags,
      projections: ["seeker", "employer", "auditor", "a2a_receiver"].map((audience) => ({
        audience: audience as "seeker" | "employer" | "auditor" | "a2a_receiver",
        disclosure_stage: "stage_0",
        ruleset_ref: run.privacy_ruleset_ref,
        payload: { run_id: run.run_id, audience },
      })),
    },
    dossierRepository: input.dossierRepository,
    runRepository: input.runRepository,
    signingKey: input.signingKey,
  });
  input.contextManager.releaseRun(run.run_id, result.terminal_event.reason_code);
  return result;
}

function initializeContexts(input: CoordinateParleyRunInput, run: ParleyRun): void {
  input.contextManager.initialize({
    run_id: run.run_id,
    side: "seeker",
    principal_view: input.initial_principal_views?.seeker ?? { side: "seeker" },
    rubric_dimensions: input.seeker_rubric.dimensions.map((dimension) => dimension.dimension_id),
    system_prompt: "Run to completion. Do not ask for human input.",
  });
  input.contextManager.initialize({
    run_id: run.run_id,
    side: "employer",
    principal_view: input.initial_principal_views?.employer ?? { side: "employer" },
    rubric_dimensions: input.employer_rubric.dimensions.map((dimension) => dimension.dimension_id),
    system_prompt: "Run to completion. Do not ask for human input.",
  });
}

async function executeTurn(
  input: CoordinateParleyRunInput,
  run: ParleyRun,
  side: ParleySide,
  round: number,
  turns: Record<ParleySide, SideTurnOutput[]>,
  modelRefs: string[],
  flags: Set<string>,
): Promise<ParleyRun> {
  const output = await input.sideAgentDriver.turn({
    run,
    context: input.contextManager.get(run.run_id, side),
    side,
    round,
  });
  validateTurnOutput(output);
  turns[side].push(output);
  output.flag_proposals.forEach((flag) => flags.add(flag));
  if (output.model_invocation_ref) modelRefs.push(output.model_invocation_ref);
  input.contextManager.appendPromptMessage(run.run_id, side, {
    role: "assistant",
    content: output.internal_notes,
  });
  const fromState = side === "seeker" ? "seeker_turn" : "employer_turn";
  const filteringState = side === "seeker" ? "seeker_filtering" : "employer_filtering";
  let next = await input.runRepository.transitionRun({
    run_id: run.run_id,
    from_state: fromState,
    to_state: filteringState,
    reason_code: "turn_completed",
    round,
    side,
  });
  const receivingSide = side === "seeker" ? "employer" : "seeker";
  const projection = await filterCrossSideMessage({
    run: next,
    from_side: side,
    content: output.message_to_counterparty,
  });
  input.contextManager.updateCounterpartyView(next.run_id, receivingSide, projection);
  next = { ...next, round };
  return next;
}

function fallbackScore(rubric: RubricVersion, side: ParleySide): SideScoringOutput {
  return {
    dimension_scores: rubric.dimensions.map((dimension) => ({
      dimension_id: dimension.dimension_id,
      score: dimension.min_score,
      rationale: "inconclusive fallback score",
    })),
    headline_rationale: `${side} scoring was inconclusive.`,
    flag_proposals: ["inconclusive_scoring_gap"],
  };
}
