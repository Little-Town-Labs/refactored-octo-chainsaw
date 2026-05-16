import { randomUUID } from "node:crypto";

import type { Principal } from "@spyglass/auth";
import type { MatchTicketRow, MatchTicketState } from "@spyglass/db";

import { IdempotencyConflictError, InvariantViolationError, MissingScopeError } from "../errors.js";
import type { TicketIdentifierKind } from "../identifiers.js";
import {
  buildTransitionAuditEvent,
  emitTransitionAuditEvent,
  principalScopes,
  type BuildTransitionEventArgs,
} from "../audit.js";
import { assertTransition } from "../transitions.js";
import type { TicketStore } from "./store.js";

export const MATCH_ADVANCE_SCOPE = "tickets.match.advance" as const;

function requireMatchAdvance(principal: Principal, scopes?: ReadonlyArray<string>): void {
  const granted = principalScopes(principal, scopes);
  if (!granted.includes(MATCH_ADVANCE_SCOPE)) throw new MissingScopeError(MATCH_ADVANCE_SCOPE);
}

export interface CreateMatchFields {
  readonly seeker_ticket_id: string;
  readonly employer_req_ticket_id: string;
  readonly principal: Principal;
  readonly round_cap?: number;
  readonly seeker_contract_id: string;
  readonly seeker_contract_version: string;
  readonly employer_contract_id: string;
  readonly employer_contract_version: string;
  readonly privacy_ruleset_id: string;
  readonly privacy_ruleset_version: string;
  readonly decision_locus_jurisdiction: string;
  readonly flags?: string[];
  readonly scopes?: ReadonlyArray<string>;
}

export interface AdvanceMatchArgs {
  readonly match_ticket_id: string;
  readonly to: MatchTicketState;
  readonly principal: Principal;
  readonly dossier_id?: string | null;
  readonly run_id?: string | null;
  readonly reason_code?: string;
  readonly scopes?: ReadonlyArray<string>;
}

export interface MatchRepoOptions {
  readonly store: TicketStore;
  readonly allocateIdentifier: (kind: TicketIdentifierKind) => Promise<string>;
  readonly createRunId?: () => string;
}

