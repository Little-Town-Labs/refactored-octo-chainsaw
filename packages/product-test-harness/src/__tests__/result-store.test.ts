import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProductResultStoreSnapshot,
  HarnessValidationError,
  LocalFileProductResultStore,
  NeonProductResultStore,
  productResultStoreSchemaSql,
  type ProductResultStoreSnapshot,
  type ProductResultStoreSqlClient,
  type ScenarioRunResult,
  validateProductResultStoreSchemaName,
} from "../index.js";

describe("product result store", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("saves and loads a valid run snapshot", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    const snapshot = snapshotFor("run-1", { status: "passed" });

    await expect(store.saveRun(snapshot)).resolves.toEqual({
      run_id: "run-1",
      created: true,
      idempotent: false,
    });

    await expect(store.getRun("run-1")).resolves.toEqual(snapshot);
  });

  it("preserves artifact contract fields and future evidence arrays", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    const snapshot = snapshotFor("run-artifacts", {
      artifacts: [
        {
          artifact_id: "json-report",
          label: "JSON report",
          type: "json",
          uri: "artifact://runs/run-artifacts/report.json",
          redaction_status: "not_required",
          checksum: "sha256:abc123",
          metadata: { report_version: "1" },
        },
        {
          artifact_id: "synthetic-log",
          label: "Synthetic log excerpt",
          type: "log_excerpt",
          uri: "artifact://runs/run-artifacts/log.txt",
          redaction_status: "contains_sensitive_synthetic_data",
          metadata: { redaction_note: "Synthetic user names retained for debugging." },
        },
      ],
      browser_artifacts: [
        {
          artifact_id: "trace-1",
          run_id: "run-artifacts",
          scenario_id: "scenario.alpha",
          kind: "trace",
          uri: "artifact://runs/run-artifacts/trace.zip",
          redaction_status: "redacted",
          checksum: "sha256:def456",
        },
      ],
    });

    await store.saveRun(snapshot);
    const loaded = await store.getRun("run-artifacts");

    expect(loaded?.run.artifacts).toEqual(snapshot.run.artifacts);
    expect(loaded?.browser_artifacts).toEqual(snapshot.browser_artifacts);
    expect(loaded?.agent_invocations).toEqual([]);
    expect(loaded?.webhook_captures).toEqual([]);
    expect(loaded?.observability_assertions).toEqual([]);
  });

  it("filters stored runs by mode, status, scenario, environment, git ref, and time", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    await store.saveRun(
      snapshotFor("run-old-failed", {
        status: "failed",
        mode: "gate",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:00:00.000Z",
      }),
    );
    await store.saveRun(
      snapshotFor("run-new-failed", {
        status: "failed",
        mode: "gate",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:05:00.000Z",
      }),
    );
    await store.saveRun(
      snapshotFor("run-eval", {
        status: "failed",
        mode: "eval",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:10:00.000Z",
      }),
    );
    await store.saveRun(
      snapshotFor("run-other-scenario", {
        status: "failed",
        mode: "gate",
        scenario_id: "scenario.beta",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:15:00.000Z",
      }),
    );

    const summaries = await store.listRuns({
      mode: "gate",
      status: "failed",
      scenario_id: "scenario.alpha",
      environment_label: "preview",
      git_ref: "feature/a",
      started_after: "2026-05-27T11:59:59.000Z",
      started_before: "2026-05-27T12:06:00.000Z",
    });

    expect(summaries.map((summary) => summary.run_id)).toEqual([
      "run-new-failed",
      "run-old-failed",
    ]);
    expect(summaries[0]).toMatchObject({
      scenario_id: "scenario.alpha",
      mode: "gate",
      status: "failed",
      environment_label: "preview",
      git_ref: "feature/a",
      artifact_count: 1,
      assertion_count: 1,
      step_count: 1,
    });
  });

  it("returns an empty list when filters have no matches", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    await store.saveRun(snapshotFor("run-1", { status: "passed" }));

    await expect(store.listRuns({ status: "failed" })).resolves.toEqual([]);
  });

  it("rejects raw database URLs before persistence", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });
    const base = snapshotFor("run-unsafe", { status: "passed" });
    const snapshot = {
      ...base,
      run: {
        ...base.run,
        metadata: { unsafe: "postgres://user:pass@example.test/db" },
      },
    } as ProductResultStoreSnapshot;

    await expect(store.saveRun(snapshot)).rejects.toThrow(HarnessValidationError);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("requires a redaction note for sensitive synthetic artifact data", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    const base = snapshotFor("run-sensitive-artifact", { status: "passed" });
    const snapshot = {
      ...base,
      run: {
        ...base.run,
        artifacts: [
          {
            artifact_id: "synthetic-log",
            label: "Synthetic log excerpt",
            type: "log_excerpt",
            uri: "artifact://runs/run-sensitive-artifact/log.txt",
            redaction_status: "contains_sensitive_synthetic_data",
          },
        ],
      },
    } as ProductResultStoreSnapshot;

    await expect(store.saveRun(snapshot)).rejects.toThrow(HarnessValidationError);
  });

  it("accepts identical duplicate writes and rejects conflicting duplicate writes", async () => {
    const store = new LocalFileProductResultStore({ directory: await tempDirectory() });
    const snapshot = snapshotFor("run-duplicate", { status: "passed" });

    await expect(store.saveRun(snapshot)).resolves.toMatchObject({ created: true });
    await expect(store.saveRun(snapshot)).resolves.toEqual({
      run_id: "run-duplicate",
      created: false,
      idempotent: true,
    });
    await expect(
      store.saveRun(snapshotFor("run-duplicate", { status: "failed" })),
    ).rejects.toMatchObject({ code: "duplicate_conflict" });
  });

  it("does not partially write invalid snapshots", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductResultStore({ directory });
    const snapshot = {
      ...snapshotFor("run-invalid", { status: "passed" }),
      run: {
        ...snapshotFor("run-invalid", { status: "passed" }).run,
        steps: [],
      },
    } as ProductResultStoreSnapshot;

    await expect(store.saveRun(snapshot)).rejects.toThrow(HarnessValidationError);
    await expect(store.getRun("run-invalid")).resolves.toBeUndefined();
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("initializes Neon result storage in the isolated test_harness schema", async () => {
    const client = new FakeProductResultStoreSqlClient();
    const store = new NeonProductResultStore({ client });

    await store.ensureSchema();

    expect(client.queries[0]).toContain('CREATE SCHEMA IF NOT EXISTS "test_harness"');
    expect(client.queries.join("\n")).toContain('"test_harness"."product_result_runs"');
    expect(productResultStoreSchemaSql()).toContain('CREATE TABLE IF NOT EXISTS "test_harness"');
  });

  it("rejects production-like Neon result store schemas", () => {
    expect(() => validateProductResultStoreSchemaName("public")).toThrow("isolated");
    expect(
      () =>
        new NeonProductResultStore({
          client: new FakeProductResultStoreSqlClient(),
          schema: "prod",
        }),
    ).toThrow("isolated");
    expect(
      () =>
        new NeonProductResultStore({
          client: new FakeProductResultStoreSqlClient(),
          schema: "test_harness;drop",
        }),
    ).toThrow("Unsafe");
  });

  it("saves, loads, filters, and limits Neon-backed result snapshots", async () => {
    const client = new FakeProductResultStoreSqlClient();
    const store = new NeonProductResultStore({ client });
    await store.saveRun(
      snapshotFor("run-old-failed", {
        status: "failed",
        mode: "gate",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:00:00.000Z",
      }),
    );
    const newest = snapshotFor("run-new-failed", {
      status: "failed",
      mode: "gate",
      scenario_id: "scenario.alpha",
      environment_label: "preview",
      git_ref: "feature/a",
      started_at: "2026-05-27T12:05:00.000Z",
    });
    await store.saveRun(newest);
    await store.saveRun(
      snapshotFor("run-eval", {
        status: "failed",
        mode: "eval",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_at: "2026-05-27T12:10:00.000Z",
      }),
    );

    await expect(store.getRun("run-new-failed")).resolves.toEqual(newest);
    await expect(
      store.listRuns({
        mode: "gate",
        status: "failed",
        scenario_id: "scenario.alpha",
        environment_label: "preview",
        git_ref: "feature/a",
        started_after: "2026-05-27T11:59:59.000Z",
        started_before: "2026-05-27T12:06:00.000Z",
        limit: 1,
      }),
    ).resolves.toMatchObject([
      {
        run_id: "run-new-failed",
        scenario_id: "scenario.alpha",
        mode: "gate",
        status: "failed",
        environment_label: "preview",
        git_ref: "feature/a",
        artifact_count: 1,
        assertion_count: 1,
        step_count: 1,
      },
    ]);
  });

  it("accepts identical Neon duplicate writes and rejects conflicting duplicates", async () => {
    const store = new NeonProductResultStore({ client: new FakeProductResultStoreSqlClient() });
    const snapshot = snapshotFor("run-neon-duplicate", { status: "passed" });

    await expect(store.saveRun(snapshot)).resolves.toMatchObject({ created: true });
    await expect(store.saveRun(snapshot)).resolves.toEqual({
      run_id: "run-neon-duplicate",
      created: false,
      idempotent: true,
    });
    await expect(
      store.saveRun(snapshotFor("run-neon-duplicate", { status: "failed" })),
    ).rejects.toMatchObject({ code: "duplicate_conflict" });
  });

  it("rejects invalid Neon snapshots before opening SQL writes", async () => {
    const client = new FakeProductResultStoreSqlClient();
    const store = new NeonProductResultStore({ client });
    const base = snapshotFor("run-neon-invalid", { status: "passed" });
    const snapshot = {
      ...base,
      run: {
        ...base.run,
        metadata: { unsafe: "postgres://user:pass@example.test/db" },
      },
    } as ProductResultStoreSnapshot;

    await expect(store.saveRun(snapshot)).rejects.toThrow(HarnessValidationError);
    expect(client.queries).toEqual([]);
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "product-result-store-test-"));
    directories.push(directory);
    return directory;
  }
});

