import type { HumanPrincipal, HumanTier } from "@spyglass/auth";
import type {
  EmployerReqTicketRow,
  MatchTicketRow,
  MatchTicketState,
  SeekerTicketRow,
  SeekerTicketState,
} from "@spyglass/db";

import {
  buildTransitionAuditEvent,
  emitTransitionAuditEvent,
  principalRoleOrScope,
} from "../audit.js";
import { assertTransition } from "../transitions.js";
import type { TicketStore, TicketTransactionStore } from "./store.js";

export interface SourceWorkflowRepoOptions {
  readonly store: TicketStore;
}

export interface AmendTicketPatch {
  readonly comp_band_min?: number;
  readonly comp_band_max?: number;
  readonly jurisdictions?: string[];
  readonly work_mode?: SeekerTicketRow["work_mode"];
  readonly flags?: string[];
}

export class TicketAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketAuthorizationError";
  }
}

function requireHumanRole(principal: HumanPrincipal, tier: HumanTier): void {
  if (principal.tier !== tier) {
    throw new TicketAuthorizationError(`${tier} role required`);
  }
}

function patchedFields(patch: AmendTicketPatch): string[] {
  return Object.entries(patch)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field)
    .sort();
}

function ensurePatchNotEmpty(patch: AmendTicketPatch): string[] {
  const fields = patchedFields(patch);
  if (fields.length === 0) throw new Error("amendment patch must contain at least one field");
  return fields;
}

function sourceWithdrawnMatch(
  matches: MatchTicketRow[],
  source: { seeker_ticket_id?: string; employer_req_ticket_id?: string },
): MatchTicketRow | null {
  return (
    matches.find((match) => {
      if (match.state !== "negotiating" || match.disabled_at !== null) return false;
      if (source.seeker_ticket_id && match.seeker_ticket_id !== source.seeker_ticket_id) {
        return false;
      }
      if (
        source.employer_req_ticket_id &&
        match.employer_req_ticket_id !== source.employer_req_ticket_id
      ) {
        return false;
      }
      return true;
    }) ?? null
  );
}

function jurisdictionCascadeMatch(
  matches: MatchTicketRow[],
  source: { seeker_ticket_id?: string; employer_req_ticket_id?: string },
  jurisdictions: readonly string[] | undefined,
): MatchTicketRow | null {
  if (!jurisdictions) return null;
  const match = sourceWithdrawnMatch(matches, source);
  if (!match) return null;
  return jurisdictions.includes(match.decision_locus_jurisdiction) ? null : match;
}

async function rejectMatch(
  tx: TicketTransactionStore,
  match: MatchTicketRow,
  principal: HumanPrincipal,
  reason_code: "source_withdrawn" | "jurisdiction_changed",
): Promise<MatchTicketRow> {
  assertTransition(
    {
      kind: "match_ticket",
      from: match.state as MatchTicketState,
      to: "rejected",
    },
    { scopes: [], reason_code },
  );
  const updated = await tx.updateMatch(match.match_ticket_id, {
    state: "rejected",
    updated_at: new Date(),
  });
  await emitTransitionAuditEvent(
    tx,
    buildTransitionAuditEvent({
      kind: "match_ticket",
      ticketId: updated.match_ticket_id,
      identifier: updated.identifier,
      from: match.state,
      to: updated.state,
      principal,
      reason_code,
      extra: {
        run_id: updated.run_id,
        dossier_id: updated.dossier_id,
        attempt: updated.attempt,
        seeker_ticket_id: updated.seeker_ticket_id,
        employer_req_ticket_id: updated.employer_req_ticket_id,
      },
    }),
  );
  return updated;
}

async function emitAmendEvent(
  tx: TicketTransactionStore,
  args: {
    kind: "seeker" | "employer_req";
    ticketId: string;
    identifier: string;
    principal: HumanPrincipal;
    patchedFields: readonly string[];
  },
): Promise<void> {
  await tx.insertAuditEvent({
    event_name: `${args.kind}_ticket.amended`,
    principal_id: args.principal.principal_id,
    principal_kind: args.principal.kind,
    role_or_scope: principalRoleOrScope(args.principal),
    correlation_id: args.principal.correlation_id,
    payload: {
      ticket_id: args.ticketId,
      ticket_identifier: args.identifier,
      ticket_kind: args.kind,
      patched_fields: [...args.patchedFields],
      prior_values_present: true,
    },
  });
}

