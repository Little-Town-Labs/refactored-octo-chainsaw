import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  DEFAULT_OBSERVABILITY_GATES,
  LocalFileProductResultStore,
  OBSERVABILITY_GATE_IDS,
  assertLogSafety,
  evaluateIncidentEvidence,
  evaluateMonitoringSignal,
  evaluateSentryConfig,
  runDefaultObservabilityGateSuite,
  runObservabilityGate,
} from "../index.js";
import { runObservabilityGateScenarioSample } from "../samples/observability-gates.js";

describe("observability and incident gate scenarios", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("defines the required PTH08 observability gate registry", () => {
    expect(DEFAULT_OBSERVABILITY_GATES.map((gate) => gate.gate_id)).toEqual(OBSERVABILITY_GATE_IDS);
    expect(
      DEFAULT_OBSERVABILITY_GATES.every((gate) => gate.scenario_id.startsWith("observability.")),
    ).toBe(true);
    expect(DEFAULT_OBSERVABILITY_GATES).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gate_id: "audit-signal-coverage" }),
        expect.objectContaining({ gate_id: "monitoring-latency-cost" }),
        expect.objectContaining({ gate_id: "sentry-config-readiness" }),
        expect.objectContaining({ gate_id: "incident-readiness" }),
        expect.objectContaining({ gate_id: "unsafe-log-rejection" }),
      ]),
    );
  });

  it("validates monitoring budgets, Sentry-style config, and incident readiness", () => {
    expect(
      evaluateMonitoringSignal({
        signal_id: "mon-test-latency",
        signal_type: "monitoring",
        status: "passed",
        severity: "major",
        observed_at: "2026-05-27T14:00:00.000Z",
        evidence_refs: ["monitoring://test/latency"],
        metric_name: "alpha_gate_latency_ms",
        value: 425,
        unit: "ms",
        budget: 500,
        comparison: "max",
      }),
    ).toMatchObject({ status: "passed" });
    expect(
      evaluateMonitoringSignal({
        signal_id: "mon-test-cost",
        signal_type: "monitoring",
        status: "passed",
        severity: "major",
        observed_at: "2026-05-27T14:00:00.000Z",
        evidence_refs: ["monitoring://test/cost"],
        metric_name: "alpha_gate_cost_usd",
        value: 2.5,
        unit: "usd",
        budget: 1,
        comparison: "max",
      }),
    ).toMatchObject({ status: "failed", reason_code: "budget_exceeded" });
    expect(
      evaluateSentryConfig({
        signal_id: "sentry-test",
        signal_type: "sentry",
        status: "passed",
        severity: "major",
        observed_at: "2026-05-27T14:00:00.000Z",
        evidence_refs: ["sentry://test/config"],
        release: "spyglass@alpha",
        environment: "preview",
        dsn_ref: "sentry-dsn://redacted/alpha",
        traces_sample_rate: 0.2,
        enabled: true,
      }),
    ).toMatchObject({ status: "passed" });
    expect(
      evaluateIncidentEvidence({
        signal_id: "incident-test",
        signal_type: "incident",
        status: "passed",
        severity: "blocker",
        observed_at: "2026-05-27T14:00:00.000Z",
        evidence_refs: ["incident://test/evidence"],
        incident_ref: "incident://synthetic/test",
        incident_severity: "sev1",
        owner_ref: "operator://oncall/alpha",
        trigger_refs: ["monitoring://test/latency"],
        response_status: "acknowledged",
      }),
    ).toMatchObject({ status: "passed" });
  });

  it("rejects unsafe log and metadata content with deterministic paths", () => {
    expect(
      assertLogSafety({
        message: "synthetic operation completed",
        metadata: { nested: { token: "secret-token-value" } },
      }),
    ).toEqual({
      valid: false,
      reason_code: "unsafe_key",
      forbidden_paths: ["$.metadata.nested.token"],
    });
    expect(
      assertLogSafety({
        message: "db=postgres://user:pass@example.test/spyglass",
      }),
    ).toEqual({
      valid: false,
      reason_code: "database_url",
      forbidden_paths: ["$.message"],
    });
  });

  it("runs and persists the default observability gate suite", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });

    const suite = await runDefaultObservabilityGateSuite({ store });

    expect(suite.results).toHaveLength(DEFAULT_OBSERVABILITY_GATES.length);
    expect(suite.summary).toBe(
      `${DEFAULT_OBSERVABILITY_GATES.length}/${DEFAULT_OBSERVABILITY_GATES.length} observability gate(s) passed`,
    );
    expect(
      suite.results.find((result) => result.gate.gate_id === "unsafe-log-rejection")
        ?.evaluations[0],
    ).toMatchObject({
      status: "passed",
      reason_code: "unsafe_key",
    });

    for (const result of suite.results) {
      await expect(store.getRun(result.run.run_id)).resolves.toMatchObject({
        run: { run_id: result.run.run_id, status: "passed" },
        observability_assertions: result.observability_assertions,
      });
      expect(result.snapshot.observability_assertions).toEqual(result.observability_assertions);
      expect(result.snapshot.observability_assertions.length).toBeGreaterThan(0);
    }
    await expect(store.listRuns({ mode: "gate", status: "passed" })).resolves.toHaveLength(
      DEFAULT_OBSERVABILITY_GATES.length,
    );
  });

  it("keeps individual gate snapshots and sample output persistable", async () => {
    const gate = DEFAULT_OBSERVABILITY_GATES.find(
      (entry) => entry.gate_id === "sentry-config-readiness",
    );
    expect(gate).toBeDefined();

    const result = await runObservabilityGate(gate!, {
      run_id: "observability-gate-single",
    });
    const sample = JSON.parse(await runObservabilityGateScenarioSample()) as {
      gate_count: number;
      persisted_gate_runs: number;
    };

    expect(result.run.status).toBe("passed");
    expect(result.snapshot.observability_assertions).toEqual(result.observability_assertions);
    expect(sample.gate_count).toBe(DEFAULT_OBSERVABILITY_GATES.length);
    expect(sample.persisted_gate_runs).toBe(DEFAULT_OBSERVABILITY_GATES.length);
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "observability-gate-test-"));
    directories.push(directory);
    return directory;
  }
});
