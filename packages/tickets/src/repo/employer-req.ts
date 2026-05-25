import type { Principal } from "@spyglass/auth";
import type {
  EmployerReqTicketRow,
  EmployerReqTicketState,
  NewEmployerReqTicketRow,
} from "@spyglass/db";

import {
  buildTransitionAuditEvent,
  emitTransitionAuditEvent,
  principalScopes,
  type BuildTransitionEventArgs,
} from "../audit.js";
import { assertTransition, OPERATOR_TRANSITION_SCOPE } from "../transitions.js";
import type { TicketStore } from "./store.js";

export interface EmployerReqDraftFields {
  readonly org_id: string;
  readonly role_title: string;
  readonly role_level: NewEmployerReqTicketRow["role_level"];
  readonly comp_band_min: number;
  readonly comp_band_max: number;
  readonly currency: string;
  readonly jurisdictions: string[];
  readonly decision_locus_jurisdiction: string;
  readonly work_mode: NewEmployerReqTicketRow["work_mode"];
  readonly headcount_total: number;
  readonly threshold: number;
  readonly flags?: string[];
}

export interface EmployerReqTransitionArgs {
  readonly employer_req_ticket_id: string;
  readonly to: EmployerReqTicketState;
  readonly principal: Principal;
  readonly reason_code?: string;
  readonly notes?: string;
  readonly scopes?: ReadonlyArray<string>;
}

export interface EmployerReqRepoOptions {
  readonly store: TicketStore;
  readonly allocateIdentifier: () => Promise<string>;
}

export function createEmployerReqRepo(options: EmployerReqRepoOptions) {
  return {
    async insertDraft(
      principal: Principal,
      fields: EmployerReqDraftFields,
    ): Promise<EmployerReqTicketRow> {
      return options.store.transaction(async (tx) => {
        const identifier = await options.allocateIdentifier();
        return tx.insertEmployerReqDraft({
          principal_id: principal.principal_id,
          org_id: fields.org_id,
          identifier,
          state: "draft",
          role_title: fields.role_title,
          role_level: fields.role_level,
          comp_band_min: fields.comp_band_min,
          comp_band_max: fields.comp_band_max,
          currency: fields.currency,
          jurisdictions: fields.jurisdictions,
          decision_locus_jurisdiction: fields.decision_locus_jurisdiction,
          work_mode: fields.work_mode,
          headcount_total: fields.headcount_total,
          headcount_filled: 0,
          threshold: fields.threshold,
          flags: fields.flags ?? [],
        });
      });
    },

    async transition(args: EmployerReqTransitionArgs): Promise<EmployerReqTicketRow> {
      return options.store.transaction(async (tx) => {
        const current = await tx.getEmployerReq(args.employer_req_ticket_id);
        if (!current) {
          throw new Error(`employer req ticket not found: ${args.employer_req_ticket_id}`);
        }

        assertTransition(
          {
            kind: "employer_req_ticket",
            from: current.state as EmployerReqTicketState,
            to: args.to,
          },
          {
            scopes: principalScopes(args.principal, args.scopes),
            ...(args.reason_code ? { reason_code: args.reason_code } : {}),
          },
        );

        const updated = await tx.updateEmployerReq(args.employer_req_ticket_id, {
          state: args.to,
          updated_at: new Date(),
        });
        const scopes = principalScopes(args.principal, args.scopes);
        const isOperatorTransition = scopes.includes(OPERATOR_TRANSITION_SCOPE);
        const eventArgs: BuildTransitionEventArgs = {
          kind: "employer_req_ticket",
          ticketId: updated.employer_req_ticket_id,
          identifier: updated.identifier,
          from: current.state,
          to: updated.state,
          principal: args.principal,
          ...(args.reason_code ? { reason_code: args.reason_code } : {}),
          ...(args.notes !== undefined ? { notes: args.notes } : {}),
          ...(isOperatorTransition
            ? {
                transitionName: "operator_transition",
                extra: { actor_principal_id: args.principal.principal_id },
              }
            : {}),
        };
        await emitTransitionAuditEvent(tx, buildTransitionAuditEvent(eventArgs));
        return updated;
      });
    },

    async recordAcceptedMatch(
      employerReqTicketId: string,
      principal: Principal,
    ): Promise<EmployerReqTicketRow> {
      return options.store.transaction(async (tx) => {
        const current = await tx.getEmployerReq(employerReqTicketId);
        if (!current) throw new Error(`employer req ticket not found: ${employerReqTicketId}`);
        const filled = current.headcount_filled + 1;
        const to: EmployerReqTicketState =
          filled >= current.headcount_total ? "filled" : "matching";
        assertTransition(
          { kind: "employer_req_ticket", from: current.state as EmployerReqTicketState, to },
          { scopes: principalScopes(principal) },
        );
        const updated = await tx.updateEmployerReq(employerReqTicketId, {
          headcount_filled: filled,
          state: to,
          updated_at: new Date(),
        });
        await emitTransitionAuditEvent(
          tx,
          buildTransitionAuditEvent({
            kind: "employer_req_ticket",
            ticketId: updated.employer_req_ticket_id,
            identifier: updated.identifier,
            from: current.state,
            to: updated.state,
            principal,
            transitionName: updated.state === current.state ? "additional_match" : updated.state,
          }),
        );
        return updated;
      });
    },
  };
}