export function createSourceWorkflowRepo(options: SourceWorkflowRepoOptions) {
  return {
    async withdrawSeekerIntent(
      principal: HumanPrincipal,
      seeker_ticket_id: string,
    ): Promise<{ seeker: SeekerTicketRow; rejectedMatch: MatchTicketRow | null }> {
      requireHumanRole(principal, "seeker");
      return options.store.transaction(async (tx) => {
        const current = await tx.getSeeker(seeker_ticket_id);
        if (!current) throw new Error(`seeker ticket not found: ${seeker_ticket_id}`);
        if (current.principal_id !== principal.principal_id) {
          throw new TicketAuthorizationError("seeker ticket owner required");
        }
        assertTransition(
          {
            kind: "seeker_ticket",
            from: current.state as SeekerTicketState,
            to: "withdrawn",
          },
          { scopes: [] },
        );
        const updated = await tx.updateSeeker(seeker_ticket_id, {
          state: "withdrawn",
          updated_at: new Date(),
        });
        await emitTransitionAuditEvent(
          tx,
          buildTransitionAuditEvent({
            kind: "seeker_ticket",
            ticketId: updated.seeker_ticket_id,
            identifier: updated.identifier,
            from: current.state,
            to: updated.state,
            principal,
          }),
        );

        const match = sourceWithdrawnMatch(await tx.listMatches(), {
          seeker_ticket_id,
        });
        const rejectedMatch = match
          ? await rejectMatch(tx, match, principal, "source_withdrawn")
          : null;
        return { seeker: updated, rejectedMatch };
      });
    },

    async amendSeekerIntent(
      principal: HumanPrincipal,
      seeker_ticket_id: string,
      patch: AmendTicketPatch,
    ): Promise<{ seeker: SeekerTicketRow; rejectedMatch: MatchTicketRow | null }> {
      requireHumanRole(principal, "seeker");
      const fields = ensurePatchNotEmpty(patch);
      return options.store.transaction(async (tx) => {
        const current = await tx.getSeeker(seeker_ticket_id);
        if (!current) throw new Error(`seeker ticket not found: ${seeker_ticket_id}`);
        if (current.principal_id !== principal.principal_id) {
          throw new TicketAuthorizationError("seeker ticket owner required");
        }
        const updated = await tx.updateSeeker(seeker_ticket_id, {
          ...patch,
          updated_at: new Date(),
        });
        await emitAmendEvent(tx, {
          kind: "seeker",
          ticketId: updated.seeker_ticket_id,
          identifier: updated.identifier,
          principal,
          patchedFields: fields,
        });
        const match = jurisdictionCascadeMatch(
          await tx.listMatches(),
          { seeker_ticket_id },
          patch.jurisdictions,
        );
        const rejectedMatch = match
          ? await rejectMatch(tx, match, principal, "jurisdiction_changed")
          : null;
        return { seeker: updated, rejectedMatch };
      });
    },

    async amendEmployerRequisition(
      principal: HumanPrincipal,
      employer_req_ticket_id: string,
      patch: AmendTicketPatch,
    ): Promise<{ employerReq: EmployerReqTicketRow; rejectedMatch: MatchTicketRow | null }> {
      requireHumanRole(principal, "employer_admin");
      const fields = ensurePatchNotEmpty(patch);
      return options.store.transaction(async (tx) => {
        const current = await tx.getEmployerReq(employer_req_ticket_id);
        if (!current) {
          throw new Error(`employer req ticket not found: ${employer_req_ticket_id}`);
        }
        if (!principal.org_id || current.org_id !== principal.org_id) {
          throw new TicketAuthorizationError("employer organization required");
        }
        const updated = await tx.updateEmployerReq(employer_req_ticket_id, {
          ...patch,
          updated_at: new Date(),
        });
        await emitAmendEvent(tx, {
          kind: "employer_req",
          ticketId: updated.employer_req_ticket_id,
          identifier: updated.identifier,
          principal,
          patchedFields: fields,
        });
        const match = jurisdictionCascadeMatch(
          await tx.listMatches(),
          { employer_req_ticket_id },
          patch.jurisdictions,
        );
        const rejectedMatch = match
          ? await rejectMatch(tx, match, principal, "jurisdiction_changed")
          : null;
        return { employerReq: updated, rejectedMatch };
      });
    },
  };
}
