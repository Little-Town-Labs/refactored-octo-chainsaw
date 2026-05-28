import { createHash } from "node:crypto";

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

export const DEFAULT_PRODUCT_RESULT_STORE_SCHEMA = "test_harness";
export const PRODUCT_RESULT_RUNS_TABLE = "product_result_runs";

export interface ProductResultStoreSqlResult<T> {
  readonly rows: readonly T[];
}

export interface ProductResultStoreSqlClient {
  query<T = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<ProductResultStoreSqlResult<T>>;
}

export interface NeonProductResultStoreOptions {
  readonly client: ProductResultStoreSqlClient;
  readonly schema?: string;
  readonly createSchema?: boolean;
}

interface ProductResultRunRow {
  readonly run_id: string;
  readonly scenario_id: string;
  readonly scenario_version: string;
  readonly mode: ProductResultRunSummary["mode"];
  readonly status: ProductResultRunSummary["status"];
  readonly environment_label: string;
  readonly git_ref: string | null;
  readonly git_sha: string | null;
  readonly started_at: string | Date;
  readonly ended_at: string | Date;
  readonly created_at: string | Date;
  readonly summary: string;
  readonly artifact_count: number;
  readonly assertion_count: number;
  readonly step_count: number;
}

interface StoredSnapshotRow {
  readonly snapshot: unknown;
}

interface SnapshotHashRow {
  readonly snapshot_hash: string;
}

export class NeonProductResultStore implements ProductResultStore {
  readonly schema: string;
  private readonly tableName: string;
  private readonly createSchema: boolean;
  private schemaReady: Promise<void> | undefined;

  constructor(private readonly options: NeonProductResultStoreOptions) {
    this.schema = validateProductResultStoreSchemaName(
      options.schema ?? DEFAULT_PRODUCT_RESULT_STORE_SCHEMA,
    );
    this.tableName = `${quoteIdentifier(this.schema)}.${quoteIdentifier(PRODUCT_RESULT_RUNS_TABLE)}`;
    this.createSchema = options.createSchema ?? true;
  }

  async ensureSchema(): Promise<void> {
    await this.ensureSchemaInternal();
  }

  async saveRun(snapshot: ProductResultStoreSnapshot): Promise<ProductResultStoreSaveResult> {
    assertValidProductResultStoreSnapshot(snapshot);
    if (this.createSchema) await this.ensureSchemaInternal();

    const summary = summarizeProductResultRun(snapshot);
    const snapshotHash = hashSnapshot(snapshot);

    try {
      const existing = await this.options.client.query<SnapshotHashRow>(
        `SELECT snapshot_hash FROM ${this.tableName} WHERE run_id = $1`,
        [snapshot.run.run_id],
      );
      const existingHash = existing.rows[0]?.snapshot_hash;
      if (existingHash) return duplicateResult(snapshot.run.run_id, existingHash, snapshotHash);

      const inserted = await this.options.client.query<{ run_id: string }>(
        `INSERT INTO ${this.tableName} (
          run_id,
          schema_version,
          scenario_id,
          scenario_version,
          mode,
          status,
          environment_label,
          git_ref,
          git_sha,
          started_at,
          ended_at,
          created_at,
          summary,
          artifact_count,
          assertion_count,
          step_count,
          snapshot_hash,
          snapshot
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11::timestamptz,
          $12::timestamptz, $13, $14, $15, $16, $17, $18::jsonb
        )
        ON CONFLICT (run_id) DO NOTHING
        RETURNING run_id`,
        [
          snapshot.run.run_id,
          snapshot.schema_version,
          summary.scenario_id,
          summary.scenario_version,
          summary.mode,
          summary.status,
          summary.environment_label,
          summary.git_ref ?? null,
          summary.git_sha ?? null,
          summary.started_at,
          summary.ended_at,
          summary.created_at,
          summary.summary,
          summary.artifact_count,
          summary.assertion_count,
          summary.step_count,
          snapshotHash,
          JSON.stringify(snapshot),
        ],
      );
      if (inserted.rows.length > 0) {
        return { run_id: snapshot.run.run_id, created: true, idempotent: false };
      }

      const raced = await this.options.client.query<SnapshotHashRow>(
        `SELECT snapshot_hash FROM ${this.tableName} WHERE run_id = $1`,
        [snapshot.run.run_id],
      );
      return duplicateResult(snapshot.run.run_id, raced.rows[0]?.snapshot_hash, snapshotHash);
    } catch (error) {
      if (error instanceof ProductResultStoreError) throw error;
      throw new ProductResultStoreError(
        `Failed to persist run ${snapshot.run.run_id}: ${stringifyError(error)}`,
        "write_failed",
      );
    }
  }

