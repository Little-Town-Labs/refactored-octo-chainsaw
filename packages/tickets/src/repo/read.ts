import type { Principal } from "@spyglass/auth";
import type { EmployerReqTicketRow, MatchTicketRow, SeekerTicketRow } from "@spyglass/db";

import { MissingScopeError } from "../errors.js";
import type { TicketStore, TicketTransactionStore } from "./store.js";

export type ReadTicketKind = "seeker" | "employer_req" | "match";
export type TicketRow = SeekerTicketRow | EmployerReqTicketRow | MatchTicketRow;
export const TICKET_READ_ALL_SCOPE = "tickets.read.all" as const;

export interface PageOptions {
  readonly limit?: number;
  readonly cursor?: string;
}

export interface Page<T> {
  readonly rows: readonly T[];
  readonly next_cursor: string | null;
}

export interface ReducedTicketProjection {
  readonly ticket_id: string;
  readonly identifier: string;
  readonly kind: ReadTicketKind;
  readonly state: string;
  readonly jurisdictions?: readonly string[];
  readonly role_family?: string;
  readonly role_title?: string;
  readonly decision_locus_jurisdiction?: string;
}

export interface MatchJoinGraph {
  readonly match: MatchTicketRow;
  readonly seeker: SeekerTicketRow;
  readonly employer_req: EmployerReqTicketRow;
  readonly decision_locus_jurisdiction: string;
}

export interface TicketReadRepo {
  listByPrincipal(
    principal: Principal,
    principalId: string,
    kind?: ReadTicketKind,
    opts?: PageOptions,
  ): Promise<Page<TicketRow>>;
  listByOrg(
    principal: Principal,
    orgId: string,
    kind: "employer_req",
    opts?: PageOptions,
  ): Promise<Page<EmployerReqTicketRow>>;
  listByState(
    principal: Principal,
    kind: ReadTicketKind,
    state: string,
    opts?: PageOptions,
  ): Promise<Page<TicketRow>>;
  listByJurisdiction(
    principal: Principal,
    jurisdiction: string,
    kind?: ReadTicketKind,
    opts?: PageOptions,
  ): Promise<Page<TicketRow>>;
  fetchById(
    principal: Principal,
    kind: ReadTicketKind,
    ticketId: string,
  ): Promise<TicketRow | ReducedTicketProjection | null>;
  fetchByIdentifier(
    principal: Principal,
    kind: ReadTicketKind,
    identifier: string,
  ): Promise<TicketRow | ReducedTicketProjection | null>;
  fetchMatchJoinGraph(principal: Principal, matchTicketId: string): Promise<MatchJoinGraph | null>;
}

export interface TicketReadRepoOptions {
  readonly store: TicketStore;
}

function notImplemented(): never {
  throw new Error("unreachable");
}

function scopes(principal: Principal): readonly string[] {
  return "scopes" in principal ? principal.scopes : [];
}

function canReadAll(principal: Principal): boolean {
  return scopes(principal).includes(TICKET_READ_ALL_SCOPE);
}

function requireReadAll(principal: Principal): void {
  if (!canReadAll(principal)) throw new MissingScopeError(TICKET_READ_ALL_SCOPE);
}

function page<T extends { created_at: Date }>(rows: readonly T[], opts: PageOptions = {}): Page<T> {
  const limit = Math.max(1, Math.min(opts.limit ?? 50, 100));
  const offset = opts.cursor ? Number.parseInt(opts.cursor, 10) : 0;
  const sorted = [...rows].sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
  const slice = sorted.slice(offset, offset + limit);
  const next = offset + limit < sorted.length ? String(offset + limit) : null;
  return { rows: slice, next_cursor: next };
}

function ownsSeeker(principal: Principal, row: SeekerTicketRow): boolean {
  return (
    principal.kind === "human" &&
    principal.tier === "seeker" &&
    row.principal_id === principal.principal_id
  );
}

function ownsEmployerReq(principal: Principal, row: EmployerReqTicketRow): boolean {
  return (
    principal.kind === "human" &&
    (principal.tier === "employer_admin" || principal.tier === "employer_member") &&
    row.org_id === principal.org_id
  );
}

function seekerProjection(row: SeekerTicketRow): ReducedTicketProjection {
  return {
    ticket_id: row.seeker_ticket_id,
    identifier: row.identifier,
    kind: "seeker",
    state: row.state,
    jurisdictions: row.jurisdictions,
    role_family: row.role_family,
  };
}

function employerProjection(row: EmployerReqTicketRow): ReducedTicketProjection {
  return {
    ticket_id: row.employer_req_ticket_id,
    identifier: row.identifier,
    kind: "employer_req",
    state: row.state,
    jurisdictions: row.jurisdictions,
    role_title: row.role_title,
  };
}

function matchProjection(row: MatchTicketRow): ReducedTicketProjection {
  return {
    ticket_id: row.match_ticket_id,
    identifier: row.identifier,
    kind: "match",
    state: row.state,
    decision_locus_jurisdiction: row.decision_locus_jurisdiction,
  };
}

async function canReadMatchSide(
  tx: TicketTransactionStore,
  principal: Principal,
  row: MatchTicketRow,
): Promise<boolean> {
  if (canReadAll(principal)) return true;
  const seeker = await tx.getSeeker(row.seeker_ticket_id);
  if (seeker && ownsSeeker(principal, seeker)) return true;
  const employer = await tx.getEmployerReq(row.employer_req_ticket_id);
  return employer ? ownsEmployerReq(principal, employer) : false;
}