export function createMatchRepo(options: MatchRepoOptions) {
  const createRunId = options.createRunId ?? randomUUID;
  return {
    async createMatch(fields: CreateMatchFields): Promise<MatchTicketRow> {
      requireMatchAdvance(fields.principal, fields.scopes);
      return options.store.transaction(async (tx) => {
        const seeker = await tx.getSeeker(fields.seeker_ticket_id);
        if (!seeker) throw new Error(`seeker ticket not found: ${fields.seeker_ticket_id}`);
        const employer = await tx.getEmployerReq(fields.employer_req_ticket_id);
        if (!employer) {
          throw new Error(`employer req ticket not found: ${fields.employer_req_ticket_id}`);
        }
        const existing = await tx.findMatchByPair(
          fields.seeker_ticket_id,
          fields.employer_req_ticket_id,
          1,
        );
        if (existing) {
          throw new IdempotencyConflictError(
            fields.seeker_ticket_id,
            fields.employer_req_ticket_id,
            1,
          );
        }

        const identifier = await options.allocateIdentifier("match_ticket");
        const match = await tx.insertMatch({
          identifier,
          seeker_ticket_id: fields.seeker_ticket_id,
          employer_req_ticket_id: fields.employer_req_ticket_id,
          state: "created",
          round: 0,
          round_cap: fields.round_cap ?? 3,
          attempt: 1,
          seeker_contract_id: fields.seeker_contract_id,
          seeker_contract_version: fields.seeker_contract_version,
          employer_contract_id: fields.employer_contract_id,
          employer_contract_version: fields.employer_contract_version,
          privacy_ruleset_id: fields.privacy_ruleset_id,
          privacy_ruleset_version: fields.privacy_ruleset_version,
          decision_locus_jurisdiction: fields.decision_locus_jurisdiction,
          flags: fields.flags ?? [],
        });

        await emitTransitionAuditEvent(
          tx,
          buildTransitionAuditEvent({
            kind: "match_ticket",
            ticketId: match.match_ticket_id,
            identifier: match.identifier,
            from: "none",
            to: match.state,
            principal: fields.principal,
            extra: {
              attempt: match.attempt,
              seeker_ticket_id: match.seeker_ticket_id,
              employer_req_ticket_id: match.employer_req_ticket_id,
            },
          }),
        );
        return match;
      });
    },

    async advanceMatch(args: AdvanceMatchArgs): Promise<MatchTicketRow> {
      requireMatchAdvance(args.principal, args.scopes);
      return options.store.transaction(async (tx) => {
        const current = await tx.getMatch(args.match_ticket_id);
        if (!current) throw new Error(`match ticket not found: ${args.match_ticket_id}`);
        const nextDossier = args.dossier_id === undefined ? current.dossier_id : args.dossier_id;
        const nextRun = args.run_id === undefined ? current.run_id : args.run_id;
        assertTransition(
          { kind: "match_ticket", from: current.state as MatchTicketState, to: args.to },
          {
            scopes: principalScopes(args.principal, args.scopes),
            ...(args.reason_code ? { reason_code: args.reason_code } : {}),
            dossier_id: nextDossier,
          },
        );
        const updated = await tx.updateMatch(args.match_ticket_id, {
          state: args.to,
          dossier_id: nextDossier,
          run_id: nextRun,
          updated_at: new Date(),
        });
        const eventArgs: BuildTransitionEventArgs = {
          kind: "match_ticket",
          ticketId: updated.match_ticket_id,
          identifier: updated.identifier,
          from: current.state,
          to: updated.state,
          principal: args.principal,
          ...(args.reason_code ? { reason_code: args.reason_code } : {}),
          extra: {
            run_id: updated.run_id,
            dossier_id: updated.dossier_id,
            attempt: updated.attempt,
            seeker_ticket_id: updated.seeker_ticket_id,
            employer_req_ticket_id: updated.employer_req_ticket_id,
          },
        };
        await emitTransitionAuditEvent(tx, buildTransitionAuditEvent(eventArgs));
        return updated;
      });
    },

    async renegotiate(matchTicketId: string, principal: Principal): Promise<MatchTicketRow> {
      requireMatchAdvance(principal);
      return options.store.transaction(async (tx) => {
        const current = await tx.getMatch(matchTicketId);
        if (!current) throw new Error(`match ticket not found: ${matchTicketId}`);
        assertTransition(
          { kind: "match_ticket", from: current.state as MatchTicketState, to: "negotiating" },
          { scopes: principalScopes(principal) },
        );
        const updated = await tx.updateMatch(matchTicketId, {
          state: "negotiating",
          attempt: current.attempt + 1,
          run_id: createRunId(),
          dossier_id: null,
          round: 0,
          updated_at: new Date(),
        });
        await emitTransitionAuditEvent(
          tx,
          buildTransitionAuditEvent({
            kind: "match_ticket",
            ticketId: updated.match_ticket_id,
            identifier: updated.identifier,
            from: current.state,
            to: updated.state,
            principal,
            transitionName: "renegotiated",
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
      });
    },

    async advanceRound(matchTicketId: string, principal: Principal): Promise<MatchTicketRow> {
      requireMatchAdvance(principal);
      return options.store.transaction(async (tx) => {
        const current = await tx.getMatch(matchTicketId);
        if (!current) throw new Error(`match ticket not found: ${matchTicketId}`);
        if (current.round >= current.round_cap) {
          throw new InvariantViolationError("match_ticket.round_cap_exhausted");
        }
        return tx.updateMatch(matchTicketId, {
          round: current.round + 1,
          updated_at: new Date(),
        });
      });
    },
  };
}
