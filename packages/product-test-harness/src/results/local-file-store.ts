import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  ProductResultRunSummary,
  ProductResultStore,
  ProductResultStoreFilters,
  ProductResultStoreSaveResult,
  ProductResultStoreSnapshot,
} from "../contracts.js";
import {
  assertValidProductResultStoreSnapshot,
  ProductResultStoreError,
  stableSnapshotString,
  summarizeProductResultRun,
} from "./store.js";

export interface LocalFileProductResultStoreOptions {
  readonly directory: string;
}

export class LocalFileProductResultStore implements ProductResultStore {
  constructor(private readonly options: LocalFileProductResultStoreOptions) {}

  async saveRun(snapshot: ProductResultStoreSnapshot): Promise<ProductResultStoreSaveResult> {
    assertValidProductResultStoreSnapshot(snapshot);
    await mkdir(this.options.directory, { recursive: true });

    const filePath = this.filePath(snapshot.run.run_id);
    const existing = await this.getRun(snapshot.run.run_id);
    if (existing) {
      if (stableSnapshotString(existing) === stableSnapshotString(snapshot)) {
        return { run_id: snapshot.run.run_id, created: false, idempotent: true };
      }
      throw new ProductResultStoreError(
        `Run ${snapshot.run.run_id} already exists with different content`,
        "duplicate_conflict",
      );
    }

    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const payload = `${JSON.stringify(snapshot, null, 2)}\n`;
    try {
      await writeFile(tempPath, payload, "utf8");
      await rename(tempPath, filePath);
    } catch (error) {
      throw new ProductResultStoreError(
        `Failed to persist run ${snapshot.run.run_id}: ${stringifyError(error)}`,
        "write_failed",
      );
    }
    return { run_id: snapshot.run.run_id, created: true, idempotent: false };
  }

  async getRun(runId: string): Promise<ProductResultStoreSnapshot | undefined> {
    try {
      const payload = await readFile(this.filePath(runId), "utf8");
      return JSON.parse(payload) as ProductResultStoreSnapshot;
    } catch (error) {
      if (isNotFound(error)) return undefined;
      throw new ProductResultStoreError(
        `Failed to read run ${runId}: ${stringifyError(error)}`,
        "read_failed",
      );
    }
  }

  async listRuns(
    filters: ProductResultStoreFilters = {},
  ): Promise<readonly ProductResultRunSummary[]> {
    const snapshots = await this.readSnapshots();
    const summaries = snapshots
      .filter((snapshot) => matchesFilters(snapshot, filters))
      .map(summarizeProductResultRun)
      .sort(compareNewestFirst);
    return typeof filters.limit === "number" ? summaries.slice(0, filters.limit) : summaries;
  }

  private filePath(runId: string): string {
    return path.join(this.options.directory, `${encodeURIComponent(runId)}.json`);
  }

  private async readSnapshots(): Promise<ProductResultStoreSnapshot[]> {
    let names: string[];
    try {
      names = await readdir(this.options.directory);
    } catch (error) {
      if (isNotFound(error)) return [];
      throw new ProductResultStoreError(
        `Failed to list result store: ${stringifyError(error)}`,
        "read_failed",
      );
    }
    const snapshots = await Promise.all(
      names
        .filter((name) => name.endsWith(".json"))
        .map(async (name) => {
          const payload = await readFile(path.join(this.options.directory, name), "utf8");
          return JSON.parse(payload) as ProductResultStoreSnapshot;
        }),
    );
    return snapshots;
  }
}

function matchesFilters(
  snapshot: ProductResultStoreSnapshot,
  filters: ProductResultStoreFilters,
): boolean {
  if (filters.mode && snapshot.run.scenario.mode !== filters.mode) return false;
  if (filters.status && snapshot.run.status !== filters.status) return false;
  if (filters.scenario_id && snapshot.run.scenario.scenario_id !== filters.scenario_id) {
    return false;
  }
  if (filters.environment_label && snapshot.run.environment.label !== filters.environment_label) {
    return false;
  }
  if (filters.git_ref && snapshot.run.git?.ref !== filters.git_ref) return false;
  if (filters.started_after && snapshot.run.started_at < filters.started_after) return false;
  if (filters.started_before && snapshot.run.started_at > filters.started_before) return false;
  return true;
}

function compareNewestFirst(left: ProductResultRunSummary, right: ProductResultRunSummary): number {
  return (
    right.started_at.localeCompare(left.started_at) ||
    right.created_at.localeCompare(left.created_at) ||
    right.run_id.localeCompare(left.run_id)
  );
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
