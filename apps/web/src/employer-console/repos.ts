import {
  dossierProjections,
  dossierSignatures,
  employerReqTickets,
  matchTickets,
  type Db,
  type EmployerReqTicketRow,
} from "@spyglass/db";
import { and, desc, eq } from "drizzle-orm";

import {
  EMPLOYER_CONSOLE_MAX_PAGE_SIZE,
  EMPLOYER_CONSOLE_PAGE_SIZE,
  type CandidateInboxEntry,
  type CandidateInboxResult,
  type ParsedPagination,
  type ReqListResult,
} from "./types";

function pageLimit(limit?: number): number {
  return Math.max(1, Math.min(limit ?? EMPLOYER_CONSOLE_PAGE_SIZE, EMPLOYER_CONSOLE_MAX_PAGE_SIZE));
}

function offsetFromCursor(cursor?: string): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export interface EmployerConsoleReadRepo {
  listReqs(orgId: string, pagination?: ParsedPagination): Promise<ReqListResult>;
  getReq(orgId: string, reqId: string): Promise<EmployerReqTicketRow | null>;
  listCandidates(orgId: string, pagination?: ParsedPagination): Promise<CandidateInboxResult>;
  getCandidate(orgId: string, matchId: string): Promise<CandidateInboxEntry | null>;
}

export function createDrizzleEmployerConsoleReadRepo(db: Db): EmployerConsoleReadRepo {
  return {
    async listReqs(orgId, pagination) {
      const limit = pageLimit(pagination?.limit);
      const offset = offsetFromCursor(pagination?.cursor);
      const rows = await db
        .select()
        .from(employerReqTickets)
        .where(eq(employerReqTickets.org_id, orgId))
        .orderBy(desc(employerReqTickets.created_at))
        .limit(limit + 1)
        .offset(offset);
      const hasMore = rows.length > limit;
      return {
        rows: hasMore ? rows.slice(0, limit) : rows,
        next_cursor: hasMore ? String(offset + limit) : null,
      };
    },
    async getReq(orgId, reqId) {
      const rows = await db
        .select()
        .from(employerReqTickets)
        .where(
          and(
            eq(employerReqTickets.org_id, orgId),
            eq(employerReqTickets.employer_req_ticket_id, reqId),
          ),
        )
        .limit(1);
      return rows[0] ?? null;
    },
    async listCandidates(orgId, pagination) {
      const limit = pageLimit(pagination?.limit);
      const offset = offsetFromCursor(pagination?.cursor);
      const rows = await db
        .select({ match: matchTickets, employer_req: employerReqTickets })
        .from(matchTickets)
        .innerJoin(
          employerReqTickets,
          eq(matchTickets.employer_req_ticket_id, employerReqTickets.employer_req_ticket_id),
        )
        .where(and(eq(employerReqTickets.org_id, orgId), eq(matchTickets.state, "delivered")))
        .orderBy(desc(matchTickets.updated_at))
        .limit(limit + 1)
        .offset(offset);

      const hydrated = await Promise.all(
        rows.slice(0, limit).map(async (row) => hydrateCandidate(db, row.match, row.employer_req)),
      );
      return {
        rows: hydrated,
        next_cursor: rows.length > limit ? String(offset + limit) : null,
      };
    },
    async getCandidate(orgId, matchId) {
      const rows = await db
        .select({ match: matchTickets, employer_req: employerReqTickets })
        .from(matchTickets)
        .innerJoin(
          employerReqTickets,
          eq(matchTickets.employer_req_ticket_id, employerReqTickets.employer_req_ticket_id),
        )
        .where(
          and(
            eq(employerReqTickets.org_id, orgId),
            eq(matchTickets.match_ticket_id, matchId),
            eq(matchTickets.state, "delivered"),
          ),
        )
        .limit(1);
      const row = rows[0];
      return row ? hydrateCandidate(db, row.match, row.employer_req) : null;
    },
  };
}

async function hydrateCandidate(
  db: Db,
  match: typeof matchTickets.$inferSelect,
  employerReq: EmployerReqTicketRow,
): Promise<CandidateInboxEntry> {
  if (!match.dossier_id) {
    return { match, employer_req: employerReq, projection: null, signature: null };
  }
  const [projection] = await db
    .select()
    .from(dossierProjections)
    .where(
      and(
        eq(dossierProjections.dossier_id, match.dossier_id),
        eq(dossierProjections.audience, "employer"),
      ),
    )
    .limit(1);
  const [signature] = await db
    .select()
    .from(dossierSignatures)
    .where(eq(dossierSignatures.dossier_id, match.dossier_id))
    .limit(1);
  return {
    match,
    employer_req: employerReq,
    projection: projection ?? null,
    signature: signature ?? null,
  };
}