class FakeProductResultStoreSqlClient implements ProductResultStoreSqlClient {
  readonly queries: string[] = [];
  private readonly rows = new Map<string, FakeProductResultStoreRow>();

  async query<T = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: readonly T[] }> {
    this.queries.push(text);
    const normalized = text.replace(/\s+/g, " ").trim();

    if (normalized.startsWith("CREATE ")) return { rows: [] };

    if (normalized.startsWith("SELECT snapshot_hash")) {
      const row = this.rows.get(String(values[0]));
      return { rows: (row ? [{ snapshot_hash: row.snapshot_hash }] : []) as T[] };
    }

    if (normalized.startsWith("INSERT INTO")) {
      const runId = String(values[0]);
      if (this.rows.has(runId)) return { rows: [] };
      this.rows.set(runId, {
        run_id: runId,
        schema_version: String(values[1]),
        scenario_id: String(values[2]),
        scenario_version: String(values[3]),
        mode: String(values[4]) as ScenarioRunResult["scenario"]["mode"],
        status: String(values[5]) as ScenarioRunResult["status"],
        environment_label: String(values[6]),
        git_ref: values[7] ? String(values[7]) : null,
        git_sha: values[8] ? String(values[8]) : null,
        started_at: String(values[9]),
        ended_at: String(values[10]),
        created_at: String(values[11]),
        summary: String(values[12]),
        artifact_count: Number(values[13]),
        assertion_count: Number(values[14]),
        step_count: Number(values[15]),
        snapshot_hash: String(values[16]),
        snapshot: JSON.parse(String(values[17])) as ProductResultStoreSnapshot,
      });
      return { rows: [{ run_id: runId }] as T[] };
    }

    if (normalized.startsWith("SELECT snapshot FROM")) {
      const row = this.rows.get(String(values[0]));
      return { rows: (row ? [{ snapshot: row.snapshot }] : []) as T[] };
    }

    if (normalized.startsWith("SELECT run_id,")) {
      return {
        rows: this.filterRows(normalized, values).map(
          ({ snapshot: _snapshot, ...row }) => row,
        ) as T[],
      };
    }

    throw new Error(`Unexpected SQL: ${normalized}`);
  }

  private filterRows(sql: string, values: readonly unknown[]): FakeProductResultStoreRow[] {
    let rows = Array.from(this.rows.values());
    let index = 0;
    if (sql.includes("mode = $")) {
      rows = rows.filter((row) => row.mode === values[index]);
      index += 1;
    }
    if (sql.includes("status = $")) {
      rows = rows.filter((row) => row.status === values[index]);
      index += 1;
    }
    if (sql.includes("scenario_id = $")) {
      rows = rows.filter((row) => row.scenario_id === values[index]);
      index += 1;
    }
    if (sql.includes("environment_label = $")) {
      rows = rows.filter((row) => row.environment_label === values[index]);
      index += 1;
    }
    if (sql.includes("git_ref = $")) {
      rows = rows.filter((row) => row.git_ref === values[index]);
      index += 1;
    }
    if (sql.includes("started_at >= $")) {
      rows = rows.filter((row) => row.started_at >= String(values[index]));
      index += 1;
    }
    if (sql.includes("started_at <= $")) {
      rows = rows.filter((row) => row.started_at <= String(values[index]));
      index += 1;
    }
    rows.sort(
      (left, right) =>
        right.started_at.localeCompare(left.started_at) ||
        right.created_at.localeCompare(left.created_at) ||
        right.run_id.localeCompare(left.run_id),
    );
    if (sql.includes(" LIMIT $")) rows = rows.slice(0, Number(values[index]));
    return rows;
  }
}