  async getRun(runId: string): Promise<ProductResultStoreSnapshot | undefined> {
    if (this.createSchema) await this.ensureSchemaInternal();

    try {
      const result = await this.options.client.query<StoredSnapshotRow>(
        `SELECT snapshot FROM ${this.tableName} WHERE run_id = $1`,
        [runId],
      );
      const row = result.rows[0];
      if (!row) return undefined;
      return parseSnapshot(row.snapshot);
    } catch (error) {
      if (error instanceof ProductResultStoreError) throw error;
      throw new ProductResultStoreError(
        `Failed to read run ${runId}: ${stringifyError(error)}`,
        "read_failed",
      );
    }
  }

  async listRuns(
    filters: ProductResultStoreFilters = {},
  ): Promise<readonly ProductResultRunSummary[]> {
    if (this.createSchema) await this.ensureSchemaInternal();

    const clauses: string[] = [];
    const values: unknown[] = [];
    addFilter(clauses, values, "mode", filters.mode);
    addFilter(clauses, values, "status", filters.status);
    addFilter(clauses, values, "scenario_id", filters.scenario_id);
    addFilter(clauses, values, "environment_label", filters.environment_label);
    addFilter(clauses, values, "git_ref", filters.git_ref);
    addDateFilter(clauses, values, "started_at", ">=", filters.started_after);
    addDateFilter(clauses, values, "started_at", "<=", filters.started_before);

    let sql = `SELECT
      run_id,
      scenario_id,
      scenario_version,
      mode,
      status,
      environment_label,
      git_ref,
      git_sha,
      started_at,
      ended_at,
      created_at,
      summary,
      artifact_count,
      assertion_count,
      step_count
    FROM ${this.tableName}`;
    if (clauses.length > 0) sql += ` WHERE ${clauses.join(" AND ")}`;
    sql += " ORDER BY started_at DESC, created_at DESC, run_id DESC";
    if (typeof filters.limit === "number") {
      values.push(filters.limit);
      sql += ` LIMIT $${values.length}`;
    }

    try {
      const result = await this.options.client.query<ProductResultRunRow>(sql, values);
      return result.rows.map(rowToSummary);
    } catch (error) {
      throw new ProductResultStoreError(
        `Failed to list result store: ${stringifyError(error)}`,
        "read_failed",
      );
    }
  }

  private ensureSchemaInternal(): Promise<void> {
    this.schemaReady ??= createSchema(this.options.client, this.schema, this.tableName);
    return this.schemaReady;
  }
}

export function validateProductResultStoreSchemaName(schema: string): string {
  const normalized = schema.trim();
  if (!/^[a-z_][a-z0-9_]*$/.test(normalized)) {
    throw new ProductResultStoreError(
      `Unsafe product result store schema name: ${schema}`,
      "validation_failed",
    );
  }
  if (PRODUCTION_LIKE_SCHEMAS.has(normalized)) {
    throw new ProductResultStoreError(
      `Product result store schema must be isolated from production schemas: ${schema}`,
      "validation_failed",
    );
  }
  return normalized;
}

export function productResultStoreSchemaSql(schema = DEFAULT_PRODUCT_RESULT_STORE_SCHEMA): string {
  const safeSchema = validateProductResultStoreSchemaName(schema);
  const tableName = `${quoteIdentifier(safeSchema)}.${quoteIdentifier(PRODUCT_RESULT_RUNS_TABLE)}`;
  return [
    `CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(safeSchema)}`,
    createTableSql(tableName),
    createIndexSql(
      "product_result_runs_started_at_idx",
      tableName,
      "started_at DESC, created_at DESC, run_id DESC",
    ),
    createIndexSql("product_result_runs_scenario_idx", tableName, "scenario_id, started_at DESC"),
    createIndexSql(
      "product_result_runs_mode_status_idx",
      tableName,
      "mode, status, started_at DESC",
    ),
    createIndexSql(
      "product_result_runs_environment_idx",
      tableName,
      "environment_label, started_at DESC",
    ),
    createIndexSql("product_result_runs_git_ref_idx", tableName, "git_ref, started_at DESC"),
  ].join(";\n\n");
}

