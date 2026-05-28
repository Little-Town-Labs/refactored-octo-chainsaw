import type {
  ProductAgentInvocationRecord,
  ProductPersonaEncounter,
  ProductPersonaEncounterResult,
  ProductResultStore,
  ProductResultStoreSnapshot,
  RunArtifact,
  ScenarioAssertion,
  ScenarioEnvironment,
  ScenarioRunResult,
} from "../contracts.js";
import { createProductResultStoreSnapshot } from "../results/store.js";
import { runScenario } from "../runner.js";
import { type PiAgentDriver, SyntheticPiAgentDriver } from "./driver.js";
import { evaluatePersonaEncounterResult, type ProductPersonaEvalAssessment } from "./evaluator.js";
import { DEFAULT_PI_PERSONA_ENCOUNTERS } from "./matrix.js";
import { getProductPersona } from "./personas.js";

export interface PiPersonaEvalRun {
  readonly encounter: ProductPersonaEncounter;
  readonly driver_result: ProductPersonaEncounterResult;
  readonly assessment: ProductPersonaEvalAssessment;
  readonly agent_invocations: readonly ProductAgentInvocationRecord[];
  readonly run: ScenarioRunResult;
  readonly snapshot: ProductResultStoreSnapshot;
}

export interface RunPiPersonaEvalOptions {
  readonly run_id?: string;
  readonly environment?: ScenarioEnvironment;
  readonly store?: ProductResultStore;
  readonly driver?: PiAgentDriver;
}

export interface PiPersonaEvalSuiteResult {
  readonly results: readonly PiPersonaEvalRun[];
  readonly summary: string;
}

export async function runPiPersonaEncounter(
  encounter: ProductPersonaEncounter,
  options: RunPiPersonaEvalOptions = {},
): Promise<PiPersonaEvalRun> {
  const runId = options.run_id ?? `pi-persona-eval-${encounter.encounter_id}`;
  const driver = options.driver ?? new SyntheticPiAgentDriver();
  const seeker = getProductPersona(encounter.seeker_persona_id);
  const employer = getProductPersona(encounter.employer_persona_id);
  if (!seeker || !employer) {
    throw new Error(`Missing persona for encounter ${encounter.encounter_id}`);
  }

  const driverResult = await driver.runEncounter({ encounter, seeker, employer });
  const assessment = evaluatePersonaEncounterResult(encounter, driverResult);
  const transcriptArtifact = toTranscriptArtifact(runId, encounter, driverResult);
  const scenario = {
    scenario_id: encounter.scenario_id,
    version: "1.0.0",
    title: `Pi persona eval: ${encounter.encounter_id}`,
    description: "Deterministic Pi-compatible seeker/employer persona eval encounter.",
    mode: "eval" as const,
    owner: "product-test-harness",
    tags: ["PTH09", "persona-eval", "pi"],
    steps: [
      {
        step_id: "pi-persona-encounter",
        name: "Run Pi-compatible persona encounter",
        run: () => ({
          status: assessment.status,
          assertions: scenarioAssertions(encounter, assessment),
          artifacts: [transcriptArtifact],
          evidence_refs: assessment.evidence_refs,
          metadata: {
            encounter_id: encounter.encounter_id,
            seeker_persona_id: encounter.seeker_persona_id,
            employer_persona_id: encounter.employer_persona_id,
            outcome: assessment.outcome,
            reason_code: assessment.reason_code,
          },
        }),
      },
    ],
  };

  const run = await runScenario(scenario, {
    run_id: runId,
    environment: options.environment ?? { label: "local-pi-persona-eval" },
    metadata: {
      encounter_id: encounter.encounter_id,
      driver_id: driver.driver_id,
      provider: driver.provider,
      model: driver.model,
    },
    now: deterministicClock(),
  });

  const agentInvocations = [toAgentInvocation(runId, encounter, driverResult, assessment)];
  const snapshot = createProductResultStoreSnapshot({
    run,
    agent_invocations: agentInvocations,
    created_at: "2026-05-28T14:00:00.000Z",
  });

  if (options.store) await options.store.saveRun(snapshot);

  return {
    encounter,
    driver_result: driverResult,
    assessment,
    agent_invocations: agentInvocations,
    run,
    snapshot,
  };
}

export async function runDefaultPiPersonaEvalSuite(
  options: RunPiPersonaEvalOptions = {},
): Promise<PiPersonaEvalSuiteResult> {
  const results: PiPersonaEvalRun[] = [];
  for (const encounter of DEFAULT_PI_PERSONA_ENCOUNTERS) {
    results.push(
      await runPiPersonaEncounter(encounter, {
        ...options,
        run_id: `pi-persona-eval-${encounter.encounter_id}`,
      }),
    );
  }
  const passed = results.filter((result) => result.run.status === "passed").length;
  return {
    results,
    summary: `${passed}/${results.length} persona eval encounter(s) passed`,
  };
}

function scenarioAssertions(
  encounter: ProductPersonaEncounter,
  assessment: ProductPersonaEvalAssessment,
): readonly ScenarioAssertion[] {
  return [
    {
      assertion_id: `${encounter.scenario_id}.persona-eval`,
      name: "Persona eval produced expected outcome and safe evidence",
      severity: "major",
      status: assessment.status,
      expected: encounter.expected_outcome,
      actual: assessment.outcome,
      evidence_refs: assessment.evidence_refs,
      metadata: {
        reason_code: assessment.reason_code,
      },
    },
  ];
}

function toTranscriptArtifact(
  runId: string,
  encounter: ProductPersonaEncounter,
  result: ProductPersonaEncounterResult,
): RunArtifact {
  return {
    artifact_id: `artifact-${encounter.encounter_id}-transcript`,
    label: `Transcript for ${encounter.encounter_id}`,
    type: "agent_transcript",
    uri: result.transcript.transcript_ref,
    redaction_status: "redacted",
    metadata: {
      run_id: runId,
      safe_excerpt: result.transcript.safe_excerpt,
      message_count: result.transcript.message_count,
      artifact_refs: result.transcript.artifact_refs,
      redaction_note: "Synthetic transcript excerpt only; raw transcript not persisted.",
    },
  };
}

function toAgentInvocation(
  runId: string,
  encounter: ProductPersonaEncounter,
  result: ProductPersonaEncounterResult,
  assessment: ProductPersonaEvalAssessment,
): ProductAgentInvocationRecord {
  return {
    invocation_id: `agent-invocation-${encounter.encounter_id}`,
    driver: result.driver_id,
    persona_id: encounter.seeker_persona_id,
    scenario_id: encounter.scenario_id,
    started_at: result.started_at,
    ended_at: result.ended_at,
    status: assessment.status,
    artifact_refs: result.transcript.artifact_refs,
    metadata: {
      run_id: runId,
      encounter_id: encounter.encounter_id,
      seeker_persona_id: encounter.seeker_persona_id,
      employer_persona_id: encounter.employer_persona_id,
      prompt_refs: encounter.prompt_refs,
      provider: result.provider,
      model: result.model,
      model_version: result.model_metadata.model_version,
      latency_ms: result.latency_ms,
      cost_usd: result.cost_usd,
      usage: result.usage,
      tool_traces: result.tool_traces,
      outcome: result.evaluator_summary.outcome,
      evaluator_summary: result.evaluator_summary,
      assessment_reason_code: assessment.reason_code,
    },
  };
}

function deterministicClock(): () => Date {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 4, 28, 14, 0, tick++));
}