interface FakeProductResultStoreRow {
  readonly run_id: string;
  readonly schema_version: string;
  readonly scenario_id: string;
  readonly scenario_version: string;
  readonly mode: ScenarioRunResult["scenario"]["mode"];
  readonly status: ScenarioRunResult["status"];
  readonly environment_label: string;
  readonly git_ref: string | null;
  readonly git_sha: string | null;
  readonly started_at: string;
  readonly ended_at: string;
  readonly created_at: string;
  readonly summary: string;
  readonly artifact_count: number;
  readonly assertion_count: number;
  readonly step_count: number;
  readonly snapshot_hash: string;
  readonly snapshot: ProductResultStoreSnapshot;
}

function snapshotFor(
  runId: string,
  options: Partial<{
    status: ScenarioRunResult["status"];
    mode: ScenarioRunResult["scenario"]["mode"];
    scenario_id: string;
    environment_label: string;
    git_ref: string;
    started_at: string;
    artifacts: ScenarioRunResult["artifacts"];
    browser_artifacts: ProductResultStoreSnapshot["browser_artifacts"];
  }>,
): ProductResultStoreSnapshot {
  const startedAt = options.started_at ?? "2026-05-27T12:00:00.000Z";
  const run: ScenarioRunResult = {
    run_id: runId,
    scenario: {
      scenario_id: options.scenario_id ?? "scenario.alpha",
      version: "1.0.0",
      title: "Alpha readiness scenario",
      mode: options.mode ?? "gate",
    },
    environment: { label: options.environment_label ?? "local" },
    git: { ref: options.git_ref ?? "main", sha: "abc123" },
    started_at: startedAt,
    ended_at: new Date(Date.parse(startedAt) + 1000).toISOString(),
    duration_ms: 1000,
    status: options.status ?? "passed",
    steps: [
      {
        step_id: "step-1",
        order: 1,
        name: "Exercise workflow",
        status: options.status === "failed" ? "failed" : "passed",
        started_at: startedAt,
        ended_at: new Date(Date.parse(startedAt) + 1000).toISOString(),
        duration_ms: 1000,
      },
    ],
    assertions: [
      {
        assertion_id: "assertion-1",
        name: "Outcome is captured",
        severity: "blocker",
        status: options.status === "failed" ? "failed" : "passed",
        expected: "workflow evidence exists",
        actual:
          options.status === "failed" ? "workflow evidence missing" : "workflow evidence exists",
      },
    ],
    artifacts: options.artifacts ?? [
      {
        artifact_id: `${runId}-report`,
        label: "Run report",
        type: "json",
        uri: `artifact://runs/${runId}/report.json`,
        redaction_status: "not_required",
      },
    ],
    summary: `${runId} ${options.status ?? "passed"}`,
  };

  return createProductResultStoreSnapshot({
    run,
    created_at: new Date(Date.parse(startedAt) + 2000).toISOString(),
    seed_records: [
      {
        seed_id: `${runId}-seed`,
        seed_version: "fixture-v1",
        entity_type: "scenario_fixture",
        entity_ref: `fixture://${runId}`,
        scenario_id: run.scenario.scenario_id,
      },
    ],
    browser_artifacts: options.browser_artifacts,
  });
}
