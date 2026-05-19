// F04 T016 — Identifier allocator (FR-7; plan §3 R-3).
//
// Allocates the next `<prefix>-<year>-<NNNNN>` identifier for a given
// ticket kind by drawing from a PostgreSQL native sequence named
// `<table>_<year>_seq`. F04's first migration creates the 2026
// sequences; the annual rollover function (T017) creates next year's
// sequences on Dec 1 UTC.
//
// Identifier shape (FR-7):
//   - seeker_ticket  → ST-YYYY-NNNNN
//   - employer_req_ticket → ER-YYYY-NNNNN
//   - match_ticket   → MT-YYYY-NNNNN
//
// `NNNNN` is zero-padded to five digits. The DB-side CHECK constraints
// in each schema module enforce the same shape (defense in depth per
// Constitution §I.6).
//
// The allocator depends on a small `SequenceExecutor` interface so the
// pure logic is testable without a live Postgres connection. The
// Drizzle adapter (`drizzleSequenceExecutor`) is provided alongside.

import { sql } from "drizzle-orm";
import type { Db } from "@spyglass/db";

export type TicketIdentifierKind = "seeker_ticket" | "employer_req_ticket" | "match_ticket";

const KIND_TO_TABLE: Record<TicketIdentifierKind, string> = {
  seeker_ticket: "seeker_tickets",
  employer_req_ticket: "employer_req_tickets",
  match_ticket: "match_tickets",
};

const KIND_TO_PREFIX: Record<TicketIdentifierKind, string> = {
  seeker_ticket: "ST",
  employer_req_ticket: "ER",
  match_ticket: "MT",
};

export function sequenceNameFor(kind: TicketIdentifierKind, year: number): string {
  return `${KIND_TO_TABLE[kind]}_${year}_seq`;
}

export class SequenceNotFoundError extends Error {
  readonly sequenceName: string;
  constructor(sequenceName: string) {
    super(
      `PostgreSQL sequence "${sequenceName}" does not exist. ` +
        `Run the annual rollover function (T017) or apply the F04 migration.`,
    );
    this.name = "SequenceNotFoundError";
    this.sequenceName = sequenceName;
  }
}

export interface SequenceExecutor {
  /**
   * Return the next value from `sequenceName`. MUST throw
   * `SequenceNotFoundError` (or an error caught + remapped by the
   * implementation) if the sequence does not exist.
   */
  nextval(sequenceName: string): Promise<number>;
}

export interface NextIdentifierArgs {
  kind: TicketIdentifierKind;
  /** UTC year; defaults to the current UTC year. */
  year?: number;
  executor: SequenceExecutor;
}

export async function nextIdentifier(args: NextIdentifierArgs): Promise<string> {
  const year = args.year ?? new Date().getUTCFullYear();
  const seq = sequenceNameFor(args.kind, year);
  const n = await args.executor.nextval(seq);
  const padded = String(n).padStart(5, "0");
  return `${KIND_TO_PREFIX[args.kind]}-${year}-${padded}`;
}

// --------------------------------------------------------------------
// Drizzle adapter — wraps `db.execute` with PG-error-code remapping.
// PG error code 42P01 = "undefined_table" (sequences classify here too).
// --------------------------------------------------------------------

interface PgErrorLike {
  code?: string;
}

export function drizzleSequenceExecutor(db: Db): SequenceExecutor {
  return {
    async nextval(sequenceName: string): Promise<number> {
      try {
        const result = await db.execute(sql`SELECT nextval(${sequenceName}::regclass) AS nextval`);
        // node-postgres returns rows as an array; the value is a string
        // for `bigint` (sequences are bigint by default).
        const rows = (result as unknown as { rows: Array<{ nextval: string | number }> }).rows;
        const raw = rows[0]?.nextval;
        if (raw == null) {
          throw new SequenceNotFoundError(sequenceName);
        }
        return typeof raw === "number" ? raw : Number(raw);
      } catch (err) {
        const pgErr = err as PgErrorLike;
        if (pgErr.code === "42P01") {
          throw new SequenceNotFoundError(sequenceName);
        }
        throw err;
      }
    },
  };
}
