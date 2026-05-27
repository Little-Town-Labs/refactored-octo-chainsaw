import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  ALPHA_GATE_SCENARIOS,
  LocalFileProductResultStore,
  runAlphaGateScenario,
  runAlphaGateSuite,
} from "../index.js";

describe("deterministic Alpha gate scenarios", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("defines the A1-A5 core Alpha gate scenario set", () => {
    expect(ALPHA_GATE_SCENARIOS.map((scenario) => scenario.scenario_id)).toEqual([
      "alpha.A1",
      "alpha.A2",
      "alpha.A3",
      "alpha.A4",
      "alpha.A5",
    ]);
    expect(ALPHA_GATE_SCENARIOS.every((scenario) => scenario.mode === "gate")).toBe(true);
  });

  it.each([
    ["A1", "allowed", undefined],
    ["A2", "blocked", "missing_consent"],
    ["A3", "blocked", "consent_withdrawn"],
    ["A4", "blocked", "human_review_required"],
    ["A5", "blocked", "jurisdiction_kill_switch"],
  ] as const)(
    "runs %s with the expected deterministic outcome",
    async (scenarioId, decision, reason) => {
      const result = await runAlphaGateScenario(scenarioId);

      expect(result.run.status).toBe("passed");
      expect(result.outcome.decision).toBe(decision);
      expect(result.outcome.block_reason).toBe(reason);
      expect(result.run.assertions.every((assertion) => assertion.status === "passed")).toBe(true);
      expect(result.snapshot.seed_records).toHaveLength(result.seed_bundle.entities.length);
      expect(result.snapshot.observability_assertions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            scenario_id: result.run.scenario.scenario_id,
            signal_type: "audit",
            status: "passed",
          }),
        ]),
      );
    },
  );

  it("asserts the happy path dossier, posture, audit, and privacy boundaries", async () => {
    const result = await runAlphaGateScenario("A1");

    expect(result.outcome).toMatchObject({
      decision: "allowed",
      alpha_posture: "informational_only",
      dossier: {
        status: "signed",
        signed: true,
        dispatch_blocked: false,
      },
      privacy: {
        forbidden_data_exposed: false,
      },
    });
    expect(result.outcome.audit_event_refs.length).toBeGreaterThan(0);
  });

  it("blocks denial paths without dispatching a new dossier", async () => {
    for (const scenarioId of ["A2", "A3", "A4", "A5"] as const) {
      const result = await runAlphaGateScenario(scenarioId);

      expect(result.outcome.decision).toBe("blocked");
      expect(result.outcome.dossier.dispatch_blocked).toBe(true);
      expect(result.outcome.dossier.status).not.toBe("signed");
      expect(result.outcome.audit_event_refs.length).toBeGreaterThan(0);
    }
  });

  it("exposes reviewer and jurisdiction failure evidence for A4 and A5", async () => {
    const humanReview = await runAlphaGateScenario("A4");
    const jurisdiction = await runAlphaGateScenario("A5");

    expect(humanReview.outcome.human_review).toMatchObject({
      required: true,
      reviewer_principal_ref: expect.stringContaining("seed://"),
      evidence_ref: "evidence://alpha/A4/human-review",
    });
    expect(jurisdiction.outcome.jurisdiction.failure_artifact_ref).toBe(
      "artifact://alpha/A5/jurisdiction-denial.json",
    );
    expect(jurisdiction.outcome.jurisdiction.failure_artifact_pii).toBe(false);
  });

  it("replays A1-A5 with stable run ids, seed records, and outcomes", async () => {
    const first = await runAlphaGateSuite();
    const second = await runAlphaGateSuite();

    expect(
      first.results.map((result) => ({
        run_id: result.run.run_id,
        scenario_id: result.run.scenario.scenario_id,
        outcome: result.outcome,
        seed_records: result.snapshot.seed_records,
      })),
    ).toEqual(
      second.results.map((result) => ({
        run_id: result.run.run_id,
        scenario_id: result.run.scenario.scenario_id,
        outcome: result.outcome,
        seed_records: result.snapshot.seed_records,
      })),
    );
  });

  it("persists and reloads all A1-A5 snapshots through the local result store", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });
    const suite = await runAlphaGateSuite({ store });

    expect(suite.results).toHaveLength(5);
    for (const result of suite.results) {
      await expect(store.getRun(result.run.run_id)).resolves.toMatchObject({
        run: { run_id: result.run.run_id, status: "passed" },
        seed_records: result.snapshot.seed_records,
      });
    }

    await expect(store.listRuns({ mode: "gate", status: "passed" })).resolves.toHaveLength(5);
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "alpha-gate-test-"));
    directories.push(directory);
    return directory;
  }
});