const PRODUCTION_LIKE_SCHEMAS = new Set([
  "app",
  "auth",
  "main",
  "prod",
  "production",
  "public",
  "spyglass",
]);

async function createSchema(
  client: ProductResultStoreSqlClient,
  schema: string,
  tableName: string,
): Promise<void> {
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(schema)}`);
    await client.query(createTableSql(tableName));
    await client.query(
      createIndexSql(
        "product_result_runs_started_at_idx",
        tableName,
        "started_at DESC, created_at DESC, run_id DESC",
      ),
    );
    await client.query(
      createIndexSql("product_result_runs_scenario_idx", tableName, "scenario_id, started_at DESC"),
    );
    await client.query(
      createIndexSql(
        "product_result_runs_mode_status_idx",
        tableName,
        "mode, status, started_at DESC",
      ),
    );
    await client.query(
      createIndexSql(
        "product_result_runs_environment_idx",
        tableName,
        "environment_label, started_at DESC",
      ),
    );
    await client.query(
      createIndexSql("product_result_runs_git_ref_idx", tableName, "git_ref, started_at DESC"),
    );
  } catch (error) {
    throw new ProductResultStoreError(
      `Failed to initialize product result store schema ${schema}: ${stringifyError(error)}`,
      "write_failed",
    );
  }
}

function createTableSql(tableName: string): string {
  return `CREATE TABLE IF NOT EXISTS ${tableName} (
    run_id text PRIMARY KEY,
    schema_version text NOT NULL,
    scenario_id text NOT NULL,
    scenario_version text NOT NULL,
    mode text NOT NULL,
    status text NOT NULL,
    environment_label text NOT NULL,
    git_ref text,
    git_sha text,
    started_at timestamptz NOT NULL,
    ended_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL,
    summary text NOT NULL,
    artifact_count integer NOT NULL,
    assertion_count integer NOT NULL,
    step_count integer NOT NULL,
    snapshot_hash text NOT NULL,
    snapshot jsonb NOT NULL
  )`;
}

function createIndexSql(name: string, tableName: string, columns: string): string {
  return `CREATE INDEX IF NOT EXISTS ${quoteIdentifier(name)} ON ${tableName} (${columns})`;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function hashSnapshot(snapshot: ProductResultStoreSnapshot): string {
  return `sha256:${createHash("sha256").update(stableSnapshotString(snapshot)).digest("hex")}`;
}

function duplicateResult(
  runId: string,
  existingHash: string | undefined,
  incomingHash: string,
): ProductResultStoreSaveResult {
  if (existingHash === incomingHash) return { run_id: runId, created: false, idempotent: true };
  throw new ProductResultStoreError(
    `Run ${runId} already exists with different content`,
    "duplicate_conflict",
  );
}

function parseSnapshot(value: unknown): ProductResultStoreSnapshot {
  const snapshot = typeof value === "string" ? JSON.parse(value) : value;
  assertValidProductResultStoreSnapshot(snapshot as ProductResultStoreSnapshot);
  return snapshot as ProductResultStoreSnapshot;
}

function addFilter(
  clauses: string[],
  values: unknown[],
  column: string,
  value: string | undefined,
): void {
  if (!value) return;
  values.push(value);
  clauses.push(`${column} = $${values.length}`);
}

function addDateFilter(
  clauses: string[],
  values: unknown[],
  column: string,
  operator: ">=" | "<=",
  value: string | undefined,
): void {
  if (!value) return;
  values.push(value);
  clauses.push(`${column} ${operator} $${values.length}::timestamptz`);
}

function rowToSummary(row: ProductResultRunRow): ProductResultRunSummary {
  const summary: ProductResultRunSummary = {
    run_id: row.run_id,
    scenario_id: row.scenario_id,
    scenario_version: row.scenario_version,
    mode: row.mode,
    status: row.status,
    environment_label: row.environment_label,
    started_at: toIsoString(row.started_at),
    ended_at: toIsoString(row.ended_at),
    created_at: toIsoString(row.created_at),
    summary: row.summary,
    artifact_count: row.artifact_count,
    assertion_count: row.assertion_count,
    step_count: row.step_count,
  };
  return {
    ...summary,
    ...(row.git_ref ? { git_ref: row.git_ref } : {}),
    ...(row.git_sha ? { git_sha: row.git_sha } : {}),
  };
}

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function stringifyError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