async function visibleRows(
  tx: TicketTransactionStore,
  principal: Principal,
  kind?: ReadTicketKind,
): Promise<TicketRow[]> {
  const rows: TicketRow[] = [];
  if (!kind || kind === "seeker") {
    const seekers = await tx.listSeekers();
    rows.push(
      ...(canReadAll(principal) ? seekers : seekers.filter((r) => ownsSeeker(principal, r))),
    );
  }
  if (!kind || kind === "employer_req") {
    const reqs = await tx.listEmployerReqs();
    rows.push(
      ...(canReadAll(principal) ? reqs : reqs.filter((r) => ownsEmployerReq(principal, r))),
    );
  }
  if (!kind || kind === "match") {
    const matches = await tx.listMatches();
    if (canReadAll(principal)) rows.push(...matches);
  }
  return rows;
}

async function readMatchJoinGraph(
  tx: TicketTransactionStore,
  matchTicketId: string,
): Promise<MatchJoinGraph | null> {
  const match = await tx.getMatch(matchTicketId);
  if (!match) return null;
  const seeker = await tx.getSeeker(match.seeker_ticket_id);
  const employerReq = await tx.getEmployerReq(match.employer_req_ticket_id);
  if (!seeker || !employerReq) return null;
  return {
    match,
    seeker,
    employer_req: employerReq,
    decision_locus_jurisdiction: match.decision_locus_jurisdiction,
  };
}

export function createReadRepo(options: TicketReadRepoOptions): TicketReadRepo {
  return {
    async listByPrincipal(principal, principalId, kind, opts) {
      return options.store.transaction(async (tx) => {
        if (!canReadAll(principal) && principal.principal_id !== principalId) {
          throw new MissingScopeError(TICKET_READ_ALL_SCOPE);
        }
        const rows = await visibleRows(tx, principal, kind);
        return page(
          rows.filter((r) => "principal_id" in r && r.principal_id === principalId),
          opts,
        );
      });
    },
    async listByOrg(principal, orgId, _kind, opts) {
      return options.store.transaction(async (tx) => {
        if (
          !canReadAll(principal) &&
          !(
            principal.kind === "human" &&
            (principal.tier === "employer_admin" || principal.tier === "employer_member") &&
            principal.org_id === orgId
          )
        ) {
          throw new MissingScopeError(TICKET_READ_ALL_SCOPE);
        }
        const reqs = await tx.listEmployerReqs();
        return page(
          reqs.filter((r) => r.org_id === orgId),
          opts,
        );
      });
    },
    async listByState(principal, kind, state, opts) {
      return options.store.transaction(async (tx) => {
        if (kind === "match" && !canReadAll(principal)) {
          throw new MissingScopeError(TICKET_READ_ALL_SCOPE);
        }
        const rows = await visibleRows(tx, principal, kind);
        return page(
          rows.filter((r) => r.state === state),
          opts,
        );
      });
    },
    async listByJurisdiction(principal, jurisdiction, kind, opts) {
      return options.store.transaction(async (tx) => {
        const rows = await visibleRows(tx, principal, kind);
        return page(
          rows.filter((r) =>
            "decision_locus_jurisdiction" in r
              ? r.decision_locus_jurisdiction === jurisdiction
              : r.jurisdictions.includes(jurisdiction),
          ),
          opts,
        );
      });
    },
    async fetchById(principal, kind, ticketId) {
      return options.store.transaction(async (tx) => {
        if (kind === "seeker") {
          const row = await tx.getSeeker(ticketId);
          if (!row) return null;
          return canReadAll(principal) || ownsSeeker(principal, row) ? row : seekerProjection(row);
        }
        if (kind === "employer_req") {
          const row = await tx.getEmployerReq(ticketId);
          if (!row) return null;
          return canReadAll(principal) || ownsEmployerReq(principal, row)
            ? row
            : employerProjection(row);
        }
        if (kind === "match") {
          const row = await tx.getMatch(ticketId);
          if (!row) return null;
          return (await canReadMatchSide(tx, principal, row)) ? matchProjection(row) : null;
        }
        return notImplemented();
      });
    },
    async fetchByIdentifier(principal, kind, identifier) {
      return options.store.transaction(async (tx) => {
        if (kind === "seeker") {
          const row = await tx.findSeekerByIdentifier(identifier);
          if (!row) return null;
          return canReadAll(principal) || ownsSeeker(principal, row) ? row : seekerProjection(row);
        }
        if (kind === "employer_req") {
          const row = await tx.findEmployerReqByIdentifier(identifier);
          if (!row) return null;
          return canReadAll(principal) || ownsEmployerReq(principal, row)
            ? row
            : employerProjection(row);
        }
        const row = await tx.findMatchByIdentifier(identifier);
        if (!row) return null;
        return (await canReadMatchSide(tx, principal, row)) ? matchProjection(row) : null;
      });
    },
    async fetchMatchJoinGraph(principal, matchTicketId) {
      requireReadAll(principal);
      return options.store.transaction((tx) => readMatchJoinGraph(tx, matchTicketId));
    },
  };
}
