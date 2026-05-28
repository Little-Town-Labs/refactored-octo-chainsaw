import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_PI_PERSONA_ENCOUNTERS,
  DEFAULT_PRODUCT_PERSONAS,
  LocalFileProductResultStore,
  SyntheticPiAgentDriver,
  assertPersonaTranscriptSafe,
  evaluatePersonaEncounterResult,
  getProductPersona,
  runDefaultPiPersonaEvalSuite,
} from "../index.js";
import { runPiPersonaEvalScenarioSample } from "../samples/pi-persona-evals.js";

describe("Pi persona eval adapter", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("defines default personas and a deterministic encounter matrix", () => {
    expect(DEFAULT_PRODUCT_PERSONAS.map((persona) => persona.persona_id)).toEqual(
      expect.arrayContaining([
        "seeker.senior-engineer",
        "seeker.prompt-injection-attacker",
        "employer.structured-compliant",
      ]),
    );
    expect(DEFAULT_PI_PERSONA_ENCOUNTERS.map((encounter) => encounter.encounter_id)).toEqual(
      expect.arrayContaining([
        "pi-encounter-strong-match",
        "pi-encounter-prompt-injection",
        "pi-encounter-privacy-boundary",
      ]),
    );
    expect(getProductPersona("seeker.senior-engineer")).toMatchObject({
      role: "seeker",
      prompt_seed_ref: "prompt-seed://pth09/seeker/senior-engineer",
    });
  });

  it("runs encounters through a Pi-compatible synthetic driver", async () => {
    const driver = new SyntheticPiAgentDriver();
    const encounter = DEFAULT_PI_PERSONA_ENCOUNTERS.find(
      (entry) => entry.encounter_id === "pi-encounter-strong-match",
    );
    expect(encounter).toBeDefined();

    const result = await driver.runEncounter({
      encounter: encounter!,
      seeker: getProductPersona(encounter!.seeker_persona_id)!,
      employer: getProductPersona(encounter!.employer_persona_id)!,
    });

    expect(result).toMatchObject({
      driver_id: "synthetic-pi",
      provider: "synthetic-pi",
      model: "pi-synthetic-eval-v1",
      transcript: {
        transcript_ref: "transcript://pth09/pi-encounter-strong-match",
        message_count: 4,
      },
      evaluator_summary: {
        outcome: "strong_match",
        boundary_passed: true,
      },
    });
    expect(result.tool_traces.length).toBeGreaterThan(0);
    expect(result.usage.total_tokens).toBeGreaterThan(0);
    expect(result.cost_usd).toBeGreaterThan(0);
    expect(evaluatePersonaEncounterResult(encounter!, result)).toMatchObject({
      status: "passed",
      reason_code: "expected_outcome",
    });
  });

  it("records prompt-injection refusals and rejects unsafe transcript content", async () => {
    const driver = new SyntheticPiAgentDriver();
    const encounter = DEFAULT_PI_PERSONA_ENCOUNTERS.find(
      (entry) => entry.encounter_id === "pi-encounter-prompt-injection",
    );
    expect(encounter).toBeDefined();

    const result = await driver.runEncounter({
      encounter: encounter!,
      seeker: getProductPersona(encounter!.seeker_persona_id)!,
      employer: getProductPersona(encounter!.employer_persona_id)!,
    });

    expect(result.evaluator_summary).toMatchObject({
      outcome: "unsafe_tool_refusal",
      reason_code: "unsafe_tool_request_refused",
      boundary_passed: true,
    });
    expect(result.tool_traces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          decision: "refused",
          reason_code: "unsafe_tool_request",
        }),
      ]),
    );
    expect(assertPersonaTranscriptSafe(result)).toEqual({
      valid: true,
      reason_code: "safe",
      forbidden_paths: [],
    });
    expect(
      assertPersonaTranscriptSafe({
        ...result,
        transcript: {
          ...result.transcript,
          safe_excerpt: "private_seeker_content=synthetic forbidden marker",
        },
      }),
    ).toMatchObject({
      valid: false,
      reason_code: "private_payload",
      forbidden_paths: ["$.transcript.safe_excerpt"],
    });
  });

  it("runs and persists the default persona eval suite", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });

    const suite = await runDefaultPiPersonaEvalSuite({ store });

    expect(suite.results).toHaveLength(DEFAULT_PI_PERSONA_ENCOUNTERS.length);
    expect(suite.summary).toBe(
      `${DEFAULT_PI_PERSONA_ENCOUNTERS.length}/${DEFAULT_PI_PERSONA_ENCOUNTERS.length} persona eval encounter(s) passed`,
    );
    expect(
      suite.results.find(
        (result) => result.encounter.encounter_id === "pi-encounter-prompt-injection",
      )?.driver_result.evaluator_summary,
    ).toMatchObject({
      outcome: "unsafe_tool_refusal",
    });

    for (const result of suite.results) {
      await expect(store.getRun(result.run.run_id)).resolves.toMatchObject({
        run: { run_id: result.run.run_id, status: "passed" },
        agent_invocations: result.agent_invocations,
      });
      expect(result.snapshot.agent_invocations).toEqual(result.agent_invocations);
      expect(result.snapshot.run.artifacts).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "agent_transcript" })]),
      );
    }
  });

  it("keeps sample output deterministic and result-store backed", async () => {
    const sample = JSON.parse(await runPiPersonaEvalScenarioSample()) as {
      encounter_count: number;
      persisted_eval_runs: number;
      outcomes: Record<string, number>;
      trend_summary: {
        eval_run_count: number;
        total_cost_usd: number;
        average_latency_ms: number;
        total_tokens: number;
        tool_refusal_count: number;
        outcomes: Record<string, number>;
      };
    };

    expect(sample.encounter_count).toBe(DEFAULT_PI_PERSONA_ENCOUNTERS.length);
    expect(sample.persisted_eval_runs).toBe(DEFAULT_PI_PERSONA_ENCOUNTERS.length);
    expect(sample.outcomes.strong_match).toBe(1);
    expect(sample.outcomes.unsafe_tool_refusal).toBe(1);
    expect(sample.outcomes.privacy_refusal).toBe(1);
    expect(sample.trend_summary).toMatchObject({
      eval_run_count: DEFAULT_PI_PERSONA_ENCOUNTERS.length,
      average_latency_ms: 1250,
      tool_refusal_count: 2,
      outcomes: sample.outcomes,
    });
    expect(sample.trend_summary.total_cost_usd).toBeGreaterThan(0);
    expect(sample.trend_summary.total_tokens).toBeGreaterThan(0);
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "pi-persona-eval-test-"));
    directories.push(directory);
    return directory;
  }
});
