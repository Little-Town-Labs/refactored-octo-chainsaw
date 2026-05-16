// F04 B5 — storage contract for ticket repositories.
//
// The repositories are written against this narrow transaction surface
// so business rules stay testable without a live database. The Drizzle
// adapter below backs the same surface with `@spyglass/db`.

import {
  auditEventsBuffer,
  employerReqTickets,
  matchTickets,
  seekerTickets,
  type Db,
  type EmployerReqTicketRow,
  type MatchTicketRow,
  type NewEmployerReqTicketRow,
  type NewMatchTicketRow,
  type NewSeekerTicketRow,
  type SeekerTicketRow,
} from "@spyglass/db";
import { eq } from "drizzle-orm";

import type { InsertAuditEvent, TicketAuditWriter } from "../audit.js";

export interface TicketTransactionStore extends TicketAuditWriter {
  insertSeekerDraft(values: NewSeekerTicketRow): Promise<SeekerTicketRow>;
  getSeeker(id: string): Promise<SeekerTicketRow | null>;
  findSeekerByIdentifier(identifier: string): Promise<SeekerTicketRow | null>;
  listSeekers(): Promise<SeekerTicketRow[]>;
  updateSeeker(id: string, values: Partial<SeekerTicketRow>): Promise<SeekerTicketRow>;

  insertEmployerReqDraft(values: NewEmployerReqTicketRow): Promise<EmployerReqTicketRow>;
  getEmployerReq(id: string): Promise<EmployerReqTicketRow | null>;
  findEmployerReqByIdentifier(identifier: string): Promise<EmployerReqTicketRow | null>;
  listEmployerReqs(): Promise<EmployerReqTicketRow[]>;
  updateEmployerReq(
    id: string,
    values: Partial<EmployerReqTicketRow>,
  ): Promise<EmployerReqTicketRow>;

  insertMatch(values: NewMatchTicketRow): Promise<MatchTicketRow>;
  getMatch(id: string): Promise<MatchTicketRow | null>;
  findMatchByIdentifier(identifier: string): Promise<MatchTicketRow | null>;
  findMatchByPair(
    seekerTicketId: string,
    employerReqTicketId: string,
    attempt: number,
  ): Promise<MatchTicketRow | null>;
  listMatches(): Promise<MatchTicketRow[]>;
  updateMatch(id: string, values: Partial<MatchTicketRow>): Promise<MatchTicketRow>;
}

export interface TicketStore {
  transaction<T>(fn: (tx: TicketTransactionStore) => Promise<T>): Promise<T>;
}

type DrizzleTx = Parameters<Db["transaction"]>[0] extends (tx: infer Tx) => unknown ? Tx : Db;

function drizzleTxAdapter(tx: DrizzleTx): TicketTransactionStore {
  const db = tx as unknown as Db;
  return {
    async insertSeekerDraft(values) {
      const [row] = await db.insert(seekerTickets).values(values).returning();
      if (!row) throw new Error("failed to insert seeker ticket");
      return row;
    },
    async getSeeker(id) {
      const rows = await db
        .select()
        .from(seekerTickets)
        .where(eq(seekerTickets.seeker_ticket_id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    async findSeekerByIdentifier(identifier) {
      const rows = await db
        .select()
        .from(seekerTickets)
        .where(eq(seekerTickets.identifier, identifier))
        .limit(1);
      return rows[0] ?? null;
    },
    async listSeekers() {
      return db.select().from(seekerTickets).limit(1000);
    },
    async updateSeeker(id, values) {
      const [row] = await db
        .update(seekerTickets)
        .set(values)
        .where(eq(seekerTickets.seeker_ticket_id, id))
        .returning();
      if (!row) throw new Error(`seeker ticket not found: ${id}`);
      return row;
    },
    async insertEmployerReqDraft(values) {
      const [row] = await db.insert(employerReqTickets).values(values).returning();
      if (!row) throw new Error("failed to insert employer req ticket");
      return row;
    },
    async getEmployerReq(id) {
      const rows = await db
        .select()
        .from(employerReqTickets)
        .where(eq(employerReqTickets.employer_req_ticket_id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    async findEmployerReqByIdentifier(identifier) {
      const rows = await db
        .select()
        .from(employerReqTickets)
        .where(eq(employerReqTickets.identifier, identifier))
        .limit(1);
      return rows[0] ?? null;
    },
    async listEmployerReqs() {
      return db.select().from(employerReqTickets).limit(1000);
    },
    async updateEmployerReq(id, values) {
      const [row] = await db
        .update(employerReqTickets)
        .set(values)
        .where(eq(employerReqTickets.employer_req_ticket_id, id))
        .returning();
      if (!row) throw new Error(`employer req ticket not found: ${id}`);
      return row;
    },
    async insertMatch(values) {
      const [row] = await db.insert(matchTickets).values(values).returning();
      if (!row) throw new Error("failed to insert match ticket");
      return row;
    },
    async getMatch(id) {
      const rows = await db
        .select()
        .from(matchTickets)
        .where(eq(matchTickets.match_ticket_id, id))
        .limit(1);
      return rows[0] ?? null;
    },
    async findMatchByIdentifier(identifier) {
      const rows = await db
        .select()
        .from(matchTickets)
        .where(eq(matchTickets.identifier, identifier))
        .limit(1);
      return rows[0] ?? null;
    },
    async findMatchByPair(seekerTicketId, employerReqTicketId, attempt) {
      const rows = await db
        .select()
        .from(matchTickets)
        .where(eq(matchTickets.seeker_ticket_id, seekerTicketId))
        .limit(100);
      return (
        rows.find(
          (r) =>
            r.employer_req_ticket_id === employerReqTicketId &&
            r.attempt === attempt &&
            r.disabled_at === null,
        ) ?? null
      );
    },
    async listMatches() {
      return db.select().from(matchTickets).limit(1000);
    },
    async updateMatch(id, values) {
      const [row] = await db
        .update(matchTickets)
        .set(values)
        .where(eq(matchTickets.match_ticket_id, id))
        .returning();
      if (!row) throw new Error(`match ticket not found: ${id}`);
      return row;
    },
    async insertAuditEvent(event: InsertAuditEvent) {
      await db.insert(auditEventsBuffer).values(event);
    },
  };
}

export function createDrizzleTicketStore(db: Db): TicketStore {
  return {
    async transaction<T>(fn: (tx: TicketTransactionStore) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) => fn(drizzleTxAdapter(tx)));
    },
  };
}
