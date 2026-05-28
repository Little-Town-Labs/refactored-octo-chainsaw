import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createProductResultStoreSnapshot,
  LocalFileProductArtifactStore,
  ProductArtifactStoreError,
  productArtifactChecksum,
  toRunArtifact,
  validateProductArtifactStorageInput,
  type ProductArtifactStorageInput,
  type ScenarioRunResult,
} from "../index.js";

describe("product artifact storage", () => {
  let directories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    );
    directories = [];
  });

  it("stores artifact bytes with durable metadata and RunArtifact compatibility", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductArtifactStore({
      directory,
      now: () => new Date("2026-05-28T15:30:00.000Z"),
    });

    const result = await store.saveArtifact(inputFor("run-1-report", '{"ok":true}'));

    expect(result).toMatchObject({
      created: true,
      idempotent: false,
      artifact: {
        artifact_id: "run-1-report",
        run_id: "run-1",
        scenario_id: "scenario.alpha",
        provider: "local_file",
        retention_class: "ci_artifact",
        size_bytes: 11,
        checksum: productArtifactChecksum('{"ok":true}'),
        created_at: "2026-05-28T15:30:00.000Z",
      },
    });
    await expect(readFile(path.join(directory, "run-1-report.bin"), "utf8")).resolves.toBe(
      '{"ok":true}',
    );

    const runArtifact = toRunArtifact(result.artifact);
    expect(runArtifact).toMatchObject({
      artifact_id: "run-1-report",
      type: "json",
      uri: "artifact://durable/local/run-1-report",
      checksum: result.artifact.checksum,
      metadata: {
        durable_storage: {
          provider: "local_file",
          retention_class: "ci_artifact",
          size_bytes: 11,
          created_at: "2026-05-28T15:30:00.000Z",
        },
      },
    });

    const snapshot = createProductResultStoreSnapshot({
      run: runFor("run-1", [runArtifact]),
      created_at: "2026-05-28T15:31:00.000Z",
    });
    expect(snapshot.run.artifacts).toEqual([runArtifact]);
  });

  it("loads artifact metadata without reading payload bytes into result snapshots", async () => {
    const store = new LocalFileProductArtifactStore({ directory: await tempDirectory() });
    const saved = await store.saveArtifact(inputFor("trace-1", new Uint8Array([1, 2, 3])));

    await expect(store.getArtifactMetadata("trace-1")).resolves.toEqual(saved.artifact);
  });

  it("accepts identical duplicate writes and rejects conflicting duplicates", async () => {
    const store = new LocalFileProductArtifactStore({ directory: await tempDirectory() });
    const input = inputFor("duplicate-report", "same");

    await expect(store.saveArtifact(input)).resolves.toMatchObject({ created: true });
    await expect(store.saveArtifact(input)).resolves.toMatchObject({
      created: false,
      idempotent: true,
      artifact: { artifact_id: "duplicate-report" },
    });
    await expect(
      store.saveArtifact(inputFor("duplicate-report", "different")),
    ).rejects.toMatchObject({ code: "duplicate_conflict" });
  });

  it("rejects unsafe input before creating local files", async () => {
    const directory = await tempDirectory();
    const store = new LocalFileProductArtifactStore({ directory });
    const unsafeInput = {
      ...inputFor("../unsafe", "payload"),
      metadata: { database_url: "postgres://user:pass@example.test/db" },
    };

    expect(
      validateProductArtifactStorageInput({ ...inputFor("empty", ""), content: "" }),
    ).toContain("artifact.content must be non-empty");
    await expect(store.saveArtifact(unsafeInput)).rejects.toThrow(ProductArtifactStoreError);
    await expect(readdir(directory)).resolves.toEqual([]);
  });

  it("requires a redaction note for sensitive synthetic artifact data", async () => {
    const store = new LocalFileProductArtifactStore({ directory: await tempDirectory() });

    await expect(
      store.saveArtifact({
        ...inputFor("synthetic-log", "synthetic sensitive payload"),
        redaction_status: "contains_sensitive_synthetic_data",
      }),
    ).rejects.toMatchObject({ code: "validation_failed" });

    await expect(
      store.saveArtifact({
        ...inputFor("synthetic-log", "synthetic sensitive payload"),
        redaction_status: "contains_sensitive_synthetic_data",
        redaction_note: "Synthetic payload retained for deterministic debugging.",
      }),
    ).resolves.toMatchObject({ created: true });
  });

  async function tempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(os.tmpdir(), "product-artifact-store-test-"));
    directories.push(directory);
    return directory;
  }
});

function inputFor(
  artifactId: string,
  content: ProductArtifactStorageInput["content"],
): ProductArtifactStorageInput {
  return {
    artifact_id: artifactId,
    run_id: "run-1",
    scenario_id: "scenario.alpha",
    label: "Run report",
    type: "json",
    content,
    content_type: "application/json",
    redaction_status: "not_required",
    retention_class: "ci_artifact",
    metadata: { report_version: "1" },
  };
}

function runFor(runId: string, artifacts: ScenarioRunResult["artifacts"]): ScenarioRunResult {
  return {
    run_id: runId,
    scenario: {
      scenario_id: "scenario.alpha",
      version: "1.0.0",
      title: "Alpha readiness scenario",
      mode: "gate",
    },
    environment: { label: "local" },
    started_at: "2026-05-28T15:30:00.000Z",
    ended_at: "2026-05-28T15:30:01.000Z",
    duration_ms: 1000,
    status: "passed",
    steps: [
      {
        step_id: "step-1",
        order: 1,
        name: "Exercise workflow",
        status: "passed",
        started_at: "2026-05-28T15:30:00.000Z",
        ended_at: "2026-05-28T15:30:01.000Z",
        duration_ms: 1000,
      },
    ],
    assertions: [
      {
        assertion_id: "assertion-1",
        name: "Outcome is captured",
        severity: "blocker",
        status: "passed",
        expected: "workflow evidence exists",
        actual: "workflow evidence exists",
      },
    ],
    artifacts,
    summary: "run passed",
  };
}
