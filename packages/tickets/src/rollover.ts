// F04 T017 — Annual sequence-rollover function (plan §3 R-3; EC-9).
//
// Bootstraps the next year's three identifier sequences exactly once.
// Designed to be scheduled by Inngest at `0 0 1 12 *` UTC (Dec 1)
// so each year's allocator (T016) finds its sequence the instant the
// calendar rolls over. Idempotent — re-running the cron is a no-op.
//
// The pure logic here takes a `SequenceBootstrapExecutor`; the Inngest
// function (when Inngest is wired into the apps/web surface) wraps
// this and emits one `identifier_sequences.bootstrapped` audit event
// per *created* sequence (skipped sequences emit nothing — they were
// bootstrapped on a prior run).
//
// EC-9 recovery: if a rollover is missed, an operator can invoke the
// runbook (T018) which calls this function directly. The idempotent
// shape means re-running after a partial recovery is safe.

import { sql } from "drizzle-orm";
import type { Db } from "@spyglass/db";

import { sequenceNameFor } from "./identifiers.js";

const KINDS = ["seeker_ticket", "employer_req_ticket", "match_ticket"] as const;

export interface SequenceBootstrapExecutor {
  /**
   * Atomically create `sequenceName` if it does not exist. Returns
   * `{ created: true }` when the sequence was newly created and
   * `{ created: false }` when it already existed (i.e., a prior run
   * bootstrapped it).
   */
  createIfNotExists(sequenceName: string): Promise<{ created: boolean }>;
}

export interface BootstrappedSequenceEvent {
  readonly event_name: "identifier_sequences.bootstrapped";
  readonly payload: {
    readonly sequence_name: string;
    readonly year: number;
  };
}

export interface BootstrapResult {
  readonly year: number;
  readonly created: ReadonlyArray<string>;
  readonly skipped: ReadonlyArray<string>;
  readonly auditEvents: ReadonlyArray<BootstrappedSequenceEvent>;
}

function assertValidYear(year: number): void {
  if (!Number.isInteger(year) || year < 1) {
    throw new Error(`bootstrapYearSequences: year must be a positive integer (got ${year}).`);
  }
}

export async function bootstrapYearSequences(
  executor: SequenceBootstrapExecutor,
  year: number,
): Promise<BootstrapResult> {
  assertValidYear(year);

  const sequenceNames = KINDS.map((k) => sequenceNameFor(k, year));
  const created: string[] = [];
  const skipped: string[] = [];

  for (const name of sequenceNames) {
    const result = await executor.createIfNotExists(name);
    if (result.created) {
      created.push(name);
    } else {
      skipped.push(name);
    }
  }

  const auditEvents: BootstrappedSequenceEvent[] = created.map((sequence_name) => ({
    event_name: "identifier_sequences.bootstrapped",
    payload: { sequence_name, year },
  }));

  return { year, created, skipped, auditEvents };
}

// --------------------------------------------------------------------
// Drizzle adapter — `CREATE SEQUENCE IF NOT EXISTS` is the natural fit
// but does NOT report whether the sequence was newly created. We use a
// two-step pattern: probe `pg_class` first, then `CREATE SEQUENCE IF
// NOT EXISTS` (race-safe; the probe is advisory, the IF NOT EXISTS is
// authoritative).
// --------------------------------------------------------------------

export function drizzleBootstrapExecutor(db: Db): SequenceBootstrapExecutor {
  return {
    async createIfNotExists(sequenceName: string): Promise<{ created: boolean }> {
      const probe = await db.execute(
        sql`SELECT 1 AS one FROM pg_class WHERE relkind = 'S' AND relname = ${sequenceName}`,
      );
      const rows = (probe as unknown as { rows: Array<{ one: number }> }).rows;
      const existedBefore = rows.length > 0;

      await db.execute(sql.raw(`CREATE SEQUENCE IF NOT EXISTS "${sequenceName}" START 1`));

      return { created: !existedBefore };
    },
  };
}
